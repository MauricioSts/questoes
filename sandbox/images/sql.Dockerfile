FROM alpine:3.22.1
RUN apk add --no-cache sqlite
ENV HOME=/tmp
WORKDIR /tmp
