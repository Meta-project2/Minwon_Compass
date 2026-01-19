from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from app.services import llm_service
from app import database
from app.services.llm_service import LLMService
from fastapi.middleware.cors import CORSMiddleware
import requests
import os
import uuid
import os
import re
import json
import uuid
import requests
import textwrap
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from datetime import datetime
import google.generativeai as genai
from sqlalchemy import Integer, create_engine, Column, BigInteger, String, Text, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects.postgresql import JSONB

app = FastAPI(title="Complaint Analyzer AI")


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
    
# --- 요청 데이터 모델 ---
class ComplaintRequest(BaseModel):
    id: int # 민원 PK
    title: str # 민원 제목
    body: str # 민원 본문
    addressText: str # 도로명 주소 (지도에서 변환된 값)
    # SQL의 DECIMAL(10,7)과 매핑되도록 BigDecimal 사용 권장
    lat: float # 위도
    lon: float # 경도
    # 추가로 필요한 정보들
    applicantId: int # 민원인 ID (Long)
    districtId: int # 발생 구역 ID (Long)

@app.post("/api/complaints/preprocess")
async def preprocess_complaint(req: ComplaintRequest, request: Request):
    body = await request.body()
    print(f"받은 원본 데이터: {body.decode()}")
    try:
        api_key = os.getenv("LANGFLOW_KEY")
        url = "http://complaint-langflow:7860/api/v1/run/24e840bc-9129-4520-9773-d964f39d9cb8"  # The complete API endpoint URL for this flow

        for i in req:
            print(i)

        # Request payload configuration
        payload = {
            "output_type": "chat",
            "input_type": "text",
            "tweaks": {
                # 찾으신 ID를 정확히 매핑합니다
                "TITLE-vVY6M": {
                    "input_value": req.title
                },
                "BODY-mep0o": {
                    "input_value": req.body
                }
            }
        }
        payload["session_id"] = str(uuid.uuid4())
        headers = {"x-api-key": api_key}

        # Send API request
        response = requests.request("POST", url, json=payload, headers=headers)
        response.raise_for_status()
        
        # 4. 결과 파싱 (Langflow 응답 구조에서 텍스트만 추출)
        result_json = response.json()
        ai_text = result_json['outputs'][0]['outputs'][0]['results']['message']['data']['text']
        
        print(f"AI 분석 완료: {ai_text}")
        
        # 성공 시 실제 AI 분석 결과를 반환
        return {
            "status": "success",
            "data": ai_text
        }
    except Exception as e:
        print(f"처리 중 오류 발생: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        }

# 직접 실행을 위한 블록 (python main.py로 실행 가능)
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)