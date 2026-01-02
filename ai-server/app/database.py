import psycopg2
from psycopg2.extras import Json
import os

# DB 연결 정보 (환경 변수 또는 .env 활용 권장)
DB_CONFIG = {
    "dbname": "your_db",
    "user": "your_user",
    "password": "your_password",
    "host": "localhost",
    "port": 5432
}

def save_normalization(complaint_id, analysis, embedding):
    """
    1. 기존 데이터의 is_current를 false로 업데이트 
    2. 새로운 정규화 데이터 및 임베딩 벡터 저장 
    """
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    
    try:
        # Step 1: 기존 분석 결과를 '과거 데이터'로 변경 (is_current = false) 
        cur.execute("""
            UPDATE complaint_normalizations 
            SET is_current = false 
            WHERE complaint_id = %s AND is_current = true
        """, (complaint_id,))

        # Step 2: 신규 정규화 데이터 삽입 
        # keywords_jsonb 컬럼은 Jsonb 타입이므로 Json 객체로 전달합니다. 
        cur.execute("""
            INSERT INTO complaint_normalizations (
                complaint_id, neutral_summary, core_request, core_cause, 
                target_object, keywords_jsonb, embedding, model_name, is_current
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, true)
        """, (
            complaint_id, 
            analysis['neutral_summary'], 
            analysis['core_request'], 
            analysis['core_cause'], 
            analysis['target_object'], 
            Json(analysis['keywords']), # 리스트를 JSONB 형식으로 변환 
            embedding,                  # vector(1536) 타입 
            "llama3.1",                 # 사용된 모델명 
        ))
        
        conn.commit()
        print(f"[*] 민원 {complaint_id} 정규화 데이터 저장 완료")
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cur.close()
        conn.close()