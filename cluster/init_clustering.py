import psycopg2
import pandas as pd
import numpy as np
import json
import logging
import re
from collections import Counter
from datetime import datetime
from difflib import SequenceMatcher
from sklearn.cluster import DBSCAN
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.metrics import silhouette_score

DB_CONFIG = {
    "host": "0.0.0.0",
    "dbname": "postgres",
    "user": "postgres",
    "password": "0000",
    "port": "5432"
}

logging.basicConfig(level=logging.INFO, format='🚀 %(message)s')

LARGE_CLUSTER_THRESHOLD = 30

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

def calculate_hybrid_distance(embeddings, keywords_list, alpha=0.6):
    n = len(embeddings)
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
            if i == j:
                dist_matrix[i][j] = 0.0
                continue

            sim = SequenceMatcher(None, texts[i], texts[j]).ratio()
            dist = 1.0 - sim
            dist_matrix[i][j] = dist_matrix[j][i] = dist

    return dist_matrix

def main():
    conn = get_db_connection()
    cursor = conn.cursor()

    print(f"🚀 [Start] 3단계 정밀 필터링(Text Deep Check) 군집화 ({datetime.now()})")

    try:
        sql = """
            SELECT n.complaint_id as id, n.core_request, n.embedding,
                   n.keywords_jsonb, n.district_id, n.target_object, d.name as district_name
            FROM complaint_normalizations n
            JOIN complaints c ON n.complaint_id = c.id
            LEFT JOIN districts d ON n.district_id = d.id
            WHERE c.incident_id IS NULL AND n.is_current = true
        """

        df = pd.read_sql(sql, conn)
        if df.empty: return

        df['district_id'] = df['district_id'].fillna(0)
        df['target_object'] = df['target_object'].fillna('기타')
        df['district_name'] = df['district_name'].fillna('서울시')

        grouped = df.groupby(['district_id', 'target_object'])

        total_clusters = 0
        total_noise = 0

        scores = []


        for (dist_id, target), group in grouped:
            if len(group) < 2:
                save_incident(cursor, group, is_noise=True)
                total_noise += 1

                continue

            embeddings = np.array([parse_embedding(e) for e in group['embedding']])
            keywords_list = [k if k else [] for k in group['keywords_jsonb'].tolist()]
            
            l1_dist = calculate_hybrid_distance(embeddings, keywords_list, alpha=0.7)
            l1_labels = DBSCAN(eps=0.2, min_samples=2, metric='precomputed').fit_predict(l1_dist)  

            for l1_lab in set(l1_labels):
                if l1_lab == -1:
                    sub_df = group.iloc[np.where(l1_labels == -1)[0]]
                    save_incident(cursor, sub_df, is_noise=True)
                    total_noise += len(sub_df)
                    continue

                l1_indices = np.where(l1_labels == l1_lab)[0]
                l1_df = group.iloc[l1_indices]
                final_groups_to_save = []
                if len(l1_df) >= LARGE_CLUSTER_THRESHOLD:
                    l2_emb = embeddings[l1_indices]
                    l2_kw = [keywords_list[i] for i in l1_indices]            
                    l2_dist = calculate_hybrid_distance(l2_emb, l2_kw, alpha=0.7)         
                    l2_labels = DBSCAN(eps=0.15, min_samples=2, metric='precomputed').fit_predict(l2_dist)

                    for l2_lab in set(l2_labels):
                        l2_sub_indices = np.where(l2_labels == l2_lab)[0]
                        l2_df = l1_df.iloc[l2_sub_indices]
                        
                        if l2_lab == -1:
                            save_incident(cursor, l2_df, is_noise=True)
                            total_noise += len(l2_df)

                        else:
                            final_groups_to_save.append(l2_df)

                else:
                    final_groups_to_save.append(l1_df)

                for candidate_df in final_groups_to_save:
                    if len(candidate_df) < 2:
                        save_incident(cursor, candidate_df, is_noise=True)

                        continue

                    texts = candidate_df['core_request'].tolist()
                    text_dist_matrix = calculate_text_distance(texts)
                
                    l3_labels = DBSCAN(eps=0.25, min_samples=2, metric='precomputed').fit_predict(text_dist_matrix)

                  
                    try:
                        valid_mask = l3_labels != -1
                        unique_core_labels = set(l3_labels[valid_mask])
                      
                        if len(unique_core_labels) >= 2 and np.sum(valid_mask) >= 2:
                            score = silhouette_score(text_dist_matrix[valid_mask][:, valid_mask], l3_labels[valid_mask], metric='precomputed')
                            scores.append(score)

                    except Exception as e:
                        pass

                    for l3_lab in set(l3_labels):
                        l3_indices = np.where(l3_labels == l3_lab)[0]
                        final_df = candidate_df.iloc[l3_indices]

                      
                        if l3_lab == -1:
                            save_incident(cursor, final_df, is_noise=True)
                            total_noise += len(final_df)

                        else:
                            save_incident(cursor, final_df, is_noise=False)
                            total_clusters += 1

        conn.commit()

        avg_score = sum(scores) / len(scores) if scores else 0
        print("\n" + "="*50)
        print(f"📊 [최종 군집화 성적표 (70:30 비율)]")
        print(f"✅ 생성된 사건(Incidents): {total_clusters}개")
        print(f"🧹 걸러진 단독민원(Noise): {total_noise}개")
        print(f"🎯 평균 정확도(Silhouette Score): {avg_score:.4f}")

        

        if avg_score > 0.5: print("   🌟 [판정] 아주 훌륭합니다! (군집들이 아주 단단하게 뭉쳤음)")

        elif avg_score > 0.3: print("   ✨ [판정] 양호합니다. (다양한 민원이 잘 분류됨)")

        else: print("   ⚠️ [판정] 군집 점수는 낮지만, 이는 1개의 대형 군집으로 완벽히 묶였거나 데이터가 파편화된 경우일 수 있습니다.")

        print("="*50 + "\n")


    except Exception as e:
        conn.rollback()
        print(f"❌ 에러 발생: {e}")

    finally:
        cursor.close()
        conn.close()

