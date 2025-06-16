const express = require('express');
const router = express.Router();
const db = require('../models/db');

// 一覧表示
router.get('/', (req, res) => {
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
router.post('/add', (req, res) => {
  const { task, due_date, due_datetime, category_id } = req.body;
  if (!task) return res.redirect('/');
  let due = due_datetime || due_date || null;
  if (due && due.includes('T')) due = due.replace('T', ' ');
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

// タスク完了
router.post('/done/:id', (req, res) => {
  db.run('UPDATE todos SET done = 1 WHERE id = ?', [req.params.id], err => {
    res.redirect('/');
  });
});

// タスク未完了に戻す
router.post('/undone/:id', (req, res) => {
  db.run('UPDATE todos SET done = 0 WHERE id = ?', [req.params.id], err => {
    res.redirect('/');
  });
});

// タスク削除
router.post('/delete/:id', (req, res) => {
  db.run('DELETE FROM todos WHERE id = ?', [req.params.id], err => {
    res.redirect('/');
  });
});

// タスク編集画面
router.get('/edit/:id', (req, res) => {
  db.get('SELECT * FROM todos WHERE id = ?', [req.params.id], (err, todo) => {
    if (err || !todo) return res.status(404).send('タスクが見つかりません');
    db.all('SELECT * FROM categories', (err, categories) => {
      if (err) return res.status(500).send('DB error');
      res.render('edit', { todo, categories, now: new Date() });
    });
  });
});

// タスク編集処理
router.post('/edit/:id', (req, res) => {
  const { task, due_date, due_datetime, category_id } = req.body;
  let due = due_datetime || due_date || null;
  if (due && due.includes('T')) due = due.replace('T', ' ');
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

module.exports = router;
