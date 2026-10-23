const express = require('express');
const { rateLimit } = require('express-rate-limit');
const {
  createProduct,
  getProducts,
  getAllProducts,
  getProductById,
  generateProductTryOn,
  updateProduct,
  deleteProduct,
  handleProductError,
} = require('../controllers/product.controller');
const authenticateUser = require('../middleware/auth.middleware');
const authorizeAdmin = require('../middleware/admin.middleware');

const router = express.Router();
const tryOnRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'AI 가상착장은 시간당 30회까지 사용할 수 있습니다.' },
});

router.post('/', authenticateUser, authorizeAdmin, createProduct);
router.post('/try-on/generate', authenticateUser, tryOnRateLimit, generateProductTryOn);
router.get('/', getProducts);
router.get('/all', getAllProducts);
router.get('/:id', getProductById);
router.put('/:id', authenticateUser, authorizeAdmin, updateProduct);
router.patch('/:id', authenticateUser, authorizeAdmin, updateProduct);
router.delete('/:id', authenticateUser, authorizeAdmin, deleteProduct);
router.use(handleProductError);

module.exports = router;
