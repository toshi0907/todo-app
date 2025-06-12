# TODO管理アプリ

**バージョン: ver.000.000.001**

Node.js（Express）＋ SQLite3 によるシンプルなTODO管理アプリです。

## 必要なアプリ・パッケージ

- Node.js（v18以上推奨）
- npm
- sqlite3（CLIツール。DBの中身を直接操作したい場合のみ）

### Node.js依存パッケージ

- express
- sqlite3
- ejs
- body-parser

`npm install` で自動インストールされます。

## 主な機能

- タスクの登録・一覧・完了・削除
- タスクには「タスク名」「期限日（任意）」「カテゴリ（任意）」「登録日時」が付与されます
- 期日を過ぎた未完了タスクは背景色がLightPinkで表示
- タスク一覧は「カテゴリ → 期限日（未設定が上）→ 登録日」順でソート
- カテゴリは登録・修正・削除が可能、タスク登録時に選択式
- UIはBootstrap＋カスタムCSSでモダンなデザイン

## データベース

- SQLite3を使用（ファイル: `todo.db`）
- テーブル: `todos`, `categories`
  - `todos`: id, task, due_date, category_id, done, created_at
  - `categories`: id, name

## ディレクトリ構成

- `index.js` ... サーバー本体
- `views/` ... EJSテンプレート
- `public/main.css` ... 共通CSS
- `todo.db` ... SQLite DB（自動生成）

## 使い方

1. 依存パッケージインストール: `npm install`
2. サーバー起動: `npm start`
3. ブラウザで [http://localhost:3000](http://localhost:3000) にアクセス

## 環境変数設定

- `.env.sample` をコピーして `.env` を作成し、必要に応じて編集してください。
  - 例: `cp .env.sample .env`
  - `PORT`（サーバーポート）、`DB_FILE`（DBファイルパス）、`DOMAIN`（公開用ドメイン名）などを設定できます。

## SSL対応・公開（Nginx + Let's Encrypt）

- 公開用ドメインを `.env` の `DOMAIN` に設定してください。
- `ssl_publish.sh` を実行すると、Nginxのリバースプロキシ＋SSL証明書自動取得・設定が行われます。
  - 例: `sudo ./ssl_publish.sh`
- 事前に80/443番ポートが開放されていること、ドメインのDNSがサーバーIPを向いていることを確認してください。

## トラブルシューティング

- 502 Bad Gateway: Node.jsアプリが起動していない、またはNginxのproxy_pass先が間違っている可能性があります。
  - `npm start` でアプリが動作しているか確認
  - `curl http://localhost:3000` で応答があるか確認

- SSL証明書取得エラー: Nginx設定の構文エラーや、ドメインのDNS未設定が原因の場合があります。
  - `/etc/nginx/sites-enabled/ドメイン名` の `proxy_set_header` 記述を確認
  - `sudo nginx -t` で構文チェック

## ライセンス
MIT
