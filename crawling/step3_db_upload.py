import pandas as pd
import psycopg2
import glob
import os
from tqdm import tqdm

# DB 정보
DB_CONFIG = {
    "host": "localhost",
    "database": "complaint_db",
    "user": "postgres",
    "password": "0000",
    "port": "5432"
}

def upload_to_db():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        print("[*] DB 연결 성공. 업로드를 시작합니다.")

        vector_files = glob.glob("data/step2_vectors/*.parquet")

        for file_path in vector_files:
            df = pd.read_parquet(file_path)
            print(f"\n[*] {os.path.basename(file_path)} 업로드 중...")

            for _, row in tqdm(df.iterrows(), total=len(df), desc="  └ DB Insert"):
                # 1. complaints 테이블 저장
                cursor.execute("""
                    INSERT INTO complaints (received_at, title, body, answer, district, status, created_at)
                    VALUES (NOW(), %s, %s, %s, %s, 'CLOSED', NOW()) RETURNING id;
                """, (row['req_title'], row['req_content'], row['resp_content'], row['resp_dept']))
                
                complaint_id = cursor.fetchone()[0]

                # 2. complaint_normalizations 테이블 저장
                cursor.execute("""
                    INSERT INTO complaint_normalizations (
                        complaint_id, neutral_summary, embedding, answer_embedding, is_current, created_at
                    ) VALUES (%s, %s, %s, %s, true, NOW());
                """, (
                    complaint_id, 
                    row['processed_body'], 
                    row['body_embedding'].tolist(), 
                    row['answer_embedding'].tolist()
                ))

            conn.commit() # 파일 하나 끝날 때마다 커밋
            print(f"[+] {os.path.basename(file_path)} 완료!")

    except Exception as e:
        print(f"[!] 오류 발생: {e}")
        if conn: conn.rollback()
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

if __name__ == "__main__":
    upload_to_db()