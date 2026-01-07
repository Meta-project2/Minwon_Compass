import json
import logging
from typing import List, Optional
from pydantic import BaseModel, Field

from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser

# 1. 로깅 설정 (print 대신 사용)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==========================================
# [설정] 데이터 구조 정의 (AI가 이 틀을 절대 벗어나지 않게 함)
# ==========================================
class RefinedComplaint(BaseModel):
    summary: str = Field(description="민원의 핵심 내용 요약 (불필요한 감정 제외)")
    location: str = Field(description="민원 발생 추정 위치 (없으면 '알 수 없음')")
    requirements: str = Field(description="민원인의 구체적인 요구사항")
    category: str = Field(description="민원 카테고리 (가장 적절한 것 1개)")
    keywords: List[str] = Field(description="검색용 핵심 키워드 3~5개")

# ==========================================
# [메인] 민원 분석기 클래스 (도구 상자)
# ==========================================
class ComplaintAnalyzer:
    def __init__(self, model_name="llama3.1"):
        logger.info(f"🤖 AI 모델({model_name})을 로딩 중입니다...")
        self.llm = ChatOllama(model=model_name, temperature=0)
        
        # 출력 형식을 강제하는 파서(Parser) 준비
        self.parser = JsonOutputParser(pydantic_object=RefinedComplaint)

    def analyze(self, text: str) -> dict:
        """
        민원 내용을 입력받아 정제, 분류, 키워드 추출을 한 번에 수행합니다.
        """
        try:
            # 프롬프트 템플릿 작성
            template = """
            너는 대한민국 구청의 [민원 데이터 전문 분석가]야.
            아래 [민원 내용]을 꼼꼼히 읽고 분석해서 필요한 정보를 추출해줘.
            
            반드시 아래 포맷 지침을 따라서 순수한 JSON 형식으로만 응답해.
            설명이나 인삿말은 절대 하지 마.
            
            [민원 내용]
            {text}
            
            [포맷 지침]
            {format_instructions}
            """
            
            prompt = ChatPromptTemplate.from_template(template)
            
            # 체인 연결 (프롬프트 -> AI -> JSON파서)
            chain = prompt | self.llm | self.parser
            
            logger.info("⏳ 민원 분석을 수행하고 있습니다...")
            result = chain.invoke({
                "text": text,
                "format_instructions": self.parser.get_format_instructions()
            })
            
            logger.info("✅ 분석 완료!")
            return result
            
        except Exception as e:
            logger.error(f"❌ 분석 중 오류 발생: {e}")
            # 에러 발생 시 기본값 반환 (서버가 죽지 않게 함)
            return {
                "summary": text[:50], 
                "location": "오류", 
                "category": "기타",
                "error": str(e)
            }

# ==========================================
# 실행 테스트
# ==========================================
if __name__ == "__main__":
    # 도구 상자 꺼내기
    analyzer = ComplaintAnalyzer()
    
    # 테스트 데이터
    sample_text = """
    아니 서교동 사거리 쪽에 가로등이 며칠째 깜빡거려서 눈이 아파요.
    밤에 너무 어두워서 넘어질 뻔했습니다. 구청에서 빨리 좀 고쳐주세요!
    """
    
    print("\n" + "="*50)
    print(f"📄 원본: {sample_text.strip()}")
    print("="*50)
    
    # 분석 실행
    result = analyzer.analyze(sample_text)
    
    # 예쁘게 출력
    import json
    print(json.dumps(result, indent=2, ensure_ascii=False))


    # llama를 이용한 민원 분석기