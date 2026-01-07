import logging
from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings, ChatOllama
from langchain_core.prompts import ChatPromptTemplate

# 로깅 설정
logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

class LegalAdvisor:
    def __init__(self):
        DB_PATH = "legal_vector_db"
        # ⚡ [중요] 여기를 'nomic-embed-text'로 바꿔야 DB를 읽을 수 있습니다!
        embeddings = OllamaEmbeddings(model="nomic-embed-text")
        
        try:
            self.db = Chroma(persist_directory=DB_PATH, embedding_function=embeddings)
            logger.info("⚖️ 법률 데이터베이스 로드 완료.")
        except Exception:
            self.db = None

        self.llm = ChatOllama(model="llama3.1", temperature=0)

    def advise(self, complaint_text):
        if not self.db:
            return "법령 DB가 없습니다."

        # 1. 유사 판례/법령 검색
        results = self.db.similarity_search(complaint_text, k=3)
        if not results:
            return "관련된 법적 근거를 찾지 못했습니다."

        context_text = "\n\n".join([f"[참고 {i+1}] {doc.page_content[:300]}..." for i, doc in enumerate(results)])
        
        # 2. AI 조언 생성
        template = """
        너는 [법률 전문 AI]야. 검색된 [법령/판례]를 근거로 시민에게 조언해줘.
        
        [질문] {complaint}
        [근거] {context}
        
        [답변 형식]
        1. 관련 법령/판례 요약
        2. 취할 수 있는 법적 조치
        (말투는 정중하게)
        """
        chain = ChatPromptTemplate.from_template(template) | self.llm
        response = chain.invoke({"complaint": complaint_text, "context": context_text})
        
        return response.content