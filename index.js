const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');
const app = express();

const db = new sqlite3.Database('./portal.db');

// ==========================================
// 1. ESTRUTURA DO BANCO DE DADOS
// ==========================================
db.serialize(() => {
    // Tabela de Usuários
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        discord_user TEXT,
        discord_id TEXT,
        setor TEXT,
        login TEXT UNIQUE,
        senha TEXT,
        cargo TEXT DEFAULT 'Membro',
        advs INTEGER DEFAULT 0,
        banido INTEGER DEFAULT 0,
        mute_ate DATETIME DEFAULT NULL
    )`);

    // Criar Login Master
    const masterLogin = "Shelby Ower";
    const masterPass = "05032010";
    db.get("SELECT * FROM usuarios WHERE login = ?", [masterLogin], async (err, row) => {
        if (!row) {
            const hash = await bcrypt.hash(masterPass, 10);
            db.run(`INSERT INTO usuarios (discord_user, setor, login, senha, cargo) VALUES (?, ?, ?, ?, ?)`,
            ['Shelby#0000', 'Staff', masterLogin, hash, 'Criador']);
        }
    });

    // Tabela de Notícias
    db.run(`CREATE TABLE IF NOT EXISTS noticias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT,
        subtitulo TEXT,
        conteudo TEXT,
        autor TEXT,
        data DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabela de Comentários
    db.run(`CREATE TABLE IF NOT EXISTS comentarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        noticia_id INTEGER,
        usuario_nome TEXT,
        texto TEXT,
        data DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

// ==========================================
// 2. CONFIGURAÇÕES DO EXPRESS
// ==========================================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'eb_portal_secret_2024',
    resave: false,
    saveUninitialized: false
}));

// Middlewares de Permissão
const verificarCargo = (cargosPermitidos) => {
    return (req, res, next) => {
        if (!req.session.user) return res.redirect('/login');
        if (cargosPermitidos.includes(req.session.user.cargo) || req.session.user.cargo === 'Criador') {
            next();
        } else {
            res.status(403).send("Acesso Negado: Patente Insuficiente.");
        }
    };
};

// ==========================================
// 3. ROTAS PRINCIPAIS (HOME E LEITURA)
// ==========================================

app.get('/', (req, res) => {
    db.all("SELECT * FROM noticias ORDER BY data DESC", (err, rows) => {
        res.render('index', { user: req.session.user, noticias: rows || [] });
    });
});

app.get('/materia/:id', (req, res) => {
    const id = req.params.id;
    db.get("SELECT * FROM noticias WHERE id = ?", [id], (err, noticia) => {
        if (!noticia) return res.status(404).send("Matéria não encontrada.");
        db.all("SELECT * FROM comentarios WHERE noticia_id = ? ORDER BY data DESC", [id], (err, comentarios) => {
            res.render('materia', { user: req.session.user, noticia, comentarios: comentarios || [] });
        });
    });
});

// ==========================================
// 4. AUTENTICAÇÃO (LOGIN E CADASTRO)
// ==========================================

app.get('/login', (req, res) => res.render('login'));

app.post('/login', (req, res) => {
    const { login, senha } = req.body;
    db.get("SELECT * FROM usuarios WHERE login = ?", [login], async (err, user) => {
        if (user && await bcrypt.compare(senha, user.senha)) {
            if (user.banido) return res.send("Você foi exilado do portal.");
            req.session.user = user;
            res.redirect('/');
        } else {
            res.send("Usuário ou senha incorretos.");
        }
    });
});

app.get('/cadastro', (req, res) => res.render('cadastro'));

app.post('/cadastro', async (req, res) => {
    const { discord_user, discord_id, setor, login, senha } = req.body;
    const hash = await bcrypt.hash(senha, 10);
    db.run(`INSERT INTO usuarios (discord_user, discord_id, setor, login, senha) VALUES (?, ?, ?, ?, ?)`,
    [discord_user, discord_id, setor, login, hash], (err) => {
        if (err) return res.send("Erro: Login já existe.");
        res.redirect('/login');
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// ==========================================
// 5. ÁREA JORNALÍSTICA (POSTAGEM)
// ==========================================

app.get('/publicar', verificarCargo(['Jornalista', 'CComEX', 'Administrador']), (req, res) => {
    res.render('publicar', { user: req.session.user });
});

app.post('/publicar', verificarCargo(['Jornalista', 'CComEX', 'Administrador']), (req, res) => {
    const { titulo, subtitulo, conteudo } = req.body;
    const autor = req.session.user.login; // Assinatura automática
    db.run("INSERT INTO noticias (titulo, subtitulo, conteudo, autor) VALUES (?, ?, ?, ?)",
    [titulo, subtitulo, conteudo, autor], () => {
        res.redirect('/');
    });
});

// ==========================================
// 6. INTERAÇÃO (COMENTÁRIOS E ADMIN)
// ==========================================

app.post('/comentar/:id', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const { texto } = req.body;
    const noticia_id = req.params.id;
    const usuario_nome = req.session.user.login;
    db.run("INSERT INTO comentarios (noticia_id, usuario_nome, texto) VALUES (?, ?, ?)",
    [noticia_id, usuario_nome, texto], () => {
        res.redirect(`/materia/${noticia_id}`);
    });
});

app.get('/admin', verificarCargo(['Moderador', 'Administrador']), (req, res) => {
    db.all("SELECT id, discord_user, setor, cargo, advs FROM usuarios", (err, logs) => {
        res.render('admin', { user: req.session.user, logs });
    });
});

// Aplicação de ADV
app.post('/admin/adv/:id', verificarCargo(['Moderador', 'Administrador']), (req, res) => {
    const id = req.params.id;
    db.get("SELECT advs FROM usuarios WHERE id = ?", [id], (err, row) => {
        let novasAdvs = (row.advs || 0) + 1;
        let ban = novasAdvs >= 3 ? 1 : 0;
        db.run("UPDATE usuarios SET advs = ?, banido = ? WHERE id = ?", [novasAdvs, ban, id], () => {
            res.redirect('/admin');
        });
    });
});

// ==========================================
// 7. INICIALIZAÇÃO
// ==========================================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🌐 Portal CComEX rodando na porta ${PORT}`));
