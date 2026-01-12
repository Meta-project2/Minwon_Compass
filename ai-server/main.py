from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from app.services import llm_service
from app import database
from app.services.llm_service import LLMService
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Complaint Analyzer AI")
llm_service = LLMService()

# (CORS 설정)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # 모든 곳에서 접속 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 테스트
@app.get("/")
async def root():
    return {"message": "서버 연결 성공 "}

# Postman으로 보낼 데이터 구조 정의
class ComplaintRequest(BaseModel):
    title: str
    body: str
    district: str

@app.post("/analyze")
async def analyze_and_store(request: ComplaintRequest):
    try:
        print(f"[*] 분석 시작 - 민원 제목: {request.title}")

        # 1. LLM 요약 및 분석 (Normalization)
        # Ollama가 응답할 때까지 기다립니다.
        body = request.title + "\n" + request.body
        analysis = await llm_service.get_normalization(body)
        print(f"[*] 정규화 완료: {analysis}...")

        # 2. 벡터 추출 (Embedding)
        # 전처리된 민원 원본을 바탕으로 1024차원 벡터 생성
        embedding = await llm_service.get_embedding(analysis['preprocess_body'])
        analysis['embedding'] = embedding
        print(f"[*] 벡터화 완료 (차원: {len(embedding)})")

        # 3. DB 저장 (is_current 처리 포함 트랜잭션)
        # Python에서 PostgreSQL로 직접 저장
        complaint_id = database.save_complaint(request.title, request.body, request.district)
        database.save_normalization(complaint_id, analysis, embedding)
        print(f"[+] 성공: 민원 {complaint_id} 데이터베이스 저장 완료")

        return {
            "status": "success", 
            "complaint_id": complaint_id,
            **analysis,
        }

    except Exception as e:
        print(f"[!] 에러 발생: {str(e)}")
        # 클라이언트에게 500 에러와 원인 반환
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

# 요청 데이터 구조 정의
class ChatRequest(BaseModel):
    query: str

# 민원 상세 화면 진입 시 (자동 분석 & 가이드)
@app.get("/api/complaints/{complaint_id}/ai-analysis")
async def get_ai_analysis(complaint_id: int):
    """
    [자동 모드]
    공무원이 민원을 클릭했을 때, DB에 있는 민원 내용을 바탕으로
    유사 사례 요약과 처리 방향 가이드를 자동으로 생성
    """
    try:
        # query 인자 없이 호출 -> llm_service 내부에서 '자동 모드'로 동작
        response = await llm_service.generate_rag_response(complaint_id)
        return {"status": "success", "result": response}
    except Exception as e:
        return {"status": "error", "message": f"AI 분석 실패: {str(e)}"}

# 챗봇에게 추가 질문하기 (Q&A)
@app.post("/api/complaints/{complaint_id}/chat")
async def chat_with_ai(complaint_id: int, request: ChatRequest):
    """
    [수동 모드]
    공무원이 채팅창에 질문(query)을 입력하면,
    해당 질문을 법률 용어로 변환 후 검색하여 답변
    """
    try:
        # query 인자 포함 호출 -> llm_service 내부에서 '수동 질문 모드'로 동작
        response = await llm_service.generate_rag_response(complaint_id, request.query)
        return {"status": "success", "result": response}
    except Exception as e:
        return {"status": "error", "message": f"답변 생성 실패: {str(e)}"}


# 직접 실행을 위한 블록 (python main.py로 실행 가능)
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

