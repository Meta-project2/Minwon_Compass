import psycopg2
import pandas as pd
import numpy as np
import json
import time
import logging
import re
import sys
import warnings
from datetime import datetime
from collections import Counter
from difflib import SequenceMatcher
from sklearn.cluster import DBSCAN
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy import create_engine

# 경고 메시지 숨기기
warnings.filterwarnings("ignore")

# ==========================================
# 1. 설정
# ==========================================

DB_CONFIG = {
    "host": "localhost",
    "dbname": "postgres",
    "user": "postgres",
    "password": "0000",
    "port": "5432"
}

CHECK_INTERVAL = 10  # 실행 주기 (초)

# 로깅 설정
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s | %(message)s', 
    datefmt='%H:%M:%S'
)

# SQLAlchemy 엔진
db_url = f"postgresql+psycopg2://{DB_CONFIG['user']}:{DB_CONFIG['password']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['dbname']}"
engine = create_engine(db_url)

def get_db_connection():
    return psycopg2.connect(**DB_CONFIG)

def parse_embedding(emb_str):
    try:
        if isinstance(emb_str, str): return np.array(json.loads(emb_str))
        elif isinstance(emb_str, list): return np.array(emb_str)
        return np.zeros(1024)
    except: return np.zeros(1024)

def clean_text_for_title(text):
    text = re.sub(r'[^\w\s가-힣]', ' ', text)
    return ' '.join(text.split())

# ==========================================
# 2. 거리 계산 로직
# ==========================================

def calculate_hybrid_distance(embeddings, keywords_list, alpha=0.6):
    n = len(embeddings)
    if n == 0: return np.zeros((0, 0))
    
    emb_sim = cosine_similarity(embeddings)
    key_sim = np.zeros((n, n))
    keyword_sets = [set(k) if k else set() for k in keywords_list]

    for i in range(n):
        for j in range(i, n):
            if i == j: key_sim[i][j] = 1.0; continue
            u_len = len(keyword_sets[i].union(keyword_sets[j]))
            sim = len(keyword_sets[i].intersection(keyword_sets[j])) / u_len if u_len > 0 else 0.0
            key_sim[i][j] = key_sim[j][i] = sim
            
    dist = 1 - ((emb_sim * alpha) + (key_sim * (1 - alpha)))
    dist[dist < 0] = 0
    return dist

def calculate_text_distance(texts):
    n = len(texts)
    dist_matrix = np.zeros((n, n))
    for i in range(n):
        for j in range(i, n):
            if i == j: dist_matrix[i][j] = 0.0; continue
            sim = SequenceMatcher(None, texts[i], texts[j]).ratio()
            dist_matrix[i][j] = dist_matrix[j][i] = 1.0 - sim
    return dist_matrix

# ==========================================
# 3. 핵심 로직: 병합 & 신규 생성
# ==========================================

def try_merge_to_existing_incidents(conn, new_df):
    """기존 사건과 유사하면 병합 (CLOSED된 사건이라도 유사하면 병합 후 OPEN으로 부활 가능)"""
    cursor = conn.cursor()
    merged_ids = []
    
    # 최근 30일 이내의 활성 사건 조회
    sql_active = """
        SELECT i.id as incident_id, i.district_id,
               n.embedding, n.keywords_jsonb
        FROM incidents i
        JOIN complaints c ON c.incident_id = i.id
        JOIN complaint_normalizations n ON n.complaint_id = c.id
        WHERE i.opened_at > NOW() - INTERVAL '30 days'
        -- 종결된 사건(CLOSED)도 병합 대상에 포함할지 여부는 정책에 따름.
        -- 여기서는 '유사하면 병합'을 우선하여 CLOSED도 포함해서 검색 후, 병합 시 상태를 OPEN으로 바꿈
        ORDER BY i.id, c.created_at ASC
    """
    
    try:
        full_active_df = pd.read_sql(sql_active, engine)
    except Exception as e:
        logging.error(f"기존 사건 조회 중 에러: {e}")
        return new_df

    if full_active_df.empty:
        return new_df

    active_incidents = full_active_df.drop_duplicates(subset=['incident_id']).reset_index(drop=True)
    logging.info(f"🔍 [비교] 기존 사건 {len(active_incidents)}개와 유사도 분석 중...")

    for idx, row in new_df.iterrows():
        my_emb = parse_embedding(row['embedding']).reshape(1, -1)
        my_k = set(row['keywords_jsonb']) if row['keywords_jsonb'] else set()
        my_dist_id = row['district_id']

        candidates = active_incidents[active_incidents['district_id'] == my_dist_id]
        if candidates.empty: continue

        cand_embs = np.array([parse_embedding(e) for e in candidates['embedding']])
        if len(cand_embs) == 0: continue

        sim_scores = cosine_similarity(my_emb, cand_embs)[0]
        
        best_score = -1
        best_inc_id = None

        for i, score in enumerate(sim_scores):
            if score < 0.85: continue
            
            cand_k = set(candidates.iloc[i]['keywords_jsonb']) if candidates.iloc[i]['keywords_jsonb'] else set()
            if len(my_k.intersection(cand_k)) == 0: continue 

            if score > best_score:
                best_score = score
                best_inc_id = candidates.iloc[i]['incident_id']

        if best_inc_id and best_score >= 0.85:
            try:
                # 1. 민원 업데이트
                cursor.execute("""
                    UPDATE complaints 
                    SET incident_id = %s, incident_linked_at = NOW(), incident_link_score = %s 
                    WHERE id = %s
                """, (int(best_inc_id), float(best_score), int(row['id'])))
                
                # 2. 사건 업데이트 (민원 수 증가)
                # [중요] 신규 민원이 추가되면, 혹시 종결(CLOSED)되었던 사건도 다시 대응중(OPEN)으로 바뀌어야 함
                cursor.execute("""
                    UPDATE incidents 
                    SET complaint_count = complaint_count + 1,
                        status = 'OPEN' 
                    WHERE id = %s
                """, (int(best_inc_id),))
                
                logging.info(f"  🔗 [병합 성공] 민원 #{row['id']} -> 사건 #{best_inc_id} (점수: {best_score:.2f})")
                merged_ids.append(row['id'])
            except Exception as e:
                logging.error(f"  ❌ 병합 실패: {e}")

    conn.commit()
    cursor.close()
    
    return new_df[~new_df['id'].isin(merged_ids)]

