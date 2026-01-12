import pandas as pd
import psycopg2
import glob
import os
from tqdm import tqdm

# DB 접속 정보
DB_CONFIG = { "host": "localhost", "database": "complaint_db", "user": "postgres", "password": "0000", "port": "5432" }

def get_or_create_dept(cursor, name, category, parent_id=None):
    """
    부서가 있으면 ID를 반환하고, 없으면 새로 만들고 ID를 반환하는 함수 (기본에 충실)
    """
    # 1. 이미 존재하는지 확인
    if parent_id:
        cursor.execute("SELECT id FROM departments WHERE name = %s AND category = %s AND parent_id = %s", (name, category, parent_id))
    else:
        cursor.execute("SELECT id FROM departments WHERE name = %s AND category = %s AND parent_id IS NULL", (name, category))
        
    res = cursor.fetchone()
    if res:
        return res[0] # 이미 있으면 그 ID 반환

    # 2. 없으면 새로 생성 (INSERT)
    try:
        cursor.execute("""
            INSERT INTO departments (name, category, parent_id, is_active) 
            VALUES (%s, %s, %s, true) 
            RETURNING id
        """, (name, category, parent_id))
        return cursor.fetchone()[0]
    except Exception as e:
        print(f"  [!] 생성 오류 ({name}): {e}")
        return None

def build_hierarchy():
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()

    # 우리가 정제한 민원 파일들이 있는 곳 (여기서 부서명을 추출)
    # 파일명 예시: 강남구_cleaned.csv
    file_list = glob.glob("data/step1_output/*.csv") 
    
    # 만약 step1 폴더가 비어있다면 원본 폴더 확인
    if not file_list:
        file_list = glob.glob("crawling/data/*.csv")

    print(f"[*] 총 {len(file_list)}개의 파일에서 조직 정보를 추출합니다.")

    for file_path in file_list:
        # 1. 파일 이름에서 '구(GU)' 이름 추출 (예: 강남구_cleaned.csv -> 강남구)
        filename = os.path.basename(file_path)
        gu_name = filename.split('_')[0] 

        # 이상한 파일은 건너뛰기
        if "구" not in gu_name: 
            continue

        print(f"\n[*] 처리 중: {gu_name}")

        # --- Level 1: 구(GU) 등록 ---
        # 부모가 없으므로 parent_id는 NULL
        gu_id = get_or_create_dept(cursor, gu_name, 'GU', None)
        
        # 파일 읽기
        try:
            df = pd.read_csv(file_path, encoding='utf-8-sig')
        except:
            df = pd.read_csv(file_path, encoding='cp949', errors='ignore')

        # 2. 부서 컬럼(resp_dept)에서 '국'과 '과' 정보 추출
        # 데이터 예시: "안전건설교통국 교통행정과" -> "안전건설교통국"(국) + "교통행정과"(과)
        if 'resp_dept' not in df.columns:
            print(f"  [!] {filename}: resp_dept 컬럼이 없습니다. 건너뜀.")
            continue

        # 중복 제거 후 유니크한 부서명만 가져옴
        unique_depts = df['resp_dept'].dropna().unique()

        for dept_str in tqdm(unique_depts, desc=f"{gu_name} 부서 등록"):
            dept_str = str(dept_str).strip()
            if not dept_str: continue

            parts = dept_str.split() # 띄어쓰기 기준으로 자름

            if len(parts) >= 2:
                # 패턴 A: "국 이름 + 과 이름" (예: 기획경제국 일자리정책과)
                guk_name = parts[0] # 첫 번째 단어 = 국
                gwa_name = " ".join(parts[1:]) # 나머지 단어 = 과 (혹시 띄어쓰기 더 있을까봐)

                # --- Level 2: 국(GUK) 등록 ---
                # 부모는 방금 만든 '구 ID'
                guk_id = get_or_create_dept(cursor, guk_name, 'GUK', gu_id)

                # --- Level 3: 과(GWA) 등록 ---
                # 부모는 방금 만든 '국 ID'
                get_or_create_dept(cursor, gwa_name, 'GWA', guk_id)

            elif len(parts) == 1:
                # 패턴 B: "과 이름"만 있는 경우 (예: 보건소, 청소행정과)
                # 국 정보가 없으므로 '구' 바로 밑에 '과'로 등록
                gwa_name = parts[0]
                get_or_create_dept(cursor, gwa_name, 'GWA', gu_id)

    # 기본값 '정보없음' 등록 (안전장치)
    cursor.execute("INSERT INTO departments (name, category) VALUES ('정보없음', 'NONE') ON CONFLICT DO NOTHING")

    conn.commit()
    conn.close()
    print("\n[+] 조직도 계층화(GU-GUK-GWA) 구축 완료!")

if __name__ == "__main__":
    build_hierarchy()