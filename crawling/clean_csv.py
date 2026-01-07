import pandas as pd
import re
import os

# ==========================================
# 🛠️ 사용자 설정
# ==========================================
INPUT_FILE = 'data/rowdata/새올/중랑구.csv'
OUTPUT_FILE = 'data/processed_data/중랑구_cleaned.csv'


# ==========================================

def clean_text(text):
    if pd.isna(text): return ""
    text = str(text)

    # 1. HTML 태그 및 &nbsp; 제거
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'&[a-z]+;', ' ', text)

    # 2. 전화번호 마스킹
    text = re.sub(r'(\d{2,3})-(\d{3,4})-(\d{4})', r'\1-****-****', text)

    # 3. 특수문자 제거
    text = re.sub(r'[^가-힣a-zA-Z0-9.,?!\s]', '', text)

    # 4. 다중 공백 제거
    text = re.sub(r'\s+', ' ', text)

    return text.strip()


# 🔧 [수정됨] 글자 수 별 맞춤형 마스킹 함수
def mask_name(text):
    if not isinstance(text, str):
        return ""

    text = text.strip()  # 공백 제거
    length = len(text)

    # 1. 두 글자 (예: 이호 -> 이O)
    if length == 2:
        return text[0] + "O"

    # 2. 세 글자 (예: 김태환 -> 김OO)
    elif length == 3:
        return text[0] + "OO"

    # 3. 네 글자 (예: 남궁민수 -> 남궁OO, 독고영재 -> 독고OO)
    # 보통 4글자는 복성(남궁, 선우, 황보 등)일 확률이 높으므로 앞 2글자를 보여줍니다.
    elif length == 4:
        return text[0:2] + "OO"

    # 4. 그 외 (5글자 이상 등) -> 그냥 첫 글자만 남기고 싹 다 가림
    elif length > 4:
        return text[0] + ("O" * (length - 1))

    # 1글자 이하는 그냥 둠
    return text


def run_cleaning():
    print(f"🧹 청소 시작: {INPUT_FILE}")

    try:
        df = pd.read_csv(INPUT_FILE, encoding='utf-8-sig')
    except FileNotFoundError:
        print("❌ 파일을 찾을 수 없습니다.")
        return

    print(f"   - 총 {len(df)}개의 데이터 로딩 완료.")

    # 1. [이름 마스킹] 작성자(req_p) 컬럼이 있으면 적용
    if 'req_p' in df.columns:
        print("   - 'req_p' (작성자) 이름 가리는 중...")
        df['req_p'] = df['req_p'].apply(mask_name)

    # 2. [내용 청소]
    target_columns = ['req_title', 'req_content']

    for col in target_columns:
        if col in df.columns:
            print(f"   - '{col}' 텍스트 청소 중...")
            df[col] = df[col].apply(clean_text)

    # 3. [빈 데이터 삭제]
    initial_count = len(df)
    df = df[df['req_content'].str.strip() != ""]
    df = df.dropna(subset=['req_content'])

    deleted_count = initial_count - len(df)
    print(f"   - 내용이 없는 민원 {deleted_count}개를 삭제했습니다.")

    # 4. [검증] 이름이 규칙대로 잘 바뀌었나 확인
    print("\n👀 [이름 변경 결과 미리보기]")
    if 'req_p' in df.columns:
        # 무작위가 아니라, 2,3,4글자 이름을 하나씩 찾아서 보여주면 좋겠지만
        # 일단 상위 10개를 출력해서 확인해봅시다.
        print(df[['req_p']].head(10))
    else:
        print("⚠️ 'req_p' 컬럼이 없어서 이름 마스킹 결과를 보여줄 수 없습니다.")

    # 저장
    df.to_csv(OUTPUT_FILE, index=False, encoding='utf-8-sig')
    print(f"\n✨ 저장 완료! 파일을 열어보세요: {OUTPUT_FILE}")


if __name__ == "__main__":
    run_cleaning()