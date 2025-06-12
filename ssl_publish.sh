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

# Nginxサーバーブロック作成
sudo tee /etc/nginx/sites-available/$domain > /dev/null <<EOF
server {
    listen 80;
    server_name $domain;

    location / {
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
