import psycopg2
from psycopg2.extras import RealDictCursor
import requests
import json

# --- [설정] 본인의 환경에 맞게 수정하세요 ---
DB_CONFIG = {
    "host": "localhost",
    "database": "postgres",
    "user": "postgres",
    "password": "sanghpw",
    "port": 5432
}

OLLAMA_URL = "http://localhost:11434/api/embeddings"
EMBED_MODEL = "mxbai-embed-large"

def get_embedding(text):
    """
    mxbai-embed-large 모델 전용 임베딩 생성 함수.
    검색 쿼리 시 반드시 'query: ' 접두사를 붙여야 성능이 보장됩니다.
    """
    payload = {"model": EMBED_MODEL, "prompt": f"query: {text}"}
    try:
        res = requests.post(OLLAMA_URL, json=payload, timeout=15)
        res.raise_for_status()
        return res.json().get('embedding')
    except Exception as e:
        print(f"❌ Embedding Error: {e}")
        return None

def search_similar_complaints(input_text, top_k=5):
    query_vec = get_embedding(input_text)
    if not query_vec: return

    conn = psycopg2.connect(**DB_CONFIG)
    # RealDictCursor를 사용하면 row['컬럼명']으로 접근해야 합니다.
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        search_sql = """
        WITH scored_results AS (
            SELECT 
                id, 
                resp_dept, 
                core_request,
                neutral_summary,
                keywords_jsonb,
                -- 아래 컬럼들이 v_score, k_score로 정의됨
                COALESCE(1 - (embedding <=> %s::vector), 0.0) AS v_score,
                COALESCE(ts_rank_cd(search_vector, websearch_to_tsquery('simple', %s)), 0.0) AS k_score
            FROM complaint_normalizations
        )
        SELECT *,
               CASE 
                   WHEN v_score < 0.28 THEN (k_score * 0.9 + v_score * 0.1)
                   ELSE (v_score * 0.7 + k_score * 0.3)
               END AS final_total_score
        FROM scored_results
        ORDER BY final_total_score DESC
        LIMIT %s;
        """
        
        cur.execute(search_sql, (query_vec, input_text, top_k))
        results = cur.fetchall()
        
        print(f"\n" + "="*80)
        print(f"🔍 하이브리드 검색 완료")
        print("="*80)

        for i, row in enumerate(results, 1):
            # [수정 포인트] 숫자가 아닌 '컬럼 이름'으로 직접 접근
            # RealDictCursor 사용 시 row[0]은 에러를 발생시킵니다.
            f_score = row['final_total_score']
            v_score = row['v_score']
            k_score = row['k_score']
            dept = row['resp_dept']
            request = row['core_request']

            print(f"[{i}] 통합 점수: {f_score:.4f} [V: {v_score:.3f} | K: {k_score:.3f}]")
            print(f"    - 담당 부서: {dept}")
            print(f"    - 핵심 요약: {request}")
            print("-" * 80)

    except Exception as e:
        # 여기서 'tuple index out of range'가 발생한다면 SQL의 %s 개수와 execute 인자 개수를 확인하세요.
        print(f"❌ Search Error: {e}")
    finally:
        cur.close()
        conn.close()

# --- 실행부 ---
if __name__ == "__main__":
    # Gemini가 분석한 것으로 가정된 입력 (키워드 + 요약 + 카테고리 조합)
    # 실제 검색 시에는 '전체 문장'보다 '분석된 키워드 뭉치'를 넣는 것이 k_score를 올리는 데 유리합니다.
    test_complaint = "['둘레길', '배드민턴장', '축대', '안전점검', '보수']"
    
    search_similar_complaints(test_complaint, top_k=5)