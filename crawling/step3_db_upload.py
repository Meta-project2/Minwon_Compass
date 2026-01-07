import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
import glob
import os
from tqdm import tqdm

# DB 정보
DB_CONFIG = {
    "host": "localhost",
    "database": "complaint_db",
    "user": "postgres",
    "password": "0000", # ★ 집 비밀번호 확인 필요
    "port": "5432"
}

def upload_to_db_bulk():
    conn = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        print("[*] DB 연결 성공. Bulk 업로드를 시작합니다.")

        # pickle 파일 찾기
        vector_files = glob.glob("data/step2_vectors/*.pkl")

        if not vector_files:
            print("[!] 업로드할 .pkl 파일이 없습니다.")
            return

        for file_path in vector_files:
            # pickle 파일 읽기
            df = pd.read_pickle(file_path)
            
            print(f"\n[*] {os.path.basename(file_path)} 처리 중 (총 {len(df)}건)...")

            # 100개씩 끊어서 처리
            chunk_size = 100
            for i in tqdm(range(0, len(df), chunk_size), desc="  └ Bulk Inserting"):
                chunk = df.iloc[i : i + chunk_size]
                
                # 1. complaints 테이블 저장
                complaints_data = [
                    (row.get('req_title', '제목없음'), row.get('req_content', ''), row.get('resp_content', ''), row.get('resp_dept', ''))
                    for _, row in chunk.iterrows()
                ]
                
                insert_complaints_query = """
                    INSERT INTO complaints (received_at, title, body, answer, district, status, created_at, updated_at)
                    VALUES (NOW(), %s, %s, %s, %s, 'CLOSED', NOW(), NOW())
                    RETURNING id;
                """
                
                # ID를 순서대로 받아오기 위해 하나씩 실행 (여기는 Bulk 아님)
                ids = []
                for data in complaints_data:
                    cursor.execute(insert_complaints_query, data)
                    ids.append(cursor.fetchone()[0])

                # 2. complaint_normalizations 테이블 저장 (Bulk Insert)
                norm_data = []
                for idx, (_, row) in enumerate(chunk.iterrows()):
                    norm_data.append((
                        ids[idx],              # 원본 ID
                        row.get('processed_body', ''), 
                        row['embedding'],      # 벡터
                        True                   # is_current
                    ))

                # ★ [수정 완료] created_at 제거 (DB 자동 생성)
                insert_norm_query = """
                    INSERT INTO complaint_normalizations (complaint_id, neutral_summary, embedding, is_current)
                    VALUES %s
                """
                
                # 여기서 한방에 넣습니다 (속도 빠름)
                execute_values(cursor, insert_norm_query, norm_data)
                conn.commit()

            print(f"[+] {os.path.basename(file_path)} 완료!")

    except Exception as e:
        print(f"[!] 오류 발생: {e}")
        if conn: conn.rollback()
    finally:
        if conn: conn.close()

if __name__ == "__main__":
    upload_to_db_bulk()