
process.env.NODE_ENV = 'test';
const fs = require('fs');
if (fs.existsSync('./test.db')) fs.unlinkSync('./test.db');
const request = require('supertest');
const express = require('express');
const app = require('../index');

describe('TODOアプリ', () => {
  it('タスク編集ページが表示される', async () => {
    // まずタスクを追加
    await request(app)
      .post('/add')
      .send('task=編集テスト')
      .set('Content-Type', 'application/x-www-form-urlencoded');
    // 追加したタスクのIDを取得
    const res1 = await request(app).get('/');
    const liBlocks = res1.text.split('<li').slice(1);
    let editId = null;
    for (const block of liBlocks) {
      if (block.includes('編集テスト')) {
        const m = block.match(/\/edit\/(\d+)/);
        if (m) {
          editId = m[1];
          break;
        }
      }
    }
    expect(editId).not.toBeNull();
    // 編集ページ表示
    const res2 = await request(app).get(`/edit/${editId}`);
    expect(res2.statusCode).toBe(200);
    expect(res2.text).toContain('タスク編集');
    expect(res2.text).toContain('編集テスト');
  });

  it('カテゴリ管理ページが表示される', async () => {
    const res = await request(app).get('/categories');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('カテゴリ管理');
  });

  it('カテゴリを追加・編集・削除できる', async () => {
    // 追加
    await request(app)
      .post('/categories/add')
      .send('name=テストカテゴリ')
      .set('Content-Type', 'application/x-www-form-urlencoded');
    let res = await request(app).get('/categories');
    expect(res.text).toContain('テストカテゴリ');
    // ID取得
    const match = res.text.match(/\/categories\/edit\/(\d+)/);
    expect(match).not.toBeNull();
    const catId = match[1];
    // 編集
    await request(app)
      .post(`/categories/edit/${catId}`)
      .send('name=編集済カテゴリ')
      .set('Content-Type', 'application/x-www-form-urlencoded');
    res = await request(app).get('/categories');
    expect(res.text).toContain('編集済カテゴリ');
    // 削除
    await request(app)
      .post(`/categories/delete/${catId}`)
      .set('Content-Type', 'application/x-www-form-urlencoded');
    res = await request(app).get('/categories');
    expect(res.text).not.toContain('編集済カテゴリ');
  });
  it('トップページが表示される', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('TODOリスト');
  });
  let testTaskId = null;

  it('タスクを追加できる', async () => {
    const res = await request(app)
      .post('/add')
      .send('task=テストタスク')
      .set('Content-Type', 'application/x-www-form-urlencoded');
    expect([200, 302]).toContain(res.statusCode); // リダイレクトまたは成功
  });

  it('追加したタスクのIDを取得できる', async () => {
    const res = await request(app).get('/');
    // liごとに分割し、テストタスクを含むli内の/done/IDを取得
    const liBlocks = res.text.split('<li').slice(1);
    let foundId = null;
    for (const block of liBlocks) {
      if (block.includes('テストタスク')) {
        const m = block.match(/\/done\/(\d+)/);
        if (m) {
          foundId = m[1];
          break;
        }
      }
    }
    expect(foundId).not.toBeNull();
    testTaskId = foundId;
  });

  it('タスクを完了にできる', async () => {
    expect(testTaskId).not.toBeNull();
    const res = await request(app)
      .post(`/done/${testTaskId}`)
      .set('Content-Type', 'application/x-www-form-urlencoded');
    expect([200, 302]).toContain(res.statusCode);
  });

  it('完了タスクが取り消し線で表示される', async () => {
    expect(testTaskId).not.toBeNull();
    const res = await request(app).get('/');
    // 完了にしたIDのタスクspanだけを検証
    // li要素ごとに分割し、該当IDのli内にspan.doneとundone formが両方あるか検証
    const liBlocks = res.text.split('<li').slice(1);
    const found = liBlocks.some(block =>
      block.includes(`<span class=\"done\">テストタスク</span>`) &&
      block.includes(`<form action=\"/undone/${testTaskId}`)
    );
    expect(found).toBe(true);
  });
});
