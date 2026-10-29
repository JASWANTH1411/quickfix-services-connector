const ResponseHandler = require('../utils/responseHandler');

const errorHandler = (err, req, res, next) => {
  console.error('Unhandled Application Error:', err.stack || err.message);

  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  return ResponseHandler.error(
    res,
    err.message || 'An unexpected server error occurred',
    process.env.NODE_ENV === 'development' ? err.stack : null,
    statusCode
  );
};

module.exports = errorHandler;
