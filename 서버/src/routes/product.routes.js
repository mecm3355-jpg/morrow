const express = require('express');
const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  handleProductError,
} = require('../controllers/product.controller');
const authenticateUser = require('../middleware/auth.middleware');
const authorizeAdmin = require('../middleware/admin.middleware');

const router = express.Router();

router.post('/', authenticateUser, authorizeAdmin, createProduct);
router.get('/', getProducts);
router.get('/:id', getProductById);
router.put('/:id', authenticateUser, authorizeAdmin, updateProduct);
router.patch('/:id', authenticateUser, authorizeAdmin, updateProduct);
router.delete('/:id', authenticateUser, authorizeAdmin, deleteProduct);
router.use(handleProductError);

module.exports = router;
