import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
import time
import csv

# ==========================================
# 🤖 서초구청 조직도 크롤러 (업그레이드 버전)
# - 기능: 민원센터 건너뛰기, 데이터 밀림 현상 자동 보정, 이름/직위 분리
# ==========================================

print("🤖 [조직도] 스마트 수집 모드 가동...")
driver = uc.Chrome(use_subprocess=True)

# 1. 엑셀 파일 준비
filename = "seocho_staff_final_v2.csv"  # 파일명 살짝 바꿨습니다 (구분 위해)
f = open(filename, "w", encoding="utf-8-sig", newline="")
writer = csv.writer(f)
writer.writerow(["소속조직", "부서/팀명", "직위", "이름", "전화번호", "담당업무"])

unique_staff_ids = set()  # 중복 방지용
total_saved_count = 0

try:
    # 2. 페이지 진입
    driver.get("https://www.seocho.go.kr/site/seocho/05/10503010100002015062601.jsp")
    time.sleep(1)

    # 예외 처리: 페이지 못 찾으면 메뉴로 찾아가기
    if "페이지를 찾을 수" in driver.page_source:
        print("ℹ️ 메뉴를 통해 조직도로 이동합니다...")
        driver.get("https://www.seocho.go.kr/site/seocho/main.do")
        time.sleep(1)
        driver.find_element(By.PARTIAL_LINK_TEXT, "열린구청").click()
        time.sleep(1)
        driver.find_element(By.PARTIAL_LINK_TEXT, "행정조직").click()
        time.sleep(1)
        try:
            driver.find_element(By.PARTIAL_LINK_TEXT, "조직도").click()
        except:
            pass

    time.sleep(3)

    # 3. 조직 박스 찾기
    target_selectors = ".org-dep3 a, .org-tree2 a"
    dept_boxes = driver.find_elements(By.CSS_SELECTOR, target_selectors)
    total_count = len(dept_boxes)
    print(f"📊 총 {total_count}개 조직 발견.\n")

    for i in range(total_count):
        try:
            # Stale Element 방지 (요소를 잃어버렸을 때 다시 찾기)
            current_boxes = driver.find_elements(By.CSS_SELECTOR, target_selectors)
            if i >= len(current_boxes):
                driver.refresh()
                time.sleep(3)
                current_boxes = driver.find_elements(By.CSS_SELECTOR, target_selectors)

            target = current_boxes[i]
            dept_name = target.text.strip()  # 소속조직 이름

            # [필터링 1] 불필요한 부서(민원센터 등) 건너뛰기
            # 사용자가 요청한 'OK민원센터' 등은 여기서 걸러집니다.
            if "민원센터" in dept_name:
                print(f"⏩ [건너뛰기] {dept_name} (단순 민원 센터)")
                continue

            # 기본 필터링 (국, 소, 관, 과, 동 등으로 끝나는지 확인)
            target_keywords = ('국', '소', '관', '과', '담당관', '동', '팀', '실')
            if not dept_name.endswith(target_keywords) and "보건지소" not in dept_name:
                continue

            print(f"[{i + 1}/{total_count}] 🎯 '{dept_name}' 수집 중...")

            # 강제 클릭 (스크롤 후 클릭)
            driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", target)
            time.sleep(0.5)
            driver.execute_script("arguments[0].click();", target)
            time.sleep(3)  # 페이지 로딩 대기

            # 표(table) 데이터 가져오기
            rows = driver.find_elements(By.CSS_SELECTOR, "tbody tr")
            saved_in_this_dept = 0

            for row in rows:
                cells = row.find_elements(By.TAG_NAME, "td")

                # 칸이 없으면 패스
                if not cells:
                    continue

                # 텍스트 추출
                texts = [c.text.strip() for c in cells]

                # 전화번호(02-) 위치 찾기 (기준점)
                phone_idx = -1
                phone = ""
                for idx, text in enumerate(texts):
                    if "02-" in text:
                        phone_idx = idx
                        phone = text
                        break

                # 전화번호가 없으면 직원 아님 -> 패스
                if phone_idx == -1:
                    continue

                # [필터링 2] 전화번호에 쉼표(,)가 있으면 패스
                # 예: "02-1234, 02-5678" 같은 대표번호 라인 제외
                if "," in phone:
                    continue

                # ========================================================
                # 🔧 [핵심 수정] 데이터 위치 보정 및 이름 분리 로직
                # ========================================================

                team = ""
                pos = ""
                name = ""
                task = ""

                # 1. 담당업무 (전화번호 다음 칸)
                if len(texts) > phone_idx + 1:
                    task = texts[phone_idx + 1]

                # 2. 전화번호 앞쪽 데이터 분석 (팀명, 직위, 이름)
                # phone_idx가 2라면 -> 앞에는 [팀명, 직위+이름] 2칸만 있는 상황 (밀림 현상)
                # phone_idx가 3라면 -> 앞에는 [팀명, 직위, 이름] 3칸이 있는 상황 (정상)

                cols_before_phone = texts[:phone_idx]  # 전화번호 앞의 칸들만 자름

                if len(cols_before_phone) == 2:
                    # [상황 A] 칸이 모자람 -> 밀려있는 상태
                    # 구조: [팀명] [직위+이름]
                    team = cols_before_phone[0]  # 첫 번째는 팀명
                    raw_info = cols_before_phone[1]  # 두 번째는 '직위+이름' 뭉치

                    # 띄어쓰기로 쪼개기
                    splitted = raw_info.split()
                    if len(splitted) >= 2:
                        pos = splitted[0]  # 앞부분은 직위
                        name = splitted[1]  # 뒷부분은 이름
                    else:
                        pos = splitted[0]  # 하나만 있으면 직위로 간주
                        name = ""  # 이름은 비워둠 (요청하신 부분!)

                elif len(cols_before_phone) >= 3:
                    # [상황 B] 칸이 충분함 -> 정상
                    # 구조: ... [팀명] [직위] [이름]
                    team = cols_before_phone[-3]
                    pos = cols_before_phone[-2]
                    name = cols_before_phone[-1]

                else:
                    # 그 외 예외 상황 (칸이 너무 적음)
                    continue

                # 중복 저장 방지
                if phone in unique_staff_ids:
                    continue
                unique_staff_ids.add(phone)

                # 엑셀 저장
                writer.writerow([dept_name, team, pos, name, phone, task])
                saved_in_this_dept += 1
                total_saved_count += 1

            print(f"   -> {saved_in_this_dept}명 정리 완료")

            # 뒤로 가기
            driver.back()
            time.sleep(2)

        except Exception as e:
            print(f"⚠️ 에러 발생 ({dept_name}): {e}")
            try:
                driver.back();
                time.sleep(2)
            except:
                pass

    print(f"\n✅ 모든 작업 완료! 'seocho_staff_final_v2.csv' 파일을 확인하세요.")

except Exception as e:
    print(f"❌ 치명적 오류: {e}")

finally:
    f.close()
    driver.quit()