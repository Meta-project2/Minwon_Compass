from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import StaleElementReferenceException, TimeoutException
from selenium.webdriver.chrome.options import Options  # 옵션 설정을 위해 추가
import re
import time
import pandas as pd
import os


# 1. 공개 상담 민원 조회 페이지 이동 및 필터 설정
def move_to_open_minwon(driver):
    driver.execute_script(
        'fnPostLink("/gov/mogaha/ntis/web/emwp/cns/action/EmwpCnslWebAction","selectCnslWebPage","EMWPCnslWebInqL","EmwpCnslWebEJB","selectCnslWebPage","link")')
    time.sleep(2)

    from selenium.webdriver.support.select import Select
    try:
        select_elem = WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.NAME, 'pt_deal_state')))
        select = Select(select_elem)
        select.select_by_value("9")
        driver.execute_script('fncSearch()')
        time.sleep(2)
    except Exception as e:
        print(f"필터 설정 중 오류: {e}")


# 2. 데이터프레임 초기화
def make_df():
    cols = ['req_id', 'req_title', 'req_p', 'req_date', 'req_content', 'resp_dept', 'resp_date', 'resp_writer',
            'resp_content', 'page_num']
    return pd.DataFrame(columns=cols)


# 3. 메인 스크래핑 함수
def scrape(driver, district_name, result_df, save_dir):
    wait = WebDriverWait(driver, 15)

    try:
        navi_elements = wait.until(EC.presence_of_all_elements_located((By.CLASS_NAME, 'navi')))
        navi_elements[-1].click()
        time.sleep(1)  # [수정] 2초 -> 1초 (안전한 선에서 단축)
        last_page_num = int(wait.until(EC.presence_of_all_elements_located((By.CLASS_NAME, 'navi')))[-3].text)
        print(f'[{district_name}] 마지막 페이지 번호: {last_page_num}')

        driver.find_element(By.XPATH, '//*[@id="navigator"]/a[1]').click()
        time.sleep(1)  # [수정] 2초 -> 1초
    except Exception as e:
        print(f"페이지 정보 획득 실패: {e}")
        return result_df

    while True:
        try:
            wait.until(EC.presence_of_element_located((By.TAG_NAME, 'tbody')))
            spans = driver.find_elements(By.TAG_NAME, 'span')
            page_num = int(spans[-4].text)

            rows = driver.find_element(By.TAG_NAME, 'tbody').find_elements(By.TAG_NAME, 'tr')
            list_num = len(rows)

            print(f">>> {district_name} - {page_num}페이지 크롤링 시작 (민원 {list_num}건)")

            for i in range(list_num):
                try:
                    wait.until(EC.presence_of_element_located((By.ID, 'dataSetTb')))
                    current_rows = driver.find_element(By.TAG_NAME, 'tbody').find_elements(By.TAG_NAME, 'tr')
                    transfer_text = current_rows[i].find_element(By.CLASS_NAME, "td-answer").text.strip()
                    target_minwon = current_rows[i].find_element(By.TAG_NAME, 'a')

                    if target_minwon.text.strip() == '':
                        continue

                    driver.execute_script("arguments[0].click();", target_minwon)
                    wait.until(EC.presence_of_element_located((By.TAG_NAME, 'tbody')))
                    tbodies = driver.find_elements(By.TAG_NAME, 'tbody')

                    if 2 <= len(tbodies) <= 3:
                        complaint_table = tbodies[0].find_elements(By.TAG_NAME, 'tr')
                        req_id = complaint_table[0].find_elements(By.TAG_NAME, 'td')[0].text
                        req_title = complaint_table[0].find_elements(By.TAG_NAME, 'td')[-1].text
                        req_p = complaint_table[1].find_elements(By.TAG_NAME, 'td')[0].text
                        req_date = complaint_table[1].find_elements(By.TAG_NAME, 'td')[-2].text
                        req_content = complaint_table[3].find_elements(By.TAG_NAME, 'td')[-1].text
                        req_content = re.split(r'※ 첨부파일', req_content)[0]

                        resp_dept, resp_date, resp_writer, resp_content = "", "", "", ""

                        if re.search(r'^(이송이첩|다부처병렬)$', transfer_text):
                            try:
                                element = driver.find_element(By.XPATH,
                                                              '/html/body/main/div/table/tbody/tr/td').text.split('\n')
                                resp_dept = re.search(r'\s*:\s*(.+)', element[1]).group(1).strip() if len(
                                    element) > 1 else "Unknown"
                            except:
                                resp_dept = "이송이첩(부서확인불가)"
                        else:
                            resp_table = tbodies[1].find_elements(By.TAG_NAME, 'tr')
                            if len(resp_table) == 3:
                                resp_dept = resp_table[0].find_elements(By.TAG_NAME, 'td')[0].text
                                resp_date = resp_table[0].find_elements(By.TAG_NAME, 'td')[1].text
                                resp_writer = resp_table[1].find_elements(By.TAG_NAME, 'td')[0].text
                                resp_content = resp_table[2].find_elements(By.TAG_NAME, 'td')[0].text
                            else:
                                req_title = "테스트"

                        result_df.loc[len(result_df) + 1] = {
                            'req_id': req_id, 'req_title': req_title, 'req_p': req_p,
                            'req_date': req_date, 'req_content': req_content, 'resp_dept': resp_dept,
                            'resp_date': resp_date, 'resp_writer': resp_writer,
                            'resp_content': resp_content, 'page_num': page_num
                        }

                    driver.back()
                    wait.until(EC.presence_of_element_located((By.TAG_NAME, 'tbody')))

                except Exception as row_e:
                    print(f"  - {i + 1}번째 행 처리 중 오류: {row_e}")
                    if len(driver.find_elements(By.ID, 'dataSetTb')) == 0:
                        driver.back()
                    continue

            temp_filename = f'temp_{district_name}.csv'
            temp_path = os.path.join(save_dir, temp_filename)
            result_df.to_csv(temp_path, index=False, encoding='utf-8-sig')

            if page_num == last_page_num:
                break

            next_btn = driver.find_elements(By.CLASS_NAME, 'navi')[-2]
            driver.execute_script("arguments[0].click();", next_btn)
            time.sleep(1)  # [수정] 2초 -> 1초

        except StaleElementReferenceException:
            print("DOM 변경 감지됨. 페이지를 다시 로드합니다.")
            time.sleep(1)  # [수정] 짧게 대기
            continue
        except Exception as p_e:
            print(f"페이지 처리 중 치명적 오류: {p_e}")
            break

    return result_df


