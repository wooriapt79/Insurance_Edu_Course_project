const jwt = require('jsonwebtoken');
const User = require('../models/User'); // User 모델 임포트

// JWT Secret Key (실제 환경에서는 .env 파일에서 불러오는 것을 권장)
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key'; 

const jwtMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: '인증 토큰이 제공되지 않았습니다.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // 디코딩된 정보로 사용자 찾기
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: '유효하지 않은 토큰입니다: 사용자를 찾을 수 없음' });
    }
    req.user = { id: user._id, username: user.username, role: user.role };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: '인증 토큰이 만료되었습니다.' });
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: '유효하지 않은 인증 토큰입니다.' });
    }
    console.error('JWT verification error:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

const requireRole = (roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: '권한이 없습니다.' });
  }
  next();
};

// JWT를 생성하는 함수
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role }, 
    JWT_SECRET, 
    { expiresIn: '1h' } // 토큰 만료 시간 설정 (예: 1시간)
  );
};

module.exports = { jwtMiddleware, requireRole, generateToken };
