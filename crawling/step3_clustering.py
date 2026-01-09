import psycopg2
import numpy as np
from sklearn.cluster import AgglomerativeClustering
import ast
from tqdm import tqdm

# ==========================================
# 1. 설정 및 노이즈 제거 리스트
# ==========================================
DB_CONFIG = { "host": "localhost", "database": "complaint_db", "user": "postgres", "password": "0000", "port": "5432" }

# 유사도 문턱값 (0.08 = 매우 엄격함, 정확도 향상)
SIMILARITY_THRESHOLD = 0.08 

def run_precision_clustering():
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()

    # 기존 잘못 묶인 정보 초기화 (선택 사항)
    print("[*] 기존 클러스터링 데이터를 초기화합니다...")
    cursor.execute("UPDATE complaints SET incident_id = NULL, incident_linked_at = NULL")
    cursor.execute("TRUNCATE TABLE incidents CASCADE")
    conn.commit()

    # 1. 데이터 로딩 (구별로 나누어 처리하여 지역 혼선을 방지합니다) 
    cursor.execute("SELECT id, name FROM districts")
    districts = cursor.fetchall()

    for d_id, d_name in districts:
        print(f"\n[*] '{d_name}' 지역 민원 분석 중...")
        
        query = """
            SELECT c.id, c.title, cn.embedding 
            FROM complaints c
            JOIN complaint_normalizations cn ON c.id = cn.complaint_id
            WHERE c.district_id = %s
        """
        cursor.execute(query, (d_id,))
        rows = cursor.fetchall()

        if len(rows) < 2:
            continue

        ids, titles, embeddings = [], [], []
        for row in rows:
            c_id, title, emb_str = row
            emb = ast.literal_eval(emb_str) if isinstance(emb_str, str) else emb_str
            ids.append(c_id)
            titles.append(title)
            embeddings.append(emb)

        # 2. 고정밀 군집화 실행
        X = np.array(embeddings)
        cluster_model = AgglomerativeClustering(
            n_clusters=None, 
            metric='cosine', 
            linkage='average', 
            distance_threshold=SIMILARITY_THRESHOLD
        )
        
        labels = cluster_model.fit_predict(X)
        unique_labels = set(labels)

        # 3. 결과 저장
        for label in unique_labels:
            indices = [i for i, x in enumerate(labels) if x == label]
            if len(indices) < 2: continue  # 2건 이상만 사건으로 등록 

            # 사건 제목 생성 (가장 짧은 제목을 대표 제목으로 사용)
            group_titles = [titles[i] for i in indices]
            rep_title = min(group_titles, key=len)
            incident_title = f"[집중민원] {rep_title} 관련"

            cursor.execute("""
                INSERT INTO incidents (title, district_id, status, opened_at)
                VALUES (%s, %s, 'OPEN', NOW())
                RETURNING id
            """, (incident_title, d_id))
            
            new_incident_id = cursor.fetchone()[0]
            target_ids = [ids[i] for i in indices]
            
            cursor.execute(f"UPDATE complaints SET incident_id = %s, incident_linked_at = NOW() WHERE id IN ({','.join(map(str, target_ids))})", (new_incident_id,))

        conn.commit()
        print(f"[*] '{d_name}' 완료: {len(unique_labels)}개 그룹 생성")

    conn.close()
    print("\n[ALL DONE] 정확도 중심의 클러스터링이 완료되었습니다.")

if __name__ == "__main__":
    run_precision_clustering()