import streamlit as st
import time
import random
import pandas as pd
from datetime import datetime

# ==========================================
# 1. 설정 및 가짜 데이터베이스(메모리)
# ==========================================
st.set_page_config(page_title="서초구 AI 민원 플랫폼", layout="wide")

# 프로그램이 켜져있는 동안 데이터를 저장할 가짜 DB (Session State)
if 'minwon_db' not in st.session_state:
    st.session_state.minwon_db = [
        {"id": 1, "date": "2025-05-30", "title": "강남역 9번 출구 보도블럭 파손", "content": "걷다가 걸려 넘어질 뻔했습니다.", "status": "접수",
         "dept": "도로과", "ai_score": 95},
        {"id": 2, "date": "2025-05-31", "title": "서초동 불법 주차 신고", "content": "가게 앞을 막고 있어요.", "status": "처리완료",
         "dept": "주차관리과", "ai_score": 88}
    ]


# ==========================================
# 2. 공통 함수 (AI 기능이 들어갈 자리)
# ==========================================
def ai_generate_draft(text):
    """(가짜) AI가 민원 초안을 써주는 척하는 함수"""
    time.sleep(1.5)  # 로딩 효과
    return f"[AI 자동 작성]\n\n귀하가 입력하신 '{text}' 내용에 기반하여 정식 민원 양식으로 정리했습니다.\n\n1. 발생 일시: {datetime.now().strftime('%Y-%m-%d %H:%M')}\n2. 주요 내용: {text}\n3. 요청 사항: 신속한 현장 확인 및 조치 요망\n\n(이 내용은 AI가 작성했습니다.)"


def ai_recommend_dept(text):
    """(가짜) AI가 부서를 추천해주는 척하는 함수"""
    # 실제로는 여기서 RAG 코드가 돌아갑니다.
    depts = ["주차관리과", "도로과", "청소행정과", "치수과"]
    return random.choice(depts)


# ==========================================
# 3. 사이드바 (화면 전환)
# ==========================================
st.sidebar.title("🚀 서초 AI 민원 시스템")
menu = st.sidebar.radio("접속 모드 선택", ["👨‍🦱 민원인 (시민)", "🧑‍💼 공무원 (담당자)"])

# ==========================================
# 4. [화면 1] 민원인 모드
# ==========================================
if menu == "👨‍🦱 민원인 (시민)":
    st.title("🗣️ AI가 도와주는 쉽고 빠른 민원 접수")
    st.info("무엇이 불편하신가요? 대충 말씀하셔도 AI가 찰떡같이 정리해 드립니다!")

    with st.form("minwon_form"):
        col1, col2 = st.columns([2, 1])

        with col1:
            raw_input = st.text_area("민원 내용 입력 (예: 집 앞에 쓰레기가 너무 많아요)", height=150)

        with col2:
            st.write("📸 사진 업로드 (선택)")
            st.file_uploader("현장 사진을 올려주세요", type=['png', 'jpg'])

        # AI 초안 작성 버튼
        if st.form_submit_button("🤖 AI로 초안 작성하기"):
            if raw_input:
                with st.spinner("AI가 법률 용어와 양식에 맞춰 작성 중입니다..."):
                    draft = ai_generate_draft(raw_input)
                    st.success("작성 완료! 내용을 확인해주세요.")
                    st.text_area("최종 제출 초안", value=draft, height=200)

                    # 실제로 저장
                    new_data = {
                        "id": len(st.session_state.minwon_db) + 1,
                        "date": datetime.now().strftime("%Y-%m-%d"),
                        "title": f"신규 민원 ({raw_input[:10]}...)",
                        "content": draft,
                        "status": "접수",
                        "dept": ai_recommend_dept(raw_input),  # AI가 몰래 부서 배정
                        "ai_score": random.randint(70, 99)
                    }
                    st.session_state.minwon_db.append(new_data)
                    st.balloons()  # 성공 축하 효과
            else:
                st.warning("내용을 입력해주세요!")

    st.divider()
    st.subheader("📋 내가 낸 민원 처리 현황")
    # 내가 낸 민원만 보여주기 (가장 최근 3개)
    my_df = pd.DataFrame(st.session_state.minwon_db[-3:])
    st.dataframe(my_df[["date", "title", "status", "dept"]], use_container_width=True)


# ==========================================
# 5. [화면 2] 공무원 모드
# ==========================================
elif menu == "🧑‍💼 공무원 (담당자)":
    st.title("🏢 스마트 행정 대시보드")

    # 상단 지표 (대시보드 느낌)
    m1, m2, m3, m4 = st.columns(4)
    m1.metric("오늘 접수된 민원", f"{len(st.session_state.minwon_db)}건", "+2건")
    m2.metric("AI 자동 분류율", "94.5%", "+1.2%")
    m3.metric("평균 처리 시간", "3.2시간", "-0.5시간")
    m4.metric("악성 민원 차단", "12건", "안전함")

    st.divider()

    col_list, col_detail = st.columns([1, 1])

    with col_list:
        st.subheader("📥 접수 대기 목록")
        # 데이터프레임으로 보여주기
        df = pd.DataFrame(st.session_state.minwon_db)
        st.dataframe(df[["id", "title", "dept", "status"]], use_container_width=True)

    with col_detail:
        st.subheader("🔍 상세 검토 및 AI 분석")

        # 민원 선택 (ID로)
        selected_id = st.number_input("검토할 민원 ID 입력", min_value=1, max_value=len(df), value=len(df))

        # 선택된 데이터 가져오기
        target = next((item for item in st.session_state.minwon_db if item["id"] == selected_id), None)

        if target:
            with st.container(border=True):
                st.markdown(f"**제목:** {target['title']}")
                st.markdown(f"**내용:**")
                st.info(target['content'])

                st.divider()

                # 여기가 RAG 기능이 보여지는 곳
                st.markdown("### 🤖 AI 분석 리포트")
                st.write(f"**추천 담당 부서:** `{target['dept']}`")
                st.write(f"**AI 확신도:** {target['ai_score']}%")

                with st.expander("📚 관련 법령 및 유사 사례 보기"):
                    st.write("- **관련 법령:** 도로법 제32조 (도로의 보전)")
                    st.write("- **유사 사례:** 2024-11-02 방배동 보도블럭 파손 (도로과 처리)")

                with st.expander("✍️ AI 추천 답변 초안"):
                    st.text_area("답변 수정",
                                 value=f"안녕하십니까, {target['dept']}입니다. 귀하께서 제기하신 불편 사항에 대해 현장 확인 후 즉시 조치하도록 하겠습니다. 불편을 드려 죄송합니다.",
                                 height=100)

            if st.button("결재 및 답변 전송"):
                st.success("처리가 완료되었습니다. 민원인에게 알림톡이 전송되었습니다.")
                target['status'] = "처리완료"