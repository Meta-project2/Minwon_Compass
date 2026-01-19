import ast
import os
import numpy as np
import pandas as pd
import psycopg2
from psycopg2.extras import Json
import requests
from datetime import datetime

# --- 설정 섹션 ---
DB_CONFIG = {
    "host": "localhost",
    "database": "postgres",
    "user": "postgres",
    "password": "0000",
    "port": 5432
}

OLLAMA_URL = "http://localhost:11434/api/embeddings"
EMBED_MODEL = "mxbai-embed-large"
base_path = os.path.dirname(os.path.abspath(__file__))
CSV_FILE = os.path.join(base_path, "강동구_structured_final.csv")
TABLE_NAME = "complaint_normalizations"

def get_embedding(text):
    # mxbai 모델 권장 접두사 포함
    payload = {"model": EMBED_MODEL, "prompt": f"doc: {text}"}
    try:
        res = requests.post(OLLAMA_URL, json=payload, timeout=10) # 타임아웃 추가
        return res.json()['embedding']
    except Exception as e:
        print(f"Embedding Error: {e}")
        return None
    
def clean_keywords(raw_value):
    if pd.isna(raw_value) or str(raw_value).strip() == "":
        return []
    try:
        # 문자열 "['A', 'B']"를 진짜 리스트 ['A', 'B']로 변환
        return ast.literal_eval(str(raw_value))
    except (ValueError, SyntaxError):
        # 만약 리스트 형태가 아닐 경우를 대비한 예외 처리
        return [k.strip() for k in str(raw_value).split(',')]

def migrate_data():
    # 1. 파일 읽기 (인코딩 에러 방지)
    try:
        df = pd.read_csv(CSV_FILE, encoding='utf-8-sig')
    except:
        df = pd.read_csv(CSV_FILE, encoding='cp949')

    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    # 2. 이어하기 지점 확인 (정확히 정규화 테이블에 몇 건 있는지 확인)
    cur.execute(f"SELECT COUNT(*) FROM {TABLE_NAME}")
    last_count = cur.fetchone()[0]
    
    print(f"현재 DB({TABLE_NAME})에 저장된 데이터 수: {last_count}건")

    # 3. 데이터 슬라이싱 (이미 완료된 건수 이후부터 시작)
    # iloc[last_count:] 를 사용하여 중복 삽입 방지
    df_to_process = df.iloc[last_count:]
    df_to_process = df_to_process.replace({np.nan: None})
    
    if len(df_to_process) == 0:
        print("✨ 이미 모든 데이터가 이관되었습니다.")
        return

    print(f"🚀 총 {len(df)}건 중 {last_count}건 이후인 {len(df_to_process)}건부터 이관을 시작합니다...")

    for i, row in df_to_process.iterrows():
        try:
            now = datetime.now()
            
            # 1. 부모 테이블 삽입
            sql_parent = """
            INSERT INTO complaints (
                received_at, title, body, answer, district_id, status, address_text, created_at, updated_at
            ) VALUES (%s, %s, %s, %s, 2, 'RECEIVED', %s, %s, %s) RETURNING id;
            """
            cur.execute(sql_parent, (now, row['req_title'], row['req_content'], row['resp_content'], row['resp_dept'] , row["req_date"], row["resp_date"]))
            new_complaint_id = cur.fetchone()[0]

            # 2. 임베딩 생성 (search_text 컬럼 활용)
            vector = get_embedding(row['search_text'])
            if not vector:
                print(f"⚠️ [{i}] 임베딩 실패 - 이 행을 건너뜁니다.")
                conn.rollback() # 부모 테이블 삽입 취소
                continue

            # 3. 자식 테이블 삽입
            sql_child = """
            INSERT INTO complaint_normalizations (
                complaint_id, neutral_summary, core_request, 
                target_object, keywords_jsonb, embedding, resp_dept
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            
            keywords_list = clean_keywords(row['keywords'])
            
            cur.execute(sql_child, (
                new_complaint_id,
                row['search_text'],
                row['topic'],
                row['category'],
                Json(keywords_list),
                vector,
                row['resp_dept'],
            ))

            # 4. 개별 건별 커밋 (안정성 최우선)
            # 중간에 꺼져도 현재 행까지는 완벽히 저장됨
            conn.commit()
            
            if (i + 1) % 10 == 0 or i == len(df) - 1:
                print(f"✅ [{i+1}/{len(df)}] 이관 완료 (ID: {new_complaint_id})")

        except Exception as e:
            conn.rollback()
            print(f"❌ Error at row {i}: {e}")
            # 루프를 유지할지 중단할지 결정 (일단 중단하여 원인 파악 권장)
            break 

    cur.close()
    conn.close()
    print("✨ 이관 프로세스 종료")

if __name__ == "__main__":
    migrate_data()