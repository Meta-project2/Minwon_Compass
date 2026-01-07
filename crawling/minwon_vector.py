import pandas as pd
import re
import psycopg2
import glob
import os
import warnings
import torch
from datetime import datetime
from tqdm import tqdm
from sentence_transformers import SentenceTransformer
from summa.summarizer import summarize

# 경고 메시지 무시
warnings.filterwarnings("ignore")

# [설정] DB 정보
DB_CONFIG = {
    "host": "localhost",
    "database": "complaint_db",
    "user": "postgres",
    "password": "0000",
    "port": "5432"
}

class UltraFastProcessor:
    def __init__(self):
        """
        초기화 함수: DB 연결 및 AI 모델 로딩
        """
        # 1. DB 연결
        self.conn = psycopg2.connect(**DB_CONFIG)
        self.cursor = self.conn.cursor()
        
        # 2. 장치 설정 (GPU 우선 사용)
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"[*] 현재 사용 중인 장치: {self.device.upper()}")

        # 3. 모델 로딩 (mxbai-embed-large-v1)
        # 설명: 기존 코드에 섞여 있던 모델 로딩 로직을 하나로 통일했습니다.
        model_name = "mixedbread-ai/mxbai-embed-large-v1"
        print(f"[*] 모델 로딩 중: {model_name} (1024차원)...")
        
        self.model = SentenceTransformer(model_name, device=self.device)
        self.embedding_dim = 1024

    def clean_text(self, text):
        """기본 텍스트 전처리 (특수문자 제거 등)"""
        if pd.isna(text) or text == "": 
            return ""
        # 한글, 영어, 숫자, 기본 문장부호만 남김
        text = re.sub(r'[^가-힣a-zA-Z0-9\s.,!?]', ' ', str(text))
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    def get_summary(self, text):
        """
        긴 텍스트를 요약하는 함수 (Summa/TextRank 알고리즘)
        """
        text = self.clean_text(text)
        if len(text) < 100:  # 너무 짧으면 요약 없이 반환
            return text
        
        try:
            # 전체 내용의 50% 비율로 중요 문장 추출
            summary = summarize(text, ratio=0.5)
            
            # 요약 결과가 없으면 원문의 앞부분 500자 사용
            if not summary:
                return text[:500]
            
            return summary.replace('\n', ' ')
        except:
            return text[:500]

    def process_csv_ultra_fast(self, file_path):
        """CSV 파일을 읽어서 벡터화 후 DB에 저장"""
        try:
            # 인코딩 자동 감지 (utf-8 시도 후 실패 시 cp949)
            try:
                df = pd.read_csv(file_path, encoding='utf-8')
            except:
                df = pd.read_csv(file_path, encoding='cp949')
            
            df = df.fillna('')
            total_rows = len(df)
            print(f"\n[*] 파일 처리 시작: {file_path} (총 {total_rows}건)")

            # ------------------------------------------------------------------
            # [수정] 배치 사이즈 조정: 200 -> 32
            # 설명: 한 번에 처리하는 양을 줄여서 메모리 부족 오류를 방지합니다.
            # ------------------------------------------------------------------
            batch_size = 32
            
            for i in tqdm(range(0, total_rows, batch_size), desc="  └ 데이터 처리 중"):
                batch_df = df.iloc[i : i + batch_size]
                
                # 1. 텍스트 요약 및 전처리
                processed_bodies = []
                processed_answers = []
                
                for _, row in batch_df.iterrows():
                    # 민원 내용은 길기 때문에 요약 시도
                    processed_bodies.append(self.get_summary(row.get('req_content', '')))
                    # 답변은 보통 정형화되어 있어 전처리만 수행
                    processed_answers.append(self.clean_text(row.get('resp_content', '')))

                # 2. 임베딩(벡터) 생성 (AI 모델 사용)
                body_embeddings = self.model.encode(processed_bodies)
                answer_embeddings = self.model.encode(processed_answers)

                # 3. DB 저장 (배치 단위로 처리)
                for idx, row in enumerate(batch_df.to_dict('records')):
                    district = row.get('resp_dept', '')
                    title = row.get('req_title', '제목없음')
                    
                    # (1) 원본 데이터 저장 (complaints 테이블)
                    self.cursor.execute("""
                        INSERT INTO complaints (received_at, title, body, answer, district, status, created_at)
                        VALUES (NOW(), %s, %s, %s, %s, 'CLOSED', NOW()) RETURNING id;
                    """, (title, row.get('req_content', ''), row.get('resp_content', ''), district))
                    
                    complaint_id = self.cursor.fetchone()[0]

                    # (2) 요약 및 벡터 데이터 저장 (complaint_normalizations 테이블)
                    self.cursor.execute("""
                        INSERT INTO complaint_normalizations (
                            complaint_id, neutral_summary, embedding, answer_embedding, is_current, created_at
                        ) VALUES (%s, %s, %s, %s, true, NOW());
                    """, (
                        complaint_id, 
                        processed_bodies[idx], 
                        body_embeddings[idx].tolist(), 
                        answer_embeddings[idx].tolist()
                    ))

                # 한 배치가 끝날 때마다 커밋 (저장 확정)
                self.conn.commit()

        except Exception as e:
            print(f"[!] 오류 발생 ({file_path}): {e}")
            self.conn.rollback() # 오류 시 해당 배치는 취소

    def close(self):
        """DB 연결 종료"""
        self.cursor.close()
        self.conn.close()

if __name__ == "__main__":
    # 프로세서 초기화
    processor = UltraFastProcessor()
    
    # 처리할 CSV 파일 찾기
    possible_paths = ["data/*.csv", "data/processed_data/*.csv", "crawling/data/*.csv"]
    csv_files = []
    for path in possible_paths:
        csv_files.extend(glob.glob(path))
    csv_files = list(set(csv_files)) # 중복 제거

    if not csv_files:
        print("[!] CSV 파일을 찾을 수 없습니다. 경로를 확인해주세요.")
    else:
        print(f"[*] 총 {len(csv_files)}개의 파일을 발견했습니다.")
        for file_path in csv_files:
            processor.process_csv_ultra_fast(file_path)
            
    processor.close()
    print("\n[+] 모든 작업 완료!")