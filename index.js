const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const db = new sqlite3.Database('./todo.db');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));

// DB初期化
const initSql = `CREATE TABLE IF NOT EXISTS todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task TEXT NOT NULL,
  done INTEGER DEFAULT 0
)`;
db.run(initSql);

// 一覧表示
app.get('/', (req, res) => {
  db.all('SELECT * FROM todos', (err, rows) => {
    if (err) return res.status(500).send('DB error');
    res.render('index', { todos: rows });
  });
});

// タスク追加
app.post('/add', (req, res) => {
  const task = req.body.task;
  if (!task) return res.redirect('/');
  db.run('INSERT INTO todos (task) VALUES (?)', [task], err => {
    res.redirect('/');
  });
});

// タスク完了
app.post('/done/:id', (req, res) => {
  db.run('UPDATE todos SET done = 1 WHERE id = ?', [req.params.id], err => {
    res.redirect('/');
  });
});

// タスク削除
app.post('/delete/:id', (req, res) => {
  db.run('DELETE FROM todos WHERE id = ?', [req.params.id], err => {
    res.redirect('/');
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