def save_incident(cursor, df, is_noise=False):
    if is_noise:
        iterator = df.iterrows()
        count_per_incident = 1
    else:
        iterator = [(None, df)]
        count_per_incident = len(df)

    for _, row_data in iterator:
        if is_noise:
            target_df = pd.DataFrame([row_data])
            row_item = row_data
        else:
            target_df = row_data
            row_item = target_df.iloc[0]

        dist_name = row_item['district_name']
        
        all_k = []
        for k_list in target_df['keywords_jsonb']:
            if k_list: all_k.extend(k_list)
            
        top_k_list = [k for k, v in Counter(all_k).most_common(1)]
        main_keyword = top_k_list[0] if top_k_list else "민원"

        valid_requests = [r for r in target_df['core_request'].tolist() if r]
        if valid_requests:
            raw_summ = max(valid_requests, key=len)
        else:
            raw_summ = "내용 없음"
        
        temp_title = f"{dist_name} {main_keyword} 관련 {raw_summ}"
        final_title = clean_text_for_title(temp_title)
        final_title = final_title[:150].strip()
            
        d_id = int(row_item['district_id']) if row_item['district_id'] > 0 else None
        
        cursor.execute("""
            INSERT INTO incidents (title, status, complaint_count, keywords, district_id, opened_at)
            VALUES (%s, 'OPEN', %s, %s, %s, NOW())
            RETURNING id
        """, (final_title, count_per_incident, main_keyword, d_id))
        inc_id = cursor.fetchone()[0]
      
        ids = tuple(target_df['id'].tolist())
        cursor.execute(f"""
            UPDATE complaints
            SET incident_id = %s, incident_linked_at = NOW(), incident_link_score = 0.95
            WHERE id IN %s
        """, (inc_id, ids))


if __name__ == "__main__":

    main()