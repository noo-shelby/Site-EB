const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');
const app = express();

const db = new sqlite3.Database('./portal.db');

// INICIALIZAÇÃO DO BANCO
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        discord_user TEXT, setor TEXT, login TEXT UNIQUE, senha TEXT,
        cargo TEXT DEFAULT 'Membro', advs INTEGER DEFAULT 0, banido INTEGER DEFAULT 0
    )`);

    const masterLogin = "Shelby Ower";
    const masterPass = "05032010";
    db.get("SELECT * FROM usuarios WHERE login = ?", [masterLogin], async (err, row) => {
        if (!row) {
            const hash = await bcrypt.hash(masterPass, 10);
            db.run(`INSERT INTO usuarios (discord_user, setor, login, senha, cargo) VALUES (?, ?, ?, ?, ?)`,
            ['Shelby#0000', 'Staff', masterLogin, hash, 'Criador']);
        }
    });

    db.run(`CREATE TABLE IF NOT EXISTS noticias (
        id INTEGER PRIMARY KEY AUTOINCREMENT, titulo TEXT, subtitulo TEXT, conteudo TEXT, autor TEXT, data DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS comentarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT, noticia_id INTEGER, usuario_nome TEXT, texto TEXT, data DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'shelby_god_mode', resave: false, saveUninitialized: false }));

const garantirAcesso = (cargos) => (req, res, next) => {
    if (req.session.user && (req.session.user.cargo === 'Criador' || cargos.includes(req.session.user.cargo))) return next();
    res.status(403).send("Acesso Negado.");
};

// ROTAS DE LOGIN/CADASTRO
app.get('/login', (req, res) => res.render('login'));
app.post('/login', (req, res) => {
    const { login, senha } = req.body;
    db.get("SELECT * FROM usuarios WHERE login = ?", [login], async (err, user) => {
        if (user && await bcrypt.compare(senha, user.senha)) {
            if (user.banido) return res.send("Você está banido.");
            req.session.user = user;
            res.redirect('/');
        } else res.send("Erro no login.");
    });
});

app.get('/cadastro', (req, res) => res.render('cadastro'));
app.post('/cadastro', async (req, res) => {
    const { discord_user, setor, login, senha } = req.body;
    const hash = await bcrypt.hash(senha, 10);
    db.run("INSERT INTO usuarios (discord_user, setor, login, senha, cargo) VALUES (?, ?, ?, ?, 'Membro')", 
    [discord_user, setor, login, hash], () => res.redirect('/login'));
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

// ROTAS DO PORTAL
app.get('/', (req, res) => {
    db.all("SELECT * FROM noticias ORDER BY data DESC", (err, rows) => {
        res.render('index', { user: req.session.user || null, noticias: rows || [] });
    });
});

app.get('/materia/:id', (req, res) => {
    db.get("SELECT * FROM noticias WHERE id = ?", [req.params.id], (err, noticia) => {
        if (!noticia) return res.redirect('/');
        db.all("SELECT * FROM comentarios WHERE noticia_id = ? ORDER BY data DESC", [req.params.id], (err, coments) => {
            res.render('materia', { user: req.session.user || null, noticia, comentarios: coments || [] });
        });
    });
});

// COMANDOS ADMIN
app.get('/admin', garantirAcesso(['Moderador', 'Administrador']), (req, res) => {
    db.all("SELECT * FROM usuarios WHERE cargo != 'Criador'", (err, rows) => {
        res.render('admin', { user: req.session.user, logs: rows });
    });
});

app.post('/admin/alterar-cargo/:id', garantirAcesso(['Administrador']), (req, res) => {
    db.run("UPDATE usuarios SET cargo = ? WHERE id = ?", [req.body.novo_cargo, req.params.id], () => res.redirect('/admin'));
});

app.post('/admin/adv/:id', garantirAcesso(['Moderador']), (req, res) => {
    db.get("SELECT advs FROM usuarios WHERE id = ?", [req.params.id], (err, u) => {
        let a = (u.advs || 0) + 1;
        db.run("UPDATE usuarios SET advs = ?, banido = ? WHERE id = ?", [a, a >= 3 ? 1 : 0, req.params.id], () => res.redirect('/admin'));
    });
});

app.post('/admin/banir-direto/:id', garantirAcesso(['Administrador']), (req, res) => {
    db.run("UPDATE usuarios SET banido = 1, advs = 3 WHERE id = ?", [req.params.id], () => res.redirect('/admin'));
});

app.post('/admin/excluir-noticia/:id', garantirAcesso(['CComEX', 'Administrador']), (req, res) => {
    db.run("DELETE FROM noticias WHERE id = ?", [req.params.id], () => res.redirect('/'));
});

app.get('/publicar', garantirAcesso(['Jornalista', 'CComEX']), (req, res) => res.render('publicar', { user: req.session.user }));
app.post('/publicar', garantirAcesso(['Jornalista', 'CComEX']), (req, res) => {
    const { titulo, subtitulo, conteudo } = req.body;
    db.run("INSERT INTO noticias (titulo, subtitulo, conteudo, autor) VALUES (?, ?, ?, ?)", [titulo, subtitulo, conteudo, req.session.user.login], () => res.redirect('/'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Portal Ativo`));
