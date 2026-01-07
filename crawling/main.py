import os
import time
from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

# 우리가 만든 전처리 모듈 가져오기
from complaint_preprocessor import ComplaintCleaner

# 1. 설정 및 초기화
load_dotenv() # .env 파일 로드

# 경로 설정 (폴더 위치가 다르면 여기서 수정하세요)
DB_PATH_LAW_ORG = "./chroma_db"             # 법령/조직도 DB
DB_PATH_CASES = "./complaint_vector_db"     # 과거 민원 사례 DB
MODEL_NAME = "jhgan/ko-sroberta-multitask"  # 임베딩 모델

class ComplaintAI:
    def __init__(self):
        print("🤖 AI 시스템을 초기화하는 중입니다... (10~20초 소요)")
        
        # (1) 전처리 도구 준비
        self.cleaner = ComplaintCleaner()
        
        # (2) 임베딩 모델 준비
        self.embeddings = HuggingFaceEmbeddings(
            model_name=MODEL_NAME,
            model_kwargs={'device': 'cpu'},
            encode_kwargs={'normalize_embeddings': True}
        )
        
        # (3) 두 개의 두뇌(DB) 연결
        # 뇌 A: 이론 담당 (법령, 조직도)
        self.db_law_org = Chroma(
            persist_directory=DB_PATH_LAW_ORG,
            embedding_function=self.embeddings
        )
        # 뇌 B: 경험 담당 (과거 사례)
        self.db_cases = Chroma(
            persist_directory=DB_PATH_CASES,
            embedding_function=self.embeddings
        )
        
        # (4) 최종 판단을 내릴 LLM (Gemini) 준비
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-flash-latest",
            temperature=0,
            google_api_key=os.getenv("GOOGLE_API_KEY")
        )

    def search_documents(self, db, query, k=3):
        """DB에서 유사한 문서 k개를 찾아오는 함수"""
        try:
            docs = db.similarity_search(query, k=k)
            # 문서 내용만 텍스트로 합침
            context = "\n".join([f"- {doc.page_content}" for doc in docs])
            return context
        except Exception:
            return "관련 정보를 찾을 수 없음."

    def classify(self, user_complaint, target_gu="강남구"):
        """
        민원을 분석하여 담당 부서를 배정하는 메인 함수
        """
        start_time = time.time()
        print("\n" + "="*50)
        print(f"📢 민원 접수: {user_complaint[:30]}...")
        
        # --- 1단계: 민원 전처리 (청소) ---
        print("🧹 1단계: 민원 내용 정제 및 키워드 추출 중...")
        refined_result = self.cleaner.refine(user_complaint)
        
        # 전처리 결과에서 '요약내용'만 추출해서 검색에 사용
        search_query = refined_result.replace("요약내용:", "").replace("주요키워드:", "")
        print(f"   ㄴ 검색 쿼리: {search_query[:50]}...")

        # --- 2단계: 과거 사례 검색 (경험) ---
        print("🔍 2단계: 타 지자체 과거 유사 사례 검색 중...")
        case_context = self.search_documents(self.db_cases, search_query, k=3)
        
        # --- 3단계: 법령 및 조직도 검색 (이론) ---
        print(f"📖 3단계: {target_gu} 조직도 및 관련 법령 검색 중...")
        # '강남구 도로 파손' 처럼 구 이름을 붙여서 검색해야 해당 구 조직도가 잘 나옴
        org_query = f"{target_gu} {search_query}"
        law_org_context = self.search_documents(self.db_law_org, org_query, k=3)

        # --- 4단계: 최종 추론 (LLM) ---
        print("🧠 4단계: AI가 최종 판단을 내리는 중...")
        
        final_prompt = f"""
        당신은 {target_gu}청의 베테랑 민원 분류관입니다.
        아래 정보를 종합하여 해당 민원을 처리할 **최적의 부서**를 선정하고 이유를 설명하세요.

        [분석 정보]
        1. 민원 내용(정제됨):
        {refined_result}

        2. 과거 유사 처리 사례 (참고용 타 지자체 데이터):
        {case_context}

        3. {target_gu} 조직도 및 법적 근거 (실무 부서 정보):
        {law_org_context}

        [지시사항]
        - 과거 사례에서 처리했던 부서가 {target_gu}에 없을 수 있습니다.
        - 반드시 '3. 조직도 정보'를 기준으로 {target_gu}에 실제로 존재하는 부서를 매칭하세요.
        - 과거 사례의 '하는 일(업무)'과 조직도의 '담당 업무'를 비교하여 추론하세요.
        
        [출력 형식]
        --------------------------------------------------
        결과: [부서명] (정확도: %)
        근거: (왜 이 부서인지, 과거 사례와 조직도 정보를 인용하여 3줄 이내 설명)
        관련법령: (찾은 법령이 있다면 기재, 없으면 생략)
        --------------------------------------------------
        """
        
        chain = PromptTemplate.from_template(final_prompt) | self.llm | StrOutputParser()
        response = chain.invoke({})
        
        end_time = time.time()
        print(f"✅ 처리 완료! (소요시간: {end_time - start_time:.2f}초)")
        return response

# --- 실행 테스트 ---
if __name__ == "__main__":
    ai = ComplaintAI()
    
    # 테스트할 민원 내용
    complaint = """
    논현동 먹자골목 쪽에 식당들이 쓰레기를 밤마다 무단으로 버려서
    냄새나고 미치겠어요. 고양이들이 다 뜯어놓고 난리입니다.
    CCTV라도 달아서 과태료 좀 물려주세요 제발!!!
    """
    
    # 강남구 기준으로 분류 요청
    result = ai.classify(complaint, target_gu="강남구")
    print(result)