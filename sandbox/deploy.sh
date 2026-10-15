#!/usr/bin/env bash
# Builda as imagens e o worker do sandbox e (re)instala o serviço. Rodar da VM:
#   sandbox/deploy.sh
set -euo pipefail
cd "$(dirname "$0")"

for l in python node java cpp sql shell; do
  sudo docker build -q -t "questoes-sandbox-$l:1" -f "images/$l.Dockerfile" images >/dev/null
  echo "imagem questoes-sandbox-$l:1 ok"
done

(cd worker && npm ci --silent && npm run build --silent)
sudo mkdir -p /opt/questoes-sandbox
sudo rsync -a --delete worker/dist worker/package.json worker/package-lock.json /opt/questoes-sandbox/
(cd /opt/questoes-sandbox && sudo npm ci --omit=dev --silent)
sudo install -m 644 questoes-sandbox.service /etc/systemd/system/questoes-sandbox.service
sudo systemctl daemon-reload
sudo systemctl enable --now questoes-sandbox
sudo systemctl restart questoes-sandbox
sleep 2
sudo systemctl --no-pager --lines=5 status questoes-sandbox
