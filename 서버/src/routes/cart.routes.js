const express = require('express');

const {
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearCart,
  validateCartPrices,
  handleCartError,
} = require('../controllers/cart.controller');
const authenticateUser = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticateUser);
router.get('/', getCart);
router.post('/items', addCartItem);
router.patch('/items/:itemId', updateCartItem);
router.delete('/items/:itemId', removeCartItem);
router.delete('/', clearCart);
router.post('/validate', validateCartPrices);
router.use(handleCartError);

module.exports = router;
