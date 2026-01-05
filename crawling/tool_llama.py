from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate

# 1. Llama(AI) 준비시키기
# temperature=0 : 창의력은 줄이고, 정확하고 논리적으로 대답하게 설정
print("🤖 Llama를 불러오고 있습니다... (잠시만 기다려주세요)")
llm = ChatOllama(model="llama3.1", temperature=0)

# ==========================================
# 기능 1: 민원 내용 깔끔하게 정제하기 (요약)
# ==========================================
def refine_complaint(text):
    # AI에게 줄 지시사항 (프롬프트)
    template = """
    너는 [데이터 정제 전문가]야. 
    아래 [민원 내용]에서 불필요한 인사말, 감정적인 하소연은 전부 빼고,
    오직 '핵심 요구사항', '발생 위치', '대상'만 요약해서 JSON 형식으로 정리해줘.
    
    [민원 내용]
    {text}
    """
    prompt = ChatPromptTemplate.from_template(template)
    chain = prompt | llm
    
    # AI에게 일을 시키고 결과 받기
    response = chain.invoke({"text": text})
    return response.content

# ==========================================
# 기능 2: 민원 카테고리 자동 분류하기
# ==========================================
def classify_complaint(text):
    # AI에게 줄 지시사항 (프롬프트)
    template = """
    너는 [민원 분류기]야.
    아래 [민원 내용]을 읽고, 다음 카테고리 중 가장 적절한 것 하나만 딱 골라서 단어로 대답해.
    (카테고리 목록: 불법주차, 소음, 쓰레기, 도로파손, 기타)

    [민원 내용]
    {text}
    """
    prompt = ChatPromptTemplate.from_template(template)
    chain = prompt | llm
    
    response = chain.invoke({"text": text})
    return response.content

# ==========================================
# 실행 부분 (터미널에서 실행하면 여기가 작동함)
# ==========================================
if __name__ == "__main__":
    # 테스트용 가짜 민원 데이터
    print("\n--- 🧪 테스트를 시작합니다 ---")
    
    sample_text_1 = "아니 제가 어제 밤에 잠을 자려는데 집 앞 공원에서 누가 고성방가를 하고 술판을 벌이고 난리가 났어요. 진짜 시끄러워서 못 살겠네. 관악구청 근처 공원이에요. 빨리 해결 좀 해주세요."
    sample_text_2 = "집 앞에 쓰레기가 너무 많이 쌓여있어요 냄새나요."
    
    # 1. 정제 기능 테스트
    print("\n[테스트 1] 데이터 정제 기능")
    print(f"📄 원본: {sample_text_1}")
    print("⏳ 정제 중...")
    refined_result = refine_complaint(sample_text_1)
    print(f"✨ 결과:\n{refined_result}")

    # 2. 분류 기능 테스트
    print("\n" + "-"*30)
    print("[테스트 2] 자동 분류 기능")
    print(f"📄 원본: {sample_text_2}")
    print("⏳ 분류 중...")
    category_result = classify_complaint(sample_text_2)
    print(f"🏷️ 결과: {category_result}")
    
    print("\n✅ 모든 테스트 완료!")