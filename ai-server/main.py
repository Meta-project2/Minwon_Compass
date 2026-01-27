from fastapi import FastAPI, HTTPException, Request
from openai import OpenAI
from pydantic import BaseModel
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
from pydantic import BaseModel
from datetime import datetime
from sqlalchemy import Integer, create_engine, Column, BigInteger, String, Text, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.dialects.postgresql import JSONB

app = FastAPI(title="Complaint Analyzer AI")


# (CORS 설정)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

my_ai_bot = LLMService()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def get_embedding(text: str):
    try:
        response = client.embeddings.create(
            model="text-embedding-3-large",
            input=text,
            dimensions=1024
        )

        embedding_vector = response.data[0].embedding

        return embedding_vector

    except Exception as e:
        print(f"OpenAI Embedding Error: {e}")
        return None

@app.get("/")
async def root():
    return {"message": "서버 연결 성공 "}

class ChatRequest(BaseModel):
    query: str = None
    action: str = "chat"


# --- AI 초안 작성 엔드포인트 ---
@app.post("/api/v2/complaints/{complaint_id}/generate-draft")
async def generate_draft_endpoint(complaint_id: int, request: ChatRequest):
    """
    [AI 초안 작성]
    request.query에는 현재 민원 본문(body)이 들어옵니다.
    """
    try:
        user_complaint_body = request.query

        result_text = await my_ai_bot.generate_draft(complaint_id, user_complaint_body)

        return {"status": "success", "data": result_text}

    except Exception as e:
        print(f"Error generating draft: {e}")
        return {"status": "error", "message": str(e)}

# AI 채팅 엔드포인트
@app.post("/api/v2/complaints/{complaint_id}/ai-chat")
async def chat_with_ai(complaint_id: int, request: ChatRequest):
    try:
        if request.query:
            database.save_chat_log(complaint_id, "user", request.query)

        result = await my_ai_bot.generate_response(
            complaint_id=complaint_id,
            user_query=request.query,
            action=request.action
        )
        if result and "answer" in result:
            database.save_chat_log(complaint_id, "assistant", result["answer"])

        return {"status": "success", "data": result}
    except Exception as e:
        print(f"Error: {e}")
        return {"status": "error", "message": str(e)}


# 대화 기록 조회 엔드포인트
@app.get("/api/v2/complaints/{complaint_id}/chat-history")
async def get_chat_history(complaint_id: int):
    """민원별 과거 채팅 기록 조회"""
    try:
        logs = database.get_chat_logs(complaint_id)
        return {"status": "success", "data": logs}
    except Exception as e:
        return {"status": "error", "message": str(e)}
    
# 요청 데이터 모델
class ComplaintRequest(BaseModel):
    id: int 
    title: str
    body: str
    addressText: str 
    lat: float
    lon: float 
    applicantId: int
    districtId: int

@app.post("/api/complaints/preprocess")
async def preprocess_complaint(req: ComplaintRequest, request: Request):
    body = await request.body()
    print(f"받은 원본 데이터: {body.decode()}")
    try:
        api_key = os.getenv("LANGFLOW_KEY")
        # url = "http://complaint-langflow:7860/api/v1/run/59369f82-0d62-414e-bd20-9bc5f9aa8a50"
        # 서버 전용 langflow api url
        url = "http://complaint-langflow:7860/api/v1/run/86111065-2582-4a9f-a41c-ce2d8800d198"

        for i in req:
            print(i)

        payload = {
            "output_type": "chat",
            "input_type": "text",
            "tweaks": {

                # "TextInput-MBAG": {
                #     "input_value": req.title
                # },
                # "TextInput-NNDwa": {
                #     "input_value": req.body
                # }
                
                # 서버 전용
                "TITLE-srPg5": {
                    "input_value": req.title
                },
                "BODY-hfM2I": {
                    "input_value": req.body
                }
            }
        }
        payload["session_id"] = str(uuid.uuid4())
        headers = {"x-api-key": api_key}
        response = requests.request("POST", url, json=payload, headers=headers)
        response.raise_for_status()
        
        # 결과 파싱
        result_json = response.json()
        ai_text = result_json['outputs'][0]['outputs'][0]['results']['message']['data']['text']
        
        embedding_vector = None
        
        try:
            clean_json_str = re.sub(r'```json\n|```', '', ai_text).strip()
            inner_data = json.loads(clean_json_str)
            original = inner_data.get("original_analysis", {})
            text_to_embed = f"{original.get('topic', '')} {original.get('keywords', '')} {original.get('category', '')}"
        
            if text_to_embed.strip():
                embedding_vector = get_embedding(text_to_embed)
                print(f"임베딩 생성 완료 (차원: {len(embedding_vector)})")
        except Exception as parse_err:
            print(f"임베딩 처리 중 파싱 오류: {parse_err}")

        return {
            "status": "success",
            "data": ai_text,
            "embedding": embedding_vector
        }
        
    except Exception as e:
        print(f"처리 중 오류 발생: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)