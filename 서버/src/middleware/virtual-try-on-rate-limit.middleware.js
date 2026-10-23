const { rateLimit } = require('express-rate-limit');

const virtualTryOnRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: true,
  legacyHeaders: false,
  ipv6Subnet: 56,
  message: {
    message: '무료 AI 생성은 한 시간에 3번까지 사용할 수 있습니다. 잠시 후 다시 시도해 주세요.',
  },
});

module.exports = virtualTryOnRateLimiter;
