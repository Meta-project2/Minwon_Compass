from fastapi import FastAPI
import psycopg2
from psycopg2.extras import Json
import os
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Complaint Analyzer AI")

DB_CONFIG = {
    "dbname": os.getenv("POSTGRES_DB", "postgres"),
    "user": os.getenv("POSTGRES_USER", "postgres"),
    "password": os.getenv("POSTGRES_PASSWORD", "0000"),
    "host": os.getenv("DB_HOST", "db"),
    "port": int(os.getenv("DB_PORT", 5432))
}

def get_db_connection():
    """DB에 연결하고 커넥션 객체를 반환하는 함수"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        print(f" DB 연결 실패: {e}")
        return None

# 원본 내용 저장
def save_complaint(title, body, district=None, address_text=None):
    conn = psycopg2.connect(**DB_CONFIG, client_encoding='UTF8')
    cur = conn.cursor()
    
    try:
        cur.execute("""
            INSERT INTO complaints (title, body, district, address_text, received_at) 
            VALUES (%s, %s, %s, %s, now())
            RETURNING id
        """, (title, body, district, address_text))
        
        complaint_id = cur.fetchone()[0]
        conn.commit()
        print(f"[*] 민원 {complaint_id} 원본 데이터 저장 완료")
        return complaint_id
    except Exception as e:
        conn.rollback()
        print(f"[!] 민원 저장 중 에러: {e}")
        raise e
    finally:
        cur.close()
        conn.close()


# 임베딩 벡터 저장
def save_normalization(complaint_id, analysis, embedding):
    conn = psycopg2.connect(**DB_CONFIG, client_encoding='UTF8')
    cur = conn.cursor()
    
    try:
        cur.execute("""
            INSERT INTO complaint_normalizations (
                complaint_id, 
                neutral_summary, 
                core_request, 
                core_cause, 
                target_object, 
                keywords_jsonb, 
                location_hint,
                urgency_signal,
                embedding, 
                is_current
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, true)
        """, (
            complaint_id, 
            analysis.get('neutral_summary'), 
            analysis.get('core_request'), 
            analysis.get('core_cause'), 
            analysis.get('target_object'), 
            Json(analysis.get('keywords', [])),
            analysis.get('location_hint'),    
            analysis.get('urgency_signal'),   
            embedding                      
        ))
        
        conn.commit()
        print(f"[*] 민원 {complaint_id} 정규화 데이터 저장 완료")
    except Exception as e:
        conn.rollback()
        print(f"[!] 정규화 데이터 저장 중 에러: {e}")
        raise e
    finally:
        cur.close()
        conn.close()


# 특정 민원 ID를 기준으로 유사한 과거 사례를 검색
def search_cases_by_id(complaint_id: int, limit: int = 3) -> List[Dict]:
    conn = get_db_connection()
    if not conn: return []
    cur = conn.cursor()
    
    try:
        query = """
        WITH current_vec AS (
            SELECT embedding FROM complaint_normalizations 
            WHERE complaint_id = %s AND is_current = true LIMIT 1
        )
        SELECT 
            c.id, c.body, c.answer, cn.neutral_summary,
            (cn.embedding <=> (SELECT embedding FROM current_vec)) as distance
        FROM complaint_normalizations cn
        JOIN complaints c ON cn.complaint_id = c.id
        WHERE cn.complaint_id != %s
          AND cn.is_current = true
        ORDER BY distance ASC
        LIMIT %s;
        """
        cur.execute(query, (complaint_id, complaint_id, limit))
        return _parse_results(cur.fetchall(), type="case")
    finally:
        cur.close()
        conn.close()

# 문맥 유사도로 찾기
def search_cases_by_text(embedding_vector: List[float], limit: int = 3) -> List[Dict]:
    conn = get_db_connection()
    if not conn: return []
    cur = conn.cursor()
    
    try:
        query = """
        SELECT 
            c.id, c.body, c.answer, cn.neutral_summary, 
            (cn.embedding <=> %s::vector) as distance
        FROM complaint_normalizations cn
        JOIN complaints c ON cn.complaint_id = c.id
        WHERE cn.is_current = true
        ORDER BY distance ASC
        LIMIT %s;
        """
        cur.execute(query, (embedding_vector, limit))
        return _parse_results(cur.fetchall(), type="case")
    finally:
        cur.close()
        conn.close()

# 민원 id 기준 법령 검색
def search_laws_by_id(complaint_id: int, limit: int = 3) -> List[Dict]:
    conn = get_db_connection()
    if not conn: return []
    cur = conn.cursor()
    
    try:
        query = """
        WITH current_vec AS (
            SELECT embedding FROM complaint_normalizations 
            WHERE complaint_id = %s AND is_current = true LIMIT 1
        )
        SELECT 
            d.title, lc.article_no, lc.chunk_text,
            (lc.embedding <=> (SELECT embedding FROM current_vec)) as distance
        FROM law_chunks lc
        JOIN law_documents d ON lc.document_id = d.id
        ORDER BY distance ASC
        LIMIT %s;
        """
        cur.execute(query, (complaint_id, limit))
        return _parse_results(cur.fetchall(), type="law")
    finally:
        cur.close()
        conn.close()

# 텍스트 임베딩 기준 법령 검색
def search_laws_by_text(embedding_vector: List[float], limit: int = 3, keyword: str = None) -> List[Dict]:
    conn = get_db_connection()
    if not conn: return []
    cur = conn.cursor()

    try:
        query = """
        SELECT d.title, lc.article_no, lc.chunk_text, (lc.embedding <=> %s::vector) as distance
        FROM law_chunks lc
        JOIN law_documents d ON lc.document_id = d.id
        ORDER BY distance ASC
        LIMIT %s;
        """
        cur.execute(query, (embedding_vector, limit))

        return _parse_results(cur.fetchall(), type="law")
    finally:
        cur.close()
        conn.close()

# 코사인 거리를 백분율 유사도로 변환
def _cosine_distance_to_percent(distance: float) -> float:
    if distance is None:
        return 0.0
    
    score = (1.0 - (distance / 2.0)) * 100.0
    
    if score < 0: score = 0.0
    if score > 100: score = 100.0
    
    return round(score, 2)

# 쿼리 결과를 딕셔너리 리스트로 변환
def _parse_results(rows: List[tuple], type: str = "case") -> List[Dict[str, Any]]:
    results = []
    for row in rows:
        raw_distance = float(row[-1]) if row[-1] is not None else 2.0
        similarity_score = _cosine_distance_to_percent(raw_distance)

        if type == "case":
            results.append({
                "id": row[0],
                "body": row[1],
                "answer": row[2] if row[2] else "답변 없음",
                "summary": row[3],
                "similarity": similarity_score
            })
        elif type == "law":
            results.append({
                "title": row[0],
                "section": row[1],
                "content": row[2],
                "similarity": similarity_score
            })
    return results

# AI 분석 결과에서 연관 민원 추출, 해당 민원과 일치하는 과거 민원을 반환
def get_reference_answer(complaint_id: int) -> Optional[str]:
    conn = get_db_connection()
    if not conn: return None

    try:
        with conn.cursor() as cur:
            # 현재 민원의 routing_rank 조회
            cur.execute(
                "SELECT routing_rank FROM complaint_normalizations WHERE complaint_id = %s",
                (complaint_id,)
            )
            row = cur.fetchone()
            if not row or not row[0]:
                print(f"❌ [DB] 민원 {complaint_id}의 routing_rank가 없습니다.")
                return None
            # JSON 파싱
            routing_data = row[0]
            if isinstance(routing_data, str):
                import json
                routing_data = json.loads(routing_data)
            # 연관 민원 추출
            target_core_request = None
            if isinstance(routing_data, list) and len(routing_data) > 0:
                target_core_request = routing_data[0].get("related_case")
            elif isinstance(routing_data, dict):
                target_core_request = routing_data.get("related_case")
            if not target_core_request:
                print(f"⚠️ [DB] routing_rank에서 related_case를 찾을 수 없습니다.")
                return None
            print(f"🔎 [DB] 참고할 과거 민원 키워드: {target_core_request}")
            # 키워드가 일치하는 과거 민원 답변 조회
            sql = """
                SELECT c.answer
                FROM complaint_normalizations cn
                JOIN complaints c ON cn.complaint_id = c.id
                WHERE cn.core_request = %s
                  AND c.id != %s
                  AND c.answer IS NOT NULL
                  AND c.answer != ''
                LIMIT 1
            """
            cur.execute(sql, (target_core_request, complaint_id))
            ref_row = cur.fetchone()
            if ref_row:
                print("✅ [DB] 유사한 과거 답변을 찾았습니다.")
                return ref_row[0]
            else:
                print("⚠️ [DB] 키워드는 찾았으나, 답변이 달린 과거 사례가 없습니다.")
                return None
    except Exception as e:
        print(f"❌ [DB] 과거 답변 조회 실패: {e}")
        return None

# 민원인과의 채팅 로그 저장
def save_chat_log(complaint_id: int, role: str, message: str):
    conn = get_db_connection()
    if not conn: return
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO complaint_chat_logs (complaint_id, role, message) VALUES (%s, %s, %s)",
                (complaint_id, role, message)
            )
            conn.commit()
    except Exception as e:
        print(f"❌ 채팅 로그 저장 실패: {e}")
    finally:
        conn.close()

# 과거 채팅 기록 조회
def get_chat_logs(complaint_id: int) -> List[Dict]:
    conn = get_db_connection()
    if not conn: return []
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT role, message FROM complaint_chat_logs WHERE complaint_id = %s ORDER BY id ASC",
                (complaint_id,)
            )
            rows = cur.fetchall()
            return [{"role": row[0], "content": row[1]} for row in rows]
    except Exception as e:
        print(f"❌ 채팅 로그 조회 실패: {e}")
        return []
    finally:
        conn.close()