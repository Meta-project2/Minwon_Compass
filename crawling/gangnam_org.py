from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
import pandas as pd
import time

# ==========================================
# 🛠️ 강남구청 조직도 URL
# ==========================================
TARGET_URL = "https://www.gangnam.go.kr/dept/user/find.do?mid=ID06_040603"
OUTPUT_FILE = 'gangnam_org_chart.csv'


# ==========================================

def crawl_gangnam_departments():
    # 옵션 설정 (화면 띄우고 하는 게 진행상황 보기 좋습니다)
    options = webdriver.ChromeOptions()
    options.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36")

    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    all_staff_data = []

    print(f"🚀 강남구청 조직도 크롤링 시작: {TARGET_URL}")
    driver.get(TARGET_URL)
    time.sleep(3)  # 페이지 로딩 대기

    try:
        # 1. 조직도 안에 있는 '부서 링크(버튼)'들을 모두 찾습니다.
        # (스크린샷 기반 추정: .organization_wrap 클래스 내부의 a 태그들)
        # 보통 국/과 버튼들이 a 태그로 되어 있습니다.
        dept_links = driver.find_elements(By.CSS_SELECTOR, ".organization_wrap a")

        print(f"   🔍 총 {len(dept_links)}개의 부서 버튼을 발견했습니다.")

        # 링크가 너무 많으면 테스트로 앞쪽 5개만 할 수도 있습니다. (전체 하려면 슬라이싱 제거)
        # for i in range(len(dept_links)):  <-- 전체 수집용
        for i in range(len(dept_links)):
            try:
                # 요소가 자꾸 바뀌므로(Stale) 매번 다시 찾아야 안전합니다.
                current_links = driver.find_elements(By.CSS_SELECTOR, ".organization_wrap a")
                if i >= len(current_links): break

                button = current_links[i]
                dept_name = button.text.strip()

                # 빈 버튼이거나 '국' 이름인 경우 건너뛰기 (필요시 로직 추가)
                if not dept_name: continue

                print(f"   [{i + 1}/{len(dept_links)}] '{dept_name}' 클릭 시도...", end="")

                # 2. 버튼 클릭 (자바스크립트 클릭이 더 확실함)
                driver.execute_script("arguments[0].click();", button)
                time.sleep(2)  # 표가 로딩될 때까지 기다림 (중요!)

                # 3. 아래에 뜬 테이블(직원현황) 찾기
                # 스크린샷에 나온 id="deptInfoDiv" 활용
                try:
                    table = driver.find_element(By.CSS_SELECTOR, "#deptInfoDiv table")
                    rows = table.find_elements(By.TAG_NAME, "tr")

                    collected_count = 0
                    for row in rows:
                        cols = row.find_elements(By.TAG_NAME, "td")
                        # 데이터가 있는 행만 (보통 4칸: 소속, 직위, 전화번호, 업무)
                        if len(cols) >= 4:
                            staff_info = {
                                '부서명': dept_name,  # 클릭한 부서명
                                '소속': cols[0].text.strip(),
                                '직위': cols[1].text.strip(),
                                '전화번호': cols[2].text.strip(),
                                '담당업무': cols[3].text.strip()
                            }
                            all_staff_data.append(staff_info)
                            collected_count += 1

                    print(f" -> 성공! ({collected_count}명 수집)")

                except:
                    print(" -> ⚠️ 직원 표가 없습니다 (상위 조직이거나 링크 없음)")

            except Exception as e:
                print(f"\n      ❌ 개별 부서 처리 중 에러: {e}")
                continue

    except Exception as e:
        print(f"❌ 전체 로직 에러: {e}")

    finally:
        driver.quit()

    # 저장
    if all_staff_data:
        df = pd.DataFrame(all_staff_data)
        # 내용에 줄바꿈이 있으면 보기 흉하므로 공백으로 변경
        df['담당업무'] = df['담당업무'].str.replace('\n', ' ').str.replace('\r', '')

        df.to_csv(OUTPUT_FILE, index=False, encoding='utf-8-sig')
        print(f"\n✅ 수집 완료! 총 {len(df)}명의 데이터가 저장되었습니다.")
        print(f"   📂 파일 경로: {OUTPUT_FILE}")
    else:
        print("\n⚠️ 수집된 데이터가 없습니다.")


if __name__ == "__main__":
    crawl_gangnam_departments()