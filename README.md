# 🧭 민원 나침반 (Minwon Compass)

> **LLM/RAG 기반 지능형 민원 처리 지원 & 자동 배정 플랫폼**
> *"단순 반복 업무와 부서 간 핑퐁 현상을 해결하여, 행정의 효율성과 신뢰도를 높입니다."*

---

## 📖 1. 프로젝트 개요 (Project Overview)

**민원 나침반**은 공공기관 민원 처리 과정에서 발생하는 비효율을 해결하기 위해 개발된 **AI 기반 행정 지원 시스템**입니다.
대규모 언어 모델(LLM)과 RAG(검색 증강 생성) 기술을 활용하여 접수된 민원의 의도를 분석하고, 담당 부서를 자동으로 배정하며, 법령과 유사 사례에 기반한 답변 초안을 공무원에게 제공합니다.

### 🛑 기획 배경 (Problem)

* **핑퐁(Ping-Pong) 현상:** 민원 내용의 모호함으로 인해 담당 부서 배정 오류 및 재이관 반복.


* **높은 정보 탐색 비용:** 담당자가 답변 작성을 위해 과거 유사 사례나 방대한 법령 규정을 일일이 찾아야 함.


* **반복 업무 과중:** 동일한 이슈(예: 특정 지역 포트홀)에 대한 중복 민원이 다수 발생하여 행정력 낭비.



### ✅ 핵심 솔루션 (Solution)

* **AI 자동 배정 & 라우팅:** 문맥 유사도와 키워드 분석을 통해 최적의 담당 부서를 추천.


* **RAG 기반 업무 지원:** 민원 내용과 관련된 **법령(조 단위)** 및 **과거 유사 민원**을 즉시 검색하여 근거 기반 답변 초안 생성.


* **지능형 군집화 (Clustering):** **DBSCAN 알고리즘**을 적용하여 실시간으로 유입되는 중복/유사 민원을 자동으로 그룹화.



---

## 🛠 2. 기술 스택 (Tech Stack)

| 구분 | 기술 스택 | 설명 |
| --- | --- | --- |
| **Backend** | **Java, Spring Boot, Gradle** | REST API 서버, 비즈니스 로직, 인증/권한(OAuth2) 관리 |
| **Database** | **PostgreSQL** | 관계형 데이터 및 벡터(Vector) 데이터 통합 관리, pgvector 활용 |
| **AI / ML** | **Python, FastAPI** | LLM 인터페이스, 임베딩 처리, RAG 파이프라인 구축 |
| **AI Tool** | **LangFlow, OpenAI API, Ollama** | AI 워크플로우 설계 및 LLM(GPT) 연동 |
| **Frontend** | **React, Nginx, Vite** | 민원인/공무원 UI, 대시보드(Recharts), 정적 파일 서빙 |
| **Infra** | **Docker, GCP** | 컨테이너 기반 배포, 클라우드 서버 환경 구축 |
| **Library** | **QueryDSL, JPA** | 동적 쿼리 처리 및 ORM 매핑 |

---

## 🏗 3. 시스템 아키텍처 (System Architecture)

*(PPT 8페이지의 아키텍처 다이어그램 참조)*

### 🔄 데이터 흐름

1. **Client:** 민원인(Web/Mobile) 및 공무원(Dashboard)이 Nginx(Reverse Proxy)를 통해 접속.


2. **API Gateway:** Nginx가 `/api/` 요청은 Spring Boot로, 정적 리소스는 React로 라우팅.

3. **Backend (Spring Boot):** 사용자 요청 처리, DB CRUD 수행. AI 분석이 필요한 경우 FastAPI 서버로 요청 (`/api/v2/`).


4. **AI Server (FastAPI)**
    * **임베딩:** 민원 텍스트를 1024차원 벡터로 변환.

    * **Langflow:** 민원의 분석 및 최적 부서 매칭 수행 

    * **RAG:** PostgreSQL에서 유사 벡터 검색 후 OpenAI API를 통해 답변/분석 결과 생성.



5. **Database:** 민원 데이터, 사용자 정보, 벡터 데이터(임베딩된 법령/사례) 저장.



---

### 🤖 4.1. 하이브리드 AI 부서 배정 (Auto Routing)
단순한 키워드 매칭을 넘어, 문맥을 이해하는 **하이브리드 검색 방식**을 적용하여 배정 정확도를 극대화했습니다.

* **알고리즘 로직**
  $$Final Score = (Context \times 0.6) + (Keyword \times 0.2) + Category Bonus$$
  * **문맥 유사도 (Context):** 민원 요약본의 임베딩 벡터 간 코사인 유사도 계산.
  * **키워드 매칭 (Keyword):** 핵심 키워드(`Search Vector`)의 정밀 대조.
  * **부서 가중치:** AI가 분류한 대분류(예: 도로교통)와 부서명이 일치할 경우 가산점 부여.

