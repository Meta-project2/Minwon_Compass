import time
import re
import requests
import json
from konlpy.tag import Okt

OLLAMA_URL = "http://localhost:11434/api"

class LLMService:
    def __init__(self):
        try:
            # Okt는 한 번 로드할 때 시간이 걸리므로 생성자에서 초기화합니다.
            self.okt = Okt()
        except Exception as e:
            print(f"KoNLPy 로드 실패 (Java 설정을 확인하세요): {e}")
            self.okt = None

    def preprocess(self, text):
        # 특수문자만 제거하고 문장은 그대로 둡니다.
        text = re.sub(r'[^가-힣a-zA-Z0-9\s.,!?]', '', text)
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    async def get_normalization(self, body: str):
        """LLM을 호출하여 민원을 정규화된 JSON 구조로 변환합니다."""
        
        # 전처리 수행
        preprocess_body = self.preprocess(body)

        print(f"[*] 전처리된 민원 내용: {preprocess_body}")

        prompt = f"""
            당신은 대한민국 구청의 민원 분석 전문가입니다. 
            다음은 시민이 접수한 민원 내용입니다. 내용을 정확히 읽고 반드시 '한국어'로 분석하세요.

            [민원 내용]
            {preprocess_body}

            [응답 양식]
            반드시 아래의 JSON 형식을 지켜서 한국어로 답변하세요.
            {{
            "neutral_summary": "객관적인 요약 내용",
            "core_request": "민원인의 핵심 요구사항",
            "core_cause": "민원 발생 원인",
            "target_object": ["대상물1", "대상물2"],
            "keywords": ["키워드1", "키워드2"]
            }}
            """
        
        response = requests.post(f"{OLLAMA_URL}/generate", json={
            "model": "gemma2:2b", 
            "prompt": prompt, 
            "format": "json", 
            "stream": False
        })

        if response.status_code == 200:
            # 3. LLM의 응답(JSON 문자열)을 파이썬 딕셔너리로 변환
            result_dict = json.loads(response.json()['response'])
            
            # 4. 전처리된 원본 데이터를 결과에 추가
            result_dict['preprocess_body'] = preprocess_body
            
            return result_dict
        else:
            raise Exception(f"Ollama API Error: {response.text}")


    async def get_embedding(self, text: str):
        """텍스트를 벡터로 변환합니다. (mxbai-embed-large: 1024차원)"""
        response = requests.post(f"{OLLAMA_URL}/embeddings", json={
            "model": "mxbai-embed-large", 
            "prompt": text
        })
        if response.status_code == 200:
            return response.json()['embedding']
        else:
            raise Exception(f"Ollama Embedding Error: {response.text}")

    async def get_embedding_with_answer(self, complaint, department, answer):
        """민원, 부서명, 답변을 결합하여 벡터로 변환합니다."""
        combined_text = f"민원: {complaint}\n부서명: {department}\n답변: {answer}"
        return await self.get_embedding(combined_text)