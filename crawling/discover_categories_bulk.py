import os
import glob
import pandas as pd
import random
from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate

# ======================================================
# [설정] 데이터가 모여있는 폴더 경로
# ======================================================
DATA_DIR = "data/processed_data"  # 사용자의 실제 경로
FILE_PATTERN = "*_cleaned.csv"    # 끝이 _cleaned.csv로 끝나는 모든 파일

# 1. AI 준비
print("🤖 Llama를 불러오는 중입니다...")
llm = ChatOllama(model="llama3.1", temperature=0)

def load_and_analyze_all():
    # 1. 파일 목록 찾기
    # 현재 파일 위치 기준으로 경로 조합
    current_dir = os.path.dirname(os.path.abspath(__file__))
    search_path = os.path.join(current_dir, DATA_DIR, FILE_PATTERN)
    
    file_list = glob.glob(search_path)
    
    if not file_list:
        print(f"❌ 파일을 하나도 못 찾았습니다! 경로를 확인해주세요: {search_path}")
        return

    print(f"📂 총 {len(file_list)}개의 구청 데이터 파일을 발견했습니다!")
    
    all_samples = []
    
    # 2. 각 파일에서 데이터 골고루 뽑기
    for file_path in file_list:
        try:
            # CSV 파일 읽기
            df = pd.read_csv(file_path)
            
            # [중요] 민원 내용이 담긴 컬럼(열) 이름 찾기
            # 보통 '내용', 'content', '민원내용' 등의 이름일 것입니다.
            # 자동으로 찾기 위해 컬럼명들을 훑어봅니다.
            text_col = None
            for col in df.columns:
                if "내용" in col or "제목" in col or "content" in col or "complaint" in col:
                    text_col = col
                    break
            
            if text_col:
                # 데이터가 너무 많으면 각 구청마다 5개씩만 랜덤으로 뽑기 (AI 메모리 용량 고려)
                # 데이터가 적으면 있는 만큼 다 가져오기
                n_samples = min(len(df), 15) 
                sampled_texts = df[text_col].dropna().sample(n=n_samples).tolist()
                
                # "강남구: 불법주차가 심각해요" 형태로 출처를 붙여줌
                file_name = os.path.basename(file_path)
                all_samples.extend([f"[{file_name}] {text[:100]}" for text in sampled_texts])
                print(f"  - {file_name}: {n_samples}개 수집 완료")
            else:
                print(f"  ⚠️ {os.path.basename(file_path)}: 텍스트 컬럼을 못 찾아서 건너뜁니다. (컬럼명: {df.columns})")
                
        except Exception as e:
            print(f"  ❌ {os.path.basename(file_path)} 읽기 실패: {e}")

    print(f"\n✅ 총 {len(all_samples)}개의 다양한 민원 샘플을 확보했습니다!")
    print("⏳ AI가 데이터를 분석하여 최적의 카테고리를 구상 중입니다... (1분 정도 소요)")

    # 3. AI에게 분석 요청
    # 샘플들을 하나의 긴 글(문자열)로 합침
    combined_text = "\n".join(all_samples)
    
    template = """
    너는 [공공 데이터 분석 전문가]야.
    서울시 여러 구청에서 수집된 아래 [민원 데이터 샘플]들을 종합적으로 분석해줘.
    
    이 민원들을 분류할 때, '기타' 카테고리가 최대한 나오지 않도록 
    가장 빈번하게 발생하고 명확하게 구분되는 [핵심 카테고리 10~15개]를 선정해줘.
    
    [출력 형식]
    - 카테고리명 (설명 및 포함되는 예시 민원 키워드)
    - 카테고리명 (설명 및 포함되는 예시 민원 키워드)
    ...
    
    [분석할 민원 데이터 샘플 모음]
    {text}
    """
    
    prompt = ChatPromptTemplate.from_template(template)
    chain = prompt | llm
    
    # 텍스트 길이가 너무 길면 AI가 오류를 낼 수 있으므로, 최대 3000자 정도로 자름
    if len(combined_text) > 30000:
        combined_text = combined_text[:30000] + "...(생략)..."

    response = chain.invoke({"text": combined_text})
    
    print("\n" + "="*50)
    print("🏆 AI가 제안하는 [서울시 통합 민원 카테고리]")
    print("="*50)
    print(response.content)

if __name__ == "__main__":
    load_and_analyze_all()