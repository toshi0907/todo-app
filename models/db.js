const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const DB_FILE = process.env.NODE_ENV === 'test' ? './test.db' : (process.env.DB_FILE || './todo.db');
const MIGRATE_FILE = './migrate.sql';

if (!fs.existsSync(DB_FILE)) {
  const execSync = require('child_process').execSync;
  execSync(`sqlite3 ${DB_FILE} < ${MIGRATE_FILE}`);
}

const db = new sqlite3.Database(DB_FILE);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task TEXT NOT NULL,
    due_date TEXT,
    category_id INTEGER,
    done INTEGER DEFAULT 0,
    created_at TEXT,
    FOREIGN KEY (category_id) REFERENCES categories(id)
  )`);
});

module.exports = db;
