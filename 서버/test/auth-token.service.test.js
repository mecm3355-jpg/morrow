const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createLoginToken,
  verifyLoginToken,
  extractBearerToken,
  getTokenExpiresIn,
} = require('../src/services/auth-token.service');

test('Bearer 인증 헤더에서 토큰을 추출한다', () => {
  assert.equal(extractBearerToken('Bearer sample-token'), 'sample-token');
  assert.equal(extractBearerToken('bearer another-token'), 'another-token');
  assert.equal(extractBearerToken('Basic sample-token'), null);
  assert.equal(extractBearerToken(), null);
});

test('로그인 토큰 생성과 검증이 동일한 인증 서비스를 사용한다', () => {
  const previousSecret = process.env.JWT_SECRET;
  const previousExpiresIn = process.env.JWT_EXPIRES_IN;
  process.env.JWT_SECRET = 'test-jwt-secret-for-auth-token-service';
  process.env.JWT_EXPIRES_IN = '30m';

  try {
    const token = createLoginToken({
      _id: { toString: () => '507f1f77bcf86cd799439011' },
      email: 'customer@example.com',
      user_type: 'customer',
    });
    const payload = verifyLoginToken(token);

    assert.equal(payload.sub, '507f1f77bcf86cd799439011');
    assert.equal(payload.email, 'customer@example.com');
    assert.equal(payload.user_type, 'customer');
    assert.equal(getTokenExpiresIn(), '30m');
  } finally {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;

    if (previousExpiresIn === undefined) delete process.env.JWT_EXPIRES_IN;
    else process.env.JWT_EXPIRES_IN = previousExpiresIn;
  }
});
