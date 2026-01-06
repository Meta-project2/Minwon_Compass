import pandas as pd
import glob
import os
import torch
import warnings
import numpy as np
from tqdm import tqdm
from sentence_transformers import SentenceTransformer

warnings.filterwarnings("ignore")

class VectorGenerator:
    def __init__(self):
        # 장치 설정
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"[*] 장치: {self.device} / 모델 로딩 중 (mxbai-embed-large-v1)...")
        # 모델 로딩
        self.model = SentenceTransformer("mixedbread-ai/mxbai-embed-large-v1", device=self.device, truncate_dim=1024)

    def generate_vectors(self, file_path, output_dir):
        try:
            df = pd.read_csv(file_path)
            df = df.fillna('')
            file_name = os.path.basename(file_path).replace(".csv", ".parquet")
            save_path = os.path.join(output_dir, file_name)

            print(f"\n[*] 벡터 생성 시작: {os.path.basename(file_path)} (총 {len(df)}건)")

            # CPU 환경에서는 배치 사이즈를 더 줄여서 진행률이 자주 보이게 합니다.
            batch_size = 4 
            
            all_body_vectors = []
            all_answer_vectors = []

            for i in tqdm(range(0, len(df), batch_size), desc="  └ 벡터 계산 중"):
                batch_df = df.iloc[i : i + batch_size]
                
                # 벡터 생성
                body_vecs = self.model.encode(batch_df['processed_body'].tolist(), show_progress_bar=False)
                answer_vecs = self.model.encode(batch_df['processed_answer'].tolist(), show_progress_bar=False)
                
                all_body_vectors.extend(body_vecs.tolist())
                all_answer_vectors.extend(answer_vecs.tolist())

            # 데이터프레임에 벡터 추가
            df['body_embedding'] = all_body_vectors
            df['answer_embedding'] = all_answer_vectors

            # 벡터 데이터는 용량이 크므로 parquet 형식으로 저장 (pip install pyarrow 필요할 수 있음)
            df.to_parquet(save_path, index=False)
            print(f"[+] 저장 완료: {save_path}")

        except Exception as e:
            print(f"[!] 오류 발생: {e}")

if __name__ == "__main__":
    generator = VectorGenerator()
    output_dir = "data/step2_vectors"
    os.makedirs(output_dir, exist_ok=True)

    target_files = glob.glob("data/step1_output/*.csv")
    
    for file_path in target_files:
        generator.generate_vectors(file_path, output_dir)

    print("\n[+] 2단계 벡터 생성 완료!")