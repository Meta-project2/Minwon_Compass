import psycopg2
from psycopg2.extras import Json
import os
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

# DB 연결 정보 (환경 변수 또는 .env 활용 권장)
DB_CONFIG = {
    "dbname": "complaint_db",
    "user": "postgres",
    "password": os.getenv("POSTGRES_PASSWORD"),
    "host": "localhost",
    "port": 5432
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
            (cn.embedding <=> %s) as distance
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

# ========================================================
#  법령 검색 (Law Search)
# ========================================================

def search_laws_by_id(complaint_id: int, limit: int = 3) -> List[Dict]:
    """[자동 모드] 민원 ID를 기준으로 관련된 법령/규정을 검색합니다.

    Args:
        complaint_id (int): 기준 민원 ID
        limit (int): 가져올 최대 개수

    Returns:
        List[Dict]: 유사도 순으로 정렬된 법령 리스트
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
            d.title, kc.section, kc.content,
            (kc.embedding <=> (SELECT embedding FROM current_vec)) as distance
        FROM knowledge_chunks kc
        JOIN knowledge_documents d ON kc.document_id = d.id
        ORDER BY distance ASC
        LIMIT %s;
        """
        cur.execute(query, (complaint_id, limit))
        return _parse_results(cur.fetchall(), type="law")
    finally:
        cur.close()
        conn.close()

def search_laws_by_text(embedding_vector: List[float], limit: int = 3, keyword: str = None) -> List[Dict]:
    """[수동 모드] 하이브리드 검색(Vector + Keyword)을 수행합니다.

    키워드가 제공되면 ILIKE 검색으로 필터링 후 벡터 유사도를 계산하여
    정확도와 문맥을 동시에 고려합니다.

    Args:
        embedding_vector (list): 질문 벡터
        limit (int): 최대 개수
        keyword (str, optional): 필터링할 핵심 키워드 (ILIKE 검색용)

    Returns:
        List[Dict]: 법령 리스트
    """
    conn = get_db_connection()
    if not conn: return []
    cur = conn.cursor()
    
    try:
        if keyword:
            # ILIKE: 대소문자 구분 없는 부분 일치 검색 (Hybrid Search)
            query = """
            SELECT d.title, kc.section, kc.content, (kc.embedding <=> %s) as distance
            FROM knowledge_chunks kc
            JOIN knowledge_documents d ON kc.document_id = d.id
            WHERE kc.content ILIKE %s 
            ORDER BY distance ASC
            LIMIT %s;
            """
            cur.execute(query, (embedding_vector, f"%{keyword}%", limit))
        else:
            # 순수 벡터 검색
            query = """
            SELECT d.title, kc.section, kc.content, (kc.embedding <=> %s) as distance
            FROM knowledge_chunks kc
            JOIN knowledge_documents d ON kc.document_id = d.id
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