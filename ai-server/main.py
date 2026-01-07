from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from app.services import llm_service
from app import database
from app.services.llm_service import LLMService

app = FastAPI(title="Complaint Analyzer AI")
llm_service = LLMService()

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

# 직접 실행을 위한 블록 (python main.py로 실행 가능)
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)