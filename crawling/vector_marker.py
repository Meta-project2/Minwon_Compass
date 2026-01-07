import os
from langchain_community.document_loaders import CSVLoader
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

# ---------------------------------------------------------------
# 1. 파일 경로 설정 (정제된 파일 이름을 정확히 적어주세요)
# ---------------------------------------------------------------
# 예: "노원구_조직도_완료.csv" 또는 "law_database_refined.csv"
file_path = "노원구_조직도_완료.csv" 

# 저장할 폴더 이름 (이 폴더 안에 벡터 데이터가 생깁니다)
save_folder = "my_vector_db"

def create_vector_db():
    print(f"🚀 '{file_path}' 데이터를 벡터화(AI 학습) 시작합니다...")

    # (1) CSV 파일 읽기
    # csv_args는 엑셀 파일이 깨지지 않게 읽기 위한 설정입니다.
    loader = CSVLoader(
        file_path=file_path, 
        encoding='utf-8-sig',
        csv_args={'delimiter': ','}
    )
    documents = loader.load()
    print(f"   -> 총 {len(documents)}개의 데이터를 읽어왔습니다.")

    # (2) 임베딩 모델 준비 (한국어에 강한 무료 모델 사용)
    # 'jhgan/ko-sroberta-multitask'는 한국어 검색에 아주 성능이 좋습니다.
    print("🤖 AI 모델(Embedding)을 불러오는 중... (처음엔 시간 좀 걸려요)")
    embeddings = HuggingFaceEmbeddings(
        model_name="jhgan/ko-sroberta-multitask",
        model_kwargs={'device': 'cpu'}, # 그래픽카드 없으면 cpu
        encode_kwargs={'normalize_embeddings': True}
    )

    # (3) 벡터 저장소(FAISS) 만들기
    # 여기서 실제로 글자가 숫자로 변환됩니다.
    print("⚡ 데이터를 벡터로 변환 중...")
    vector_store = FAISS.from_documents(documents, embeddings)

    # (4) 내 컴퓨터에 저장하기
    vector_store.save_local(save_folder)
    print(f"🎉 변환 완료! '{save_folder}' 폴더에 저장되었습니다.")

if __name__ == "__main__":
    # 파일이 실제로 있는지 확인 후 실행
    if os.path.exists(file_path):
        create_vector_db()
    else:
        print(f"❌ 오류: '{file_path}' 파일이 없습니다. 파일명을 확인해주세요!")