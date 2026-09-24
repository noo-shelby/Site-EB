const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

// 1. REGISTRO DE MEMBRO
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Preencha todos os campos.' });
    }

    const userExists = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (userExists) {
      return res.status(400).json({ error: 'E-mail já cadastrado.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const insert = db.prepare('INSERT INTO users (username, email, password, is_staff) VALUES (?, ?, ?, 0)');
    insert.run(username, email, hashedPassword);

    return res.status(201).json({ message: 'Conta criada com sucesso!' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

// 2. LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, is_staff: Boolean(user.is_staff) },
      process.env.JWT_SECRET || 'chave_secreta_padrao',
      { expiresIn: '8h' }
    );

    return res.json({
      message: 'Login efetuado com sucesso!',
      token,
      user: { id: user.id, username: user.username, is_staff: Boolean(user.is_staff) }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao realizar login.' });
  }
});

// 3. ROTA SECRETA PARA TORNAR CONTA STAFF (Uso pelo Render)
router.post('/make-staff', (req, res) => {
  const { email, secretKey } = req.body;

  // Proteção simples por chave no body
  if (secretKey !== (process.env.ADMIN_SECRET_KEY || 'minha_chave_master_123')) {
    return res.status(403).json({ error: 'Chave de acesso inválida.' });
  }

  const update = db.prepare('UPDATE users SET is_staff = 1 WHERE email = ?');
  const result = update.run(email);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }

  return res.json({ message: `O usuário ${email} agora é STAFF!` });
});

module.exports = router;
