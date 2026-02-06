const axios = require('axios');

// Secret Key 가져오기 (운영 모드: PRD 키 사용)
const getSecretKey = () => {
  return process.env.KAKAO_SECRET_KEY_PRD;
};

module.exports = async (req, res) => {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const {
      cid = 'CQP987001835703', // 실제 가맹점 코드
      tid,
      partner_order_id,
      partner_user_id,
      pg_token
    } = req.body;

    const secretKey = getSecretKey();

    console.log('결제 승인 요청:', {
      cid,
      tid,
      partner_order_id,
      pg_token
    });

    const response = await axios.post(
      'https://open-api.kakaopay.com/online/v1/payment/approve',
      {
        cid,
        tid,
        partner_order_id,
        partner_user_id,
        pg_token
      },
      {
        headers: {
          'Authorization': `SECRET_KEY ${secretKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('결제 승인 완료:', response.data);
    res.json(response.data);

  } catch (error) {
    const errorData = error.response && error.response.data;
    console.error('카카오페이 결제 승인 오류:', errorData || error.message);
    
    if (error.response) {
      res.status(error.response.status).json({
        error: (errorData && errorData.error_message) || '결제 승인 실패',
        code: errorData && errorData.error_code,
        details: errorData
      });
    } else {
      res.status(500).json({ 
        error: '서버 오류가 발생했습니다.',
        message: error.message 
      });
    }
  }
};

