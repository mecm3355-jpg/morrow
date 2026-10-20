const { rateLimit } = require('express-rate-limit');

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  ipv6Subnet: 56,
  message: {
    message: '인증 요청이 너무 많습니다. 15분 후 다시 시도해 주세요.',
  },
});

module.exports = authRateLimiter;
