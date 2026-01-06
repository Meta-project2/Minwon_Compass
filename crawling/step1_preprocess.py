import pandas as pd
import re
import glob
import os
from tqdm import tqdm

# [설정] 요약(자르기) 길이 설정
MAX_LENGTH = 1000 

def clean_text(text):
    """특수문자 제거 및 공백 정리"""
    if pd.isna(text) or text == "": 
        return ""
    text = re.sub(r'[^가-힣a-zA-Z0-9\s.,!?]', ' ', str(text))
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def process_text_data(file_path, output_dir):
    try:
        # 파일 읽기
        try:
            df = pd.read_csv(file_path, encoding='utf-8')
        except:
            df = pd.read_csv(file_path, encoding='cp949')
        
        df = df.fillna('')
        print(f"[*] 처리 중: {os.path.basename(file_path)} (총 {len(df)}건)")

        # 데이터 전처리 (AI 모델 없이 순수 텍스트 작업이라 빠름)
        # 민원 내용(req_content)과 답변(resp_content)을 다듬고 자름
        df['processed_body'] = df['req_content'].apply(lambda x: clean_text(x)[:MAX_LENGTH])
        df['processed_answer'] = df['resp_content'].apply(lambda x: clean_text(x)[:MAX_LENGTH])

        # 결과 저장
        file_name = os.path.basename(file_path)
        save_path = os.path.join(output_dir, file_name)
        
        # 중간 결과 csv 저장
        df.to_csv(save_path, index=False, encoding='utf-8-sig')
        
    except Exception as e:
        print(f"[!] 오류 발생 {file_path}: {e}")

if __name__ == "__main__":
    # 저장할 폴더 생성
    output_dir = "data/step1_output"
    os.makedirs(output_dir, exist_ok=True)

    # 원본 데이터 찾기
    possible_paths = ["data/*.csv", "data/processed_data/*.csv", "crawling/data/*.csv"]
    csv_files = []
    for path in possible_paths:
        csv_files.extend(glob.glob(path))
    csv_files = list(set(csv_files))

    if not csv_files:
        print("[!] 원본 CSV 파일을 찾을 수 없습니다.")
    else:
        print(f"[*] 총 {len(csv_files)}개의 파일을 1단계 처리합니다.")
        for file_path in tqdm(csv_files, desc="[1단계] 텍스트 요약/정제 중"):
            process_text_data(file_path, output_dir)
            
    print(f"\n[+] 1단계 완료! '{output_dir}' 폴더를 확인하세요.")