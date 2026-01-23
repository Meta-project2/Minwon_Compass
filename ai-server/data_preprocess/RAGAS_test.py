import os
import pandas as pd
from sqlalchemy import create_engine, text
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevancy, context_recall, context_precision
from ragas.llms import llm_factory
from ragas.embeddings import embedding_factory
from openai import OpenAI
from datasets import Dataset

# ==========================================
# 1. 환경 설정
# ==========================================
os.environ["OPENAI_API_KEY"] = os.getenv("OPENAI_API_KEY")

DB_CONFIG = {
    "host": "0.0.0.0",
    "database": "postgres",
    "user": "postgres",
    "password": "0000",
    "port": 5432
}

def format_to_sentence(data):
    return (
        f"소관 부서: [{data['dept']}], "
        f"사례 요약: {data['summary']}, "
        f"핵심 키워드: {data['keywords']}, "
        f"도메인 카테고리: {data['category']}"
    )

def get_filtered_evaluation_dataset():
    db_url = f"postgresql://{DB_CONFIG['user']}:{DB_CONFIG['password']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}"
    engine = create_engine(db_url)
    
    target_query = text("""
        SELECT c.id, c.body AS question, n.resp_dept, n.neutral_summary,
               n.keywords_jsonb, n.target_object, n.embedding
        FROM complaints c
        JOIN complaint_normalizations n ON c.id = n.complaint_id
        WHERE n.resp_dept IS NOT NULL
        LIMIT 100
    """)
    
    eval_rows = []
    with engine.connect() as conn:
        targets = conn.execute(target_query).fetchall()
        
        for t in targets:
            category = t.target_object or ""
            cat_pattern = "|".join([category[i:i+2] for i in range(len(category)-1)]) if len(category) >= 2 else category
            emb_str = str(t.embedding) if isinstance(t.embedding, list) else t.embedding

            # [해결] SELECT 절에 sub.target_object를 추가했습니다.
            search_query = text("""
                SELECT 
                    sub.resp_dept, 
                    sub.neutral_summary, 
                    sub.keywords_jsonb, 
                    sub.target_object,  -- 이 부분이 누락되어 에러가 발생했었습니다.
                    sub.final_score
                FROM (
                    SELECT cn.*,
                        ((1 - (cn.embedding <=> CAST(:emb AS vector))) * 0.6 + 
                         ts_rank(cn.search_vector, plainto_tsquery('simple', :keywords)) * 0.2 + 
                         (CASE WHEN cn.resp_dept::text ~ :cat_pattern THEN 0.2 ELSE 0 END)) AS final_score
                    FROM complaint_normalizations cn
                    WHERE cn.complaint_id != :tid
                ) sub
                WHERE sub.final_score > 0.45
                ORDER BY sub.final_score DESC
                LIMIT 1
            """)
            
            keywords_str = " ".join(t.keywords_jsonb) if isinstance(t.keywords_jsonb, list) else ""
            
            res = conn.execute(search_query, {
                "emb": emb_str, 
                "keywords": keywords_str,
                "cat_pattern": cat_pattern,
                "tid": t.id
            }).fetchone()
            
            if res:
                actual_data = {
                    'dept': t.resp_dept,
                    'summary': t.neutral_summary,
                    'keywords': ", ".join(t.keywords_jsonb) if isinstance(t.keywords_jsonb, list) else "",
                    'category': t.target_object
                }
                
                predict_data = {
                    'dept': res.resp_dept,
                    'summary': res.neutral_summary,
                    'keywords': ", ".join(res.keywords_jsonb) if isinstance(res.keywords_jsonb, list) else "",
                    'category': res.target_object  # 이제 정상적으로 접근 가능합니다.
                }
                
                eval_rows.append({
                    "question": t.question,
                    "ground_truth": format_to_sentence(actual_data),
                    "answer": format_to_sentence(predict_data),
                    "contexts": [res.neutral_summary]
                })

    return Dataset.from_pandas(pd.DataFrame(eval_rows))

def run_evaluation(dataset):
    openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    eval_llm = llm_factory("gpt-4o", client=openai_client)
    eval_embeddings = embedding_factory(
        "openai", 
        model="text-embedding-3-large", 
        client=openai_client, 
        interface="modern",
    )
    metrics = [
        faithfulness,
        answer_relevancy,
        context_recall,
        context_precision
    ]

    print(f"📊 Ragas 평가 지표 계산 시작 (총 {len(dataset)}건)...")

    results = evaluate(
        dataset=dataset,
        metrics=metrics,
        llm=eval_llm,    
        embeddings=eval_embeddings
    )
    
    results.to_pandas().to_csv("ragas_eval_results.csv", index=False, encoding='utf-8-sig')
    print("✅ 평가 완료! 'ragas_eval_results.csv' 파일이 생성되었습니다.")
    
    return results

if __name__ == "__main__":
    try:
        ds = get_filtered_evaluation_dataset()
        if ds and len(ds) > 0:
            print(f"✅ {len(ds)}건의 데이터를 확보했습니다. 평가를 시작합니다.")
            results = run_evaluation(ds)
            print("\n✨ [최종 결과]")
            print(results)
        else:
            print("⚠️ 조건에 맞는 데이터가 없습니다.")
    except Exception as e:
        print(f"❌ 오류 발생: {e}")