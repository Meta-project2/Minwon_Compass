import time
import re
import requests
import json
from app import database
from typing import List, Dict

OLLAMA_URL = "http://localhost:11434/api"
MODEL_NAME = "llama3.1"          
EMBED_MODEL = "mxbai-embed-large"

class LLMService:
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
        
        # 주의: gemma2:2b 모델이 설치되어 있어야 합니다 (ollama pull gemma2:2b)
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
        # 주의: 사용 중인 모델의 차원이 1024인지 확인 필수!
        response = requests.post(f"{OLLAMA_URL}/embeddings", json={
            "model": EMBED_MODEL, 
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


    async def optimize_query(self, user_query: str) -> str:
        """사용자의 비정형 질문을 검색에 최적화된 법률/행정 용어로 변환

        예: '스쿨존 딱지 얼마' -> '어린이 보호구역 불법주정차 과태료 부과 기준'

        Args:
            user_query (str): 공무원의 원본 질문

        Returns:
            str: 최적화된 검색어 텍스트
        """
        prompt = f"""
        공무원이 입력한 '실무 검색어'를 '법률/행정 표준 용어'로 변환하세요.
        - 약어는 정식 명칭으로 (스쿨존 -> 어린이 보호구역)
        - 문맥을 보강하여 명확하게 (빨간 통 -> 소방용수시설)
        - 설명 없이 변환된 텍스트만 출력하세요.

        입력: "{user_query}"
        출력:
        """
        try:
            response = requests.post(f"{OLLAMA_URL}/generate", json={
                "model": MODEL_NAME, "prompt": prompt, "stream": False
            })
            return response.json()['response'].strip()
        except Exception as e:
            print(f"⚠️ 쿼리 최적화 실패 (원본 사용): {e}")
            return user_query

    def _clip(self, text: str, max_chars: int) -> str:
        """텍스트 길이를 제한하여 프롬프트 토큰 초과를 방지

        Args:
            text (str): 원본 텍스트
            max_chars (int): 최대 허용 글자 수

        Returns:
            str: 잘린 텍스트 (... 포함)
        """
        if not text: return ""
        text = text.strip()
        if len(text) <= max_chars:
            return text
        return text[:max_chars].rstrip() + "..."

    async def retrieve_references(self, complaint_id: int, query: str = None) -> Dict[str, List]:
        """상황(자동/수동)에 맞춰 DB에서 적절한 참고 자료를 검색

        - query가 없음: 민원 ID 기반 자동 추천 (Context Search)
        - query가 있음: 채팅 질문 기반 하이브리드 검색 (Vector + Keyword)

        Args:
            complaint_id (int): 현재 보고 있는 민원 ID
            query (str, optional): 사용자의 추가 질문

        Returns:
            Dict: 'cases'(유사사례), 'laws'(관련법령) 리스트 포함
        """
        references = { "cases": [], "laws": [] }

        if query is None:
            print(f"🤖 [Auto] 민원 #{complaint_id} 자동 추천 검색 수행")
            references["cases"] = database.search_cases_by_id(complaint_id)
            references["laws"] = database.search_laws_by_id(complaint_id)
        else:
            print(f"👤 [Manual] 사용자 질의 검색: {query}")
            
            # 1. 쿼리 최적화 (실무 용어 -> 법률 용어)
            # [수정] self.optimize_query 호출
            refined_query = await self.optimize_query(query)
            print(f"   -> 변환된 쿼리: {refined_query}")
            
            # 2. 임베딩 생성
            # [수정] self.get_embedding 호출
            query_vec = await self.get_embedding(refined_query)
            
            # 3. 검색 수행 (법령은 키워드 필터링 포함)
            references["cases"] = database.search_cases_by_text(query_vec)
            references["laws"] = database.search_laws_by_text(query_vec, keyword=refined_query)

        return references

    async def generate_rag_response(self, complaint_id: int, user_query: str = None) -> str:
        """RAG 파이프라인을 실행하여 최종 답변을 생성

        Retrieval(검색) -> Augmentation(프롬프트 조립) -> Generation(생성) 단계를 거칩니다.

        Args:
            complaint_id (int): 대상 민원 ID
            user_query (str, optional): 사용자 질문 (없으면 자동 요약 모드)

        Returns:
            str: LLM이 생성한 최종 답변 텍스트
        """
        # 1. Retrieval: 근거 자료 검색
        # [수정] self.retrieve_references 호출
        references = await self.retrieve_references(complaint_id, user_query)
        cases = references['cases']
        laws = references['laws']

        if not cases and not laws:
            return "죄송합니다. 관련된 유사 사례나 법령 데이터를 찾을 수 없습니다."

        # 2. Augmentation: 컨텍스트 조립 (길이 제한 적용)
        context_text = "## 1. 유사 민원 처리 사례\n"
        for i, case in enumerate(cases[:3], 1): # Top-3 제한
            # [수정] self._clip 호출
            context_text += (
                f"[{i}] {case['summary']} (유사도: {case['similarity']}%)\n"
                f"   - 처리결과: {self._clip(case['answer'], 200)}\n"
            )
        
        context_text += "\n## 2. 관련 법령\n"
        for i, law in enumerate(laws[:3], 1): # Top-3 제한
            context_text += (
                f"[{i}] {law['title']} {law['section']} (유사도: {law['similarity']}%)\n"
                f"   - 내용: {self._clip(law['content'], 600)}\n"
            )

        # 상황별 프롬프트 분기
        if user_query:
            system_instruction = f"""
            당신은 공무원 업무 지원 AI입니다. 아래 [참고 자료]를 바탕으로 질문에 대해 명확하게 답변하세요.
            
            [작성 규칙]
            1. 자료에 없는 내용은 추측하지 말고 '자료에서 확인 불가'라고 명시하세요.
            2. 답변 끝에 반드시 인용 출처를 대괄호로 표기하세요 (예: [도로교통법 제32조 참고]).
            3. 공손하고 전문적인 어조를 사용하세요.

            [질문]: "{user_query}"
            """
        else:
            system_instruction = f"""
            당신은 민원 분석 AI입니다. [참고 자료]를 바탕으로 민원 #{complaint_id}의 처리 방향 가이드를 작성하세요.
            
            [작성 규칙]
            1. 유사 사례들이 주로 어떻게 처리되었는지 요약하세요.
            2. 적용 가능한 핵심 법령이 무엇인지 짚어주세요.
            3. 담당자에게 추천하는 처리 방향을 3줄 이내로 제안하세요.
            """

        final_prompt = f"{system_instruction}\n\n[참고 자료]\n{context_text}"

        # 3. Generation: 답변 생성
        try:
            response = requests.post(f"{OLLAMA_URL}/generate", json={
                "model": MODEL_NAME, "prompt": final_prompt, "stream": False
            })
            return response.json()['response'].strip()
        except Exception as e:
            print(f"❌ 생성 실패: {e}")
            return f"답변 생성 중 시스템 오류가 발생했습니다: {str(e)}"