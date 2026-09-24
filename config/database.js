const Database = require('better-sqlite3');
const path = require('path');

// Cria ou abre o arquivo de banco de dados
const db = new Database(path.join(__dirname, '../database.db'));

// Cria a tabela de usuários se ela ainda não existir
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    is_staff INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

module.exports = db;
