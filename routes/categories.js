const express = require('express');
const router = express.Router();
const db = require('../models/db');

// カテゴリ一覧・管理画面
router.get('/', (req, res) => {
  db.all('SELECT * FROM categories', (err, categories) => {
    if (err) return res.status(500).send('DB error');
    res.render('categories', { categories, now: new Date() });
  });
});

// カテゴリ追加
router.post('/add', (req, res) => {
  const name = req.body.name;
  if (!name) return res.redirect('/categories');
  db.run('INSERT INTO categories (name) VALUES (?)', [name], err => {
    res.redirect('/categories');
  });
});

// カテゴリ削除
router.post('/delete/:id', (req, res) => {
  db.run('DELETE FROM categories WHERE id = ?', [req.params.id], err => {
    res.redirect('/categories');
  });
});

// カテゴリ修正
router.post('/edit/:id', (req, res) => {
  const name = req.body.name;
  db.run('UPDATE categories SET name = ? WHERE id = ?', [name, req.params.id], err => {
    res.redirect('/categories');
  });
});

module.exports = router;
