from fastapi import FastAPI
import psycopg2
from psycopg2.extras import Json
import os
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Complaint Analyzer AI")

# DB 연결 정보 (환경 변수 또는 .env 활용 권장)
DB_CONFIG = {
    "dbname": os.getenv("POSTGRES_DB", "postgres"),
    "user": os.getenv("POSTGRES_USER", "postgres"),
    "password": os.getenv("POSTGRES_PASSWORD", "0000"),
    "host": os.getenv("DB_HOST", "db"), # 기본값을 db로 설정
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

def save_complaint(title, body, district=None, address_text=None):
    """민원 원본 내용을 저장하는 함수"""
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


def save_normalization(complaint_id, analysis, embedding):
    """
    1. 기존 데이터의 is_current를 false로 업데이트 
    2. 새로운 정규화 데이터 및 임베딩 벡터 저장 
    """
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
            Json(analysis.get('keywords', [])), # 리스트를 JSONB로 변환
            analysis.get('location_hint'),      # 추가된 컬럼
            analysis.get('urgency_signal'),    # 추가된 컬럼
            embedding                           # 1024차원 리스트
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


# ========================================================
#  유사 민원 검색 (Case Search)
# ========================================================

def search_cases_by_id(complaint_id: int, limit: int = 3) -> List[Dict]:
    """[자동 모드] 특정 민원 ID를 기준으로 유사한 과거 사례를 검색

    Args:
        complaint_id (int): 기준 민원 ID
        limit (int): 가져올 최대 개수

    Returns:
        List[Dict]: 유사도 순으로 정렬된 민원 사례 리스트
    """
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
        WHERE cn.complaint_id != %s  -- 자기 자신 제외
          AND cn.is_current = true
        ORDER BY distance ASC
        LIMIT %s;
        """
        cur.execute(query, (complaint_id, complaint_id, limit))
        return _parse_results(cur.fetchall(), type="case")
    finally:
        cur.close()
        conn.close()

def search_cases_by_text(embedding_vector: List[float], limit: int = 3) -> List[Dict]:
    """[수동 모드] 사용자의 질문 벡터와 유사한 과거 사례를 검색

    Args:
        embedding_vector (list): 사용자 질문의 임베딩 벡터
        limit (int): 가져올 최대 개수

    Returns:
        List[Dict]: 유사도 순으로 정렬된 민원 사례 리스트
    """
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

def search_laws_by_id(complaint_id: int, limit: int = 3) -> List[Dict]:
    """[자동 모드] 민원 ID 기준 법령 검색 (테이블명 law_chunks로 수정됨)"""
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


def search_laws_by_text(embedding_vector: List[float], limit: int = 3, keyword: str = None) -> List[Dict]:
    """[수동 모드] 텍스트 임베딩 기준 법령 검색 (키워드 필터 제거 버전)"""
    conn = get_db_connection()
    if not conn: return []
    cur = conn.cursor()

    try:
        # [수정됨] keyword가 있어도 ILIKE로 필터링하지 않고, 순수 벡터 유사도로만 검색합니다.
        # 이유: 사용자가 문장으로 질문하면 ILIKE 매칭이 0건이 되기 때문입니다.
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

def _cosine_distance_to_percent(distance: float) -> float:
    """pgvector의 Cosine Distance를 백분율 유사도로 변환

    pgvector의 <=> 연산자는 거리(Distance)를 반환
    - 0.0: 완전 일치 (유사도 100%)
    - 1.0: 직교 (유사도 50%)
    - 2.0: 완전 반대 (유사도 0%)

    Args:
        distance (float): 코사인 거리 값 (0.0 ~ 2.0)

    Returns:
        float: 0.0 ~ 100.0 사이의 유사도 점수
    """
    if distance is None:
        return 0.0
    
    # 변환 공식: (1 - distance / 2) * 100
    score = (1.0 - (distance / 2.0)) * 100.0
    
    # 부동소수점 오차로 인한 범위 이탈 방지 (Clamping)
    if score < 0: score = 0.0
    if score > 100: score = 100.0
    
    return round(score, 2)

def _parse_results(rows: List[tuple], type: str = "case") -> List[Dict[str, Any]]:
    """SQL 쿼리 결과를 딕셔너리 리스트로 변환

    Args:
        rows (list): fetchall()로 가져온 튜플 리스트
        type (str): 변환할 데이터 타입 ('case' 또는 'law')

    Returns:
        List[Dict]: API 응답에 적합한 딕셔너리 리스트
    """
    results = []
    for row in rows:
        # 마지막 컬럼은 항상 distance라고 가정
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

def get_reference_answer(complaint_id: int) -> Optional[str]:
    """
    1. 현재 민원의 routing_rank JSON에서 'related_case' 텍스트 추출
    2. 그 텍스트와 core_request가 일치하는 과거 민원 찾기
    3. 과거 민원의 답변(answer) 반환
    """
    conn = get_db_connection()
    if not conn: return None

    try:
        with conn.cursor() as cur:
            # 1단계: 현재 민원의 routing_rank 조회
            cur.execute(
                "SELECT routing_rank FROM complaint_normalizations WHERE complaint_id = %s",
                (complaint_id,)
            )
            row = cur.fetchone()
            if not row or not row[0]:
                print(f"❌ [DB] 민원 {complaint_id}의 routing_rank가 없습니다.")
                return None
            # JSON 파싱 (DB에 텍스트로 저장되어 있다고 가정)
            routing_data = row[0]
            if isinstance(routing_data, str):
                import json
                routing_data = json.loads(routing_data)
            # related_case 추출 (리스트인 경우 첫 번째 요소 사용, 객체인 경우 바로 사용)
            target_core_request = None
            if isinstance(routing_data, list) and len(routing_data) > 0:
                target_core_request = routing_data[0].get("related_case")
            elif isinstance(routing_data, dict):
                target_core_request = routing_data.get("related_case")
            if not target_core_request:
                print(f"⚠️ [DB] routing_rank에서 related_case를 찾을 수 없습니다.")
                return None
            print(f"🔎 [DB] 참고할 과거 민원 키워드: {target_core_request}")
            # 2단계 & 3단계: 키워드가 일치하는 과거 민원의 답변 조회
            # (조건: 현재 민원 제외, 답변이 있는 것만)
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

def save_chat_log(complaint_id: int, role: str, message: str):
    """채팅 로그 저장"""
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

def get_chat_logs(complaint_id: int) -> List[Dict]:
    """과거 채팅 기록 조회"""
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