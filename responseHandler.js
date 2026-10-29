class ResponseHandler {
  static success(res, message = 'Success', data = null, statusCode = 200) {
    return res.status(statusCode).json({
      status: 'success',
      message,
      data
    });
  }

  static error(res, message = 'Internal Server Error', errorDetails = null, statusCode = 500) {
    return res.status(statusCode).json({
      status: 'error',
      message,
      errors: errorDetails
    });
  }
}

module.exports = ResponseHandler;
