const express = require('express');
const router = express.Router();
const checkStaff = require('../middleware/checkStaff');

// Aplica o filtro de segurança em todas as rotas da staff
router.use(checkStaff);

// --- PAINEL SECRETO DA STAFF ---
router.get('/dashboard', (req, res) => {
  res.json({
    status: 'SISTEMA DE COMANDO ATIVO',
    message: 'Bem-vindo ao Centro de Controle da Staff.',
    staff_user: req.user.username,
    metrics: {
      pending_bans: 3,
      open_tickets: 12,
      system_load: '14%'
    }
  });
});

module.exports = router;
