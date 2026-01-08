import pandas as pd
import glob
import os
import torch
import warnings
from tqdm import tqdm
from sentence_transformers import SentenceTransformer

warnings.filterwarnings("ignore")

class VectorGenerator:
    def __init__(self):
        # 모델 로딩 (GPU가 있으면 사용, 없으면 CPU)
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"[*] 장치: {self.device} / 모델 로딩 중 (mxbai-embed-large-v1)...")
        self.model = SentenceTransformer("mixedbread-ai/mxbai-embed-large-v1", device=self.device)

    def make_combined_text(self, row):
        # 1. 각 컬럼 데이터 안전하게 가져오기
        summary = row.get('processed_body', '')
        dept = row.get('resp_dept', '정보없음')
        answer = row.get('processed_answer', '')
        district = row.get('district', '정보없음')
        
        # 2. 날짜 가공 (연-월-일 10자리만 추출)
        raw_date = str(row.get('resp_date', '정보없음'))
        date = raw_date[:10] if raw_date != '정보없음' else '정보없음'
        
        # 3. 통합 텍스트 생성 (RAG 성능 최적화 포맷)
        return f"[민원 요약]: {summary} [담당 부서]: {dept} [처리 결과]: {answer} [처리일자]: {date} [담당 구]: {district}"

    def generate_vectors(self, file_path, output_dir):
        try:
            # 파일명에서 '구' 이름 추출 (파일명이 '강동구_어쩌구.csv' 형태라고 가정)
            file_name_raw = os.path.basename(file_path)
            current_district = file_name_raw.split('_')[0] 

            df = pd.read_csv(file_path)
            df = df.fillna('')
            
            # 구 정보 강제 주입
            df['district'] = current_district

            # 저장 경로 설정 (.pkl)
            file_name = file_name_raw.replace(".csv", ".pkl")
            save_path = os.path.join(output_dir, file_name)

            print(f"\n[*] 벡터 생성 시작: {file_name_raw} (추출된 구: {current_district}, 총 {len(df)}건)")

            # 통합 텍스트 생성
            df['combined_text'] = df.apply(self.make_combined_text, axis=1)

            # 배치 단위 인코딩 (속도와 메모리 효율)
            batch_size = 8 
            all_embeddings = []
            text_list = df['combined_text'].tolist()

            for i in tqdm(range(0, len(text_list), batch_size), desc="  └ 통합 임베딩 계산 중"):
                batch_texts = text_list[i : i + batch_size]
                # 임베딩 생성
                embeddings = self.model.encode(batch_texts, show_progress_bar=False)
                all_embeddings.extend(embeddings.tolist())

            df['embedding'] = all_embeddings
            
            # Pickle 파일로 저장 (에러 방지 및 데이터 무결성)
            df.to_pickle(save_path)
            print(f"[+] 저장 완료: {save_path}")

        except Exception as e:
            print(f"[!] 오류 발생 ({file_path}): {e}")

if __name__ == "__main__":
    generator = VectorGenerator()
    # 경로 설정
    output_dir = "data/step2_vectors"
    input_dir = "data/step1_output"
    
    os.makedirs(output_dir, exist_ok=True)

    # 담당한 파일들만 처리
    target_files = glob.glob(os.path.join(input_dir, "*.csv"))
    
    if not target_files:
        print(f"[!] {input_dir} 폴더에 처리할 CSV 파일이 없습니다.")
    else:
        for file_path in target_files:
            generator.generate_vectors(file_path, output_dir)

    print("\n[+] 모든 담당 구 벡터 생성 완료!")