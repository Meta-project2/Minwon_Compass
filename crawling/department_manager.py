import json
import logging
from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate

# 로깅 설정
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger(__name__)

class DepartmentManager:
    def __init__(self):
        self.llm = ChatOllama(model="llama3.1", temperature=0)
        
        # [설정] 표준 카테고리 목록
        self.CATEGORIES = [
            "불법주차", "도로/시설물", "청소/쓰레기", "소음/악취", 
            "공원/녹지", "건축/허가", "보건/위생", "교통/버스", "세금/행정", "기타"
        ]
        
        # [설정] 구청별 조직도 데이터 (나중에는 json 파일에서 불러오도록 확장 가능)
        # 지금은 코드에 두지만, 구조를 딕셔너리로 명확히 분리함
        self.DISTRICT_MAP = {
            "강남구": {"불법주차": "주차관리과", "도로/시설물": "도로관리과", "청소/쓰레기": "청소행정과", "소음/악취": "환경과"},
            "마포구": {"불법주차": "교통지도과", "도로/시설물": "토목과", "청소/쓰레기": "청소행정과", "소음/악취": "환경과"},
            "노원구": {"불법주차": "교통지도과", "도로/시설물": "토목과", "청소/쓰레기": "자원순환과", "소음/악취": "보건위생과"}
        }

    def classify_and_match(self, text: str, district: str) -> dict:
        """민원 내용을 분석하여 카테고리를 찾고, 해당 구청 부서를 배정합니다."""
        
        # 1. AI에게 카테고리 분류 요청
        category = self._get_ai_category(text)
        
        # 2. 구청 조직도에서 부서 찾기
        dept_name = self._find_dept(district, category)
        
        return {
            "category": category,
            "district": district,
            "department": dept_name
        }

    def _get_ai_category(self, text):
        """내부 함수: AI를 이용한 카테고리 분류"""
        category_str = ", ".join(self.CATEGORIES)
        template = f"""
        너는 민원 분류 시스템이야. 아래 내용을 읽고 [카테고리 목록] 중 하나를 골라줘.
        설명 없이 카테고리 단어만 딱 출력해.
        
        [목록] {category_str}
        [내용] {{text}}
        """
        try:
            prompt = ChatPromptTemplate.from_template(template)
            chain = prompt | self.llm
            response = chain.invoke({"text": text})
            result = response.content.strip()
            
            # AI가 목록에 없는 말을 할 경우를 대비해 필터링
            for cat in self.CATEGORIES:
                if cat in result:
                    return cat
            return "기타"
        except Exception:
            return "기타"

    def _find_dept(self, district, category):
        """내부 함수: 매핑 테이블에서 부서 조회"""
        if district not in self.DISTRICT_MAP:
            return "민원여권과 (기본)" # 구청 정보가 없으면 기본 부서
        
        # 해당 카테고리의 담당 부서 가져오기 (없으면 민원여권과)
        return self.DISTRICT_MAP[district].get(category, "민원여권과")

# ==========================================
# 테스트
# ==========================================
if __name__ == "__main__":
    manager = DepartmentManager()
    
    print("🚀 부서 배정 매니저 테스트")
    test_case = "홍대입구역 앞에 쓰레기가 너무 많아요."
    result = manager.classify_and_match(test_case, "마포구")
    
    print(f"민원: {test_case}")
    print(f"결과: {result}") 
    # 예상 결과: {'category': '청소/쓰레기', 'district': '마포구', 'department': '청소행정과'}