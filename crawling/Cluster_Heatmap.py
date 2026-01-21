import psycopg2
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import json
from sklearn.manifold import TSNE

# DB 설정
DB_CONFIG = { "host": "localhost", "dbname": "postgres", "user": "postgres", "password": "0000", "port": "5432" }

import platform
if platform.system() == 'Darwin': plt.rc('font', family='AppleGothic')
else: plt.rc('font', family='Malgun Gothic')
plt.rc('axes', unicode_minus=False)

def parse_vector(val):
    if isinstance(val, str):
        try: return np.array(json.loads(val))
        except: return np.zeros(1024)
    return np.array(val) if val is not None else np.zeros(1024)

def plot_final_polished():
    conn = psycopg2.connect(**DB_CONFIG)
    print("📥 데이터 불러오는 중...")
    
    sql = """
        SELECT c.id, c.incident_id, n.embedding
        FROM complaints c
        JOIN complaint_normalizations n ON c.id = n.complaint_id
        WHERE c.incident_id IS NOT NULL AND n.embedding IS NOT NULL
    """
    
    import warnings
    warnings.filterwarnings('ignore')
    df = pd.read_sql(sql, conn)
    conn.close()
    
    if df.empty: 
        print("❌ 군집화된 데이터가 없습니다.")
        return

    df['vec'] = df['embedding'].apply(parse_vector)
    
    print("🎨 t-SNE 좌표 계산 중... (n_iter 옵션 제거)")
    matrix = np.vstack(df['vec'].values)
    
    # [수정] n_iter=1000 삭제
    tsne = TSNE(n_components=2, random_state=42, perplexity=40)
    visual_data = tsne.fit_transform(matrix)
    
    df['x'] = visual_data[:, 0]
    df['y'] = visual_data[:, 1]
    
    # 상위 20개 군집 강조 전략
    top_n = 20
    top_clusters = df['incident_id'].value_counts().nlargest(top_n).index
    
    def get_label(iid):
        if iid in top_clusters:
            return f"Cluster {iid}"
        return "기타 (소규모 군집)"
        
    df['Label'] = df['incident_id'].apply(get_label)
    df = df.sort_values('Label', ascending=(df['Label'].iloc[0] == '기타 (소규모 군집)'))

    plt.figure(figsize=(12, 10))
    
    # 기타(회색) 그리기
    others = df[df['Label'] == "기타 (소규모 군집)"]
    plt.scatter(others['x'], others['y'], c='#e0e0e0', s=30, label='기타 (소규모)', alpha=0.5)
    
    # 메인 군집(컬러) 그리기
    main = df[df['Label'] != "기타 (소규모 군집)"]
    sns.scatterplot(
        data=main, x='x', y='y', 
        hue='Label', 
        palette='tab20', 
        s=80, alpha=0.9, edgecolor='white'
    )
    
    plt.title('민원 데이터 군집화 최종 결과 (Top 20 이슈 강조)', fontsize=18, fontweight='bold', pad=20)
    plt.legend(bbox_to_anchor=(1.02, 1), loc='upper left', title='주요 군집 ID')
    plt.axis('off') 
    plt.tight_layout()
    plt.savefig('final_polished_result.png', dpi=300)
    plt.show()
    print("✅ 저장 완료: final_polished_result.png")

if __name__ == "__main__":
    plot_final_polished()