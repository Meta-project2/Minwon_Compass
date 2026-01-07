import pandas as pd
import re
import os
import glob
from tqdm import tqdm
import requests # Ollama API 호출용

# [설정] 요약 마지노선
MAX_LENGTH = 1000

def mask_pii(text):
    """전화번호, 이메일 등 개인정보 마스킹 (기본에 충실)"""
    text = re.sub(r'\d{2,3}-\d{3,4}-\d{4}', '[전화번호]', str(text))
    text = re.sub(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', '[이메일]', text)
    return text

def summarize_with_llm(text):
    """Ollama를 사용하여 1,000자 이상의 민원을 핵심 요약"""
    prompt = f"다음은 민원 내용입니다. 핵심 요구사항과 원인을 중심으로 1000자 내외로 요약해줘:\n\n{text}"
    
    try:
        # 로컬 Ollama 서버 호출 (Llama3 등 사용 권장)
        response = requests.post("http://localhost:11434/api/generate", 
                                 json={"model": "llama3", "prompt": prompt, "stream": False})
        return response.json()['response']
    except:
        # 오류 발생 시 안전하게 앞 1,000자만 자름
        return text[:MAX_LENGTH]

def process_data():
    input_files = glob.glob("./data/processed_data/*.csv")
    output_dir = "data/step1_refined"
    os.makedirs(output_dir, exist_ok=True)

    for file_path in input_files:
        filename = os.path.basename(file_path)
        print(f"[*] {filename} 정제 및 요약 시작...")
        
        try:
            df = pd.read_csv(file_path, encoding='utf-8-sig')
        except:
            df = pd.read_csv(file_path, encoding='cp949', errors='ignore')

        refined_data = []

        for _, row in tqdm(df.iterrows(), total=len(df), desc=f"{filename} 처리"):
            body = str(row['req_content'])
            
            # 1. 개인정보 마스킹
            clean_body = mask_pii(body)
            
            # 2. 1,000자 초과 시 요약 실행
            if len(clean_body) > MAX_LENGTH:
                processed_text = summarize_with_llm(clean_body)
            else:
                processed_text = clean_body
            
            # 3. 결과 수집 (나중에 DB 컬럼에 맞게)
            refined_data.append({
                **row, # 기존 컬럼 유지
                'refined_body': clean_body,     # 원본(마스킹됨)
                'summary_text': processed_text  # 요약본 (임베딩용)
            })

        # 결과 저장
        new_df = pd.DataFrame(refined_data)
        new_df.to_csv(os.path.join(output_dir, filename), index=False, encoding='utf-8-sig')

if __name__ == "__main__":
    process_data()