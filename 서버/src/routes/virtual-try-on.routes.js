const express = require('express');

const {
  createVirtualTryOn,
  getVirtualTryOnStatus,
} = require('../controllers/virtual-try-on.controller');
const authenticateUser = require('../middleware/auth.middleware');
const virtualTryOnRateLimiter = require('../middleware/virtual-try-on-rate-limit.middleware');

const router = express.Router();

router.get('/status', getVirtualTryOnStatus);
router.post('/', authenticateUser, virtualTryOnRateLimiter, createVirtualTryOn);

module.exports = router;
