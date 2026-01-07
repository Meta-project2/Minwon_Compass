import os
import pandas as pd
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_core.documents import Document
from tqdm import tqdm  # 진행률 표시바

# ==========================================
# 1. 설정 (경로를 본인 환경에 맞게 수정하세요)
# ==========================================
# 벡터 DB가 저장될 폴더 이름
DB_PATH = "./chroma_db" 

# 데이터 파일 경로 설정 (이미지 기반 추정)
FILE_PATHS = {
    "org": "./data/goo_data",          # 조직도 폴더
    "law": "./data/processed",         # 법령 폴더 (이미지상 processed에 법령이 있음)
    "complaint": "./data/rowdata"      # 민원 데이터 폴더 (대용량 예상)
}

# 임베딩 모델 설정 (무료, 한국어 특화 모델)
# OpenAI 키 없이 내 컴퓨터 CPU/GPU로 돌아갑니다.
print("📥 임베딩 모델을 로드 중입니다... (처음엔 다운로드 시간이 좀 걸려요)")
embeddings = HuggingFaceEmbeddings(model_name="jhgan/ko-sroberta-multitask")

# 벡터 저장소 초기화
vectorstore = Chroma(
    persist_directory=DB_PATH,
    embedding_function=embeddings,
    collection_name="complaint_system" # 하나의 DB 안에 다 담습니다
)

# ==========================================
# 2. 데이터 처리 함수들
# ==========================================

def process_org_data(folder_path):
    """조직도 데이터를 읽어서 텍스트로 만듭니다."""
    print(f"\n🏢 조직도 데이터 처리 시작: {folder_path}")
    docs = []
    
    for file in os.listdir(folder_path):
        if file.endswith(".csv"):
            full_path = os.path.join(folder_path, file)
            try:
                # 인코딩 에러 방지 (cp949 혹은 utf-8 시도)
                try:
                    df = pd.read_csv(full_path, encoding='utf-8')
                except:
                    df = pd.read_csv(full_path, encoding='cp949')
                
                # 데이터프레임을 돌면서 텍스트로 변환
                for _, row in df.iterrows():
                    # 컬럼 이름이 파일마다 다를 수 있으니 모든 컬럼을 합칩니다.
                    # 예: "부서: 교통과, 팀: 관리팀, 이름: 홍길동" 식의 문자열 생성
                    text_content = " | ".join([f"{col}: {val}" for col, val in row.items() if pd.notnull(val)])
                    
                    # 메타데이터(출처 파일명, 타입)
                    metadata = {"source": file, "type": "organization"}
                    
                    docs.append(Document(page_content=text_content, metadata=metadata))
            except Exception as e:
                print(f"⚠️ {file} 읽기 실패: {e}")
                
    return docs

def process_law_data(folder_path):
    """법령 데이터를 처리합니다."""
    print(f"\n⚖️ 법령 데이터 처리 시작: {folder_path}")
    docs = []
    
    for file in os.listdir(folder_path):
        if "law" in file and file.endswith(".csv"):
            full_path = os.path.join(folder_path, file)
            try:
                try:
                    df = pd.read_csv(full_path, encoding='utf-8')
                except:
                    df = pd.read_csv(full_path, encoding='cp949')
                
                for _, row in df.iterrows():
                    # 법령은 보통 내용이 길어서 앞부분 1000자만 자르거나 그대로 씁니다.
                    # row에 있는 모든 텍스트를 합칩니다.
                    text_parts = [str(val) for val in row.values if pd.notnull(val)]
                    text_content = " ".join(text_parts)
                    
                    metadata = {"source": file, "type": "law"}
                    docs.append(Document(page_content=text_content, metadata=metadata))
            except Exception as e:
                print(f"⚠️ {file} 읽기 실패: {e}")
    return docs

def save_to_chroma_in_batches(documents, batch_size=100):
    """문서를 조금씩 나누어 저장합니다 (대용량 처리 핵심)"""
    total = len(documents)
    print(f"💾 총 {total}개의 데이터를 벡터화하여 저장합니다...")
    
    # tqdm으로 진행률 바 표시
    for i in tqdm(range(0, total, batch_size), desc="Vectorizing"):
        batch = documents[i : i + batch_size]
        vectorstore.add_documents(batch) # 여기서 실제로 저장됨
        
    print("✅ 저장 완료!")

# ==========================================
# 3. 실행 파트
# ==========================================

if __name__ == "__main__":
    # 1. 조직도 처리
    org_docs = process_org_data(FILE_PATHS["org"])
    if org_docs:
        save_to_chroma_in_batches(org_docs)
    
    # 2. 법령 처리
    law_docs = process_law_data(FILE_PATHS["law"])
    if law_docs:
        save_to_chroma_in_batches(law_docs)
        
    # 3. 민원 데이터 (여기는 파일이 너무 크면 로직을 따로 짜야 합니다)
    # 일단 예시로 law 폴더나 rowdata 폴더에 있는 csv를 처리하게 둡니다.
    # 필요시 경로를 수정하세요.
    
    print("\n🎉 모든 작업이 끝났습니다. 'chroma_db' 폴더가 생성되었는지 확인하세요.")