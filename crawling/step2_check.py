import pandas as pd
import psycopg2
import glob
import os
import numpy as np

# 보기 편하게 색깔 넣기
class Color:
    GREEN = '\033[92m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    END = '\033[0m'

# DB 설정 (집 비밀번호 확인하세요!)
DB_CONFIG = {
    "host": "localhost",
    "database": "complaint_db",
    "user": "postgres",
    "password": "0000", 
    "port": "5432"
}

def check_step2_pickle():
    print(f"\n{Color.BLUE}========================================={Color.END}")
    print(f"{Color.BLUE}[1] Step 2 (.pkl) 파일 점검{Color.END}")
    print(f"{Color.BLUE}========================================={Color.END}")

    files = glob.glob("data/step2_vectors/*.pkl")
    if not files:
        print(f"{Color.RED}[!] .pkl 파일이 없습니다.{Color.END}")
        return

    # 첫 번째 파일만 샘플로 검사
    target_file = files[0]
    print(f"[*] 대상 파일: {os.path.basename(target_file)}")
    
    try:
        df = pd.read_pickle(target_file)
        print(f"[*] 데이터 개수: {len(df)}건")
        
        # 벡터 확인
        sample_vec = df.iloc[0]['embedding']
        print(f"[*] 벡터 차원: {len(sample_vec)}")
        
        if len(sample_vec) == 1024:
            print(f"{Color.GREEN}[PASS] 벡터가 1024차원으로 잘 생성되었습니다.{Color.END}")
        else:
            print(f"{Color.RED}[FAIL] 벡터 차원이 이상합니다 ({len(sample_vec)}).{Color.END}")
            
    except Exception as e:
        print(f"{Color.RED}[!] 파일 읽기 실패: {e}{Color.END}")

def check_step3_db():
    print(f"\n{Color.BLUE}========================================={Color.END}")
    print(f"{Color.BLUE}[2] Step 3 (DB) 저장 상태 점검{Color.END}")
    print(f"{Color.BLUE}========================================={Color.END}")

    conn = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()

        # 1. 민원 원본 테이블 개수 확인
        cursor.execute("SELECT COUNT(*) FROM complaints;")
        count_core = cursor.fetchone()[0]
        print(f"[*] complaints 테이블(원본) 데이터 수: {count_core}건")

        # 2. 벡터 테이블 개수 확인
        cursor.execute("SELECT COUNT(*) FROM complaint_normalizations;")
        count_vec = cursor.fetchone()[0]
        print(f"[*] complaint_normalizations 테이블(벡터) 데이터 수: {count_vec}건")

        if count_core > 0 and count_vec > 0:
             print(f"{Color.GREEN}[PASS] DB에 데이터가 들어있습니다.{Color.END}")
        else:
             print(f"{Color.RED}[FAIL] DB가 비어있습니다. Step 3를 다시 확인하세요.{Color.END}")
             return

        # 3. 실제 벡터 데이터 샘플 확인 (가장 최근 것)
        # embedding 컬럼을 가져와서 문자열인지 리스트인지, 길이는 맞는지 확인
        cursor.execute("""
            SELECT id, embedding 
            FROM complaint_normalizations 
            ORDER BY id DESC LIMIT 1;
        """)
        row = cursor.fetchone()
        
        if row:
            db_id = row[0]
            db_vector_str = row[1] # pgvector는 문자열 형태로 반환될 수 있음
            
            # pgvector 포맷을 파이썬 리스트로 변환해서 길이 잴 준비
            # 보통 '[0.1, 0.2, ...]' 문자열로 옴 -> 파싱 필요없이 vector 타입이면 자동 변환되기도 함
            # 라이브러리 버전에 따라 다르므로 안전하게 확인
            
            print(f"[*] DB 샘플 ID: {db_id}")
            print(f"[*] DB 벡터 데이터 타입: {type(db_vector_str)}")
            
            # 길이를 재봅니다 (문자열이면 파싱, 리스트면 len)
            vec_len = 0
            if isinstance(db_vector_str, list):
                vec_len = len(db_vector_str)
            elif isinstance(db_vector_str, str):
                # 문자열 '[1, 2, 3]' 형태라면 쉼표 개수 + 1로 추정
                vec_len = db_vector_str.count(',') + 1
            
            print(f"[*] DB 저장된 벡터 차원: {vec_len}")

            if vec_len == 1024:
                print(f"{Color.GREEN}[PASS] DB에도 1024차원으로 완벽하게 저장되었습니다!{Color.END}")
            else:
                 print(f"{Color.RED}[WARN] 차원이 1024가 아닙니다. ({vec_len}){Color.END}")

    except Exception as e:
        print(f"{Color.RED}[!] DB 연결 실패: {e}{Color.END}")
    finally:
        if conn: conn.close()

if __name__ == "__main__":
    check_step2_pickle()
    check_step3_db()
    print(f"\n{Color.BLUE}[종료] 모든 점검이 끝났습니다.{Color.END}")