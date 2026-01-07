import pandas as pd
import os
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_core.documents import Document
from tqdm import tqdm

# ==========================================
# 1. 설정 (경로 및 모델)
# ==========================================

# 데이터 파일 경로
JOJIK_FILES = [
    "./data/jojik_data/jojik_gangnam_list.csv",
    "./data/jojik_data/jojik_mapo_list.csv",
    "./data/jojik_data/jojik_nowon_list.csv" # 파일명에 .csv가 두 번 들어간 것 주의
]
LAW_FILE = "./data/processed/law_database_refined.csv"

# 벡터 DB 저장 경로 (이 폴더에 AI의 지능이 저장됩니다)
DB_PATH = "./chroma_db"

# 임베딩 모델 (한글 성능이 좋은 모델 사용)
# jhgan/ko-sroberta-multitask 모델이 민원/법령 검색에 성능이 좋습니다.
MODEL_NAME = "jhgan/ko-sroberta-multitask"

def load_jojik_data():
    """
    흩어져 있는 조직도 CSV들을 읽어서 표준화된 문서 리스트로 만듭니다.
    """
    documents = []
    print("🏢 조직도 데이터 로딩 및 변환 중...")

    for file_path in JOJIK_FILES:
        if not os.path.exists(file_path):
            print(f"⚠️ 파일 없음: {file_path}")
            continue

        try:
            df = pd.read_csv(file_path)
            # 구청 이름 추측 (파일명에서 추출)
            gu_name = os.path.basename(file_path).split('_')[1] 

            for _, row in df.iterrows():
                # 구청마다 컬럼명이 다르므로 통일 작업 필요
                # 1. 부서명/팀명 합치기
                dept_info = ""
                if '부서명' in df.columns: dept_info += str(row['부서명']) + " "
                if '소속' in df.columns: dept_info += str(row['소속']) + " "
                if '팀명' in df.columns: dept_info += str(row['팀명']) + " "
                if '대분류(국/과)' in df.columns: dept_info += str(row['대분류(국/과)']) + " "
                
                # 2. 담당업무 (가장 중요!)
                job_desc = str(row['담당업무']) if '담당업무' in df.columns else ""
                
                # 3. 전화번호
                phone = str(row['전화번호']) if '전화번호' in df.columns else ""

                # 4. AI에게 학습시킬 텍스트 내용 구성
                # 예: "강남구 주택과 주택팀. 담당업무: 아파트 관리, 민원 처리."
                content = f"{gu_name} {dept_info.strip()}. 담당업무: {job_desc}"
                
                # 5. 메타데이터 (나중에 출처를 확인하기 위함)
                metadata = {
                    "category": "organization", # 조직도 카테고리
                    "source": gu_name,
                    "dept": dept_info.strip(),
                    "phone": phone
                }

                # 문서 객체 생성
                doc = Document(page_content=content, metadata=metadata)
                documents.append(doc)

        except Exception as e:
            print(f"❌ {file_path} 처리 중 오류: {e}")

    print(f"✅ 조직도 문서 {len(documents)}개 변환 완료.")
    return documents

def load_law_data():
    """
    법령 데이터를 읽어서 문서 리스트로 만듭니다.
    """
    documents = []
    print("\n⚖️ 법령 데이터 로딩 중...")
    
    if not os.path.exists(LAW_FILE):
        print(f"❌ 법령 파일 없음: {LAW_FILE}")
        return []

    try:
        df = pd.read_csv(LAW_FILE)
        
        for _, row in df.iterrows():
            content = str(row['내용'])
            
            # 메타데이터
            metadata = {
                "category": "law", # 법령 카테고리
                "source_id": str(row['source_id'])
            }
            
            doc = Document(page_content=content, metadata=metadata)
            documents.append(doc)
            
    except Exception as e:
        print(f"❌ 법령 데이터 처리 중 오류: {e}")

    print(f"✅ 법령 문서 {len(documents)}개 변환 완료.")
    return documents

def main():
    # 1. 데이터 준비
    jojik_docs = load_jojik_data()
    law_docs = load_law_data()
    
    all_docs = jojik_docs + law_docs
    
    if not all_docs:
        print("❌ 변환할 데이터가 없습니다. 경로를 확인해주세요.")
        return

    print(f"\n🚀 총 {len(all_docs)}개의 문서를 벡터화(임베딩) 시작합니다...")
    print(f"사용 모델: {MODEL_NAME}")
    print("시간이 조금 걸릴 수 있습니다. 잠시만 기다려주세요...")

    # 2. 임베딩 모델 설정
    embeddings = HuggingFaceEmbeddings(
        model_name=MODEL_NAME,
        model_kwargs={'device': 'cpu'}, # GPU가 있다면 'cuda'로 변경
        encode_kwargs={'normalize_embeddings': True}
    )

    # 3. 벡터 DB 생성 및 저장
    # 기존 DB가 있다면 로드하고, 없으면 새로 만듭니다.
    vector_store = Chroma.from_documents(
        documents=all_docs,
        embedding=embeddings,
        persist_directory=DB_PATH
    )

    print("-" * 50)
    print(f"🎉 벡터화 완료! 데이터베이스가 '{DB_PATH}' 폴더에 저장되었습니다.")
    print("이제 AI가 이 데이터를 검색할 수 있습니다.")

if __name__ == "__main__":
    main()