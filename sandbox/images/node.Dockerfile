FROM node:22.20.0-alpine3.22
RUN npm install -g typescript@5.9.2 && npm cache clean --force
COPY ambiente.d.ts /opt/sandbox/ambiente.d.ts
ENV HOME=/tmp
WORKDIR /tmp
