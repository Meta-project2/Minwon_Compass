# PostGIS 16 이미지를 베이스로 사용 (Debian 기반)
FROM postgis/postgis:16-3.4

# pgvector 설치를 위해 패키지 목록 업데이트 및 설치
RUN apt-get update && apt-get install -y \
    postgresql-16-pgvector \
    && rm -rf /var/lib/apt/lists/*