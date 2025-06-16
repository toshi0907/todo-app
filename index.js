require('dotenv').config();

const fs = require('fs');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');

const DB_FILE = process.env.NODE_ENV === 'test' ? './test.db' : (process.env.DB_FILE || './todo.db');
const MIGRATE_FILE = './migrate.sql';

// DBファイルがなければ自動作成
if (!fs.existsSync(DB_FILE)) {
  const execSync = require('child_process').execSync;
  execSync(`sqlite3 ${DB_FILE} < ${MIGRATE_FILE}`);
}

const app = express();
const db = new sqlite3.Database(DB_FILE);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));

// DB初期化
const initTodos = `CREATE TABLE IF NOT EXISTS todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task TEXT NOT NULL,
  due_date TEXT,
  category_id INTEGER,
  done INTEGER DEFAULT 0,
  FOREIGN KEY (category_id) REFERENCES categories(id)
)`;
const initCategories = `CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
)`;
db.run(initCategories);
db.run(initTodos);

// 一覧表示
app.get('/', (req, res) => {
  // カテゴリ、期限日、登録日でソート
  const sql = `
    SELECT t.* FROM todos t
    LEFT JOIN categories c ON t.category_id = c.id
    ORDER BY
      c.name IS NULL, c.name ASC,
      t.due_date IS NOT NULL, t.due_date ASC,
      t.created_at ASC
  `;
  db.all(sql, (err, todos) => {
    if (err) return res.status(500).send('DB error');
    db.all('SELECT * FROM categories', (err, categories) => {
      if (err) return res.status(500).send('DB error');
      res.render('index', { todos, categories, now: new Date() });
    });
  });
});

// タスク追加
app.post('/add', (req, res) => {
  const { task, due_date, due_datetime, category_id } = req.body;
  if (!task) return res.redirect('/');
  // 日付＋時間があればそちらを優先
  let due = due_datetime || due_date || null;
  if (due && due.includes('T')) due = due.replace('T', ' ');
  // バリデーション: dueがnullでなければ形式チェック
  if (due) {
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    const datetimeRe = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
    if (!(dateRe.test(due) || datetimeRe.test(due))) {
      return res.redirect('/');
    }
  }
  const created_at = new Date().toISOString().replace('T', ' ').slice(0, 19);
  db.run('INSERT INTO todos (task, due_date, category_id, created_at) VALUES (?, ?, ?, ?)', [task, due, category_id || null, created_at], err => {
    res.redirect('/');
  });
});
// カテゴリ一覧・管理画面
app.get('/categories', (req, res) => {
  db.all('SELECT * FROM categories', (err, categories) => {
    if (err) return res.status(500).send('DB error');
    res.render('categories', { categories, now: new Date() });
  });
});

// カテゴリ追加
app.post('/categories/add', (req, res) => {
  const name = req.body.name;
  if (!name) return res.redirect('/categories');
  db.run('INSERT INTO categories (name) VALUES (?)', [name], err => {
    res.redirect('/categories');
  });
});

// カテゴリ削除
app.post('/categories/delete/:id', (req, res) => {
  db.run('DELETE FROM categories WHERE id = ?', [req.params.id], err => {
    res.redirect('/categories');
  });
});

// カテゴリ修正
app.post('/categories/edit/:id', (req, res) => {
  const name = req.body.name;
  db.run('UPDATE categories SET name = ? WHERE id = ?', [name, req.params.id], err => {
    res.redirect('/categories');
  });
});

// タスク完了
app.post('/done/:id', (req, res) => {
  db.run('UPDATE todos SET done = 1 WHERE id = ?', [req.params.id], err => {
    res.redirect('/');
  });
});

// タスク未完了に戻す
app.post('/undone/:id', (req, res) => {
  db.run('UPDATE todos SET done = 0 WHERE id = ?', [req.params.id], err => {
    res.redirect('/');
  });
});

// タスク削除
app.post('/delete/:id', (req, res) => {
  db.run('DELETE FROM todos WHERE id = ?', [req.params.id], err => {
    res.redirect('/');
  });
});

// タスク編集画面
app.get('/edit/:id', (req, res) => {
  db.get('SELECT * FROM todos WHERE id = ?', [req.params.id], (err, todo) => {
    if (err || !todo) return res.status(404).send('タスクが見つかりません');
    db.all('SELECT * FROM categories', (err, categories) => {
      if (err) return res.status(500).send('DB error');
      res.render('edit', { todo, categories, now: new Date() });
    });
  });
});

// タスク編集処理
app.post('/edit/:id', (req, res) => {
  const { task, due_date, due_datetime, category_id } = req.body;
  let due = due_datetime || due_date || null;
  if (due && due.includes('T')) due = due.replace('T', ' ');
  // バリデーション: dueがnullでなければ形式チェック
  if (due) {
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    const datetimeRe = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
    if (!(dateRe.test(due) || datetimeRe.test(due))) {
      return res.redirect('/');
    }
  }
  db.run('UPDATE todos SET task = ?, due_date = ?, category_id = ? WHERE id = ?', [task, due, category_id || null, req.params.id], err => {
    res.redirect('/');
  });
});

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
