import os
import glob
import pandas as pd
import random
from langchain_community.vectorstores import Chroma
from langchain_ollama import OllamaEmbeddings
from langchain_core.documents import Document
from tqdm import tqdm

# [설정]
DATA_DIR = "data/processed_data"
DB_PATH = "complaint_vector_db"
TARGET_COUNT = 3000

def build_complaint_db():
    print("🏗️ 구청별 민원 데이터를 벡터화합니다...")
    
    # ======================================================
    # ⚡ [핵심 수정] 뚱뚱한 llama3.1 대신 날쌘돌이 nomic 모델 사용!
    # ======================================================
    print("🚀 가벼운 임베딩 모델(nomic-embed-text)을 준비합니다...")
    embeddings = OllamaEmbeddings(model="nomic-embed-text")
    
    # 1. 파일 찾기
    all_files = glob.glob(os.path.join(DATA_DIR, "*_cleaned.csv"))
    print(f"📂 총 {len(all_files)}개의 파일을 발견했습니다.")
    
    all_documents = []

    # 2. 데이터 읽기
    for file_path in all_files:
        try:
            df = pd.read_csv(file_path)
            file_name = os.path.basename(file_path)
            
            text_col = None
            for col in df.columns:
                if "내용" in col or "content" in col:
                    text_col = col
                    break
            
            if text_col:
                for _, row in df.iterrows():
                    if pd.isna(row[text_col]) or len(str(row[text_col])) < 5:
                        continue
                        
                    meta = {"source": file_name}
                    if "category" in df.columns:
                        meta["category"] = row["category"]
                    
                    doc = Document(
                        page_content=str(row[text_col]),
                        metadata=meta
                    )
                    all_documents.append(doc)
        except Exception:
            pass 

    print(f"📚 원본 데이터 총 {len(all_documents)}개를 확보했습니다.")
    
    if len(all_documents) > TARGET_COUNT:
        print(f"✂️ 랜덤으로 {TARGET_COUNT}개만 뽑아서 학습합니다.")
        random.shuffle(all_documents)
        all_documents = all_documents[:TARGET_COUNT]
    
    print("⏳ 벡터 변환 시작! (아까보다 훨씬 빠를 겁니다)")

    # 3. 배치 처리
    batch_size = 500
    vectorstore = None
    
    for i in tqdm(range(0, len(all_documents), batch_size), desc="Vectorizing"):
        batch_docs = all_documents[i : i + batch_size]
        
        if vectorstore is None:
            if os.path.exists(DB_PATH):
                 vectorstore = Chroma(persist_directory=DB_PATH, embedding_function=embeddings)
                 vectorstore.add_documents(batch_docs)
            else:
                vectorstore = Chroma.from_documents(batch_docs, embeddings, persist_directory=DB_PATH)
        else:
            vectorstore.add_documents(batch_docs)

    print(f"✅ 민원 DB 구축 완료! 저장 위치: {DB_PATH}")

if __name__ == "__main__":
    build_complaint_db()