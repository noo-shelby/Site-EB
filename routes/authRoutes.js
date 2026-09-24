const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Banco de dados simulado (Substituir pela conexão real do SQLite/PostgreSQL)
const usersDB = []; 
const recoveryTokensDB = new Map();

// --- 1. CRIAR CONTA (MEMBRO) ---
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Preencha todos os campos.' });
    }

    const userExists = usersDB.find(u => u.email === email);
    if (userExists) {
      return res.status(400).json({ error: 'E-mail já cadastrado.' });
    }

    // Criptografa a senha com Hash de alto custo
    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = {
      id: Date.now(),
      username,
      email,
      password: hashedPassword,
      is_staff: false // Por padrão, novos cadastros são membros
    };

    usersDB.push(newUser);

    return res.status(201).json({ message: 'Conta criada com sucesso!' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

// --- 2. LOGIN DE MEMBROS ---
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = usersDB.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    // Gera o Token JWT de Membro
    const token = jwt.sign(
      { id: user.id, username: user.username, is_staff: user.is_staff },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 3600 * 1000
    });

    return res.json({
      message: 'Login efetuado com sucesso!',
      user: { id: user.id, username: user.username, is_staff: user.is_staff }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao realizar login.' });
  }
});

// --- 3. SOLICITAR RECUPERAÇÃO DE SENHA ---
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  const user = usersDB.find(u => u.email === email);

  // Mesmo que o e-mail não exista, respondemos com sucesso para evitar rastreio de e-mails existentes
  if (!user) {
    return res.json({ message: 'Se o e-mail estiver cadastrado, um link de recuperação foi enviado.' });
  }

  // Gera Token temporário de 15 minutos
  const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
  recoveryTokensDB.set(resetToken, user.id);

  // Aqui entraria a integração com serviço de e-mail (Ex: Nodemailer, Resend)
  console.log(`🔑 Link de recuperação (Simulação): https://meusite.com/reset-password?token=${resetToken}`);

  return res.json({ message: 'Se o e-mail estiver cadastrado, um link de recuperação foi enviado.' });
});

// --- 4. REDEFINIR SENHA COM TOKEN ---
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = recoveryTokensDB.get(token);

    if (!userId || decoded.id !== userId) {
      return res.status(400).json({ error: 'Token inválido ou expirado.' });
    }

    const user = usersDB.find(u => u.id === userId);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

    // Atualiza a senha
    user.password = await bcrypt.hash(newPassword, 12);
    recoveryTokensDB.delete(token); // Invalida o token após o uso

    return res.json({ message: 'Senha alterada com sucesso! Faça login novamente.' });
  } catch (err) {
    return res.status(400).json({ error: 'Token inválido ou expirado.' });
  }
});

module.exports = router;
