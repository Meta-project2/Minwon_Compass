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
    payload = {"model": EMBED_MODEL, "prompt": f"doc: {text}"}
    try:
        res = requests.post(OLLAMA_URL, json=payload, timeout=10)
        return res.json()['embedding']
    except Exception as e:
        print(f"Embedding Error: {e}")
        return None

def migrate_data():
    try:
        df = pd.read_csv(CSV_FILE, encoding='utf-8-sig')
    except:
        df = pd.read_csv(CSV_FILE, encoding='cp949')

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
            now = datetime.now()
            sql_parent = """
            INSERT INTO complaints (
                received_at, title, body, answer, address_text, status, urgency, created_at, updated_at
            ) VALUES (%s, %s, %s, %s, %s, 'RECEIVED', 'MEDIUM', %s, %s) RETURNING id;
            """
            cur.execute(sql_parent, (now, row['req_title'], row['req_content'], row['resp_content'], row["resp_dept"], row["req_date"], row["resp_date"]))
            new_complaint_id = cur.fetchone()[0]
            vector = get_embedding(row['search_text'])
            if not vector:
                print(f"⚠️ [{i}] 임베딩 실패 - 이 행을 건너뜁니다.")
                conn.rollback()
                continue

            sql_child = """
            INSERT INTO complaint_normalizations (
                complaint_id, neutral_summary, core_request, 
                target_object, keywords_jsonb, embedding, resp_dept, is_current
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """
            
            keywords_list = [k.strip() for k in str(row['keywords']).split(',')] if pd.notna(row['keywords']) else []
            
            cur.execute(sql_child, (
                new_complaint_id,
                row['search_text'],
                row['topic'],
                row['category'],
                Json(keywords_list),
                vector,
                row['resp_dept'],
                True
            ))

            conn.commit()
            
            if (i + 1) % 10 == 0 or i == len(df) - 1:
                print(f"✅ [{i+1}/{len(df)}] 이관 완료 (ID: {new_complaint_id})")

        except Exception as e:
            conn.rollback()
            print(f"❌ Error at row {i}: {e}")
            break 

    cur.close()
    conn.close()
    print("✨ 이관 프로세스 종료")

if __name__ == "__main__":
    migrate_data()