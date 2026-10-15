FROM alpine:3.22.1
RUN apk add --no-cache bash git
ENV HOME=/tmp GIT_CONFIG_NOSYSTEM=1 GIT_AUTHOR_NAME=aluno GIT_AUTHOR_EMAIL=aluno@sandbox GIT_COMMITTER_NAME=aluno GIT_COMMITTER_EMAIL=aluno@sandbox
WORKDIR /tmp
