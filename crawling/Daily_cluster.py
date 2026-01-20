import psycopg2
import pandas as pd
import numpy as np
import json
import time
import logging
import re
from difflib import SequenceMatcher
from sklearn.metrics.pairwise import cosine_similarity

# 설정
DB_CONFIG = {
    "host": "localhost",
    "dbname": "postgres",
    "user": "postgres",
    "password": "0000",
    "port": "5432"
}
CHECK_INTERVAL = 30 
logging.basicConfig(level=logging.INFO, format='⏰ %(message)s')

def get_db_connection(): return psycopg2.connect(**DB_CONFIG)

def parse_embedding(emb_str):
    try:
        if isinstance(emb_str, str): return np.array(json.loads(emb_str))
        elif isinstance(emb_str, list): return np.array(emb_str)
        return np.zeros(1024)
    except: return np.zeros(1024)

def clean_text_for_title(text):
    text = re.sub(r'[^\w\s]', ' ', text)
    return ' '.join(text.split())

def verify_triple_check(score, my_k, tgt_k, my_txt, tgt_txt):
    if score < 0.82: return False
    tgt_set = set(tgt_k) if tgt_k else set()
    if len(my_k.intersection(tgt_set)) < 1: return False
    if SequenceMatcher(None, my_txt, tgt_txt).ratio() < 0.3: return False
    return True

def process_new_complaints():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # 신규 민원 (지역정보 포함)
        sql_new = """
            SELECT n.complaint_id as id, n.core_request, n.embedding, n.keywords_jsonb,
                   n.district_id, n.target_object, d.name as district_name
            FROM complaint_normalizations n
            JOIN complaints c ON n.complaint_id = c.id
            LEFT JOIN districts d ON n.district_id = d.id
            WHERE c.incident_id IS NULL AND n.is_current = true
            LIMIT 50
        """
        new_df = pd.read_sql(sql_new, conn)
        if new_df.empty: return

        logging.info(f"⚡ 신규 {len(new_df)}건 감지 - 분석 시작")

        # 비교군 로드
        sql_active = """
            SELECT c.incident_id, n.core_request, n.embedding, n.keywords_jsonb,
                   n.district_id, n.target_object
            FROM complaint_normalizations n
            JOIN complaints c ON n.complaint_id = c.id
            WHERE c.incident_id IS NOT NULL AND n.is_current = true
            AND c.created_at > NOW() - INTERVAL '7 days'
        """
        all_active = pd.read_sql(sql_active, conn)

        for _, row in new_df.iterrows():
            my_emb = parse_embedding(row['embedding']).reshape(1, -1)
            my_k = set(row['keywords_jsonb']) if row['keywords_jsonb'] else set()
            my_txt = row['core_request']
            my_dist = row['district_id']
            my_tgt = row['target_object']

            # 하드 필터링 (같은 지역/대상만 후보)
            if all_active.empty: candidates = pd.DataFrame()
            else:
                m_d = (all_active['district_id'] == my_dist) if my_dist else all_active['district_id'].isna()
                m_t = (all_active['target_object'] == my_tgt) if my_tgt else all_active['target_object'].isna()
                candidates = all_active[m_d & m_t].reset_index(drop=True)

            best_id, best_score = None, -1

            if not candidates.empty:
                cand_embs = np.array([parse_embedding(e) for e in candidates['embedding']])
                emb_sims = cosine_similarity(my_emb, cand_embs)[0]
                
                scores = []
                for i, t_k in enumerate(candidates['keywords_jsonb']):
                    t_set = set(t_k) if t_k else set()
                    u_len = len(my_k.union(t_set))
                    jac = len(my_k.intersection(t_set))/u_len if u_len > 0 else 0
                    scores.append((emb_sims[i]*0.6) + (jac*0.4))
                
                if scores:
                    idx = np.argmax(scores)
                    if verify_triple_check(scores[idx], my_k, candidates.iloc[idx]['keywords_jsonb'], my_txt, candidates.iloc[idx]['core_request']):
                        best_id = candidates.iloc[idx]['incident_id']
                        best_score = scores[idx]

            if best_id:
                # 병합
                cursor.execute("UPDATE complaints SET incident_id=%s, incident_linked_at=NOW(), incident_link_score=%s WHERE id=%s", (int(best_id), float(best_score), int(row['id'])))
                cursor.execute("UPDATE incidents SET complaint_count=complaint_count+1 WHERE id=%s", (int(best_id),))
                logging.info(f"  🔗 [병합] #{row['id']} -> 사건 #{best_id}")
            else:
                # 신규 생성 (제목 형식 통일)
                dist_name = row['district_name'] if row['district_name'] else "서울시"
                clean_summ = clean_text_for_title(my_txt)[:30]
                k_str = " ".join(list(my_k)[:2])
                
                if k_str: title = f"{dist_name} {k_str} {clean_summ}..."
                else: title = f"{dist_name} {clean_summ}..."
                
                d_id = int(my_dist) if my_dist and my_dist > 0 else None
                
                cursor.execute("INSERT INTO incidents (title, status, complaint_count, keywords, district_id, opened_at) VALUES (%s, 'OPEN', 1, %s, %s, NOW()) RETURNING id", (title, k_str, d_id))
                new_id = cursor.fetchone()[0]
                
                cursor.execute("UPDATE complaints SET incident_id=%s, incident_linked_at=NOW(), incident_link_score=1.0 WHERE id=%s", (new_id, int(row['id'])))
                
                # 메모리 업데이트
                new_row = {'incident_id': new_id, 'core_request': my_txt, 'embedding': row['embedding'], 'keywords_jsonb': row['keywords_jsonb'], 'district_id': my_dist, 'target_object': my_tgt}
                all_active = pd.concat([all_active, pd.DataFrame([new_row])], ignore_index=True)
                logging.info(f"  🆕 [신규] #{row['id']} -> {title}")

        conn.commit()
    except Exception as e:
        conn.rollback(); logging.error(f"❌ 에러: {e}")
    finally:
        cursor.close(); conn.close()

if __name__ == "__main__":
    logging.info("♻️ [Daily] 실시간 군집화 가동")
    while True: process_new_complaints(); time.sleep(CHECK_INTERVAL)