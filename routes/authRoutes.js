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

    // Verifica se e-mail já existe no banco
    const userExists = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (userExists) {
      return res.status(400).json({ error: 'E-mail já cadastrado.' });
    }

    // Criptografa a senha
    const hashedPassword = await bcrypt.hash(password, 12);

    // Insere no banco SQLite
    const insert = db.prepare('INSERT INTO users (username, email, password, is_staff) VALUES (?, ?, ?, 0)');
    insert.run(username, email, hashedPassword);

    return res.status(201).json({ message: 'Conta criada com sucesso!' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

// 2. LOGIN DE MEMBRO
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

    // Gera o Token JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, is_staff: Boolean(user.is_staff) },
      process.env.JWT_SECRET || 'secreto_temp',
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

module.exports = router;
