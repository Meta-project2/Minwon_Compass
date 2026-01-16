import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from ollama import Client
from tqdm import tqdm
import ast

# 1. 클라이언트 및 설정
client = Client(host='http://127.0.0.1:11434')

# ================= 설정 섹션 =================
DB_CONFIG = {
    "host": "localhost",
    "database": "complaint_db",
    "user": "postgres",
    "password": "0000",
    "port": 5432
}
EMBED_MODEL = "mxbai-embed-large" # 1024차원
INPUT_CSV = "강동구_structured.csv"  # LLM 처리가 완료된 최신 파일명
# =============================================

def get_embedding(text):
    """Ollama를 통한 벡터 생성 (search_text 기준)"""
    if not text or pd.isna(text):
        return None
    try:
        response = client.embeddings(model=EMBED_MODEL, prompt=text)
        return response['embedding']
    except Exception as e:
        print(f"임베딩 생성 오류: {e}")
        return None

# 1. DB 연결
conn = psycopg2.connect(**DB_CONFIG)
cur = conn.cursor()

# 2. 전처리된 데이터 로드
df = pd.read_csv(INPUT_CSV)
print(f"{len(df)}건의 데이터를 신규 스키마에 맞춰 저장합니다.")

# 3. 데이터 삽입 루프
for i, row in tqdm(df.iterrows(), total=len(df)):
    try:
        # [핵심] 검색 성능을 위해 topic + keywords가 합쳐진 search_text를 임베딩함
        search_text = str(row.get('search_text', ''))
        embedding = get_embedding(search_text)
        
        if embedding is None:
            continue

        # 신규 스키마 컬럼에 맞춘 INSERT 문
        query = """
        INSERT INTO complaint_normalizations (
            resp_dept,
            topic,
            legal_basis,
            keywords,
            search_text,
            embedding,
            model_name,
            is_current
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        # 파라미터 구성
        params = (
            str(row.get('llm_dept', row.get('resp_dept', '부서미정'))), # 1. resp_dept (LLM이 정제한 부서 우선)
            str(row.get('topic', '')),           # 2. topic (핵심 주제)
            str(row.get('legal_basis', '')),     # 3. legal_basis (법적 근거)
            str(row.get('keywords', '')),        # 4. keywords (주요 키워드 리스트)
            search_text,                         # 5. search_text (순수 검색용 텍스트)
            embedding,                           # 6. embedding (벡터)
            EMBED_MODEL,                         # 7. model_name
            True                                 # 8. is_current
        )

        cur.execute(query, params)
        
        # 100건마다 커밋 (안정성)
        if (i + 1) % 100 == 0:
            conn.commit()

    except Exception as e:
        conn.rollback()
        print(f"\n에러 발생 (행 {i}): {e}")

# 최종 반영 및 종료
conn.commit()
cur.close()
conn.close()
print("\n[성공] 모든 데이터가 신규 스키마로 벡터화되어 저장되었습니다!")