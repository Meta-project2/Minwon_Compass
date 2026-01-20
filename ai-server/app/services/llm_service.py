import os
from app import database
from typing import List, Dict, Any
from openai import OpenAI

# [필수] OpenAI API Key 설정
# os.environ["OPENAI_API_KEY"] = "sk-..." 
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not OPENAI_API_KEY:
    print("⚠️ 경고: OPENAI_API_KEY가 설정되지 않았습니다.")

client = OpenAI(api_key=OPENAI_API_KEY)

class LLMService:
    def __init__(self):
        self.embed_model = "text-embedi-large" 
        # 빠르고 성능 좋은 GPT-4o-mini 사용
        self.chat_model = "gpt-4o-mini"

    async def get_embedding(self, text: str) -> List[float]:
        """Ollama를 사용하여 텍스트를 벡터로 변환 (DB와 호환)"""
        try:
            # Ollama 호출
            response = ollama.embeddings(model=self.embed_model, prompt=text)
            return response['embedding']
        except Exception as e:
            print(f"❌ Ollama 임베딩 생성 실패: {e}")
            return []

    async def generate_response(self, complaint_id: int, user_query: str = None, action: str = "chat") -> Dict[str, Any]:
        """
        action 종류:
         - 'search_law': '관련 규정/매뉴얼 찾아줘' 버튼 클릭 시
         - 'chat': 채팅창에 직접 입력 시
        """
        
        laws = []
        
        # 1. DB 검색 단계 (Action에 따라 검색 방식 분기)
        if action == "search_law":
            print(f"🔍 [Button] 민원 #{complaint_id} 관련 법령 자동 검색")
            # 민원 ID를 기준으로, 민원 내용과 유사한 법령을 DB에서 찾음
            laws = database.search_laws_by_id(complaint_id, limit=3)
            
        else: # action == 'chat'
            print(f"🔍 [Chat] 사용자 질문 검색: {user_query}")
            # 사용자가 입력한 질문(user_query)을 벡터로 만들어 검색
            if user_query:
                vec = await self.get_embedding(user_query)
                if vec:
                    # 키워드 검색과 벡터 검색을 동시에 수행
                    laws = database.search_laws_by_text(vec, limit=3, keyword=user_query)

        # 2. 프롬프트용 참고자료 텍스트 조립
        context_text = ""
        if not laws:
            context_text = "(검색된 관련 법령/규정이 없습니다.)"
        else:
            for i, law in enumerate(laws, 1):
                # database.py에서 반환하는 키값(title, article_no, chunk_text 등)을 안전하게 가져옴
                title = law.get('title', '법령')
                article = law.get('article_no') or law.get('section', '')
                content = law.get('chunk_text') or law.get('content', '')
                context_text += f"[{i}] {title} {article}\n   - 내용: {content[:400]}...\n\n"

        # 3. LLM 페르소나 및 프롬프트 설정 (Action에 따라 다르게)
        if action == "search_law":
            # 버튼 클릭 시: 법령을 요약해서 알려줌
            system_role = "당신은 민원 법령 검색 도우미입니다. [참고 자료]를 바탕으로 이 민원과 관련된 핵심 규정을 요약해서 설명해주세요."
            user_msg = f"이 민원을 처리할 때 참고해야 할 관련 법령이나 규정을 알려줘.\n\n[참고 자료]:\n{context_text}"
            
        else: # chat
            # 채팅 입력 시: 질문에 대한 정답을 알려줌
            system_role = "당신은 법률 상담 AI입니다. 반드시 아래 [참고 자료]에 있는 내용만을 근거로 사용자의 질문에 답변하세요. 근거가 없다면 없다고 말하세요."
            user_msg = f"질문: {user_query}\n\n[참고 자료]:\n{context_text}"

        # 4. LLM 답변 생성
        ai_answer = ""
        try:
            response = client.chat.completions.create(
                model=self.chat_model,
                messages=[
                    {"role": "system", "content": system_role},
                    {"role": "user", "content": user_msg}
                ],
                temperature=0.3 # 사실기반 답변을 위해 낮음 유지
            )
            ai_answer = response.choices[0].message.content
        except Exception as e:
            ai_answer = f"죄송합니다. 답변 생성 중 오류가 발생했습니다. ({str(e)})"

        # 5. 최종 결과 반환
        # answer: 채팅창에 뜰 텍스트
        # documents: 우측 사이드바에 뜰 카드 데이터
        return {
            "answer": ai_answer,
            "documents": laws 
        }