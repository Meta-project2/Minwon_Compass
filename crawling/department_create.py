import pandas as pd
import psycopg2
import os

DB_CONFIG = {
    "host": "localhost", "database": "complaint_db",
    "user": "postgres", "password": "0000", "port": "5432"
}

def clean_and_upload_departments():
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()

    # 구 ID 매칭을 위해 DB에서 미리 가져옴
    cursor.execute("SELECT name, id FROM districts")
    dist_map = dict(cursor.fetchall())

    path = "data/jojik_data"
    files = {
        '강남구': 'jojik_gangnam_list.csv',
        '마포구': 'jojik_mapo_list.csv',
        '노원구': 'jojik_nowon_list.csv'
    }

    final_dept_list = []

    for dist_name, file_name in files.items():
        file_path = os.path.join(path, file_name)
        if not os.path.exists(file_path): continue

        try:
            df = pd.read_csv(file_path, encoding='utf-8-sig')
        except:
            df = pd.read_csv(file_path, encoding='cp949')

        # --- 구별 컬럼 매칭 및 정제 ---
        if dist_name == '강남구':
            # 강남구는 '부서명'이 사람 이름인 경우가 있어 '소속' 컬럼을 활용하거나 보정 필요
            # 여기서는 '소속' 혹은 '부서명'에서 '과'로 끝나는 것들 위주로 추출
            depts = df['부서명'].unique().tolist()
        elif dist_name == '마포구':
            depts = df['부서명'].unique().tolist()
        elif dist_name == '노원구':
            depts = df['대분류(국/과)'].unique().tolist()

        # --- 데이터 표준화 (구 이름 붙이기) ---
        for d in depts:
            if pd.isna(d) or d == '': continue
            # 이름이 너무 짧거나(사람이름 방지) 특정 패턴 제외 로직 추가 가능
            full_name = f"{dist_name} {d.strip()}"
            dept_code = f"DEPT_{dist_name}_{d.strip()}"
            final_dept_list.append((full_name, dept_code))

    # 중복 제거
    final_dept_list = list(set(final_dept_list))

    print(f"[*] 총 {len(final_dept_list)}개의 부서를 DB에 등록합니다.")

    # DB 삽입
    for name, code in final_dept_list:
        cursor.execute("""
            INSERT INTO departments (name, code, is_active) 
            VALUES (%s, %s, true) 
            ON CONFLICT (code) DO NOTHING
        """, (name, code))

    conn.commit()
    conn.close()
    print("[+] departments 테이블 채우기 완료!")

if __name__ == "__main__":
    clean_and_upload_departments()