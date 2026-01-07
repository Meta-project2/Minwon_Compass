import logging
import re
import datetime
from collections import deque
from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate

# 로깅 설정
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger(__name__)

class RiskManager:
    def __init__(self):
        # 1. 1차 필터용 욕설 리스트 (이건 즉시 탐지용)
        self.bad_words = ["죽여", "개새", "미친", "씨발", "병신", "존나"]
        
        # 2. 2차 정밀 분석용 AI
        self.llm = ChatOllama(model="llama3.1", temperature=0)
        
        # 3. 급증 감지용 메모리 (최대 1000개까지만 기억하도록 제한 -> 메모리 보호)
        self.surge_memory = deque(maxlen=1000)

    def calculate_risk_score(self, text: str) -> dict:
        """악성 민원 점수(0~100)를 산출합니다."""
        
        # [1단계] 욕설 사전 검사 (빠름)
        for word in self.bad_words:
            if word in text:
                logger.warning(f"🚨 욕설 사전 탐지: '{word}'")
                return {"is_danger": True, "score": 100, "reason": f"욕설 감지({word})"}
        
        # [2단계] AI 정밀 분석 (문맥 파악)
        template = """
        너는 [악성 민원 판독관]이야.
        아래 민원 내용을 읽고 '악성 지수(0~100)'를 매겨줘.
        
        [채점 기준]
        - 0~20점: 정상 (단순 불만, 건의)
        - 21~60점: 주의 (다소 거친 표현, 반말)
        - 61~100점: 심각 (욕설, 인격모독, 살해 협박, 성희롱)
        
        응답은 오직 숫자만 출력해. (예: 15)
        
        [민원 내용]
        {text}
        """
        try:
            prompt = ChatPromptTemplate.from_template(template)
            chain = prompt | self.llm
            response = chain.invoke({"text": text})
            
            # 숫자만 추출
            score_str = ''.join(filter(str.isdigit, response.content))
            score = int(score_str) if score_str else 0
            
            is_danger = score >= 70 # 70점 넘으면 위험으로 판단
            
            return {"is_danger": is_danger, "score": score, "reason": "AI 분석 결과"}
            
        except Exception as e:
            logger.error(f"AI 분석 실패: {e}")
            return {"is_danger": False, "score": 0, "reason": "분석 실패"}

    def check_surge(self, location: str, category: str) -> dict:
        """특정 지역+카테고리의 민원 급증 여부를 판단합니다."""
        now = datetime.datetime.now()
        
        # 현재 민원 등록
        self.surge_memory.append({
            "time": now,
            "loc": location,
            "cat": category
        })
        
        # 최근 10분간 같은 지역+카테고리 개수 세기
        count = 0
        limit_time = now - datetime.timedelta(minutes=10)
        
        for record in self.surge_memory:
            if record["time"] > limit_time:
                if record["loc"] == location and record["cat"] == category:
                    count += 1
        
        # 기준: 10분 안에 5건 이상이면 '폭주'
        is_surge = count >= 5
        
        return {
            "is_surge": is_surge, 
            "count": count, 
            "msg": f"현재 {location}에 '{category}' 민원이 {count}건 접수됨" if is_surge else "정상"
        }

# ==========================================
# 실행 테스트
# ==========================================
if __name__ == "__main__":
    manager = RiskManager()
    
    test_text = "일 처리를 왜 이렇게 늦게 합니까? 진짜 짜증나네."
    bad_text = "야이 개새끼들아 당장 튀어와라 죽여버린다."
    
    # 1. 악성 탐지 테스트
    print(f"텍스트: {test_text} => {manager.calculate_risk_score(test_text)}")
    print(f"텍스트: {bad_text} => {manager.calculate_risk_score(bad_text)}")
    
    # 2. 급증 탐지 테스트
    print("\n🔥 급증 테스트 중...")
    for _ in range(6):
        res = manager.check_surge("강남구", "불법주차")
        print(res)


# 악성/급증 민원 탐지기