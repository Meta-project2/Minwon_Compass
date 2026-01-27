import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from ollama import Client
from tqdm import tqdm
import ast

client = Client(host='http://127.0.0.1:11434')

DB_CONFIG = {
    "host": "localhost",
    "database": "complaint_db",
    "user": "postgres",
    "password": "0000",
    "port": 5432
}
EMBED_MODEL = "mxbai-embed-large"
INPUT_CSV = "강동구_structured.csv" 

def get_embedding(text):
    if not text or pd.isna(text):
        return None
    try:
        response = client.embeddings(model=EMBED_MODEL, prompt=text)
        return response['embedding']
    except Exception as e:
        print(f"임베딩 생성 오류: {e}")
        return None

conn = psycopg2.connect(**DB_CONFIG)
cur = conn.cursor()

df = pd.read_csv(INPUT_CSV)
print(f"{len(df)}건의 데이터를 신규 스키마에 맞춰 저장합니다.")

for i, row in tqdm(df.iterrows(), total=len(df)):
    try:
        search_text = str(row.get('search_text', ''))
        embedding = get_embedding(search_text)
        
        if embedding is None:
            continue

        query = """
        INSERT INTO complaint_normalizations (
            resp_dept,
            topic,
            legal_basis,
            keywords,
            search_text,
            embedding,
            model_name,
            is_current
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        params = (
            str(row.get('llm_dept', row.get('resp_dept', '부서미정'))),
            str(row.get('topic', '')),          
            str(row.get('legal_basis', '')),   
            str(row.get('keywords', '')),      
            search_text,                       
            embedding,                         
            EMBED_MODEL,                   
            True                             
        )

        cur.execute(query, params)
        
        if (i + 1) % 100 == 0:
            conn.commit()

    except Exception as e:
        conn.rollback()
        print(f"\n에러 발생 (행 {i}): {e}")

# 최종 반영 및 종료
conn.commit()
cur.close()
conn.close()
print("\n[성공] 모든 데이터가 신규 스키마로 벡터화되어 저장되었습니다!")