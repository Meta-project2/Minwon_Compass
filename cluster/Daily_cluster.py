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
    "host": "db",
    "dbname": "postgres",
    "user": "postgres",
    "password": "0000",
    "port": "5432"
}

# [설정] 실행 주기 및 임계값
CHECK_INTERVAL = 30         # 실행 주기 (초)
HYBRID_THRESHOLD = 0.65     # 하이브리드 검색 합격 점수 (0~1 사이, 높을수록 엄격)

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
# 2. 거리 계산 로직 (신규 군집 생성용)
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

# ==========================================
# 3. 핵심 로직: 하이브리드 검색 병합 (팀원 코드 적용)
# ==========================================

def try_merge_to_existing_incidents_hybrid(conn, new_df):
    """
    팀원분의 SQL 아이디어를 적용한 하이브리드 검색 함수.
    Python 반복문 대신 DB 쿼리로 최적의 사건을 찾습니다.
    """
    cursor = conn.cursor()
    merged_ids = []
    
    logging.info(f"🔍 [하이브리드 검색] 신규 민원 {len(new_df)}건을 DB 엔진으로 정밀 대조합니다.")

    # ------------------------------------------------------------------
    # [SQL 설명] 
    # 1. v_score: pgvector의 코사인 거리 (1 - 거리 = 유사도)
    # 2. k_score: JSONB 키워드가 얼마나 겹치는지 확인 (교집합 개수)
    # 3. bonus: 지역구가 같으면 가산점 (+0.2)
    # ------------------------------------------------------------------
    hybrid_search_sql = """
    WITH existing_incidents AS (
        SELECT 
            i.id AS incident_id,
            i.title,
            n.embedding,
            n.keywords_jsonb,
            n.district_id
        FROM incidents i
        JOIN complaints c ON c.incident_id = i.id
        JOIN complaint_normalizations n ON n.complaint_id = c.id
        WHERE i.status = 'OPEN' 
          AND i.opened_at > NOW() - INTERVAL '5 years'
          AND n.embedding IS NOT NULL
    ),
    scores AS (
        SELECT 
            incident_id,
            title,
            -- [1] 벡터 유사도 (비중 0.6)
            (1 - (embedding <=> %s::vector)) AS v_score,
            
            -- [2] 키워드 유사도 (비중 0.2)
            (SELECT COUNT(*) 
             FROM jsonb_array_elements_text(keywords_jsonb) k 
             WHERE k = ANY(%s::text[])) * 0.1 AS k_score,
             
            -- [3] 보너스 (비중 0.2)
            CASE WHEN district_id = %s THEN 0.2 ELSE 0 END AS bonus
        FROM existing_incidents
    )
    SELECT 
        incident_id, 
        title, 
        (v_score * 0.6 + k_score + bonus) AS final_score,
        v_score, k_score, bonus
    FROM scores
    WHERE (v_score * 0.6 + k_score + bonus) > %s
    ORDER BY final_score DESC
    LIMIT 1;
    """

    for idx, row in new_df.iterrows():
        # 파라미터 준비
        # 1. 벡터: 리스트를 문자열로 변환 (PostgreSQL vector 형식)
        emb_val = row['embedding']
        if isinstance(emb_val, str): emb_val = json.loads(emb_val)
        emb_str = str(emb_val).replace(' ', '') # 공백 제거 등 포맷팅
        
        # 2. 키워드: 리스트 (PostgreSQL 배열로 변환)
        my_keywords = row['keywords_jsonb'] if row['keywords_jsonb'] else []
        
        # 3. 지역구 ID
        my_dist_id = int(row['district_id']) if row['district_id'] > 0 else 0

        # 로그용 ID
        my_id = row['id']

        try:
            # SQL 실행 (Threshold 값 전달)
            cursor.execute(hybrid_search_sql, (emb_str, my_keywords, my_dist_id, HYBRID_THRESHOLD))
            result = cursor.fetchone()

            if result:
                best_inc_id, best_title, final_score, v, k, b = result
                
                print(f"   👉 [매칭 성공] 사건 #{best_inc_id} ('{best_title[:15]}...')")
                print(f"      - 최종 점수: {final_score:.4f} (기준: {HYBRID_THRESHOLD})")
                print(f"      - 상세: 벡터({v:.2f}) + 키워드({k:.2f}) + 보너스({b:.2f})")

                # DB 업데이트 (병합)
                cursor.execute("""
                    UPDATE complaints 
                    SET incident_id = %s, incident_linked_at = NOW(), incident_link_score = %s 
                    WHERE id = %s
                """, (best_inc_id, float(final_score), int(my_id)))
                
                # 사건 상태 갱신 (OPEN 유지/전환)
                cursor.execute("""
                    UPDATE incidents 
                    SET complaint_count = complaint_count + 1, status = 'OPEN' 
                    WHERE id = %s
                """, (best_inc_id,))
                
                logging.info(f"   🎉 [병합 완료] 민원 #{my_id} -> 사건 #{best_inc_id}")
                merged_ids.append(my_id)

        except Exception as e:
            # 벡터 형식이 잘못되었거나 pgvector가 없으면 에러 발생 가능
            logging.error(f"   ❌ SQL 실행 에러: {e}")
            conn.rollback() 
        
        time.sleep(0.1)

    conn.commit()
    cursor.close()
    
    # 병합되지 않은 나머지 데이터프레임 반환
    return new_df[~new_df['id'].isin(merged_ids)]

