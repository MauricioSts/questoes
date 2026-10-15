FROM python:3.13.7-alpine3.22
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 HOME=/tmp
RUN python3 -m compileall -q -j 0 /usr/local/lib/python3.13 || true
COPY rodar-testes.py /opt/sandbox/rodar-testes.py
WORKDIR /tmp
