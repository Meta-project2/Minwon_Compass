import pandas as pd
import glob
import os

def debug_files():
    # 1. 조직도(jojik) 파일 구조 확인
    jojik_files = glob.glob("data/jojik_data/*.csv")
    print("="*50)
    print(f"[*] 조직도 파일 확인 ({len(jojik_files)}개)")
    print("="*50)
    
    for f in jojik_files:
        print(f"\n[파일명: {os.path.basename(f)}]")
        try:
            # 인코딩 시도
            df = pd.read_csv(f, encoding='utf-8-sig')
        except:
            df = pd.read_csv(f, encoding='cp949')
            
        print("- 컬럼명:", df.columns.tolist())
        print("- 상위 15개 데이터 샘플:")
        # 데이터의 흐름을 보기 위해 상위 15줄 출력
        print(df.head(15))
        print("-" * 30)

    # 2. 과거 민원 데이터(Step 1 결과물 등) 구조 확인
    complaint_files = glob.glob("data/step1_output/*.csv")
    if not complaint_files:
        # Step 1 전이라면 원본 data 폴더 확인
        complaint_files = glob.glob("data/*.csv")

    print("\n" + "="*50)
    print(f"[*] 민원 데이터 파일 확인 ({len(complaint_files)}개)")
    print("="*50)
    
    for f in complaint_files:
        if 'jojik' in f: continue # 조직도 파일은 제외
        print(f"\n[파일명: {os.path.basename(f)}]")
        try:
            df = pd.read_csv(f, encoding='utf-8-sig')
        except:
            df = pd.read_csv(f, encoding='cp949')
            
        print("- 컬럼명:", df.columns.tolist())
        print("- 상위 5개 데이터 샘플:")
        print(df.head(5))
        
        # 부서 관련 컬럼이 있는지 확인 (예: resp_dept 등)
        dept_cols = [c for c in df.columns if 'dept' in c or '부서' in c or '국' in c]
        if dept_cols:
            print("- 부서 관련 데이터 예시:", df[dept_cols].head(3).values.tolist())
        print("-" * 30)

if __name__ == "__main__":
    debug_files()