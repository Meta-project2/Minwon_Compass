import pandas as pd
import os
import random
from langchain_community.vectorstores import Chroma
from langchain_ollama import OllamaEmbeddings
from langchain_core.documents import Document
from tqdm import tqdm

# [설정]
CSV_PATH = "data/processed/law_database_refined.csv"
DB_PATH = "legal_vector_db"
TARGET_COUNT = 2000  # ⚡ 시연용으로 2,000개만 딱 학습! (속도 최우선)

def build_legal_db():
    print("⚖️ 법령 데이터를 벡터화하여 '법률 도서관'을 짓습니다...")
    
    # 1. 파일 확인
    if not os.path.exists(CSV_PATH):
        # 혹시 경로가 다를 경우 대비
        alt_path = "data/processed/law_database.csv"
        if os.path.exists(alt_path):
            target_path = alt_path
        else:
            print("❌ CSV 파일을 찾을 수 없습니다.")
            return
    else:
        target_path = CSV_PATH

    # 2. 모델 준비 (빠른 모델 사용!)
    print("🚀 가벼운 임베딩 모델(nomic-embed-text) 로딩 중...")
    embeddings = OllamaEmbeddings(model="nomic-embed-text")

    # 3. 데이터 읽기
    try:
        print(f"📥 '{target_path}' 읽는 중...")
        df = pd.read_csv(target_path)
        
        # 4. 데이터 다이어트 (랜덤 2,000개 추출)
        if len(df) > TARGET_COUNT:
            print(f"✂️ 전체 {len(df)}개 중 랜덤으로 {TARGET_COUNT}개만 추출합니다. (시연용)")
            df = df.sample(n=TARGET_COUNT, random_state=42) # random_state=42는 항상 똑같은 랜덤을 뽑게 함
        
        documents = []
        print("📄 데이터를 문서 형태로 변환 중...")
        
        for index, row in tqdm(df.iterrows(), total=df.shape[0], desc="Converting"):
            content_parts = []
            for col in df.columns:
                if pd.notna(row[col]):
                    content_parts.append(f"{col}: {row[col]}")
            
            text_content = "\n".join(content_parts)
            documents.append(Document(
                page_content=text_content, 
                metadata={"source": "법령데이터", "row_id": index}
            ))

        # 5. 벡터 DB 저장 (배치 처리)
        print("⏳ 벡터 변환 및 저장 시작... (약 2~3분 소요)")
        batch_size = 500
        vectorstore = None
        
        for i in tqdm(range(0, len(documents), batch_size), desc="Vectorizing"):
            batch_docs = documents[i : i + batch_size]
            
            if vectorstore is None:
                if os.path.exists(DB_PATH):
                     vectorstore = Chroma(persist_directory=DB_PATH, embedding_function=embeddings)
                     vectorstore.add_documents(batch_docs)
                else:
                    vectorstore = Chroma.from_documents(batch_docs, embeddings, persist_directory=DB_PATH)
            else:
                vectorstore.add_documents(batch_docs)
                
        print(f"✅ 법령 DB 구축 완료! 저장 위치: {DB_PATH}")
        print("🎉 이제 모든 준비가 끝났습니다! 서버(Main)를 만들러 갑시다.")

    except Exception as e:
        print(f"❌ 오류 발생: {e}")

if __name__ == "__main__":
    build_legal_db()