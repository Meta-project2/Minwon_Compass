import psycopg2

def reset_db():
    try:
        conn = psycopg2.connect(
            host="localhost",
            database="complaint_db",
            user="postgres",
            password="0000", # 본인 비밀번호
            port="5432"
        )
        cursor = conn.cursor()
        # 데이터만 삭제 (구조는 유지)
        cursor.execute("TRUNCATE TABLE complaint_normalizations, complaints, incidents, departments CASCADE;")
        conn.commit()
        print("[+] DB 데이터 초기화 완료!")
    except Exception as e:
        print(f"[!] 초기화 실패: {e}")
    finally:
        if 'conn' in locals(): conn.close()

if __name__ == "__main__":
    reset_db()