def cluster_remaining_complaints(conn, df):
    if df.empty: return

    logging.info(f"🧩 [신규 군집화] 남은 민원 {len(df)}건 처리 중...")
    cursor = conn.cursor()
    
    df['district_id'] = df['district_id'].fillna(0)
    grouped = df.groupby('district_id')

    for dist_id, group in grouped:
        if len(group) == 0: continue
        
        if len(group) == 1:
            save_incident(cursor, group, is_noise=True)
            continue

        embeddings = np.array([parse_embedding(e) for e in group['embedding']])
        keywords_list = [k if k else [] for k in group['keywords_jsonb'].tolist()]
        
        l1_dist = calculate_hybrid_distance(embeddings, keywords_list, alpha=0.6)
        l1_labels = DBSCAN(eps=0.15, min_samples=2, metric='precomputed').fit_predict(l1_dist)

        for l1_lab in set(l1_labels):
            l1_indices = np.where(l1_labels == l1_lab)[0]
            l1_df = group.iloc[l1_indices]

            if l1_lab == -1: 
                save_incident(cursor, l1_df, is_noise=True)
            else:
                save_incident(cursor, l1_df, is_noise=False)

    conn.commit()
    cursor.close()

def save_incident(cursor, df, is_noise=False):
    if df.empty: return

    iterator = df.iterrows() if is_noise else [(None, df)]
    
    for _, row_data in iterator:
        if is_noise:
            target_df = pd.DataFrame([row_data])
            row_item = row_data
            count = 1
        else:
            target_df = row_data
            row_item = target_df.iloc[0]
            count = len(target_df)

        dist_name = row_item['district_name'] if row_item['district_name'] else "서울시"
        
        all_k = []
        for k_list in target_df['keywords_jsonb']:
            if k_list: all_k.extend(k_list)
        top_k = Counter(all_k).most_common(5)
        
        main_keyword = top_k[0][0] if top_k else "민원"
        keywords_str = ", ".join([k[0] for k in top_k]) 
        
        valid_reqs = [r for r in target_df['core_request'].tolist() if r]
        raw_summ = max(valid_reqs, key=len) if valid_reqs else "내용 없음"
        
        title = f"{dist_name} {main_keyword} 관련 {raw_summ}"
        title = clean_text_for_title(title)[:100].strip()

        d_id = int(row_item['district_id']) if row_item['district_id'] > 0 else None
        
        try:
            # [변경] 초기 상태는 무조건 'OPEN' (대응중)
            cursor.execute("""
                INSERT INTO incidents (title, status, complaint_count, keywords, district_id, opened_at)
                VALUES (%s, 'OPEN', %s, %s, %s, NOW())
                RETURNING id
            """, (title, count, keywords_str, d_id))
            inc_id = cursor.fetchone()[0]

            ids = tuple(target_df['id'].tolist())
            cursor.execute(f"""
                UPDATE complaints 
                SET incident_id = %s, incident_linked_at = NOW(), incident_link_score = 0.95 
                WHERE id IN %s
            """, (inc_id, ids))
            
            logging.info(f"  🆕 [사건 생성] #{inc_id} : {title} ({count}건)")
        except Exception as e:
            logging.error(f"  ❌ 사건 저장 실패: {e}")

