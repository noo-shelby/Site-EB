const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');
const app = express();

const db = new sqlite3.Database('./portal.db');

// Inicialização das Tabelas (Usuarios, Noticias, Comentarios)
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        discord_user TEXT,
        discord_id TEXT,
        setor TEXT,
        login TEXT UNIQUE,
        senha TEXT,
        cargo TEXT DEFAULT 'Membro',
        advs INTEGER DEFAULT 0,
        banido INTEGER DEFAULT 0
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS noticias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT,
        subtitulo TEXT,
        conteudo TEXT,
        autor TEXT,
        data DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'segredo_eb_portal',
    resave: false,
    saveUninitialized: false
}));

// Rota principal
app.get('/', (req, res) => {
    db.all("SELECT * FROM noticias ORDER BY data DESC", (err, rows) => {
        res.render('index', { user: req.session.user, noticias: rows });
    });
});

// Importante para a Render: Usar a porta que eles fornecerem ou a 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Site rodando na porta ${PORT}`));
