import ast
import os
import numpy as np
import pandas as pd
import psycopg2
from psycopg2.extras import Json
import requests
from datetime import datetime

# CSV 데이터를 DB로 이관하는 코드

DB_CONFIG = {
    "host": "0.0.0.0",
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

# 임베딩 실행 함수
def get_embedding(text):
    payload = {"model": EMBED_MODEL, "prompt": f"doc: {text}"}
    try:
        res = requests.post(OLLAMA_URL, json=payload, timeout=10)
        return res.json()['embedding']
    except Exception as e:
        print(f"Embedding Error: {e}")
        return None

# 키워드의 불필요한 부분 삭제
def clean_keywords(raw_value):
    if pd.isna(raw_value) or str(raw_value).strip() == "":
        return []
    try:
        return ast.literal_eval(str(raw_value))
    except (ValueError, SyntaxError):
        return [k.strip() for k in str(raw_value).split(',')]

# 데이터를 DB로 이관
def migrate_data():
    try:
        df = pd.read_csv(CSV_FILE, encoding='utf-8-sig')
    except:
        df = pd.read_csv(CSV_FILE, encoding='cp949')

    # CSV 읽을 때 날짜 변환 미리 적용
    df['req_date'] = pd.to_datetime(df['req_date'], errors='coerce')
    df['resp_date'] = pd.to_datetime(df['resp_date'], errors='coerce')

    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    cur.execute(f"SELECT COUNT(*) FROM {TABLE_NAME}")
    last_count = cur.fetchone()[0]
    
    print(f"현재 DB({TABLE_NAME})에 저장된 데이터 수: {last_count}건")

    df_to_process = df.iloc[last_count:]
    df_to_process = df_to_process.replace({np.nan: None})
    
    if len(df_to_process) == 0:
        print("✨ 이미 모든 데이터가 이관되었습니다.")
        return

    print(f"🚀 총 {len(df)}건 중 {last_count}건 이후인 {len(df_to_process)}건부터 이관을 시작합니다...")

    for i, row in df_to_process.iterrows():
        try:
            req_time = row['req_date']
            resp_time = row['resp_date'] if pd.notnull(row['resp_date']) else None
            
            status = 'CLOSED' if resp_time else 'RECEIVED'
            
            sql_parent = """
            INSERT INTO complaints (
                received_at, title, body, answer, district_id, status, address_text, 
                created_at, updated_at, closed_at, 
                current_department_id, applicant_id, tag
            ) VALUES (%s, %s, %s, %s, 2, %s, %s, %s, %s, %s, 3, 1, 'OTHER') RETURNING id;
            """
            
            cur.execute(sql_parent, (
                req_time,               
                row['req_title'], 
                row['req_content'], 
                row['resp_content'],
                status,                 
                row['resp_dept'],       
                req_time,              
                resp_time if resp_time else req_time,
                resp_time              
            ))
            new_complaint_id = cur.fetchone()[0]

            vector = get_embedding(row['search_text'])
            if not vector:
                print(f"⚠️ [{i}] 임베딩 실패 - 이 행을 건너뜁니다.")
                conn.rollback()
                continue

            sql_child = """
            INSERT INTO complaint_normalizations (
                complaint_id, neutral_summary, core_request, 
                target_object, keywords_jsonb, embedding, resp_dept,
                created_at  -- ★ 날짜 컬럼 추가
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
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
                req_time
            ))

            conn.commit()
            
            if (i + 1) % 10 == 0 or i == len(df) - 1:
                print(f"✅ [{i+1}/{len(df)}] 이관 완료 (ID: {new_complaint_id}) - 날짜: {req_time}")

        except Exception as e:
            conn.rollback()
            print(f"❌ Error at row {i}: {e}")
            break 

    cur.close()
    conn.close()
    print("✨ 이관 프로세스 종료")

if __name__ == "__main__":
    migrate_data()
