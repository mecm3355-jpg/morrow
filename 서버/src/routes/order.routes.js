const express = require('express');

const {
  createOrder,
  getPaymentConfiguration,
  getOrders,
  getAdminOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  handleOrderError,
} = require('../controllers/order.controller');
const authenticateUser = require('../middleware/auth.middleware');
const authorizeAdmin = require('../middleware/admin.middleware');

const router = express.Router();

router.use(authenticateUser);
router.get('/payment-config', getPaymentConfiguration);
router.get('/admin', authorizeAdmin, getAdminOrders);
router.post('/', createOrder);
router.get('/', getOrders);
router.get('/:id', getOrderById);
router.put('/:id', updateOrder);
router.patch('/:id', updateOrder);
router.delete('/:id', deleteOrder);
router.use(handleOrderError);

module.exports = router;
