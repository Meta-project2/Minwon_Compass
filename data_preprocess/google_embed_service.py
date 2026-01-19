import pandas as pd
import psycopg2
from psycopg2.extras import Json
import requests
import json

# --- 설정 섹션 ---
DB_CONFIG = {
    "host": "localhost",
    "database": "postgres",
    "user": "postgres",
    "password": "sangpw",
    "port": 5432
}

OLLAMA_URL = "http://localhost:11434/api/embeddings"
EMBED_MODEL = "mxbai-embed-large"

# 정제된 데이터가 담긴 CSV 파일명
CSV_FILE = "C:\\Users\\sangh\\Desktop\\Meta_Poject2\\RAG_Complaint_Classifier\\ai-server\\data_preprocess\\강동구_structured_final.csv"

def get_embedding(text):
    # mxbai-embed-large 모델 권장 접두사 'doc: ' 추가
    payload = {"model": EMBED_MODEL, "prompt": f"doc: {text}"}
    try:
        res = requests.post(OLLAMA_URL, json=payload)
        return res.json()['embedding']
    except Exception as e:
        print(f"Embedding Error: {e}")
        return None

def migrate_final_data():
    # 1. 데이터 로드
    df = pd.read_csv(CSV_FILE)
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    print(f"정제된 데이터 {len(df)}건의 이관을 시작합니다.")

    for i, row in df.iterrows():
        try:
            # 2. 이미 정제된 search_text 컬럼을 그대로 임베딩
            # 예: "요약문. 키워드1, 키워드2... 카테고리"
            raw_search_text = row['search_text']
            vector = get_embedding(raw_search_text)
            
            if not vector:
                continue

            # 3. 원본 테이블 스키마에 맞춘 데이터 매핑
            sql = """
            INSERT INTO complaint_normalizations (
                complaint_id, 
                neutral_summary, 
                core_request, 
                target_object, 
                keywords_jsonb, 
                embedding, 
                resp_dept,
                is_current
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """
            
            # 키워드 리스트 처리 (CSV에 '키워드1, 키워드2' 형태로 저장된 경우)
            keywords_list = [k.strip() for k in str(row['keywords']).split(',')] if 'keywords' in row else []
            
            cur.execute(sql, (
                row.get('complaint_id', i + 1), # 원본 ID 매핑
                raw_search_text,                # neutral_summary (검색 원문을 요약 컬럼에 보존)
                row['topic'],                   # core_request (핵심 요약)
                row['category'],                # target_object (키워드 문자열)
                Json(keywords_list),            # keywords_jsonb (JSONB 타입)
                vector,                         # 1024차원 벡터
                row['resp_dept'],                # resp_dept (부서 정보)
                True
            ))

            if i % 100 == 0:
                conn.commit()
                print(f"[{i}/{len(df)}] 이관 중: {row['topic'][:20]}...")

        except Exception as e:
            print(f"Error at row {i}: {e}")
            conn.rollback()

    conn.commit()
    cur.close()
    conn.close()
    print("✨ 강동구 정제 데이터 이관이 모두 완료되었습니다!")

if __name__ == "__main__":
    migrate_final_data()