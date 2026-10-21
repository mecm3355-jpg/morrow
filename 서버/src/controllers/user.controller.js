const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/user.model');
const {
  createLoginToken,
  getTokenExpiresIn,
} = require('../services/auth-token.service');

const userFields = ['email', 'name', 'password', 'user_type', 'address'];
const updatableUserFields = ['email', 'name', 'password', 'address'];
const requiredUserFields = ['email', 'name', 'password', 'user_type'];
const publicUserTypes = ['customer', 'seller'];
const passwordMinLength = 8;
const passwordSaltRounds = 12;

function pickUserFields(body) {
  return userFields.reduce((userData, field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      userData[field] = body[field];
    }

    return userData;
  }, {});
}

function pickUpdatableUserFields(body) {
  return updatableUserFields.reduce((userData, field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      userData[field] = body[field];
    }

    return userData;
  }, {});
}

function userWithoutPassword(user) {
  const userData = user.toObject();
  delete userData.password;
  return userData;
}

function isValidUserId(id) {
  return mongoose.isObjectIdOrHexString(id);
}

async function createUser(req, res) {
  const userData = pickUserFields(req.body);
  const missingFields = requiredUserFields.filter((field) => {
    const value = userData[field];
    return value === undefined || value === null || (typeof value === 'string' && !value.trim());
  });

  if (missingFields.length > 0) {
    return res.status(400).json({
      message: '필수 입력값을 모두 입력해 주세요.',
      fields: missingFields,
    });
  }

  if (!publicUserTypes.includes(userData.user_type)) {
    return res.status(400).json({
      message: '회원 유형은 customer 또는 seller만 선택할 수 있습니다.',
    });
  }

  if (userData.password.length < passwordMinLength) {
    return res.status(400).json({
      message: `비밀번호는 ${passwordMinLength}자 이상이어야 합니다.`,
    });
  }

  userData.password = await bcrypt.hash(userData.password, passwordSaltRounds);
  const user = await User.create(userData);

  return res.status(201).json(userWithoutPassword(user));
}

async function loginUser(req, res) {
  const body = req.body ?? {};
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const missingFields = [];

  if (!email) {
    missingFields.push('email');
  }

  if (!password) {
    missingFields.push('password');
  }

  if (missingFields.length > 0) {
    return res.status(400).json({
      message: '이메일과 비밀번호를 모두 입력해 주세요.',
      fields: missingFields,
    });
  }

  const user = await User.findOne({ email });
  const passwordMatches = user && (await bcrypt.compare(password, user.password));

  if (!passwordMatches) {
    return res.status(401).json({
      message: '이메일 또는 비밀번호가 올바르지 않습니다.',
    });
  }

  const token = createLoginToken(user);

  return res.status(200).json({
    message: '로그인에 성공했습니다.',
    token,
    tokenType: 'Bearer',
    expiresIn: getTokenExpiresIn(),
    user: userWithoutPassword(user),
  });
}

async function getUsers(req, res) {
  const users = await User.find().select('-password');

  res.status(200).json(users);
}

async function getCurrentUser(req, res) {
  if (!isValidUserId(req.auth.userId)) {
    return res.status(401).json({ message: '유효하지 않은 로그인 정보입니다.' });
  }

  const user = await User.findById(req.auth.userId).select('-password');

  if (!user) {
    return res.status(401).json({ message: '로그인한 사용자를 찾을 수 없습니다.' });
  }

  return res.status(200).json(user);
}

async function getUserById(req, res) {
  if (!isValidUserId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid user ID.' });
  }

  const user = await User.findById(req.params.id).select('-password');

  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  return res.status(200).json(user);
}

async function updateUser(req, res) {
  if (!isValidUserId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid user ID.' });
  }

  const updateData = pickUpdatableUserFields(req.body);

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ message: 'No user fields were provided.' });
  }

  if (Object.prototype.hasOwnProperty.call(updateData, 'password')) {
    if (typeof updateData.password !== 'string' || updateData.password.length < passwordMinLength) {
      return res.status(400).json({
        message: `비밀번호는 ${passwordMinLength}자 이상이어야 합니다.`,
      });
    }

    updateData.password = await bcrypt.hash(updateData.password, passwordSaltRounds);
  }

  const user = await User.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true,
  }).select('-password');

  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  return res.status(200).json(user);
}

async function deleteUser(req, res) {
  if (!isValidUserId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid user ID.' });
  }

  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  return res.status(200).json(userWithoutPassword(user));
}

function handleUserError(error, req, res, next) {
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      message: 'User validation failed.',
      errors: Object.values(error.errors).map((validationError) => validationError.message),
    });
  }

  if (error.code === 11000) {
    return res.status(409).json({ message: '이미 가입된 이메일입니다.' });
  }

  return next(error);
}

module.exports = {
  createUser,
  loginUser,
  getUsers,
  getCurrentUser,
  getUserById,
  updateUser,
  deleteUser,
  handleUserError,
};
