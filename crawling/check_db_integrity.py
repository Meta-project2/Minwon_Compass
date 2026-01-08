import psycopg2
from tabulate import tabulate

DB_CONFIG = {
    "host": "localhost", "database": "complaint_db",
    "user": "postgres", "password": "0000", "port": "5432"
}

def check_db_integrity():
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()
    
    print("="*60)
    print("      [데이터 엔지니어 파이프라인 무결성 점검 - 수정본]")
    print("="*60)

    # 1. 행정구역(Districts) 확인
    cursor.execute("SELECT count(*) FROM districts;")
    dist_count = cursor.fetchone()[0]
    print(f"1. 행정구역(Districts): {dist_count}개 구 등록 완료")

    # 2. 부서(Departments) 계층 구조 현황
    # 최신 스키마의 'category' 컬럼 기준 집계
    cursor.execute("""
        SELECT COALESCE(category, '미분류'), count(*) 
        FROM departments 
        GROUP BY category;
    """)
    dept_stats = cursor.fetchall()
    print(f"2. 부서 계층 현황: {dept_stats}")

    # 3. 민원(Complaints) 배정 현황
    cursor.execute("""
        SELECT 
            COUNT(*) as total,
            COUNT(current_department_id) as assigned
        FROM complaints;
    """)
    comp_stats = cursor.fetchone()
    print(f"3. 민원 데이터: 총 {comp_stats[0]}건 (부서 매핑 성공: {comp_stats[1]}건)")

    # 4. 벡터 임베딩(Vector) 차원 검증 (수정됨)
    # pgvector 전용 함수인 vector_dims 사용
    cursor.execute("""
        SELECT 
            COUNT(*) as vec_count,
            vector_dims(embedding) as dimension
        FROM complaint_normalizations
        WHERE embedding IS NOT NULL
        GROUP BY dimension;
    """)
    vec_info = cursor.fetchone()
    if vec_info:
        print(f"4. 벡터 DB: {vec_info[0]}건 저장됨 (차원수: {vec_info[1]})")
        if vec_info[1] == 1024:
            print("   -> [PASS] mxbai 모델 규격(1024)과 일치합니다.")
    else:
        print("4. 벡터 DB: 저장된 벡터 데이터가 없습니다.")

    # 5. 샘플 데이터 확인
    print("\n[5. 데이터 연결성 샘플 (상위 3건)]")
    cursor.execute("""
        SELECT c.id, d.name, de.name, LEFT(c.title, 20) || '...'
        FROM complaints c
        JOIN districts d ON c.district_id = d.id
        LEFT JOIN departments de ON c.current_department_id = de.id
        LIMIT 3;
    """)
    samples = cursor.fetchall()
    print(tabulate(samples, headers=['ID', '구역', '담당부서', '민원제목'], tablefmt='grid'))

    conn.close()

if __name__ == "__main__":
    check_db_integrity()