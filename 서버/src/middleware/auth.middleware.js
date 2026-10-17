const jwt = require('jsonwebtoken');

function authenticateUser(req, res, next) {
  const authorization = req.get('authorization') ?? '';
  const bearerToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!bearerToken) {
    return res.status(401).json({
      message: '로그인이 필요한 요청입니다.',
    });
  }

  if (!process.env.JWT_SECRET) {
    const error = new Error('서버 인증 설정이 올바르지 않습니다.');
    error.status = 500;
    return next(error);
  }

  try {
    const payload = jwt.verify(bearerToken, process.env.JWT_SECRET);

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
