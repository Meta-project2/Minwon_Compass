import pandas as pd

# 결과 파일 불러오기
df = pd.read_csv("./data/minwon_llm_data/마포구_final_incidents.csv")

# 같은 incident_id끼리 모아서 제목만 확인하기
print("=== [사건별 민원 묶음 확인] ===")
for i in range(12): # 생성된 12개 그룹 확인
    group = df[df['incident_id'] == i]
    print(f"\n[사건 ID: {i}] - 총 {len(group)}건의 민원")
    for idx, row in group.iterrows():
        print(f"  - {row['neutral_summary'][:50]}...") # 제목과 본문 앞부분 출력