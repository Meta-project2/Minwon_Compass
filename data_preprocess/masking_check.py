import pandas as pd
import re
import textwrap

# ================= 설정 섹션 =================
INPUT_PATH = "./강동구.csv"
WRAP_WIDTH = 80  # 한 줄에 표시할 글자 수
# =============================================

def mask_complaint(text, requester_name=None):
    """
    민원 내용(질문) 마스킹: 위치 정보(숫자)를 보존하며 작성자 실명만 제거
    """
    if not isinstance(text, str) or text.strip() == "": return ""
    
    # 1. 작성자 실명 제거 (가장 정확함)
    if requester_name and len(requester_name) >= 2:
        text = text.replace(requester_name, "[NAME_MASKED]")
    
    # 2. 실명 뒤에 '님'이 붙은 경우 처리 (예: 홍길동님)
    if requester_name:
        text = re.sub(f"{requester_name}님", "[NAME_MASKED]님", text)

    # 3. 일반적인 연락처/이메일만 제거 (지명 숫자는 건드리지 않음)
    text = re.sub(r'\d{2,3}-\d{3,4}-\d{4}', '[PHONE_MASKED]', text)
    text = re.sub(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', '[EMAIL_MASKED]', text)
    
    return text

def mask_response(text):
    """
    공무원 답변 마스킹: 부서 정보는 남기고 담당자 개인정보만 완전 제거
    """
    if not isinstance(text, str) or text.strip() == "": return ""
    
    # 1. 담당자 정보 통합 마스킹 (부서명 유지)
    staff_pattern = r'(\w+(?:과|소|동|부|팀|센터|공사|구청|주민센터|보건소))\s?\((?:담당\s?)?[가-힣0-9*○Xx]{2,4}.*?(?:\d{2,3}-\d{3,4}-\d{4}|\[PHONE_MASKED\])\)'
    text = re.sub(staff_pattern, r'\1([STAFF_INFO_MASKED])', text)
    
    # 2. 답변 내 수동 마스킹 패턴 (김00, 이XX 등) 제거
    text = re.sub(r'[가-힣][0-9*○Xx]{1,2}', '[NAME_MASKED]', text)
    
    # 3. 기타 연락처
    text = re.sub(r'\d{2,3}-\d{3,4}-\d{4}', '[PHONE_MASKED]', text)
    
    return text

def print_wrapped(label, text):
    """긴 텍스트를 보기 좋게 출력하는 헬퍼 함수"""
    wrapped = textwrap.fill(str(text), WRAP_WIDTH)
    print(f"[{label}]\n{wrapped}\n")

# 1. 데이터 로드 (상위 10개)
df = pd.read_csv(INPUT_PATH).head(10)

print("="*WRAP_WIDTH)
print(f"{'개인정보 마스킹 테스트 결과 (상위 10건)':^70}")
print("="*WRAP_WIDTH)

for idx, row in df.iterrows():
    print(f"\n▶ NO. {idx + 1} | 작성자: {row.get('req_p', '알수없음')}")
    print("-" * 30)
    
    # 제목 테스트
    m_title = mask_complaint(row['req_title'], requester_name=row.get('req_p'))
    print_wrapped("제목(Masked)", m_title)
    
    # 내용 테스트
    m_content = mask_complaint(row['req_content'], requester_name=row.get('req_p'))
    print_wrapped("내용(Masked)", m_content)
    
    # 답변 테스트 (공무원 정보 포함 여부 확인용)
    m_resp = mask_response(row['resp_content'])
    print_wrapped("답변(Masked)", m_resp)
    
    print("-" * WRAP_WIDTH)

print("\n테스트가 완료되었습니다. [MASKED] 처리가 정확한지 확인해 주세요.")