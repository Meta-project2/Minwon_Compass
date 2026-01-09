import psycopg2

# DB 설정
DB_CONFIG = { "host": "localhost", "database": "complaint_db", "user": "postgres", "password": "0000", "port": "5432" }

def check_clustering_results():
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()

    # 1. 2건 이상 묶인 사건(Incident) 목록 가져오기
    query = """
        SELECT i.id, i.title, COUNT(c.id) as count
        FROM incidents i
        JOIN complaints c ON i.id = c.incident_id
        GROUP BY i.id, i.title
        HAVING COUNT(c.id) >= 2
        ORDER BY count DESC
        LIMIT 10; -- 상위 10개 그룹만 확인
    """
    cursor.execute(query)
    incidents = cursor.fetchall()

    print("\n" + "="*70)
    print(f"{'사건 ID':<8} | {'묶인 건수':<6} | {'사건 대표 명칭 (및 포함된 민원들)'}")
    print("="*70)

    for inc in incidents:
        inc_id, inc_title, count = inc
        print(f"[{inc_id:^7}] | {count:^8}건 | {inc_title}")
        
        # 2. 해당 사건에 묶인 실제 민원 제목들 가져오기
        cursor.execute("SELECT title FROM complaints WHERE incident_id = %s", (inc_id,))
        complaints = cursor.fetchall()
        
        for i, comp in enumerate(complaints):
            print(f"    └─ 민원 {i+1}: {comp[0]}")
        print("-" * 70)

    conn.close()

if __name__ == "__main__":
    check_clustering_results()