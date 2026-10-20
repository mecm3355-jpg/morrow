const User = require('../models/user.model');

async function authorizeSelfOrAdmin(req, res, next) {
  if (req.auth.userId === req.params.id) {
    return next();
  }

  const currentUser = await User.findById(req.auth.userId).select('user_type');

  if (!currentUser) {
    return res.status(401).json({ message: '로그인한 사용자를 찾을 수 없습니다.' });
  }

  const userType = typeof currentUser.user_type === 'string'
    ? currentUser.user_type.trim().toLowerCase()
    : '';

  if (userType !== 'admin') {
    return res.status(403).json({ message: '본인의 회원 정보만 확인하거나 변경할 수 있습니다.' });
  }

  req.auth.userType = userType;
  return next();
}

module.exports = authorizeSelfOrAdmin;
