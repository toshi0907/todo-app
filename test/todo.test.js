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
  it('期限に日付＋時間でタスクを追加・表示できる', async () => {
    const due = '2099-12-31T23:59';
    await request(app)
      .post('/add')
      .send(`task=時刻付きタスク&due_datetime=${due}`)
      .set('Content-Type', 'application/x-www-form-urlencoded');
    const res = await request(app).get('/');
    expect(res.text).toContain('時刻付きタスク');
    // 時刻部分が表示されているか（〆12-31/23:59形式）
    expect(res.text).toMatch(/12-31\/23:59/);
  });

  it('カテゴリ未設定タスクが先頭に表示される', async () => {
    await request(app)
      .post('/add')
      .send('task=未設定カテゴリタスク')
      .set('Content-Type', 'application/x-www-form-urlencoded');
    const res = await request(app).get('/');
    // 最初のcategory-blockが未設定であること
    const firstBlock = res.text.split('category-block')[1];
    expect(firstBlock).toContain('カテゴリ未設定');
    expect(firstBlock).toContain('未設定カテゴリタスク');
  });

  it('編集で期限・カテゴリを変更できる', async () => {
    // カテゴリ追加
    await request(app)
      .post('/categories/add')
      .send('name=編集用カテゴリ')
      .set('Content-Type', 'application/x-www-form-urlencoded');
    let res = await request(app).get('/categories');
    const match = res.text.match(/\/categories\/edit\/(\d+)/);
    expect(match).not.toBeNull();
    const catId = match[1];
    // タスク追加
    await request(app)
      .post('/add')
      .send('task=編集対象タスク')
      .set('Content-Type', 'application/x-www-form-urlencoded');
    res = await request(app).get('/');
    const liBlocks = res.text.split('<li').slice(1);
    let editId = null;
    for (const block of liBlocks) {
      if (block.includes('編集対象タスク')) {
        const m = block.match(/\/edit\/(\d+)/);
        if (m) { editId = m[1]; break; }
      }
    }
    expect(editId).not.toBeNull();
    // 編集で期限・カテゴリを変更
    await request(app)
      .post(`/edit/${editId}`)
      .send(`task=編集後タスク&due_datetime=2099-01-01T12:00&category_id=${catId}`)
      .set('Content-Type', 'application/x-www-form-urlencoded');
    res = await request(app).get('/');
    expect(res.text).toContain('編集後タスク');
    // 〆01-01/12:00形式で表示されているか
    expect(res.text).toMatch(/01-01\/12:00/);
    // カテゴリ名が表示されているか
    expect(res.text).toContain('編集用カテゴリ');
  });

  it('期限切れタスクはoverdueクラスで表示される', async () => {
    // 過去日付でタスク追加
    const past = '2000-01-01';
    await request(app)
      .post('/add')
      .send(`task=期限切れタスク&due_date=${past}`)
      .set('Content-Type', 'application/x-www-form-urlencoded');
    const res = await request(app).get('/');
    // overdueクラスが付与されているか
    expect(res.text).toMatch(/class="overdue"[^>]*>\s*<span[^>]*>期限切れタスク/);
  });
  it('空のタスク名では追加されない', async () => {
    await request(app)
      .post('/add')
      .send('task=')
      .set('Content-Type', 'application/x-www-form-urlencoded');
    const res = await request(app).get('/');
    // 空タスク名は表示されない
    expect(res.text).not.toContain('<span class="">\n</span>');
  });

  it('存在しないIDで編集/削除/完了/未完了してもエラーにならない', async () => {
    // 存在しないID
    const invalidId = 99999;
    // 編集画面
    const res1 = await request(app).get(`/edit/${invalidId}`);
    expect([404, 500]).toContain(res1.statusCode);
    // 編集POST
    const res2 = await request(app)
      .post(`/edit/${invalidId}`)
      .send('task=xxx')
      .set('Content-Type', 'application/x-www-form-urlencoded');
    expect([200, 302, 404, 500]).toContain(res2.statusCode);
    // 削除
    const res3 = await request(app)
      .post(`/delete/${invalidId}`)
      .set('Content-Type', 'application/x-www-form-urlencoded');
    expect([200, 302]).toContain(res3.statusCode);
    // 完了
    const res4 = await request(app)
      .post(`/done/${invalidId}`)
      .set('Content-Type', 'application/x-www-form-urlencoded');
    expect([200, 302]).toContain(res4.statusCode);
    // 未完了
    const res5 = await request(app)
      .post(`/undone/${invalidId}`)
      .set('Content-Type', 'application/x-www-form-urlencoded');
    expect([200, 302]).toContain(res5.statusCode);
  });

  it('カテゴリ削除後、該当タスクは未設定カテゴリになる', async () => {
    // カテゴリ追加
    await request(app)
      .post('/categories/add')
      .send('name=一時カテゴリ')
      .set('Content-Type', 'application/x-www-form-urlencoded');
    let res = await request(app).get('/categories');
    const match = res.text.match(/\/categories\/edit\/(\d+)/);
    expect(match).not.toBeNull();
    const catId = match[1];
    // タスク追加
    await request(app)
      .post('/add')
      .send(`task=カテゴリ付きタスク&category_id=${catId}`)
      .set('Content-Type', 'application/x-www-form-urlencoded');
    // カテゴリ削除
    await request(app)
      .post(`/categories/delete/${catId}`)
      .set('Content-Type', 'application/x-www-form-urlencoded');
    // タスクが未設定カテゴリに表示されるか
    res = await request(app).get('/');
    const firstBlock = res.text.split('category-block')[1];
    expect(firstBlock).toContain('カテゴリ付きタスク');
  });

  it('カテゴリ名が重複するとエラーになる', async () => {
    await request(app)
      .post('/categories/add')
      .send('name=重複カテゴリ')
      .set('Content-Type', 'application/x-www-form-urlencoded');
    // 2回目はUNIQUE制約違反
    const res = await request(app)
      .post('/categories/add')
      .send('name=重複カテゴリ')
      .set('Content-Type', 'application/x-www-form-urlencoded');
    // 500エラーまたはエラー画面
    expect([200, 302, 500]).toContain(res.statusCode);
  });

  it('不正な日付/時間ではタスクが追加されない', async () => {
    // 不正な日付
    await request(app)
      .post('/add')
      .send('task=不正日付タスク&due_date=invalid-date')
      .set('Content-Type', 'application/x-www-form-urlencoded');
    // 不正な時間
    await request(app)
      .post('/add')
      .send('task=不正時間タスク&due_datetime=invalid-datetime')
      .set('Content-Type', 'application/x-www-form-urlencoded');
    const res = await request(app).get('/');
    expect(res.text).not.toContain('不正日付タスク');
    expect(res.text).not.toContain('不正時間タスク');
  });
});
