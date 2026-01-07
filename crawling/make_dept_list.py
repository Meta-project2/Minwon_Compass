import pandas as pd
import glob
import os

# 1. 데이터 파일이 있는 경로 설정
data_path = "./data/processed_data/"  # _cleaned.csv 파일들이 있는 폴더
output_file = "department_info.csv"   # 결과를 저장할 파일 이름

print("🕵️‍♂️ 민원 데이터에서 부서 목록 추출을 시작합니다...\n")

# 2. 모든 _cleaned.csv 파일 찾기
all_files = glob.glob(os.path.join(data_path, "*_cleaned.csv"))
total_dept_list = []

if not all_files:
    print(f"❌ '{data_path}' 경로에서 파일을 찾지 못했습니다. 경로를 확인해주세요.")
else:
    for file in all_files:
        try:
            # 파일 읽기
            df = pd.read_csv(file)
            
            # 'resp_dept' (답변 부서) 컬럼이 있는지 확인
            if 'resp_dept' in df.columns:
                # 결측치(빈 값) 제거하고 리스트로 변환하여 추가
                depts = df['resp_dept'].dropna().tolist()
                total_dept_list.extend(depts)
                print(f"✅ {os.path.basename(file)}: 부서 정보 {len(depts)}개 추출 완료")
            else:
                print(f"⚠️ {os.path.basename(file)}: 'resp_dept' 컬럼이 없습니다.")
                
        except Exception as e:
            print(f"❌ {os.path.basename(file)} 읽기 실패: {e}")

    # 3. 데이터 정리 및 통계 내기
    if total_dept_list:
        print("-" * 50)
        # 리스트를 DataFrame으로 변환
        dept_df = pd.DataFrame(total_dept_list, columns=['department'])
        
        # 부서별 등장 횟수 세기 (가장 일을 많이 하는 부서 순으로 정렬)
        dept_counts = dept_df['department'].value_counts().reset_index()
        dept_counts.columns = ['department_name', 'count'] # 컬럼 이름 변경
        
        # 4. CSV로 저장
        dept_counts.to_csv(output_file, index=False, encoding='utf-8-sig')
        
        print(f"\n🎉 총 {len(dept_counts)}개의 고유 부서를 찾았습니다!")
        print(f"💾 결과가 '{output_file}' 파일로 저장되었습니다.")
        
        # 상위 5개 부서 미리보기
        print("\n👀 [가장 민원이 많은 부서 TOP 5]")
        print(dept_counts.head(5))
    else:
        print("\n❌ 추출된 부서 정보가 하나도 없습니다.")