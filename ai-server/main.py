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
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from datetime import datetime
from sqlalchemy import Integer, create_engine, Column, BigInteger, String, Text, DateTime
from sqlalchemy.ext.declarative import declarative_base
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

        # 디버깅용 차원 확인
        print(f"임베딩된 차원: {len(embedding_vector)}")

        return embedding_vector

    except Exception as e:
        print(f"OpenAI Embedding Error: {e}")
        return None

# 테스트
@app.get("/")
async def root():
    return {"message": "서버 연결 성공 "}

# 요청 데이터 구조 정의
class ChatRequest(BaseModel):
    query: str = None
    action: str = "chat"


# --- AI 초안 작성 엔드포인트 ---
@app.post("/api/complaints/{complaint_id}/generate-draft")
async def generate_draft_endpoint(complaint_id: int, request: ChatRequest):
    """
    [AI 초안 작성]
    request.query에는 현재 민원 본문(body)이 들어옵니다.
    """
    try:
        # request.query가 비어있으면 DB에서 직접 조회하는 로직을 추가해도 됨
        # 여기서는 프론트가 보내준다고 가정
        user_complaint_body = request.query

        result_text = await my_ai_bot.generate_draft(complaint_id, user_complaint_body)

        return {"status": "success", "data": result_text}

    except Exception as e:
        print(f"Error generating draft: {e}")
        return {"status": "error", "message": str(e)}

# --- 통합 AI 채팅 엔드포인트 ---
@app.post("/api/complaints/{complaint_id}/ai-chat")
async def chat_with_ai(complaint_id: int, request: ChatRequest):
    try:
        # (1) 사용자 질문 저장 (버튼 클릭 등 query가 있을 때만)
        if request.query:
            database.save_chat_log(complaint_id, "user", request.query)

        # (2) AI 응답 생성
        result = await my_ai_bot.generate_response(
            complaint_id=complaint_id,
            user_query=request.query,
            action=request.action
        )

        # (3) AI 답변 저장
        if result and "answer" in result:
            database.save_chat_log(complaint_id, "assistant", result["answer"])

        return {"status": "success", "data": result}
    except Exception as e:
        print(f"Error: {e}")
        return {"status": "error", "message": str(e)}


# 2. [신규] 대화 기록 조회 엔드포인트 추가 (파일 맨 아래쪽 등에 추가)
@app.get("/api/complaints/{complaint_id}/chat-history")
async def get_chat_history(complaint_id: int):
    """민원별 과거 채팅 기록 조회"""
    try:
        logs = database.get_chat_logs(complaint_id)
        return {"status": "success", "data": logs}
    except Exception as e:
        return {"status": "error", "message": str(e)}
    
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
        # url = "http://complaint-langflow:7860/api/v1/run/59369f82-0d62-414e-bd20-9bc5f9aa8a50"  # The complete API endpoint URL for this flow
        # 서버 전용 langflow api url
        url = "http://complaint-langflow:7860/api/v1/run/f35aeaf3-31a1-4e73-a235-f1ad3d60553f"

        for i in req:
            print(i)

        # Request payload configuration
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
                "TITLE-n1ba7": {
                    "input_value": req.title
                },
                "BODY-5L6tb": {
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
        
        embedding_vector = None
        
        try:
            # 마크다운 태그 제거 후 JSON 파싱
            clean_json_str = re.sub(r'```json\n|```', '', ai_text).strip()
            inner_data = json.loads(clean_json_str)
            
            # 임베딩 대상 텍스트 생성 (주제와 키워드 결합)
            original = inner_data.get("original_analysis", {})
            text_to_embed = f"{original.get('topic', '')} {original.get('keywords', '')} {original.get('category', '')}"
            
            # 3. 임베딩 생성 호출
            if text_to_embed.strip():
                embedding_vector = get_embedding(text_to_embed)
                print(f"임베딩 생성 완료 (차원: {len(embedding_vector)})")
        except Exception as parse_err:
            print(f"임베딩 처리 중 파싱 오류: {parse_err}")

        # 4. 최종 결과 반환 (embedding 필드 추가)
        return {
            "status": "success",
            "data": ai_text,
            "embedding": embedding_vector  # Java의 double[]로 매핑됨
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