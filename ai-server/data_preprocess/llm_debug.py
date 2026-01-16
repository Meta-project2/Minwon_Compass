import psycopg2
import json
from ollama import Client

# 1. 설정
client = Client(host='http://127.0.0.1:11434')
DB_CONFIG = {
    "host": "localhost",
    "database": "complaint_db",
    "user": "postgres",
    "password": "0000",
    "port": 5432
}
LLM_MODEL = "gemma2:9b"
EMBED_MODEL = "mxbai-embed-large"

def preprocess_query(raw_complaint):
    """사용자 민원을 DB 검색용 포맷(Topic + Keywords)으로 변환"""
    print(f"\n[1단계] LLM 전처리 시작...")
    
    prompt = f"""
    당신은 민원 행정 데이터 전문 분석가입니다. 아래 민원 내용을 분석하여 검색에 최적화된 형태로 요약하세요.
    반드시 아래 JSON 형식으로만 응답하세요.

    [민원 원문]
    {raw_complaint}

    [응답 규칙]
    1. topic: 민원의 핵심 주제를 1문장으로 요약
    2. keywords: 핵심 명사 5개를 리스트 형태로 추출
    
    [JSON 형식]
    {{
        "topic": "핵심 주제 요약",
        "keywords": ["키워드1", "키워드2", "키워드3", "키워드4", "키워드5"]
    }}
    """
    
    response = client.generate(model=LLM_MODEL, prompt=prompt, format="json", stream=False)
    parsed = json.loads(response['response'])
    
    # DB의 search_text와 동일한 구조 생성
    processed_text = f"{parsed['topic']} {', '.join(parsed['keywords'])}"
    print(f"✨ 전처리 결과: {processed_text}")
    return processed_text

def search_complaint_top5(raw_input):
    # 1. LLM 전처리 (Query Transformation)
    search_query = preprocess_query(raw_input)
    
    # 2. 임베딩 생성
    print(f"[2단계] 벡터 생성 중...")
    embed_resp = client.embeddings(model=EMBED_MODEL, prompt=search_query)
    query_vector = embed_resp['embedding']

    # 3. DB 검색
    print(f"[3단계] 유사 민원 검색 중...")
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    
    sql = """
    SELECT id, resp_dept, topic, keywords, 
           1 - (embedding <=> %s::vector) AS similarity
    FROM complaint_normalizations
    ORDER BY similarity DESC
    LIMIT 5;
    """
    
    cur.execute(sql, (query_vector,))
    rows = cur.fetchall()
    
    print(f"\n{'순위':<4} | {'ID':<6} | {'유사도':<8} | {'담당 부서':<15} | {'핵심 주제'}")
    print("-" * 100)
    
    for i, row in enumerate(rows, 1):
        db_id, dept, topic, keywords, score = row
        print(f"{i:<5} | {db_id:<6} | {score:.4f} | {dept:<15} | {topic}")
        print(f"      └─ 키워드: {keywords}")

    cur.close()
    conn.close()

# --- 실제 테스트 실행 ---
# 아주 장황한 민원 원문을 넣어보세요.
user_raw_complaint = """
1. 상일동 고덕3단지(아)재건축조합에서는 2017년9월 개최 한 총회에서 조합원의 기본이주비 금융비용에 대한 금융비용은 유이자 사업금융비용에서 사용하며, 기본이주비 대출여부와 상관없이 개별정산하지 않음을 의결(총회회의자료 116페이지 참조)하였읍니다.

2. 조합에서 단체납부 한 대출이자에 대하여 우리은행 계좌에 납부해야만 신축아파트 키를 불출한 조합장 벌칙부과에 대하여 3회 문의 합니다.
문 의 : 조합에서 단체납부 한 대출이자에 대하여 조합 우리은행 계좌에 납부해야만 신축아파트 키를 불출한 조합장 벌칙부과 문의 및 민원상담 269230호로 엉터리 답변 한 재건축재개발과 담당자 벌칙부과 문의에 대하여 재건축재개발과에서 계속적 반복적으로 엉터리 답변을하여도 되는지요 ? 끝.
"""

search_complaint_top5(user_raw_complaint)