const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;

// CORS 설정
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

// Secret Key 가져오기
const getSecretKey = () => {
  const isDev = process.env.NODE_ENV === 'development';
  return isDev 
    ? process.env.KAKAO_SECRET_KEY_DEV 
    : process.env.KAKAO_SECRET_KEY_PRD;
};

// 카카오페이 결제 준비 API
app.post('/api/payment/ready', async (req, res) => {
  try {
    const {
      cid = 'TC0ONETIME', // 테스트용 가맹점 코드
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
      return res.status(500).json({ 
        error: 'Secret Key가 설정되지 않았습니다.' 
      });
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

    // 결제 정보 저장 (실제로는 DB에 저장해야 함)
    // tid는 결제 승인 시 필요
    const paymentInfo = {
      tid: response.data.tid,
      partner_order_id,
      partner_user_id
    };

    // 세션이나 DB에 저장하는 것이 좋음
    // 여기서는 클라이언트에 함께 전달
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
        error: (errorData && errorData.msg) || '카카오페이 API 오류',
        code: errorData && errorData.code,
        details: errorData
      });
    } else {
      res.status(500).json({ 
        error: '서버 오류가 발생했습니다.',
        message: error.message 
      });
    }
  }
});

// 카카오페이 결제 승인 API
app.post('/api/payment/approve', async (req, res) => {
  try {
    const {
      cid = 'TC0ONETIME',
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
        error: (errorData && errorData.msg) || '결제 승인 실패',
        code: errorData && errorData.code,
        details: errorData
      });
    } else {
      res.status(500).json({ 
        error: '서버 오류가 발생했습니다.',
        message: error.message 
      });
    }
  }
});

// 카카오페이 결제 취소 API
app.post('/api/payment/cancel', async (req, res) => {
  try {
    const {
      cid = 'TC0ONETIME',
      tid,
      cancel_amount,
      cancel_tax_free_amount = 0
    } = req.body;

    const secretKey = getSecretKey();

    const response = await axios.post(
      'https://open-api.kakaopay.com/online/v1/payment/cancel',
      {
        cid,
        tid,
        cancel_amount,
        cancel_tax_free_amount
      },
      {
        headers: {
          'Authorization': `SECRET_KEY ${secretKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('결제 취소 완료:', response.data);
    res.json(response.data);

  } catch (error) {
    const errorData = error.response && error.response.data;
    console.error('카카오페이 결제 취소 오류:', errorData || error.message);
    
    if (error.response) {
      res.status(error.response.status).json({
        error: (errorData && errorData.msg) || '결제 취소 실패',
        code: errorData && errorData.code
      });
    } else {
      res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
  }
});

// 헬스 체크
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    env: process.env.NODE_ENV,
    hasSecretKey: !!getSecretKey()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 카카오페이 백엔드 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`   환경: ${process.env.NODE_ENV}`);
  console.log(`   Secret Key 설정됨: ${!!getSecretKey()}`);
});

