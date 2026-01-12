# db/Dockerfile 예시 (Debian 계열 기준)
FROM postgres:16

# PostGIS 및 pgvector 확장 설치
RUN apt-get update && apt-get install -y \
    postgresql-16-postgis-3 \
    postgresql-16-postgis-3-scripts \
    postgresql-16-pgvector \
    && rm -rf /var/lib/apt/lists/*