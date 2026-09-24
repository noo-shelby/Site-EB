const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    // Retorna 404 intencionalmente para esconder a existência da rota
    return res.status(404).json({ error: 'Página não encontrada.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verifica se possui cargo de Staff/Oficial
    if (!decoded.is_staff) {
      return res.status(404).json({ error: 'Página não encontrada.' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(404).json({ error: 'Página não encontrada.' });
  }
};