# ==========================================
# 4. 신규 군집 생성 (남은 것들끼리 뭉치기)
# ==========================================

def cluster_remaining_complaints(conn, df):
    if df.empty: return

    logging.info(f"🧩 [신규 군집화] 남은 민원 {len(df)}건 처리 중...")
    cursor = conn.cursor()
    
    df['district_id'] = df['district_id'].fillna(0)
    grouped = df.groupby('district_id')

    for dist_id, group in grouped:
        if len(group) < 2:
            # 단독 민원 (Noise)
            save_incident(cursor, group, is_noise=True)
            continue

        embeddings = np.array([parse_embedding(e) for e in group['embedding']])
        keywords_list = [k if k else [] for k in group['keywords_jsonb'].tolist()]
        
        # 여기서는 여전히 DBSCAN 사용 (우리끼리 뭉칠 때는 이게 최고)
        l1_dist = calculate_hybrid_distance(embeddings, keywords_list, alpha=0.6)
        l1_labels = DBSCAN(eps=0.2, min_samples=2, metric='precomputed').fit_predict(l1_dist)

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
            if is_noise:
                # 노이즈는 저장 안 함 (필요 시 주석 해제)
                pass
            else:
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
                
                logging.info(f"   🆕 [새 사건 생성] #{inc_id} : {title} ({count}건)")
        except Exception as e:
            logging.error(f"   ❌ 사건 저장 실패: {e}")

# ==========================================
# 5. 상태 동기화
# ==========================================

def sync_incident_status(conn):
    cursor = conn.cursor()
    try:
        # OPEN -> CLOSED (모든 민원이 종료되면)
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
            logging.info(f"   🏁 [상태 동기화] {cursor.rowcount}개 사건 자동 종결")

        conn.commit()
    except Exception as e:
        logging.error(f"상태 동기화 에러: {e}")
        conn.rollback()
    finally:
        cursor.close()

# ==========================================
# 6. 메인 실행 루프
# ==========================================

def run_daily_job():
    with engine.begin() as conn:
        try:
            # 1. 신규 민원 조회 (아직 사건 번호 없는 것)
            sql = """
                SELECT n.complaint_id as id, n.core_request, n.embedding,
                    n.keywords_jsonb, n.district_id, n.target_object, 
                    d.name as district_name
                FROM complaint_normalizations n
                JOIN complaints c ON n.complaint_id = c.id
                LEFT JOIN districts d ON n.district_id = d.id
                WHERE c.incident_id IS NULL 
                LIMIT 100        
            """
            new_df = pd.read_sql(sql, conn)
            new_df['district_id'] = new_df['district_id'].fillna(0)

            if not new_df.empty:
                logging.info(f"🚀 신규 민원 {len(new_df)}건 감지 및 처리 시작")
                
                # psycopg2 전용 로직이 필요하다면 raw connection 활용
                raw_conn = conn.connection
                
                # [Step 1] 하이브리드 병합
                remaining_df = try_merge_to_existing_incidents_hybrid(raw_conn, new_df)
                
                # [Step 2] 신규 군집화
                if not remaining_df.empty:
                    cluster_remaining_complaints(raw_conn, remaining_df)
                
                logging.info("✅ 주기적 군집화 작업 완료")
            
            # 상태 동기화
            sync_incident_status(raw_conn)

        except Exception as e:
            logging.error(f"❌ 작업 중 에러 발생: {e}")

def wait_interval(duration):
    # logging.debug(f"{duration}초 대기 중...") # 굳이 안 남겨도 됨
    time.sleep(duration)

if __name__ == "__main__":
    logging.info("🤖 [Hybrid Cluster] 서버 서비스 시작")
    logging.info(f"   - 하이브리드 점수 기준: {HYBRID_THRESHOLD}점")
    print("="*60 + "\n")

    while True:
        run_daily_job()
        wait_interval(CHECK_INTERVAL)