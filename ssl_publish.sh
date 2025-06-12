#!/bin/bash
# Nginx + Let's Encrypt でSSL対応し、Node.jsアプリを公開するスクリプト
# .envファイルの DOMAIN 変数を利用

set -e

# .envからDOMAINを取得
domain=$(grep '^DOMAIN=' .env | cut -d '=' -f2)
if [ -z "$domain" ]; then
  echo "エラー: .envファイルにDOMAINが設定されていません。" >&2
  exit 1
fi

# 必要なパッケージのインストール
sudo apt-get update
sudo apt-get install -y nginx certbot python3-certbot-nginx

# Nginxの初期設定
sudo systemctl enable nginx
sudo systemctl start nginx

# Basic認証用ユーザー作成（初回のみ）
if [ ! -f /etc/nginx/.htpasswd ]; then
  echo "Basic認証用のユーザー名を入力してください: "
  read -r BASIC_USER
  sudo apt-get install -y apache2-utils
  sudo htpasswd -c /etc/nginx/.htpasswd "$BASIC_USER"
else
  echo "既存の /etc/nginx/.htpasswd を利用します。"
fi

# Nginxサーバーブロック作成
sudo tee /etc/nginx/sites-available/$domain > /dev/null <<EOF
server {
    listen 80;
    server_name $domain;

    location / {
        auth_basic "Restricted";
        auth_basic_user_file /etc/nginx/.htpasswd;
        proxy_pass http://localhost:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/$domain /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Let's EncryptでSSL証明書取得&設定
echo "証明書取得中..."
sudo certbot --nginx -d $domain --non-interactive --agree-tos -m admin@$domain --redirect

echo "SSL対応で $domain への公開が完了しました。"
