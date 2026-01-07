from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma

# 1. 설정
DB_PATH = "./chroma_db"
MODEL_NAME = "jhgan/ko-sroberta-multitask"

def test_search():
    print("🕵️‍♂️ 벡터 데이터베이스 검색 테스트를 시작합니다...")
    
    # 2. 저장된 DB 불러오기
    # (이미 만들어진 DB를 읽기만 하는 과정입니다)
    embeddings = HuggingFaceEmbeddings(
        model_name=MODEL_NAME,
        model_kwargs={'device': 'cpu'},
        encode_kwargs={'normalize_embeddings': True}
    )
    
    vector_store = Chroma(
        persist_directory=DB_PATH,
        embedding_function=embeddings
    )
    
    # 3. 테스트 질문 던지기
    # 민원 내용과 비슷한 질문을 던져봅니다.
    query = "아파트 층간 소음이 너무 심해요. 어디에 신고하나요?"
    
    print(f"\n❓ 질문: {query}")
    print("-" * 50)
    
    # 4. 가장 관련성 높은 문서 3개 찾아오기 (Similarity Search)
    results = vector_store.similarity_search(query, k=3)
    
    if not results:
        print("❌ 검색 결과가 없습니다. 데이터가 제대로 저장되었는지 확인해주세요.")
        return

    for i, doc in enumerate(results):
        print(f"\n[문서 {i+1}]")
        print(f"📄 내용: {doc.page_content}")
        print(f"🏷️ 출처(메타데이터): {doc.metadata}")
        print("-" * 30)

    print("\n✅ 테스트 완료! 관련 법령이나 부서가 잘 나오나요?")

if __name__ == "__main__":
    test_search()