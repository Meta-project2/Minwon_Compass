from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import time
import csv

# -------------------------------------------------------------
# 1. 파일 준비
# -------------------------------------------------------------
input_file = "마포구청_부서목록.csv"  # 읽어올 파일 (방금 만든 것)
output_file = "마포구청_전체직원목록.csv"  # 저장할 파일 (결과물)

# -------------------------------------------------------------
# 2. 브라우저 설정
# -------------------------------------------------------------
options = webdriver.ChromeOptions()
# options.add_argument("--headless") # 화면 없이 빠르게 하려면 주석 해제

driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)

# -------------------------------------------------------------
# 3. 크롤링 시작
# -------------------------------------------------------------
try:
    # (1) 저장할 파일 미리 열어두기 (헤더 작성)
    with open(output_file, 'w', newline='', encoding='utf-8-sig') as f_out:
        writer = csv.writer(f_out)
        # 엑셀 맨 윗줄 제목 (부서명을 맨 앞에 추가)
        writer.writerow(["부서명", "팀명", "직위", "이름", "전화번호", "담당업무"])

        # (2) 부서 목록 파일 읽기
        with open(input_file, 'r', encoding='utf-8-sig') as f_in:
            reader = csv.reader(f_in)
            next(reader)  # 첫 줄(제목 줄) 건너뛰기

            # 모든 부서 링크를 하나씩 순회
            for row in reader:
                dept_name = row[0]  # 부서명
                dept_url = row[2]  # 링크주소

                # '동/기관'이나 센터 홈페이지는 구조가 달라서 표가 없을 수도 있습니다.
                # 일단 'departList'(일반 부서)가 들어간 주소만 확실하게 긁어봅니다.
                # (모든 링크를 다 시도하려면 if문 제거하세요)
                # if "departList" not in dept_url:
                #     continue

                print(f"\n🚀 [{dept_name}] 페이지로 이동 중...")
                print(f"   주소: {dept_url}")

                try:
                    driver.get(dept_url)
                    wait = WebDriverWait(driver, 5)  # 5초까지만 대기

                    # (3) 직원 목록 테이블 찾기
                    # 보통 <tbody> 태그 안에 직원 정보가 있습니다.
                    table_rows = wait.until(
                        EC.presence_of_all_elements_located((By.CSS_SELECTOR, "tbody tr"))
                    )

                    print(f"   -> 직원 {len(table_rows)}명 발견! 데이터 추출 중...")

                    for tr in table_rows:
                        # 한 줄(tr)에 있는 칸(td)들을 다 가져옴
                        cols = tr.find_elements(By.TAG_NAME, "td")

                        # 데이터가 4칸 이상인 경우에만 수집 (빈 줄 방지)
                        if len(cols) >= 4:
                            # 텍스트만 깔끔하게 뽑기
                            row_data = [col.text.strip() for col in cols]

                            # [중요] 사이트마다 순서가 다를 수 있으니,
                            # 보통: [팀명, 직위, 이름, 전화번호, 업무] 순서라고 가정하고 저장
                            # 우리가 엑셀에 적을 순서: [부서명] + [나머지 내용]
                            save_data = [dept_name] + row_data

                            writer.writerow(save_data)  # 파일에 바로 저장

                except Exception as e:
                    print(f"   ⚠️ 실패: 이 페이지에서는 표를 찾지 못했습니다. (구조가 다를 수 있음)")
                    # 동 주민센터 등은 메인화면이라 표가 없을 수 있습니다. 이건 정상이니 넘어갑니다.
                    continue

                # 너무 빠르면 차단될 수 있으니 1초 휴식
                time.sleep(1)

    print("\n" + "=" * 50)
    print(f"🎉 크롤링 완료! '{output_file}' 파일을 확인하세요.")
    print("=" * 50)

except Exception as e:
    print(f"❌ 치명적 오류 발생: {e}")

finally:
    driver.quit()