from fastapi import FastAPI
from app.services import llm_service
from app import database

app = FastAPI()

@app.post("/analyze")
async def analyze_and_store(complaint_id: int, body: str):
    # 1. LLM 요약 및 분석 (Normalization) 
    analysis = await llm_service.get_normalization(body)
    
    # 2. 벡터 추출 (Embedding) 
    embedding = await llm_service.get_embedding(analysis['neutral_summary'])
    
    # 3. DB 저장 (is_current 처리 포함 트랜잭션) 
    database.save_normalization(complaint_id, analysis, embedding)
    
    return {"status": "success", "data": analysis}