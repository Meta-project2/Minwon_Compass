import os
import pandas as pd
import json

# 1. 탐색할 경로 설정 (현재 위치 기준)
target_path = "."  # 현재 폴더 및 하위 폴더 전체 탐색

# 2. 찾고 싶은 키워드 리스트 (한글 및 영어)
keywords = [
    "법", "law", "act",       # 법령 관련
    "조직", "jojik", "dept",    # 조직/부서 관련
    "직제", "structure",      # 구조 관련
    "code", "코드"            # 코드 데이터 관련
]

print(f"🔍 '{target_path}' 경로에서 법령 및 조직도 관련 파일을 찾습니다...\n")
print("-" * 60)

found_count = 0

# os.walk를 사용하여 모든 하위 폴더까지 샅샅이 뒤집니다.
for root, dirs, files in os.walk(target_path):
    for file in files:
        # 파일명과 확장자 분리
        filename, ext = os.path.splitext(file)
        
        # 파일명에 키워드가 포함되어 있는지 확인 (대소문자 무시)
        if any(keyword in filename.lower() for keyword in keywords):
            # 파이썬 스크립트(.py)나 임시 파일은 제외
            if ext.lower() in ['.py', '.pyc', '.git']:
                continue

            found_count += 1
            full_path = os.path.join(root, file)
            print(f"📁 관련 파일 발견: {full_path}")
            
            # 파일 형식에 따라 내용 살짝 엿보기
            try:
                # 1) CSV 파일인 경우
                if ext.lower() == '.csv':
                    df = pd.read_csv(full_path, nrows=1) # 1줄만 읽기
                    print(f"   ㄴ 📋 컬럼 정보: {list(df.columns)}")
                
                # 2) 엑셀 파일인 경우
                elif ext.lower() in ['.xlsx', '.xls']:
                    df = pd.read_excel(full_path, nrows=1)
                    print(f"   ㄴ 📊 엑셀 헤더: {list(df.columns)}")
                
                # 3) JSON 파일인 경우
                elif ext.lower() == '.json':
                    with open(full_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        # 리스트라면 첫 번째 요소의 키, 딕셔너리라면 키 목록 출력
                        if isinstance(data, list) and len(data) > 0:
                            print(f"   ㄴ ｛｝ JSON 구조 (리스트 첫 항목): {list(data[0].keys())}")
                        elif isinstance(data, dict):
                            print(f"   ㄴ ｛｝ JSON 키 목록: {list(data.keys())}")

                # 4) 이미지 파일인 경우
                elif ext.lower() in ['.png', '.jpg', '.jpeg']:
                    print("   ㄴ 🖼️ 이미지 파일입니다 (조직도 그림일 수 있음)")

            except Exception as e:
                print(f"   ㄴ ⚠️ 내용 미리보기 실패: {e}")
            
            print("-" * 60)

if found_count == 0:
    print("❌ 지정된 키워드(법, 조직, law, org 등)가 포함된 파일을 찾지 못했습니다.")
else:
    print(f"✅ 총 {found_count}개의 관련 파일을 찾았습니다.")