# 4. 테스트 데이터 제거
def remove_test(result_df):
    try:
        mask = result_df['req_title'].str.contains('테스트|test', case=False, na=False)
        result_df = result_df[~mask].reset_index(drop=True)
    except:
        pass
    return result_df


# 5. 실행부
url_dict = {
    '중랑구': 'https://eminwon.jungnang.go.kr/emwp/gov/mogaha/ntis/web/emwp/cmmpotal/action/EmwpMainMgtAction.do',
}

if __name__ == "__main__":
    current_folder = os.path.dirname(os.path.abspath(__file__))
    save_dir = os.path.join(current_folder, 'data', 'rowdata', '새올')
    os.makedirs(save_dir, exist_ok=True)

    print(f"📂 저장 위치: {save_dir}")

    # ==========================================
    # 🛡️ [안전한 속도 향상 설정]
    # ==========================================
    chrome_options = Options()
    # 이미지 로딩만 끕니다. (가장 안전하고 효과적)
    prefs = {"profile.managed_default_content_settings.images": 2}
    chrome_options.add_experimental_option("prefs", prefs)
    # ==========================================

    for k, v in url_dict.items():
        print(f'\n############# {k} 크롤링 시작 #############')

        # 옵션 적용해서 브라우저 열기
        driver = webdriver.Chrome(options=chrome_options)

        try:
            driver.get(v)
            move_to_open_minwon(driver)

            initial_df = make_df()
            final_df = scrape(driver, k, initial_df, save_dir)
            final_df = remove_test(final_df)

            final_filename = f'{k}.csv'
            final_path = os.path.join(save_dir, final_filename)

            final_df.to_csv(final_path, index=False, encoding='utf-8-sig')

            temp_filename = f'temp_{k}.csv'
            temp_path = os.path.join(save_dir, temp_filename)

            if os.path.exists(temp_path):
                os.remove(temp_path)

            print(f'############# {k} 완료! 저장된 파일: {final_path} #############')
        except Exception as main_e:
            print(f"{k} 처리 중 메인 루프 오류: {main_e}")
        finally:
            driver.quit()