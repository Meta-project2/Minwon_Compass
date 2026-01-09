# 로컬 올라마로 돌리기
# ollama pull gemma2:9b
# pip install pandas requests tqdm

import pandas as pd
import requests
import json
import os
from tqdm import tqdm

# ================= 설정 섹션 =================
OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "gemma2:9b"
INPUT_PATH = "./data/processed_data/마포구_cleaned.csv"         # 로컬 경로로 수정
OUTPUT_PATH = "./data/minwon_llm_data/마포구_llm.csv"     # 로컬 경로로 수정
SAVE_INTERVAL = 10                  # 10건마다 저장
# =============================================

def get_summary(row):
    # 규칙을 엄격하게 적용한 프롬프트
    prompt = f"""
    당신은 민원 요약 전문가입니다. 아래 규칙을 **반드시** 지키세요.

    [규칙]
    1. 출력은 오직 [부서], [핵심 주제], [법적 근거] 세 줄로만 구성한다.
    2. '##', '**' 같은 마크다운 기호를 절대 사용하지 않는다.
    3. 인사말이나 '민원 정보 요약' 같은 제목을 절대 붙이지 않는다.
    4. 라벨(예: [부서]) 뒤에 별표나 특수기호를 붙이지 않는다.

    [민원 제목]: {row['req_title']}
    [민원 내용]: {row['req_content']}
    [답변 내용]: {row['resp_content']}
    [담당 부서]: {row['resp_dept']}

    출력 형식 예시:
    [부서]: 부서명
    [핵심 주제]: 요약 내용
    [법적 근거]: 근거 내용
    """

    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.0, # 창의성을 억제하여 규칙 준수 강화
            "num_predict": 256
        }
    }

    try:
        response = requests.post(OLLAMA_URL, json=payload, timeout=900)
        res_json = response.json()
        if 'response' in res_json:
            return res_json['response'].strip()
        else:
            print(f"\n[Ollama Error]: {res_json}")
            return "ERROR: NO RESPONSE"
    except Exception as e:
        print(f"\n[Request Error]: {e}")
        return "ERROR: CONNECTION FAILED"

# 1. 파일 로드 및 작업 재개 확인
if os.path.exists(OUTPUT_PATH):
    print(f"기존 파일을 발견했습니다. 이어서 작업을 시작합니다: {OUTPUT_PATH}")
    df = pd.read_csv(OUTPUT_PATH)
    if 'search_text' not in df.columns:
        df['search_text'] = None
else:
    print("새로운 작업을 시작합니다.")
    df = pd.read_csv(INPUT_PATH)
    df['search_text'] = None

# 2. 아직 처리되지 않은 행만 추출
target_indices = df[df['search_text'].isna()].index
print(f"전체 {len(df)}건 중 {len(target_indices)}건의 남은 작업을 처리합니다.")

# 3. 루프 실행 및 중간 저장
count = 0
try:
    for idx in tqdm(target_indices, desc="처리 중"):
        result = get_summary(df.loc[idx])
        df.at[idx, 'search_text'] = result
        count += 1

        # 주기적으로 파일 저장
        if count % SAVE_INTERVAL == 0:
            df.to_csv(OUTPUT_PATH, index=False, encoding='utf-8-sig')
            
except KeyboardInterrupt:
    print("\n사용자에 의해 중단되었습니다. 현재까지의 데이터를 저장합니다.")
finally:
    df.to_csv(OUTPUT_PATH, index=False, encoding='utf-8-sig')
    print(f"최종 저장 완료: {OUTPUT_PATH}")