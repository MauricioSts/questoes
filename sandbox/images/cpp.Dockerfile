FROM alpine:3.22.1
RUN apk add --no-cache g++
ENV HOME=/tmp
WORKDIR /tmp
