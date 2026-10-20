const express = require('express');
const {
  createUser,
  loginUser,
  getUsers,
  getCurrentUser,
  getUserById,
  updateUser,
  deleteUser,
  handleUserError,
} = require('../controllers/user.controller');
const authenticateUser = require('../middleware/auth.middleware');
const authorizeAdmin = require('../middleware/admin.middleware');
const authorizeSelfOrAdmin = require('../middleware/user-access.middleware');
const authRateLimiter = require('../middleware/auth-rate-limit.middleware');

const router = express.Router();

router.post('/', authRateLimiter, createUser);
router.post('/login', authRateLimiter, loginUser);
router.get('/', authenticateUser, authorizeAdmin, getUsers);
router.get('/me', authenticateUser, getCurrentUser);
router.get('/:id', authenticateUser, authorizeSelfOrAdmin, getUserById);
router.put('/:id', authenticateUser, authorizeSelfOrAdmin, updateUser);
router.patch('/:id', authenticateUser, authorizeSelfOrAdmin, updateUser);
router.delete('/:id', authenticateUser, authorizeSelfOrAdmin, deleteUser);
router.use(handleUserError);

module.exports = router;
