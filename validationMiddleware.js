const { validationResult } = require('express-validator');
const ResponseHandler = require('../utils/responseHandler');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return ResponseHandler.error(res, 'Validation error', errors.array(), 400);
  }
  next();
};

module.exports = {
  validateRequest
};
