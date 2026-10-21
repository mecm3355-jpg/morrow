const jwt = require('jsonwebtoken');

const DEFAULT_TOKEN_EXPIRES_IN = '1h';

function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    const error = new Error('서버 인증 설정이 올바르지 않습니다.');
    error.status = 500;
    throw error;
  }

  return process.env.JWT_SECRET;
}

function getTokenExpiresIn() {
  return process.env.JWT_EXPIRES_IN || DEFAULT_TOKEN_EXPIRES_IN;
}

function extractBearerToken(authorization = '') {
  if (typeof authorization !== 'string') return null;
  return authorization.match(/^Bearer\s+(.+)$/i)?.[1] || null;
}

function createLoginToken(user) {
  return jwt.sign(
    {
      email: user.email,
      user_type: user.user_type,
    },
    getJwtSecret(),
    {
      subject: user._id.toString(),
      expiresIn: getTokenExpiresIn(),
    },
  );
}

function verifyLoginToken(token) {
  return jwt.verify(token, getJwtSecret());
}

module.exports = {
  createLoginToken,
  verifyLoginToken,
  extractBearerToken,
  getTokenExpiresIn,
};
