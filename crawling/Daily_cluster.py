import psycopg2
import pandas as pd
import numpy as np
import json
import ast
import time
from datetime import datetime
from sklearn.cluster import DBSCAN
from sklearn.metrics.pairwise import cosine_distances
from collections import Counter

# DB 설정
DB_CONFIG = { "host": "localhost", "dbname": "complaint_db", "user": "postgres", "password": "0000", "port": "5432" }

# ---------------- (기존 함수들: 파싱, 거리계산 등은 동일하게 유지) ----------------
# 코드가 너무 길어지니 함수 정의 부분은 기존 daily_clustering.py와 똑같이 복사해서 쓰시면 됩니다.
# 여기서는 핵심인 run_daily_clustering 함수와 스케줄러 부분만 보여드립니다.

def parse_vector(val):
    if isinstance(val, str):
        try: return np.array(json.loads(val))
        except: return np.zeros(1024)
    return np.array(val) if val is not None else np.zeros(1024)

def parse_keywords(val):
    if not val: return set()
    raw_set = set()
    if isinstance(val, str):
        try: raw_set = set(json.loads(val))
        except: 
            try: raw_set = set(ast.literal_eval(val))
            except: raw_set = set()
    else: raw_set = set(val)
    return {word for word in raw_set if len(word) > 1}

def get_representative_keyword(keywords_list):
    all_kws = [kw for sub in keywords_list for kw in sub]
    if not all_kws: return "민원"
    top_kw = Counter(all_kws).most_common(1)[0][0]
    clean_kw = str(top_kw).replace('[','').replace(']','').replace("'","").replace('"','').strip()
    return clean_kw

def calculate_hybrid_distance(vec1, vec2, kws1, kws2):
    sem_dist = cosine_distances([vec1], [vec2])[0][0]
    if not kws1 and not kws2: key_dist = 0.5
    elif not kws1 or not kws2: key_dist = 1.0
    else:
        inter = len(kws1.intersection(kws2))
        union = len(kws1.union(kws2))
        key_dist = 1.0 - (inter / union if union else 0)
    return (sem_dist * 0.7) + (key_dist * 0.3)

def calculate_jaccard_matrix(keywords_list):
    n = len(keywords_list)
    dist_matrix = np.ones((n, n))
    for i in range(n):
        for j in range(i, n):
            set1 = keywords_list[i]
            set2 = keywords_list[j]
            if not set1 and not set2: dist = 0.5
            elif not set1 or not set2: dist = 1.0 
            else:
                inter = len(set1.intersection(set2))
                union = len(set1.union(set2))
                dist = 1.0 - (inter / union if union else 0)
            dist_matrix[i, j] = dist
            dist_matrix[j, i] = dist
    return dist_matrix

def generate_title(group):
    return group.sort_values("received_at").iloc[0]["core_request"].replace('\n',' ').strip()

