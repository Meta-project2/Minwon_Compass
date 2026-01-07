from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import logging

# 우리가 만든 전문가들(모듈) 불러오기
from tool_llama import ComplaintAnalyzer
from department_manager import DepartmentManager
from risk_detector import RiskManager
from legal_advisor import LegalAdvisor

# [추가] 민원 DB 검색용 (유사 사례 찾기)
from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Server")

# 1. FastAPI 앱 생성 (서버 본체)
app = FastAPI(title="민원 AI 통합 처리 시스템", version="1.0")

# 2. 전문가들 출근 (서버 켤 때 한 번만 로딩)
print("🏭 시스템 초기화 중... (AI 모델들을 로딩합니다)")
analyzer = ComplaintAnalyzer()       # 정제/요약
dept_manager = DepartmentManager()   # 부서 배정
risk_manager = RiskManager()         # 위험 탐지
legal_advisor = LegalAdvisor()       # 법률 자문

# 민원 DB 로딩 (유사 사례 추천용)
complaint_db = Chroma(
    persist_directory="complaint_vector_db",
    embedding_function=OllamaEmbeddings(model="nomic-embed-text")
)

# == 데이터 모델 (입력받을 형식) ==
class ComplaintRequest(BaseModel):
    text: str
    location: str = "마포구" # 기본값

# == API 엔드포인트 (기능 버튼) ==

@app.post("/analyze")
async def process_complaint(request: ComplaintRequest):
    """
    [통합 처리] 민원 텍스트를 받아서 5단계 분석 결과를 반환합니다.
    """
    logger.info(f"📩 신규 민원 접수: {request.text[:20]}...")
    
    response = {
        "original_text": request.text,
        "location": request.location,
        "steps": {}
    }

    # [Step 1] 위험 탐지 (악성/급증)
    risk_result = risk_manager.calculate_risk_score(request.text)
    surge_result = risk_manager.check_surge(request.location, "미분류") # 카테고리는 아직 모름
    
    response["risk_analysis"] = {
        "is_danger": risk_result["is_danger"],
        "risk_score": risk_result["score"],
        "is_surge": surge_result["is_surge"],
        "tags": []
    }
    if risk_result["is_danger"]: response["risk_analysis"]["tags"].append("👿 악성 의심")
    if surge_result["is_surge"]: response["risk_analysis"]["tags"].append("🔥 민원 폭주")

    # [Step 2] 내용 정제 및 요약 (Llama)
    refined = analyzer.analyze(request.text)
    response["refined_content"] = refined
    
    # [Step 3] 부서 배정
    # AI가 뽑은 카테고리를 이용해 부서 매칭
    dept_info = dept_manager.classify_and_match(refined["summary"], request.location)
    response["department_info"] = dept_info

    # [Step 4] 법률 자문 (RAG)
    # 민원 내용이 구체적일 때만 자문 수행
    if len(request.text) > 10:
        legal_advice = legal_advisor.advise(refined["summary"])
        response["legal_advice"] = legal_advice
    else:
        response["legal_advice"] = "내용이 너무 짧아 법률 자문을 생략합니다."

    # [Step 5] 유사 민원 사례 찾기 (Bonus)
    docs = complaint_db.similarity_search(refined["summary"], k=2)
    similar_cases = [{"content": d.page_content[:100], "source": d.metadata.get("source")} for d in docs]
    response["similar_cases"] = similar_cases

    return response

# == 서버 실행 코드 ==
if __name__ == "__main__":
    import uvicorn
    print("🚀 서버가 8000번 포트에서 시작됩니다! (http://localhost:8000)")
    uvicorn.run(app, host="0.0.0.0", port=8000)