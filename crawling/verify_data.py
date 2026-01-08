import pandas as pd
import glob
import os
import numpy as np

# 색깔 출력을 위한 설정 (보기 편하게)
class Color:
    GREEN = '\033[92m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    YELLOW = '\033[93m'
    END = '\033[0m'

def check_step1_output():
    print(f"\n{Color.BLUE}========================================={Color.END}")
    print(f"{Color.BLUE}[Step 1] 텍스트 전처리 결과 파일 점검{Color.END}")
    print(f"{Color.BLUE}========================================={Color.END}")

    files = glob.glob("data/step1_output/*.csv")
    if not files:
        print(f"{Color.RED}[!] Step 1 결과 파일이 없습니다. (step1_preprocess.py 실행 필요){Color.END}")
        return

    # 첫 번째 파일만 샘플로 검사
    target_file = files[0]
    print(f"[*] 대상 파일: {os.path.basename(target_file)}")
    
    try:
        df = pd.read_csv(target_file)
        print(f"[*] 데이터 개수: {len(df)}행")
        print(f"[*] 컬럼 목록: {list(df.columns)}")

        # 필수 컬럼 확인
        required_cols = ['processed_body', 'processed_answer']
        missing = [col for col in required_cols if col not in df.columns]
        
        if missing:
            print(f"{Color.RED}[FAIL] 필수 컬럼 누락: {missing}{Color.END}")
        else:
            print(f"{Color.GREEN}[PASS] 필수 컬럼 존재 확인{Color.END}")

            # 데이터 샘플 확인
            sample_body = str(df.iloc[0]['processed_body'])
            print(f"\n[👀 샘플 데이터 확인]")
            print(f" - 원본 길이: {len(str(df.iloc[0].get('req_content', '')))}")
            print(f" - 전처리 길이: {len(sample_body)}")
            print(f" - 전처리 내용(앞 50자): {sample_body[:50]}...")
            
            if len(sample_body) > 0:
                 print(f"{Color.GREEN}[PASS] 데이터가 비어있지 않습니다.{Color.END}")
            else:
                 print(f"{Color.YELLOW}[WARN] 첫 번째 데이터의 전처리 결과가 비어있습니다.{Color.END}")

    except Exception as e:
        print(f"{Color.RED}[ERROR] 파일 읽기 실패: {e}{Color.END}")

def check_step2_output():
    print(f"\n{Color.BLUE}========================================={Color.END}")
    print(f"{Color.BLUE}[Step 2] 벡터(임베딩) 결과 파일 점검{Color.END}")
    print(f"{Color.BLUE}========================================={Color.END}")

    files = glob.glob("data/step2_vectors/*.parquet")
    if not files:
        print(f"{Color.RED}[!] Step 2 결과 파일이 없습니다. (step2_make_vectors.py 실행 필요){Color.END}")
        return

    target_file = files[0]
    print(f"[*] 대상 파일: {os.path.basename(target_file)}")

    try:
        # Parquet 파일 읽기
        df = pd.read_parquet(target_file)
        print(f"[*] 데이터 개수: {len(df)}행")
        
        # 벡터 컬럼 확인
        if 'body_embedding' not in df.columns:
            print(f"{Color.RED}[FAIL] 'body_embedding' 컬럼이 없습니다.{Color.END}")
            return

        # 벡터 차원 검사 (가장 중요!)
        sample_vector = df.iloc[0]['body_embedding']
        
        # 리스트인지 numpy array인지 확인 후 변환
        if isinstance(sample_vector, np.ndarray):
            sample_vector = sample_vector.tolist()
            
        vec_len = len(sample_vector)
        print(f"[*] 벡터 차원(Dimension): {vec_len}")

        if vec_len == 1024:
            print(f"{Color.GREEN}[PASS] mxbai-large 모델 규격(1024차원)과 일치합니다.{Color.END}")
        elif vec_len == 768:
             print(f"{Color.YELLOW}[WARN] 768차원입니다. (BERT/MiniLM 계열 모델 사용 중){Color.END}")
        else:
             print(f"{Color.RED}[WARN] 예상치 못한 차원입니다.{Color.END}")

        # 값이 제대로 차있는지 확인 (0으로만 되어있거나 비어있는지)
        if np.all(np.array(sample_vector) == 0):
             print(f"{Color.RED}[FAIL] 벡터 값이 모두 0입니다. (오류 가능성){Color.END}")
        else:
             print(f"{Color.GREEN}[PASS] 벡터 값이 정상적으로 생성되었습니다.{Color.END}")

    except Exception as e:
        print(f"{Color.RED}[ERROR] 파일 읽기 실패: {e}{Color.END}")

if __name__ == "__main__":
    check_step1_output()
    check_step2_output()
    print(f"\n{Color.BLUE}[종료] 검증이 완료되었습니다.{Color.END}")