# ---------------- [핵심] 30초마다 돌아가는 함수 ----------------
def run_monitoring_loop():
    print(f"👀 [System] 실시간 민원 감시 모드 시작 (30초 간격)")
    
    while True:
        try:
            conn = psycopg2.connect(**DB_CONFIG)
            cur = conn.cursor()
            
            # 1. 신규 민원 있나 확인 (가볍게 체크)
            sql_check = """
                SELECT COUNT(*) 
                FROM complaints c
                JOIN complaint_normalizations n ON c.id = n.complaint_id
                WHERE c.incident_id IS NULL AND n.embedding IS NOT NULL
            """
            cur.execute(sql_check)
            new_count = cur.fetchone()[0]
            
            if new_count > 0:
                print(f"\n🚨 [감지] 신규 민원 {new_count}건 발견! 분류를 시작합니다. ({datetime.now().strftime('%H:%M:%S')})")
                
                # ================= (여기서부터 기존 로직 수행) =================
                
                # A. 기준(Anchor) 로드
                sql_active = """
                    SELECT c.incident_id, n.embedding, n.keywords_jsonb
                    FROM complaints c
                    JOIN complaint_normalizations n ON c.id = n.complaint_id
                    WHERE c.incident_id IS NOT NULL AND c.status != 'CLOSED' 
                """
                active_df = pd.read_sql(sql_active, conn)
                active_df['vec'] = active_df['embedding'].apply(parse_vector)
                active_df['kws'] = active_df['keywords_jsonb'].apply(parse_keywords)
                
                incident_centroids = {}
                if not active_df.empty:
                    for iid, group in active_df.groupby('incident_id'):
                        mean_vec = np.mean(np.stack(group['vec'].values), axis=0)
                        all_kws = set().union(*group['kws'].tolist())
                        incident_centroids[iid] = {'vec': mean_vec, 'kws': all_kws, 'count': len(group)}
                
                # B. 신규 민원 데이터 가져오기
                sql_new = """
                    SELECT c.id, c.received_at, n.embedding, n.keywords_jsonb, n.core_request
                    FROM complaints c
                    JOIN complaint_normalizations n ON c.id = n.complaint_id
                    WHERE c.incident_id IS NULL AND n.embedding IS NOT NULL
                """
                new_df = pd.read_sql(sql_new, conn)
                new_df['vec'] = new_df['embedding'].apply(parse_vector)
                new_df['kws'] = new_df['keywords_jsonb'].apply(parse_keywords)
                
                # C. 순차적 매칭 (10개가 들어왔으면 10번 반복)
                assigned_count = 0
                unassigned_indices = []
                MATCH_THRESHOLD = 0.1 

                for idx, row in new_df.iterrows():
                    best_match = None
                    min_dist = 1.0
                    
                    for iid, info in incident_centroids.items():
                        dist = calculate_hybrid_distance(row['vec'], info['vec'], row['kws'], info['kws'])
                        if dist < min_dist:
                            min_dist = dist
                            best_match = iid
                    
                    if best_match and min_dist <= MATCH_THRESHOLD:
                        # 병합
                        cur.execute("UPDATE complaints SET incident_id = %s WHERE id = %s", (best_match, row['id']))
                        cur.execute("UPDATE incidents SET complaint_count = complaint_count + 1 WHERE id = %s", (best_match,))
                        
                        # 메모리 상의 중심점도 업데이트 (다음 루프를 위해)
                        curr_cnt = incident_centroids[best_match]['count']
                        if curr_cnt < 10:
                            new_n = curr_cnt + 1
                            new_vec = (incident_centroids[best_match]['vec'] * curr_cnt + row['vec']) / new_n
                            incident_centroids[best_match]['vec'] = new_vec
                            incident_centroids[best_match]['count'] = new_n
                            incident_centroids[best_match]['kws'].update(row['kws']) # 키워드도 실시간 업데이트
                        
                        assigned_count += 1
                    else:
                        # 매칭 실패 -> 신규 생성 후보
                        unassigned_indices.append(idx)
                        
                conn.commit()

                # D. 신규 사건 생성 (매칭 안 된 애들끼리)
                new_inc_count = 0
                remaining_df = new_df.loc[unassigned_indices].copy()
                
                if not remaining_df.empty:
                    vecs = np.stack(remaining_df['vec'].values)
                    sem_dist = cosine_distances(vecs)
                    key_dist = calculate_jaccard_matrix(remaining_df['kws'].tolist())
                    final_dist = (sem_dist * 0.7) + (key_dist * 0.3)
                    
                    dbscan = DBSCAN(eps=0.1, min_samples=1, metric='precomputed')
                    labels = dbscan.fit_predict(final_dist)
                    
                    remaining_df['label'] = labels
                    for label in set(labels):
                        if label == -1: continue
                        cls = remaining_df[remaining_df['label'] == label]
                        
                        title = generate_title(cls)
                        rep_kw = get_representative_keyword(cls['kws'].tolist())
                        kw_json = json.dumps([rep_kw], ensure_ascii=False)
                        
                        cur.execute("""
                            INSERT INTO incidents (title, status, complaint_count, opened_at, closed_at, keywords)
                            VALUES (%s, 'OPEN', %s, %s, %s, %s) RETURNING id
                        """, (title, len(cls), cls['received_at'].min(), cls['received_at'].max(), kw_json))
                        
                        new_id = cur.fetchone()[0]
                        cur.execute(f"UPDATE complaints SET incident_id = %s WHERE id IN %s", (new_id, tuple(cls['id'].tolist())))
                        new_inc_count += 1
                        
                    conn.commit()

                print(f"✅ 처리 완료: 병합 {assigned_count}건 / 신규 사건 {new_inc_count}개")
                print(f"💤 잠시 대기... (30초)")

            else:
                # 신규 민원 없으면 조용히 대기 (로그 지저분해지지 않게 print 생략 가능)
                # print(".", end="", flush=True) 
                pass

            cur.close()
            conn.close()

        except Exception as e:
            print(f"❌ 오류 발생: {e}")
            # 에러 나도 죽지 말고 잠깐 쉬었다가 다시 시도
            time.sleep(5)
        
        # 30초 휴식 (Polling Interval)
        time.sleep(15)

if __name__ == "__main__":
    run_monitoring_loop()