* **RAGAS 평가 지표**
  * 배정 신뢰도(Faithfulness): **0.77** | 재현율(Recall): **0.67** | 근거 적합도(Context Precision): **0.71**

* **결과 제공**
  * 상위 3개 추천 부서와 각각의 신뢰도(%)를 시각화하여 제공.



### 📚 4.2. RAG 기반 민원 처리 지원 (Legal & Case Search)

담당 공무원이 즉시 활용할 수 있는 법적 근거와 참고 자료를 제공합니다.

* **데이터 파이프라인 구축**
    * **과거 민원:** 강동구 데이터 등 3,965건의 민원 데이터 수집 및 정제.


    * **법령 데이터:** 국가법령정보센터 API 및 새올전자민원창구 데이터 활용.




* **Chunking & Embedding**
    * 법령을 **조(條) 단위로 청킹(Chunking)**하여 정확도 향상.


    * 모든 텍스트를 **1024차원 벡터**로 임베딩하여 PostgreSQL에 저장.









### 🔗 4.3. DBSCAN 기반 중복 민원 군집화 (Clustering)

특정 이슈로 폭주하는 민원을 효율적으로 관리하기 위해 자동 군집화를 수행합니다.

* **DBSCAN 알고리즘:** 밀도 기반 클러스터링을 적용하여 노이즈(일반 민원)와 군집(반복/집단 민원)을 명확히 구분.


* **실시간 감지:** 신규 민원 유입 시 기존 군집과의 유사도를 실시간 분석하여 자동 그룹핑.


* **일괄 처리:** 군집화된 민원은 '대표 민원'으로 묶어 한 번에 답변 처리 가능.



### 📊 4.4. 실시간 운영 대시보드

* **Recharts**를 활용하여 부서별 처리 현황, 민원 유입 추이, 평균 처리 시간 등 핵심 KPI 시각화.


* **Heatmap:** 민원 집중 발생 지역을 지도로 시각화.


* **Issue Tracking:** '포트홀', '불법주정차' 등 급상승 키워드(Top-N) 실시간 모니터링.



---

## 📅 5. 개발 일정 (Timeline)

* **기간:** 2025.12.29 ~ 2026.01.22 (약 4주) 


* **진행 과정:**
    * 1주차: 기획, WBS 작성, DB 설계 .


    * 2주차: 개발 환경 구축, LLM 정규화 및 RAG 파이프라인 구현.


    * 3주차: 프론트/백엔드 핵심 기능 구현(민원 접수, 라우팅, 군집화).


    * 4주차: 통합 테스트, 대시보드 구현, 최종 배포 .





---

## 👨‍💻 6. 팀원 및 역할 (Team Roles)

| 이름 | 역할 구분 | 담당 업무 상세 |
| :---: | :---: | :--- |
| **[고상현]** | **Service & AI Core** | • **민원인 서비스:** 접수/조회 UI 개발 및 서버 구축<br>• **AI 모델링:** LLM 기반 민원 정규화 및 RAG(검색 증강 생성) 라우팅 구현 <br>• **데이터 처리:** 과거 이력 기반 자동 분류 및 답변 생성 로직 설계  |
| **[송병곤]** | **Admin & Support AI** |• **관리자 시스템:** 공무원용 통합 UI (민원함, 재이관/승인, 사건 조회)<br>• **업무 지원 AI:** 자연어 질의 기반 규정/유사 사례 검색(RAG) 및 근거 제시 기능<br>• **대시보드:** 부서별 민원 유입/처리 현황 및 자동 배정 성과 시각화|
| **[허진욱]** | **Data & Clustering** | • **데이터 관리:** 데이터 수집 및 정제, 유사 민원 클러스터링 및 유사도 산출 데이터 수집·정제 파이프라인 구축 <br>• **중복 민원 페이지:** 유사 민원 군집화 및 신규민원 DB 감지시 자동 군집화 |

---

## 🚀 7. 실행 방법 (Getting Started)

### Prerequisites

* Docker & Docker Compose
* Java 17 (JDK)
* Python 3.10+
* PostgreSQL 16 (w/ pgvector)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-repo/minwon-compass.git
cd minwon-compass

```


2. **Environment Setup (.env)**
```env
# DB Configuration
POSTGRES_USER=admin
POSTGRES_PASSWORD=secret
POSTGRES_DB=minwon_db

# OpenAI API Key
OPENAI_API_KEY=sk-proj-xxxxxxxx...

```


3. **Run with Docker Compose**
```bash
docker-compose pull
docker-compose up -d --build

```


4. **Access**
* Frontend: `http://localhost:5173`
* Backend API: `http://localhost:8080`
* AI Swagger: `http://localhost:8000/docs`



---

## 📜 License

This project is licensed under the MIT License.
