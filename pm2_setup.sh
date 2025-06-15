#!/bin/bash
# pm2によるNode.jsアプリの本番運用自動化スクリプト
# 必要: sudo権限

set -e

# pm2インストール
if ! command -v pm2 >/dev/null 2>&1; then
  echo "pm2をインストールします..."
  sudo npm install -g pm2
else
  echo "pm2は既にインストールされています。"
fi

# アプリ起動（既に起動中なら再起動）
if pm2 list | grep -q todo-app; then
  pm2 restart todo-app
else
  pm2 start index.js --name todo-app
fi

# pm2の自動起動設定
pm2 startup | grep sudo > /tmp/pm2_startup.sh
sudo bash /tmp/pm2_startup.sh
rm /tmp/pm2_startup.sh

# 現在のプロセスリストを保存
pm2 save

echo "pm2による本番運用設定が完了しました。"
