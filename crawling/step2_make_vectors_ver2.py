import pandas as pd
import psycopg2
from sentence_transformers import SentenceTransformer
import glob
import os
import random
from tqdm import tqdm
import re

# ==========================================
# 1. 설정 (이제 구 이름을 수동으로 적을 필요 없습니다!)
# ==========================================
DB_CONFIG = { "host": "localhost", "database": "complaint_db", "user": "postgres", "password": "0000", "port": "5432" }
MODEL_NAME = 'mixedbread-ai/mxbai-embed-large-v1'

# 서울시 25개 구 리스트 (파일 이름에서 이걸 찾습니다)
SEOUL_DISTRICTS = [
    "강남구", "강동구", "강북구", "강서구", "관악구", "광진구", "구로구", "금천구",
    "노원구", "도봉구", "동대문구", "동작구", "마포구", "서대문구", "서초구", "성동구",
    "성북구", "송파구", "양천구", "영등포구", "용산구", "은평구", "종로구", "중구", "중랑구"
]

def get_or_create_dept(cursor, dept_name):
    """부서가 없으면 만들고 ID 가져오기"""
    try:
        cursor.execute("SELECT id FROM departments WHERE name = %s", (dept_name,))
        result = cursor.fetchone()
        if result:
            return result[0]
        else:
            cursor.execute("INSERT INTO departments (name, category) VALUES (%s, 'GWA') RETURNING id", (dept_name,))
            return cursor.fetchone()[0]
    except Exception as e:
        print(f"   [!] 부서 처리 중 경고: {e}")
        return 1 

def detect_district_from_filename(filename):
    """파일 이름에서 'OO구'를 찾아내는 함수"""
    for district in SEOUL_DISTRICTS:
        if district in filename:
            return district
    return None

def embed_and_upload():
    print(f"[*] 모델 로딩 중: {MODEL_NAME}")
    model = SentenceTransformer(MODEL_NAME)
    
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()

    # 1. 모든 CSV 파일 찾기 (특정 구 아님)
    target_files = glob.glob("data/step1_refined/용산구*.csv")
    print(f"[*] 총 {len(target_files)}개의 파일을 발견했습니다. 작업을 시작합니다.")
    
    for file_path in target_files:
        filename = os.path.basename(file_path)
        
        # 2. [자동화 핵심] 파일 이름에서 구 이름 찾기
        current_district_name = detect_district_from_filename(filename)
        
        if not current_district_name:
            print(f"\n[!] 스킵: '{filename}' 파일에서 서울시 구 이름을 찾을 수 없습니다.")
            continue

        print(f"\n==================================================")
        print(f"[*] 파일 처리 시작: {filename}")
        print(f"[*] 감지된 지역: {current_district_name}")
        print(f"==================================================")

        # 3. DB에서 해당 구 ID 찾기 (없으면 경고)
        cursor.execute("SELECT id FROM districts WHERE name = %s", (current_district_name,))
        dist_res = cursor.fetchone()
        if dist_res:
            district_id = dist_res[0]
        else:
            print(f"[!] 경고: DB districts 테이블에 '{current_district_name}'가 없습니다. ID=1로 진행합니다.")
            district_id = 1

        # 4. 데이터 읽기 및 처리
        df = pd.read_csv(file_path)
        df = df.fillna('') 

        if 'resp_content' not in df.columns:
            if 'answer' in df.columns:
                df['resp_content'] = df['answer']

        success = 0
        fail = 0

        for _, row in tqdm(df.iterrows(), total=len(df)):
            try:
                # 제목과 본문 사이에 공백을 한 칸 두어 구분하기 편하게 만들었습니다.
                title = str(row.get('req_title', '')).strip()
                content = str(row.get('req_content', '')).strip()
                
                # 제목 + 본문을 합치고, 너무 길어지면 DB에 안 들어갈 수 있으니 500자로 자릅니다.
                summary = f"{title}, {content}"[:500]

                dept_name = str(row.get('resp_dept', '정보없음')).split()[-1]
                
                answer_text = str(row.get('resp_content', ''))
                if not answer_text or answer_text == 'nan':
                    answer_text = "답변 내용 없음"

                dept_id = get_or_create_dept(cursor, dept_name)
                officer_id = 2 

                # 5. [자동화] 감지된 구 이름(current_district_name) 사용
                combined_text = (
                    f"[민원]: {summary} "
                    f"[부서]: {dept_name} "
                    f"[답변]: {answer_text[:100]} "
                    f"[처리일자]: {row.get('req_date', '')} "
                    f"[담당구]: {current_district_name}" 
                )

                embedding = model.encode(combined_text).tolist()

                # DB 저장 (complaints)
                cursor.execute("""
                    INSERT INTO complaints 
                    (applicant_id, received_at, title, body, answer, district_id, current_department_id, answerd_by, status)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'CLOSED')
                    RETURNING id
                """, (
                    ' ',           # applicant_id: 과거 데이터이므로 익명 처리
                    row.get('req_date'),   # received_at
                    row.get('req_title'),  # title
                    row.get('refined_body'), # body
                    answer_text,           # answer
                    district_id,           # district_id
                    dept_id,               # current_department_id
                    officer_id             # answerd_by
                ))
                
                complaint_id = cursor.fetchone()[0]

                # DB 저장 (complaint_normalizations)
                # 화면엔 요약(summary), AI엔 전체정보(combined_text) 전달
                cursor.execute("""
                    INSERT INTO complaint_normalizations (complaint_id, district_id, neutral_summary, embedding)
                    VALUES (%s, %s, %s, %s)
                """, (complaint_id, district_id, summary, embedding))

                conn.commit()
                success += 1

            except Exception as e:
                conn.rollback()
                fail += 1
                if fail == 1:
                    print(f"\n   [!] 에러 발생 (첫 번째 실패): {e}")
                continue

        print(f"[*] '{filename}' 완료: 성공 {success}건 / 실패 {fail}건")

    conn.close()
    print("\n[ALL DONE] 모든 파일 처리가 완료되었습니다.")

if __name__ == "__main__":
    embed_and_upload()