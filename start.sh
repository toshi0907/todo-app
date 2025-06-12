#!/bin/bash
# Ubuntu 24.x 環境用: 必要なパッケージをインストールし、アプリを起動するスクリプト

set -e

# システムパッケージのインストール
sudo apt-get update
sudo apt-get install -y nodejs npm sqlite3

# npmパッケージのインストール
npm install

# サーバー起動
npm start
