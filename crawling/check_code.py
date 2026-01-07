import pandas as pd
import os

# ==========================================
# 🛠️ 검사할 파일 경로 확인
# ==========================================
DB_FILE = 'data/processed/law_database.csv'  # 법전 데이터
QA_FILE = 'data/processed/law_qa.csv'  # 문제집 데이터


# ==========================================

def check_data_health(file_path, name):
    print(f"\n🩺 [{name}] 데이터 건강검진 시작: {os.path.basename(file_path)}")

    if not os.path.exists(file_path):
        print("   ❌ 파일을 찾을 수 없습니다! 경로를 확인하세요.")
        return

    try:
        df = pd.read_csv(file_path, encoding='utf-8-sig')
    except:
        try:
            df = pd.read_csv(file_path, encoding='cp949')
        except Exception as e:
            print(f"   ❌ 파일 읽기 실패 (인코딩 문제?): {e}")
            return

    # 1. 기초 체력 측정 (행/열 개수)
    print(f"   ✅ 데이터 크기: {len(df)}행 (데이터 개수)")
    print(f"   ✅ 컬럼 목록: {list(df.columns)}")

    # 2. 영양 결핍 검사 (빈 값 확인)
    null_counts = df.isnull().sum()
    if null_counts.sum() > 0:
        print(f"   ⚠️ 경고: 빈 값(Null)이 발견되었습니다!\n{null_counts[null_counts > 0]}")
    else:
        print("   ✅ 빈 값 없음 (아주 깨끗함!)")

    # 3. 데이터 길이 검사 (너무 짧거나 긴 게 있는지)
    # law_database는 '내용', law_qa는 'answer' 기준
    target_col = '내용' if '내용' in df.columns else ('answer' if 'answer' in df.columns else None)

    if target_col:
        df['length'] = df[target_col].astype(str).str.len()
        print(f"   📏 내용 길이 분석 ({target_col}):")
        print(f"      - 평균 길이: {df['length'].mean():.1f}자")
        print(f"      - 최소 길이: {df['length'].min()}자")
        print(f"      - 최대 길이: {df['length'].max()}자")

        # 너무 짧은 데이터(10자 미만) 샘플 확인
        short_rows = df[df['length'] < 10]
        if not short_rows.empty:
            print(f"      ⚠️ 10자 미만 데이터 {len(short_rows)}개 발견 (삭제 고려):")
            print(f"         예시: {short_rows[target_col].iloc[0]}")

    # 4. 시력 검사 (실제 데이터 3개 무작위 출력)
    print("\n   👀 [데이터 실물 확인 - 3개 랜덤]")
    print("-" * 50)
    for i, row in df.sample(3).iterrows():
        print(f"   행[{i}]: {row.values}")
        print("-" * 50)


if __name__ == "__main__":
    check_data_health(DB_FILE, "법령 DB")
    check_data_health(QA_FILE, "QA 문제집")