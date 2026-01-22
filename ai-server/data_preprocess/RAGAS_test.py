import os
import pandas as pd
from sqlalchemy import create_engine, text
from ragas import evaluate
from ragas.metrics import Faithfulness, AnswerRelevancy, ContextRecall
from ragas.llms import llm_factory
from ragas.embeddings import embedding_factory
from openai import OpenAI
from datasets import Dataset

# ==========================================
# 1. 환경 설정 및 API 키
# ==========================================
os.environ["OPENAI_API_KEY"] = "" # 실제 OpenAI API 키를 입력하세요.

DB_CONFIG = {
    "host": "34.50.48.38",
    "database": "postgres",
    "user": "postgres",
    "password": "0000",
    "port": 5432
}

# ==========================================
# 2. 유틸리티 함수
# ==========================================
def format_to_sentence(data):
    """JSON 데이터를 Ragas 평가용 문장으로 변환 (정보 밀도 일치화)"""
    return (
        f"소관 부서: [{data['dept']}], "
        f"사례 요약: {data['summary']}, "
        f"핵심 키워드: {data['keywords']}, "
        f"도메인 카테고리: {data['category']}"
    )

# ==========================================
# 3. 데이터 추출 및 가공 함수
# ==========================================
def get_evaluation_dataset():
    db_url = f"postgresql://{DB_CONFIG['user']}:{DB_CONFIG['password']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}"
    engine = create_engine(db_url)
    
    # [핵심] 0.6/0.2/0.2 가중치 및 0.45 임계값 필터링 반영
    query = text("""
    WITH eval_target AS (
        SELECT 
            c.id, c.body AS question,
            json_build_object(
                'dept', n.resp_dept,
                'summary', n.neutral_summary,
                'keywords', (SELECT string_agg(k, ', ') FROM jsonb_array_elements_text(n.keywords_jsonb) k),
                'category', n.target_object
            ) AS actual_data,
            n.embedding, n.keywords_jsonb, n.target_object
        FROM complaints c
        JOIN complaint_normalizations n ON c.id = n.complaint_id
        WHERE n.resp_dept IS NOT NULL
        LIMIT 30
    )
    SELECT 
        et.question,
        et.actual_data,
        (
            SELECT json_build_object(
                'dept', sub.resp_dept,
                'summary', sub.neutral_summary,
                'keywords', (SELECT string_agg(k, ', ') FROM jsonb_array_elements_text(sub.keywords_jsonb) k),
                'category', sub.target_object,
                'score', sub.final_score
            )
            FROM (
                SELECT 
                    cn.*,
                    ((1 - (cn.embedding <=> et.embedding)) * 0.6 + 
                     ts_rank(cn.search_vector, plainto_tsquery('simple', 
                         COALESCE((SELECT string_agg(k, ' ') FROM jsonb_array_elements_text(et.keywords_jsonb) k), '')::text
                     )) * 0.2 + 
                     (CASE WHEN cn.resp_dept::text LIKE '%%' || LEFT(et.target_object::text, 2) || '%%' THEN 0.2 ELSE 0 END)) AS final_score
                FROM complaint_normalizations cn
                WHERE cn.complaint_id != et.id
            ) sub
            WHERE sub.final_score > 0.45
            ORDER BY sub.final_score DESC
            LIMIT 1
        ) AS search_result
    FROM eval_target et;
    """)
    
    with engine.connect() as conn:
        df = pd.read_sql(query, conn)

    eval_rows = []
    for _, row in df.iterrows():
        actual = row['actual_data']
        predicted = row['search_result']
        
        ground_truth_sentence = format_to_sentence(actual)
        
        if predicted:
            # 임계값 0.45를 넘는 사례를 찾은 경우
            answer_sentence = format_to_sentence(predicted)
            context_data = [str(predicted['summary'])]
        else:
            # 임계값을 넘는 사례가 없는 경우 (예외 처리)
            answer_sentence = "적절한 유사 사례를 찾을 수 없어 부서 매칭이 불가능합니다."
            context_data = ["검색 임계값 0.45를 초과하는 관련 사례 없음"]
            
        eval_rows.append({
            "question": str(row['question']),
            "ground_truth": ground_truth_sentence,
            "answer": answer_sentence,
            "contexts": context_data
        })
        
    return Dataset.from_pandas(pd.DataFrame(eval_rows))

# ==========================================
# 4. Ragas 평가 함수
# ==========================================
def run_evaluation(dataset):
    openai_client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    eval_llm = llm_factory("gpt-4o", client=openai_client)
    eval_embeddings = embedding_factory("openai", model="text-embedding-3-large", client=openai_client)

    metrics = [
        Faithfulness(llm=eval_llm),
        AnswerRelevancy(llm=eval_llm, embeddings=eval_embeddings),
        ContextRecall(llm=eval_llm)
    ]

    print("📊 Ragas 평가 지표 계산 중...")
    return evaluate(dataset, metrics=metrics)

# ==========================================
# 5. 실행 메인
# ==========================================
if __name__ == "__main__":
    try:
        print("🔍 하이브리드 가중치(0.6) 및 임계값 적용 데이터셋 추출 중...")
        ds = get_evaluation_dataset()
        print(f"✅ {len(ds)}건의 평가 데이터 준비 완료.")
        
        results = run_evaluation(ds)
        print("\n✨ [부서 매칭 시스템 최종 성능 결과]")
        print(results)

    except Exception as e:
        print(f"❌ 오류 발생: {e}")