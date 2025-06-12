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

## ライセンス
MIT
