import pandas as pd
import google.generativeai as genai
import json
import time
import re
from tqdm import tqdm

# ================= 설정 섹션 =================
API_KEY = "AIzaSyC2q8-D8EPeJJCHKFQq7Qs-L3Q5mKjx1uE"
genai.configure(api_key=API_KEY)
# JSON 모드 활성화로 안정적인 파싱 보장
model = genai.GenerativeModel('gemini-2.0-flash', generation_config={"response_mime_type": "application/json"})

INPUT_PATH = "./강동구.csv"
COMPARISON_OUTPUT_PATH = "./강동구_strategy_comparison.csv"
# =============================================

def mask_complaint(text, requester_name=None):
    """민원 내용용: 지명(숫자) 보존, 작성자 실명 및 연락처만 제거"""
    if not isinstance(text, str) or text.strip() == "": return ""
    # 1. 작성자 실명 제거
    if requester_name and len(requester_name) >= 2:
        text = text.replace(requester_name, "[NAME_MASKED]")
    # 2. 연락처/이메일만 제거 (지명 숫자는 건드리지 않음)
    text = re.sub(r'\d{2,3}-\d{3,4}-\d{4}', '[PHONE_MASKED]', text)
    text = re.sub(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', '[EMAIL_MASKED]', text)
    return text

def mask_response(text):
    """공무원 답변용: 부서 정보 유지, 담당자 개인정보 완전 마스킹"""
    if not isinstance(text, str) or text.strip() == "": return ""
    # 1. 부서/담당자 패턴 통합 마스킹
    staff_pattern = r'(\w+(?:과|소|동|부|팀|센터|공사|구청|주민센터|보건소))\s?\((?:담당\s?)?[가-힣0-9*○Xx]{2,4}.*?(?:\d{2,3}-\d{3,4}-\d{4}|\[PHONE_MASKED\])\)'
    text = re.sub(staff_pattern, r'\1([STAFF_INFO_MASKED])', text)
    # 2. 답변 내 수동 마스킹(김00 등) 및 연락처 제거
    text = re.sub(r'[가-힣][0-9*○Xx]{1,2}', '[NAME_MASKED]', text)
    text = re.sub(r'\d{2,3}-\d{3,4}-\d{4}', '[PHONE_MASKED]', text)
    return text

def get_comparison_data(row):
    user_name = row.get('req_p', None)
    
    # 전략적 이원화 마스킹 적용
    masked_title = mask_complaint(row['req_title'], requester_name=user_name)
    masked_content = mask_complaint(row['req_content'], requester_name=user_name)
    masked_resp = mask_response(row['resp_content'])

    prompt = f"""
    당신은 지자체 행정 전문가입니다. 아래 민원을 분석하여 JSON으로 응답하세요.
    [MASKED]는 보안 처리된 개인정보이므로 무시하고 행정 맥락에만 집중하세요.

    [민원 정보]
    - 제목: {masked_title}
    - 내용: {masked_content}
    - 답변: {masked_resp}

    [JSON 형식]
    {{
        "topic": "핵심 주제 1문장",
        "keywords": ["핵심단어1", "핵심단어2", "핵심단어3"],
        "legal_actual": "답변에 명시된 실제 법령/조례 (없으면 '해당 없음')",
        "admin_category": "이 민원과 연관된 행정 도메인 (예: 도로교통/도로법, 건축/주택법)"
    }}
    """
    try:
        response = model.generate_content(prompt)
        p = json.loads(response.text)
        
        # 리스트 반환 대응 로직
        if isinstance(p, list):
            p = p[0] if len(p) > 0 else {}
        
        topic = p.get('topic', '')
        keys = ", ".join(p.get('keywords', []))
        actual = p.get('legal_actual', '해당 없음')
        admin = p.get('admin_category', '')

        # 전략 A: 현상 중심 (주제 + 키워드)
        p['search_text_A'] = f"{topic} {keys}"
        
        # 전략 B: 행정 중심 (주제 + 키워드 + 카테고리) - 법령 번호 노이즈 제거 버전
        p['search_text_B'] = f"{topic} {keys} {admin}"
        
        # 실제 법령 정보는 별도 보관
        p['legal_info'] = actual
        
        return p
    except Exception as e:
        print(f"Error: {e}")
        return None

# --- 실행 로직 ---
df_sample = pd.read_csv(INPUT_PATH).head(5)
results = []

for idx in tqdm(df_sample.index, desc="이원화 마스킹 기반 분석 중"):
    res = get_comparison_data(df_sample.loc[idx])
    if res:
        res['original_title'] = df_sample.loc[idx, 'req_title']
        results.append(res)
    time.sleep(4) # RPM 제한 준수

# 결과 정리 및 출력
df_res = pd.DataFrame(results)
print("\n" + "="*50)
print("이원화 마스킹 결과 및 전략 비교")
for i, row in df_res.iterrows():
    print(f"\n[사례 {i+1}] {row['original_title']}")
    print(f" > A (현상): {row['search_text_A']}")
    print(f" > B (행정): {row['search_text_B']}")
    print(f" > 실제법령: {row['legal_info']}")
print("="*50)

df_res.to_csv(COMPARISON_OUTPUT_PATH, index=False, encoding='utf-8-sig')