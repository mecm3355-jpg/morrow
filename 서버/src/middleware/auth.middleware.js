const {
  extractBearerToken,
  verifyLoginToken,
} = require('../services/auth-token.service');

function authenticateUser(req, res, next) {
  const authorization = req.get('authorization') ?? '';
  const bearerToken = extractBearerToken(authorization);

  if (!bearerToken) {
    return res.status(401).json({
      message: '로그인이 필요한 요청입니다.',
    });
  }

  try {
    const payload = verifyLoginToken(bearerToken);

    if (!payload.sub) {
      return res.status(401).json({
        message: '유효하지 않은 로그인 정보입니다.',
      });
    }

    req.auth = { userId: payload.sub };
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        message: '로그인이 만료되었거나 유효하지 않습니다.',
      });
    }

    return next(error);
  }
}

module.exports = authenticateUser;
