import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
import requests
from bs4 import BeautifulSoup
import time
import csv
import re
import os

print("🤖 [디버깅] 서초구 새올 민원 '강제 추출' 모드 시작...")

# 1. 브라우저 실행
driver = uc.Chrome(use_subprocess=True)

try:
    print("Step 1: 페이지 접속 중...")
    driver.get(
        "https://eminwon.seocho.go.kr/emwp/gov/mogaha/ntis/web/emwp/cns/action/EmwpCnslWebAction.do?method=selectList&menu_id=EMWPCnslWebInq&jndinm=EmwpCnslWebEbe&methodNm=selectList")

    # 로딩 충분히 대기 (10초)
    time.sleep(10)

    # [진단 1] 현재 AI가 보고 있는 화면 사진 찍기 (중요!)
    driver.save_screenshot("debug_view.png")
    print("📸 현재 화면을 'debug_view.png'로 저장했습니다. (폴더 확인 필수)")

    # [진단 2] 페이지 소스코드 전체 가져오기
    full_html = driver.page_source

    # [전략] HTML 태그 무시하고, "fn_goDetail('숫자')" 패턴을 무조건 찾기
    # 정규표현식: fn_goDetail( 따옴표 숫자 따옴표 )
    print("Step 2: 페이지 전체에서 민원 번호(ID) 수색 중...")

    # 패턴 1: fn_goDetail('숫자')
    ids = re.findall(r"fn_goDetail\('(\d+)'\)", full_html)

    # 만약 없으면 패턴 2: fn_goDetail("숫자") (쌍따옴표)
    if not ids:
        ids = re.findall(r'fn_goDetail\("(\d+)"\)', full_html)

    # 만약 그래도 없으면 Iframe(액자) 안쪽 뒤지기
    if not ids:
        print("⚠️ 겉표지에서 못 찾음. Iframe(액자) 내부 진입 시도...")
        iframes = driver.find_elements(By.TAG_NAME, "iframe")
        if iframes:
            driver.switch_to.frame(iframes[0])  # 첫 번째 액자로 들어감
            full_html = driver.page_source
            ids = re.findall(r"fn_goDetail\('(\d+)'\)", full_html)

    # 중복 제거
    minwon_ids = list(set(ids))

    if len(minwon_ids) > 0:
        print(f"✅ 대성공! 민원 번호 {len(minwon_ids)}개를 찾았습니다.")
        print(f"   -> 추출된 번호 예시: {minwon_ids[:3]}")

        # -----------------------------------------------------------
        # 여기서부터는 성공했을 때만 실행되는 '내용 수집' 단계
        # -----------------------------------------------------------
        print("\nStep 3: 상세 내용 수집 시작...")

        # 쿠키 복사
        session_cookies = {c['name']: c['value'] for c in driver.get_cookies()}
        driver.quit()  # 브라우저 종료

        url = "https://eminwon.seocho.go.kr/emwp/gov/mogaha/ntis/web/emwp/cns/action/EmwpCnslWebAction.do"
        f = open("seocho_saeol_final.csv", "w", encoding="utf-8-sig", newline="")
        writer = csv.writer(f)
        writer.writerow(["민원번호", "제목", "질문내용", "답변부서", "답변내용"])

        count = 0
        for m_id in minwon_ids:
            try:
                payload = {
                    'bbs_se': '301',
                    'method': 'selectCnslWebShow',
                    'jndinm': 'EmwpCnslWebEJB',
                    'context': 'NTIS',
                    'cnsl_qna_no': m_id,
                    'menu_id': '301',
                    'pt_field': 'mw_cnsl_sj'
                }
                res = requests.post(url, data=payload, cookies=session_cookies)
                if res.status_code == 200:
                    soup = BeautifulSoup(res.text, 'html.parser')
                    title = soup.select_one(".view_title, td.le").text.strip() if soup.select_one(
                        ".view_title, td.le") else "제목못찾음"

                    # 본문 찾기 (여러 패턴 시도)
                    content_el = soup.select_one("td.content, div.view_cont, pre, textarea")
                    content = content_el.text.strip() if content_el else ""

                    # 답변 찾기
                    answer_el = soup.select_one(".answer_view, .reply_content, table.view_table")
                    answer = answer_el.text.strip() if answer_el else ""

                    writer.writerow([m_id, title, content, "부서정보(내용참조)", answer])
                    print(f"[{count + 1}] 저장 완료: {title[:10]}...")
                    count += 1
                time.sleep(0.5)
            except:
                pass

        f.close()
        print(f"\n🎉 최종 완료. 'seocho_saeol_final.csv' 파일 생성됨.")

    else:
        print("❌ 여전히 0개입니다.")
        print("👉 폴더에 생성된 'debug_view.png' 사진을 열어보세요.")
        print("   1. 흰 화면이면 -> 보안 프로그램 설치가 필요하거나 로딩 실패")
        print("   2. 목록이 보이는데 0개면 -> HTML 구조가 완전히 다름 (소스코드 확인 필요)")

except Exception as e:
    print(f"❌ 에러 발생: {e}")
    if 'driver' in locals():
        driver.quit()