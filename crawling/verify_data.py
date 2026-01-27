import pandas as pd

df = pd.read_csv("./data/minwon_llm_data/마포구_final_incidents.csv")

print("=== [사건별 민원 묶음 확인] ===")
for i in range(12):
    group = df[df['incident_id'] == i]
    print(f"\n[사건 ID: {i}] - 총 {len(group)}건의 민원")
    for idx, row in group.iterrows():
        print(f"  - {row['neutral_summary'][:50]}...")