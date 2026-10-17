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

const router = express.Router();

router.post('/', createUser);
router.post('/login', loginUser);
router.get('/', getUsers);
router.get('/me', authenticateUser, getCurrentUser);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.patch('/:id', updateUser);
router.delete('/:id', deleteUser);
router.use(handleUserError);

module.exports = router;