# ==========================================
# 5. [수정됨] 상태 동기화 함수 (2단계 로직)
# ==========================================
def sync_incident_status(conn):
    """
    민원 상태에 따른 사건 상태 동기화 (단순화된 로직)
    
    1. CLOSED (종결): 모든 민원이 'CLOSED' 또는 'CANCELED'인 경우
    2. OPEN (대응중): 하나라도 끝나지 않은 민원('RECEIVED', 'IN_PROGRESS' 등)이 있는 경우
    """
    cursor = conn.cursor()
    try:
        # 1. [종결 처리] (OPEN -> CLOSED)
        # 조건: 현재 OPEN인데, 소속된 모든 민원이 (CLOSED or CANCELED) 상태일 때
        cursor.execute("""
            UPDATE incidents i
            SET status = 'CLOSED', closed_at = NOW()
            WHERE i.status = 'OPEN'
            AND NOT EXISTS (
                SELECT 1 FROM complaints c 
                WHERE c.incident_id = i.id 
                AND c.status NOT IN ('CLOSED', 'CANCELED')
            )
            AND EXISTS (SELECT 1 FROM complaints c WHERE c.incident_id = i.id)
        """)
        if cursor.rowcount > 0:
            logging.info(f"  🏁 [상태 동기화] {cursor.rowcount}개 사건 -> '종결(CLOSED)'로 변경")

        # 2. [대응중 복구] (CLOSED -> OPEN)
        # 조건: 현재 CLOSED인데, 끝나지 않은 민원이 하나라도 생겼을 때 (재접수, 신규병합 등)
        cursor.execute("""
            UPDATE incidents i
            SET status = 'OPEN', closed_at = NULL
            WHERE i.status = 'CLOSED'
            AND EXISTS (
                SELECT 1 FROM complaints c 
                WHERE c.incident_id = i.id 
                AND c.status NOT IN ('CLOSED', 'CANCELED')
            )
        """)
        if cursor.rowcount > 0:
            logging.info(f"  🔄 [상태 동기화] {cursor.rowcount}개 사건 -> '대응중(OPEN)'으로 복구")

        conn.commit()
    except Exception as e:
        logging.error(f"상태 동기화 중 에러: {e}")
        conn.rollback()
    finally:
        cursor.close()

# ==========================================
# 6. 실행 루프
# ==========================================

def run_daily_job():
    conn = get_db_connection()
    try:
        sql = """
            SELECT n.complaint_id as id, n.core_request, n.embedding,
                   n.keywords_jsonb, n.district_id, n.target_object, 
                   d.name as district_name
            FROM complaint_normalizations n
            JOIN complaints c ON n.complaint_id = c.id
            LEFT JOIN districts d ON n.district_id = d.id
            WHERE c.incident_id IS NULL 
        """
        
        try:
            new_df = pd.read_sql(sql, engine)
        except Exception as e:
            logging.error(f"데이터 조회 실패: {e}")
            return

        if not new_df.empty:
            logging.info(f"⚡ 신규 민원 {len(new_df)}건 감지! 분석 시작...")
            
            remaining_df = try_merge_to_existing_incidents(conn, new_df)
            
            if not remaining_df.empty:
                cluster_remaining_complaints(conn, remaining_df)
                
            logging.info("✅ 분석 및 처리 완료.")
        
        # 데이터 유무와 상관없이 항상 상태 동기화 수행
        sync_incident_status(conn)

    except Exception as e:
        conn.rollback()
        logging.error(f"❌ 전체 로직 에러: {e}")
    finally:
        conn.close()

def print_progress_bar(duration):
    width = 30
    for i in range(duration):
        time.sleep(1)
        progress = int((i + 1) / duration * width)
        bar = '█' * progress + '-' * (width - progress)
        sys.stdout.write(f"\r⏳ 대기 중... [{bar}] {duration - i - 1}초 ")
        sys.stdout.flush()
    sys.stdout.write("\r" + " " * 80 + "\r") 

if __name__ == "__main__":
    print("\n" + "="*50)
    print("🤖 [Daily Cluster] 실시간 민원 군집화 가동")
    print("   - 모드: 2단계 상태 관리 (OPEN / CLOSED)")
    print(f"   - 주기: {CHECK_INTERVAL}초")
    print("="*50 + "\n")

    while True:
        run_daily_job()
        print_progress_bar(CHECK_INTERVAL)