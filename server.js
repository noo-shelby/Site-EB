require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/authRoutes');
const staffRoutes = require('./routes/staffRoutes');

const app = express();

// Proteções Globais de Segurança
app.use(helmet());
app.use(express.json());

// Limite de Requisições para evitar ataques de Força Bruta
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // limite de 100 requisições por IP
  message: { error: 'Muitas tentativas. Tente novamente mais tarde.' }
});
app.use('/api/', limiter);

// Rota Pública de Autenticação (Membros)
app.use('/api/v1/auth', authRoutes);

// ROTA OCULTA DA STAFF (Carregada via Variável de Ambiente)
const staffSecretPath = process.env.STAFF_SECRET_ROUTE || 'staff-default-gate';
app.use(`/api/v1/${staffSecretPath}`, staffRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server rodando na porta ${PORT}`);
  console.log(`🛡️ Rota Secreta da Staff montada com sucesso.`);
});
