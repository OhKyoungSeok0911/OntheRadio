module.exports = (req, res) => {
  res.json({ 
    status: 'ok', 
    env: process.env.NODE_ENV || 'development',
    hasSecretKey: !!(process.env.KAKAO_SECRET_KEY_DEV || process.env.KAKAO_SECRET_KEY_PRD),
    timestamp: new Date().toISOString()
  });
};

