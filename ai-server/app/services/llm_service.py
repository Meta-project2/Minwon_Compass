import os
from app import database
from typing import List, Dict, Any
from openai import OpenAI

# [필수] OpenAI API Key 설정
# 환경 변수에서 가져오기
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not OPENAI_API_KEY:
    print("⚠️ 경고: OPENAI_API_KEY가 설정되지 않았습니다. .env 파일을 확인하세요.")

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


class LLMService:
    def __init__(self):
        # ★ 수정됨: 모델명 오타 수정 및 OpenAI 모델 지정
        self.embed_model = "text-embedding-3-large"
        # 빠르고 성능 좋은 GPT-4o-mini 사용
        self.chat_model = "gpt-4o-mini"

    async def get_embedding(self, text: str) -> List[float]:
        """OpenAI를 사용하여 텍스트를 벡터로 변환 (DB와 호환)"""
        try:
            # 줄바꿈 제거 (OpenAI 권장)
            text = text.replace("\n", " ")

            # ★ 수정됨: OpenAI API 호출로 변경
            response = client.embeddings.create(
                input=[text],
                model=self.embed_model,
                dimensions=1024  # DB와 차원수 일치 필수
            )
            return response.data[0].embedding
        except Exception as e:
            print(f"❌ OpenAI 임베딩 생성 실패: {e}")
            return []

    async def generate_response(self, complaint_id: int, user_query: str = None, action: str = "chat") -> Dict[
        str, Any]:
        """
        action 종류:
         - 'search_law': '관련 규정...' 버튼 (법령 검색)
         - 'search_case': '유사 사례...' 버튼 (과거 사례 요약) ★ 추가됨
         - 'chat': 일반 채팅
        """
        laws = []
        cases = []
        system_role = ""
        user_msg = ""

        # 1. 분기 처리
        if action == "search_law":
            print(f"🔍 [Button] 민원 #{complaint_id} 법령 검색")
            laws = database.search_laws_by_id(complaint_id, limit=3)

            # 법령 컨텍스트 조립
            context_text = ""
            for i, law in enumerate(laws, 1):
                title = law.get('title', '법령')
                content = law.get('chunk_text') or law.get('content', '')
                context_text += f"[{i}] {title}\n   내용: {content[:400]}...\n\n"

            system_role = "당신은 민원 법령 검색 도우미입니다. [참고 자료]를 바탕으로 핵심 규정을 요약해 주세요."
            user_msg = f"이 민원과 관련된 법령/규정을 찾아줘.\n\n[참고 자료]:\n{context_text}"
            # [app/services/llm_service.py] 내부 generate_response 함수 중 search_case 부분 수정

        elif action == "search_case":
            print(f"🔍 [Button] 민원 #{complaint_id} 유사 사례 검색")
            # 1. DB에서 유사 사례 조회
            raw_cases = database.search_cases_by_id(complaint_id, limit=3)

            # [디버깅]
            print(f"   --> 1차 검색된 개수: {len(raw_cases)}개")
            for idx, c in enumerate(raw_cases):
                print(f"   --> [후보 {idx + 1}] 유사도: {c.get('similarity')}% / 내용: {c.get('body')[:20]}...")

            # 2. [신규 기능] 유사도 60% 미만은 버림 (Threshold)
            cases = [c for c in raw_cases if c.get('similarity', 0) >= 00.0]
            # 3. 쓸만한 사례가 하나도 없으면 바로 종료
            if not cases:
                print("   --> 🚨 필터링 후 남은 사례가 0개여서 즉시 리턴합니다.")
                return {
                    "answer": "과거 데이터 분석 결과, 현재 민원과 유사도가 높은 처리 사례가 없습니다. (유사도 60% 이상 건 없음)",
                    "documents": []
                }
            # 4. 사례가 있으면 요약 진행
            context_text = ""
            for i, case in enumerate(cases, 1):
                body = case.get('body', '')[:200]
                answer = case.get('answer', '')[:400]
                similarity = case.get('similarity', 0)
                context_text += f"[사례 {i}] (유사도 {similarity}%)\n- 민원내용: {body}...\n- 처리결과: {answer}...\n\n"
            system_role = "당신은 민원 분석가입니다. 과거 유사 사례들의 **공통된 처리 결과와 조치 내용**을 핵심만 요약해서 보고해 주세요."
            user_msg = f"이 민원과 유사도 60% 이상인 과거 사례 {len(cases)}건입니다. 어떻게 처리되었는지 결과를 요약해줘.\n\n[과거 사례]:\n{context_text}"

        else:  # 'chat'
            print(f"🔍 [Chat] 사용자 질문: {user_query}")
            if user_query:
                vec = await self.get_embedding(user_query)
                if vec:
                    laws = database.search_laws_by_text(vec, limit=3, keyword=user_query)

            context_text = ""
            for i, law in enumerate(laws, 1):
                title = law.get('title', '법령')
                content = law.get('chunk_text') or law.get('content', '')
                context_text += f"[{i}] {title}\n   내용: {content[:400]}...\n\n"

            system_role = "당신은 법률 상담 AI입니다. [참고 자료]를 근거로 답변하세요. 근거가 없으면 없다고 하세요."
            user_msg = f"질문: {user_query}\n\n[참고 자료]:\n{context_text}"

        # 2. LLM 호출
        ai_answer = ""
        try:
            response = client.chat.completions.create(
                model=self.chat_model,
                messages=[
                    {"role": "system", "content": system_role},
                    {"role": "user", "content": user_msg}
                ],
                temperature=0.3
            )
            ai_answer = response.choices[0].message.content
        except Exception as e:
            ai_answer = f"오류 발생: {str(e)}"

        # 3. 결과 반환 (문서나 사례 리스트도 같이 반환)
        return {
            "answer": ai_answer,
            "documents": laws if action != 'search_case' else cases  # 사례 검색이면 사례를 반환
        }

    async def generate_draft(self, complaint_id: int, complaint_body: str) -> str:
        """
        [AI 초안 작성]
        - 과거 유사 답변(Reference) + RAG(법령) -> 최종 초안 생성
        """
        # 1. 과거 답변 가져오기 (Step 1~3)

        past_answer = database.get_reference_answer(complaint_id)

        # 2. 관련 법령 검색 (RAG)
        law_text = ""
        if complaint_body:
            # (1) 텍스트 -> 벡터 변환 (기존 메서드 활용)
            vec = await self.get_embedding(complaint_body)

            if vec:
                # (2) 벡터로 법령 검색 (기존에 있던 함수!)
                laws = database.search_laws_by_text(vec, limit=3)

                # (3) 결과 텍스트로 변환
                law_text = "\n\n".join([
                    f"- {law.get('title')} {law.get('section', '')}: {law.get('content', '')[:200]}..."
                    for law in laws
                ])

        # 3. 프롬프트 구성 (분기 처리)
        system_role = "당신은 강동구청의 베테랑 주무관입니다. 민원인에게 정중하고 명확하게 답변해야 합니다."

        if past_answer:
            # Case A: 과거 답변 있음 (모방)
            prompt = f"""
            [지시사항]
            아래 제공된 '과거 유사 답변'의 **말투, 형식, 인사말, 맺음말 스타일**을 철저히 참고하여,
            '현재 민원 내용'에 대한 답변 초안을 작성해주세요.

            단, 적용되는 법적 근거는 '과거 답변'의 내용이 아니라, 아래 제공된 '최신 관련 법령'을 우선적으로 인용해야 합니다.
            (과거 답변의 법령이 구형일 수 있으므로 주의하세요.)

            [현재 민원 내용]
            {complaint_body}

            [최신 관련 법령 (Fact Check용)]
            {law_text}

            [참고할 과거 유사 답변 (Style Reference)]
            {past_answer}

            [작성할 답변]
            """
            warning_msg = ""
        else:
            # Case B: 과거 답변 없음 (생성)
            prompt = f"""
            [지시사항]
            아래 '관련 법령'을 근거로 '현재 민원 내용'에 대한 답변 초안을 작성해주세요.
            서론(공감 및 인사) - 본론(법적 근거 및 답변) - 결론(문의처 안내 및 맺음말) 형식을 갖춰주세요.

            [현재 민원 내용]
            {complaint_body}

            [관련 법령]
            {law_text}

            [작성할 답변]
            """
            warning_msg = "(알림: 유사 사례가 없어 법령 기반으로만 작성되었습니다.)\n\n"

        # 4. LLM 호출
        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",  # 또는 gpt-4o
                messages=[
                    {"role": "system", "content": system_role},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3  # 초안은 일관성 있게
            )
            draft_content = response.choices[0].message.content
            return warning_msg + draft_content

        except Exception as e:
            return f"오류가 발생하여 초안을 작성하지 못했습니다. ({str(e)})"