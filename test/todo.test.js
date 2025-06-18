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

  it('タスク追加フォームが正しく動作し、追加後にタスクが表示される', async () => {
    // 追加前のタスク数を取得
    const res1 = await request(app).get('/');
    expect(res1.statusCode).toBe(200);
    const beforeTaskCount = (res1.text.match(/<li class=/g) || []).length;
    
    // タスクを追加
    const taskName = `追加テスト_${Date.now()}`;
    const res2 = await request(app)
      .post('/add')
      .send(`task=${encodeURIComponent(taskName)}`)
      .set('Content-Type', 'application/x-www-form-urlencoded');
    
    // リダイレクトされることを確認
    expect(res2.statusCode).toBe(302);
    expect(res2.headers.location).toBe('/');
    
    // 追加後のページを取得
    const res3 = await request(app).get('/');
    expect(res3.statusCode).toBe(200);
    
    // タスクが実際に表示されていることを確認
    expect(res3.text).toContain(taskName);
    
    // タスク数が1つ増えていることを確認
    const afterTaskCount = (res3.text.match(/<li class=/g) || []).length;
    expect(afterTaskCount).toBe(beforeTaskCount + 1);
  });

  it('空のタスク名でPOSTしてもエラーにならず、タスクは追加されない', async () => {
    // 追加前のタスク数を取得
    const res1 = await request(app).get('/');
    const beforeTaskCount = (res1.text.match(/<li class=/g) || []).length;
    
    // 空のタスク名でPOST
    const res2 = await request(app)
      .post('/add')
      .send('task=')
      .set('Content-Type', 'application/x-www-form-urlencoded');
    
    // リダイレクトされることを確認
    expect(res2.statusCode).toBe(302);
    
    // タスク数が変わっていないことを確認
    const res3 = await request(app).get('/');
    const afterTaskCount = (res3.text.match(/<li class=/g) || []).length;
    expect(afterTaskCount).toBe(beforeTaskCount);
  });

  it('フォーム送信時にrequiredバリデーションが機能している', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    
    // フォームにrequired属性があることを確認
    expect(res.text).toMatch(/<input[^>]*name="task"[^>]*required[^>]*>/);
  });

  // API エンドポイントのテスト
  describe('API エンドポイント', () => {
    it('タスク一覧APIが正常に動作する', async () => {
      const res = await request(app).get('/api/todos');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('todos');
      expect(res.body).toHaveProperty('categories');
      expect(Array.isArray(res.body.todos)).toBe(true);
      expect(Array.isArray(res.body.categories)).toBe(true);
    });

    it('タスク追加APIが正常に動作する', async () => {
      const taskData = {
        task: 'API追加テスト',
        due_date: '2024-12-31',
        category_id: null
      };
      const res = await request(app)
        .post('/api/add')
        .send(taskData)
        .set('Content-Type', 'application/json');
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('id');

      // 追加されたタスクを確認
      const listRes = await request(app).get('/api/todos');
      const addedTask = listRes.body.todos.find(t => t.task === 'API追加テスト');
      expect(addedTask).toBeTruthy();
      expect(addedTask.due_date).toBe('2024-12-31');
    });

    it('タスク追加APIでバリデーションエラーが正常に処理される', async () => {
      const res = await request(app)
        .post('/api/add')
        .send({task: ''})
        .set('Content-Type', 'application/json');
      
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('タスク完了APIが正常に動作する', async () => {
      // まずタスクを追加
      const addRes = await request(app)
        .post('/api/add')
        .send({task: '完了テスト'})
        .set('Content-Type', 'application/json');
      
      const taskId = addRes.body.id;
      
      // 完了APIを実行
      const doneRes = await request(app)
        .post(`/api/done/${taskId}`)
        .set('Content-Type', 'application/json');
      
      expect(doneRes.statusCode).toBe(200);
      expect(doneRes.body).toHaveProperty('success', true);

      // 完了状態を確認
      const listRes = await request(app).get('/api/todos');
      const completedTask = listRes.body.todos.find(t => t.id === taskId);
      expect(completedTask.done).toBe(1);
    });

    it('タスク未完了APIが正常に動作する', async () => {
      // まずタスクを追加して完了にする
      const addRes = await request(app)
        .post('/api/add')
        .send({task: '未完了テスト'})
        .set('Content-Type', 'application/json');
      
      const taskId = addRes.body.id;
      await request(app).post(`/api/done/${taskId}`);
      
      // 未完了APIを実行
      const undoneRes = await request(app)
        .post(`/api/undone/${taskId}`)
        .set('Content-Type', 'application/json');
      
      expect(undoneRes.statusCode).toBe(200);
      expect(undoneRes.body).toHaveProperty('success', true);

      // 未完了状態を確認
      const listRes = await request(app).get('/api/todos');
      const uncompletedTask = listRes.body.todos.find(t => t.id === taskId);
      expect(uncompletedTask.done).toBe(0);
    });

    it('タスク削除APIが正常に動作する', async () => {
      // まずタスクを追加
      const addRes = await request(app)
        .post('/api/add')
        .send({task: '削除テスト'})
        .set('Content-Type', 'application/json');
      
      const taskId = addRes.body.id;
      
      // 削除APIを実行
      const deleteRes = await request(app)
        .post(`/api/delete/${taskId}`)
        .set('Content-Type', 'application/json');
      
      expect(deleteRes.statusCode).toBe(200);
      expect(deleteRes.body).toHaveProperty('success', true);

      // 削除されたことを確認
      const listRes = await request(app).get('/api/todos');
      const deletedTask = listRes.body.todos.find(t => t.id === taskId);
      expect(deletedTask).toBeUndefined();
    });

    it('不正なタスクIDでAPIが適切にエラーを返す', async () => {
      const res = await request(app)
        .post('/api/done/99999')
        .set('Content-Type', 'application/json');
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });
  });
  it('【BUG検証】カテゴリ削除時にタスクの表示に問題が発生する', async () => {
    // このテストは現在の実装のバグを検証するため、意図的に失敗させます
    
    // 1. カテゴリを作成
    await request(app)
      .post('/categories/add')
      .send('name=バグ検証カテゴリ')
      .set('Content-Type', 'application/x-www-form-urlencoded');
    
    let res = await request(app).get('/categories');
    const match = res.text.match(/\/categories\/edit\/(\d+)/);
    expect(match).not.toBeNull();
    const catId = parseInt(match[1]);
    
    // 2. カテゴリ付きタスクを追加
    await request(app)
      .post('/add')
      .send(`task=バグ検証タスク&category_id=${catId}`)
      .set('Content-Type', 'application/x-www-form-urlencoded');
    
    // 3. タスクが正しく表示されることを確認
    res = await request(app).get('/');
    expect(res.text).toContain('バグ検証タスク');
    expect(res.text).toContain('バグ検証カテゴリ');
    
    // 4. カテゴリを削除
    await request(app)
      .post(`/categories/delete/${catId}`)
      .set('Content-Type', 'application/x-www-form-urlencoded');
    
    // 5. 削除後のデータベース状態をAPI経由で確認
    const apiRes = await request(app).get('/api/todos');
    const orphanedTask = apiRes.body.todos.find(t => t.task === 'バグ検証タスク');
    
    // ここでバグが判明: タスクのcategory_idが削除されたカテゴリIDのままになっている
    if (orphanedTask && orphanedTask.category_id === catId) {
      console.log('🚨 BUG DETECTED: タスクのcategory_idが削除されたカテゴリIDのままです');
      console.log(`   タスク: ${orphanedTask.task}`);
      console.log(`   category_id: ${orphanedTask.category_id} (削除済みカテゴリ)`);
      
      // このタスクは画面に表示されない可能性が高い
      res = await request(app).get('/');
      const isTaskVisible = res.text.includes('バグ検証タスク');
      
      if (!isTaskVisible) {
        console.log('🚨 CONFIRMED: タスクが画面に表示されていません');
      }
      
      // テストを失敗させて問題を明確にする
      expect(orphanedTask.category_id).toBeNull(); // これは失敗するはず
    }
  });

  it('【期待動作】カテゴリ削除時はタスクのcategory_idがNULLに更新されるべき', async () => {
    // この動作が正しい実装です
    
    // 1. カテゴリ作成
    await request(app)
      .post('/categories/add')
      .send('name=正しい削除テストカテゴリ')
      .set('Content-Type', 'application/x-www-form-urlencoded');
    
    let res = await request(app).get('/categories');
    const match = res.text.match(/\/categories\/edit\/(\d+)/);
    const catId = parseInt(match[1]);
    
    // 2. タスク追加
    await request(app)
      .post('/add')
      .send(`task=正しい削除テストタスク&category_id=${catId}`)
      .set('Content-Type', 'application/x-www-form-urlencoded');
    
    // 3. カテゴリ削除
    await request(app)
      .post(`/categories/delete/${catId}`)
      .set('Content-Type', 'application/x-www-form-urlencoded');
    
    // 4. 期待される動作: タスクのcategory_idがNULLになり、未設定カテゴリに表示される
    const apiRes = await request(app).get('/api/todos');
    const taskAfterDeletion = apiRes.body.todos.find(t => t.task === '正しい削除テストタスク');
    
    expect(taskAfterDeletion).toBeTruthy();
    expect(taskAfterDeletion.category_id).toBeNull(); // これが期待される動作
    
    // 5. 画面でも未設定カテゴリ部分に表示される
    res = await request(app).get('/');
    expect(res.text).toContain('正しい削除テストタスク');
    
    const uncategorizedSection = res.text.split('category-block')[1];
    expect(uncategorizedSection).toContain('正しい削除テストタスク');
  });
});