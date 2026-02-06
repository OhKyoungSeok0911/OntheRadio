const axios = require('axios');

// Secret Key 가져오기 (테스트 중에는 DEV 키 사용)
const getSecretKey = () => {
  // 테스트 모드: 항상 DEV 키 사용
  // 실제 운영 시 아래 주석 해제하고 위 줄 삭제
  return process.env.KAKAO_SECRET_KEY_DEV;
  
  // const isDev = process.env.NODE_ENV !== 'production';
  // return isDev 
  //   ? process.env.KAKAO_SECRET_KEY_DEV 
  //   : process.env.KAKAO_SECRET_KEY_PRD;
};

module.exports = async (req, res) => {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONS 요청 처리 (preflight)
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
      cid = 'TC0ONETIME',
      partner_order_id,
      partner_user_id,
      item_name,
      quantity,
      total_amount,
      tax_free_amount = 0,
      approval_url,
      cancel_url,
      fail_url
    } = req.body;

    const secretKey = getSecretKey();
    
    if (!secretKey) {
      res.status(500).json({ 
        error: 'Secret Key가 설정되지 않았습니다.' 
      });
      return;
    }

    console.log('결제 준비 요청:', {
      cid,
      partner_order_id,
      item_name,
      total_amount
    });

    // 카카오페이 결제 준비 API 호출
    const response = await axios.post(
      'https://open-api.kakaopay.com/online/v1/payment/ready',
      {
        cid,
        partner_order_id,
        partner_user_id,
        item_name,
        quantity,
        total_amount,
        tax_free_amount,
        approval_url,
        cancel_url,
        fail_url
      },
      {
        headers: {
          'Authorization': `SECRET_KEY ${secretKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('카카오페이 응답:', response.data);

    res.json({
      ...response.data,
      partner_order_id,
      partner_user_id
    });

  } catch (error) {
    const errorData = error.response && error.response.data;
    console.error('카카오페이 결제 준비 오류:', errorData || error.message);
    
    if (error.response) {
      res.status(error.response.status).json({
        error: (errorData && errorData.error_message) || '카카오페이 API 오류',
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

