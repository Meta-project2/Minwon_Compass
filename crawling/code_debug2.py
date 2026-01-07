import pandas as pd
import json
import os
import glob

# ==========================================
# 🛠️ 사용자 설정 (경로를 꼭 확인해주세요!)
# ==========================================
# 1. TL (QA JSON) 폴더 경로
TL_FOLDER = 'data/rowdata/TL_법령_QA/'

# 2. TS (CSV) 폴더 경로 (폴더명 확인!)
TS_FOLDER = 'data/rowdata/TS_법령/'


# ==========================================

def check_tl_structure():
    print(f"\n🔍 [TL 데이터] JSON 내부 구조 뜯어보기")
    # 폴더 내의 첫 번째 JSON 파일 찾기
    json_files = glob.glob(os.path.join(TL_FOLDER, '**', '*.json'), recursive=True)

    if not json_files:
        print("   ❌ TL 폴더에 JSON 파일이 없습니다.")
        return

    target_file = json_files[0]
    print(f"   📄 파일명: {os.path.basename(target_file)}")

    try:
        with open(target_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # 'label' 안에 무엇이 들었는지 확인
        if 'label' in data:
            print(f"   🔑 'label' 안의 키 목록: {list(data['label'].keys())}")
            # 내용 살짝 출력
            print(f"   👀 'label' 내용 맛보기: {str(data['label'])[:200]} ...")
        else:
            print("   ⚠️ 'label' 키가 없습니다. 구조가 다른 것 같습니다.")
            print(f"   🔑 전체 키 목록: {list(data.keys())}")

    except Exception as e:
        print(f"   ⚠️ 읽기 실패: {e}")


def check_ts_csv():
    print(f"\n📊 [TS 데이터] CSV 컬럼 확인하기")
    # CSV 파일 찾기
    csv_files = glob.glob(os.path.join(TS_FOLDER, '**', '*.csv'), recursive=True)

    if not csv_files:
        print("   ❌ TS 폴더에 CSV 파일이 없습니다.")
        return

    target_file = csv_files[0]
    print(f"   📄 파일명: {os.path.basename(target_file)}")

    try:
        # 인코딩 문제 방지를 위해 utf-8-sig 또는 cp949 시도
        try:
            df = pd.read_csv(target_file, encoding='utf-8-sig', nrows=3)
        except:
            df = pd.read_csv(target_file, encoding='cp949', nrows=3)

        print(f"   🔑 컬럼 목록: {list(df.columns)}")
        print("   👀 데이터 1줄 미리보기:")
        print(df.iloc[0].to_dict())

    except Exception as e:
        print(f"   ⚠️ 읽기 실패: {e}")


if __name__ == "__main__":
    check_tl_structure()
    check_ts_csv()