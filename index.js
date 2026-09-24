require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Importa e ativa as rotas de Autenticação
const authRoutes = require('./routes/authRoutes');
app.use('/api/v1/auth', authRoutes);

// Rota de Health Check / Status
app.get('/ping', (req, res) => {
  res.status(200).send('OK - Backend Web Operacional');
});

// Inicialização do Servidor
app.listen(PORT, () => {
  console.log(`🌐 Servidor Web e Backend rodando com sucesso na porta ${PORT}`);
});
