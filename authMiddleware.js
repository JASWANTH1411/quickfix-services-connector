const jwt = require('jsonwebtoken');
const ResponseHandler = require('../utils/responseHandler');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return ResponseHandler.error(res, 'Access denied. No authentication token provided.', null, 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'quickfix_super_secret_jwt_key_2026');
    req.user = decoded; // { id, email, role: 'customer' | 'worker' | 'admin' }
    next();
  } catch (err) {
    return ResponseHandler.error(res, 'Invalid or expired token.', err.message, 401);
  }
};

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return ResponseHandler.error(res, `Access forbidden. Authorized roles: ${allowedRoles.join(', ')}`, null, 403);
    }
    next();
  };
};

module.exports = {
  verifyToken,
  authorizeRoles
};
