const User = require('../models/user.model');

async function authorizeAdmin(req, res, next) {
  const user = await User.findById(req.auth.userId).select('user_type');

  if (!user) {
    return res.status(401).json({ message: '로그인한 사용자를 찾을 수 없습니다.' });
  }

  const userType = typeof user.user_type === 'string'
    ? user.user_type.trim().toLowerCase()
    : '';

  if (userType !== 'admin') {
    return res.status(403).json({ message: '관리자만 사용할 수 있는 기능입니다.' });
  }

  req.auth.userType = userType;
  return next();
}

module.exports = authorizeAdmin;
