import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode.react';
import './App.css';

// 백엔드 서버 URL (Vercel 배포 시 같은 도메인 사용)
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

// 푸드트럭 메뉴 데이터
const MENU_ITEMS = [
  { id: 1, name: '치킨버거', price: 6500, image: '🍔', category: '버거' },
  { id: 2, name: '불고기버거', price: 7000, image: '🍔', category: '버거' },
  { id: 3, name: '치즈버거', price: 6000, image: '🍔', category: '버거' },
  { id: 4, name: '치킨타코', price: 5000, image: '🌮', category: '타코' },
  { id: 5, name: '불고기타코', price: 5500, image: '🌮', category: '타코' },
  { id: 6, name: '핫도그', price: 4000, image: '🌭', category: '핫도그' },
  { id: 7, name: '치즈핫도그', price: 4500, image: '🌭', category: '핫도그' },
  { id: 8, name: '감자튀김', price: 3000, image: '🍟', category: '사이드' },
  { id: 9, name: '치킨너겟', price: 4000, image: '🍗', category: '사이드' },
  { id: 10, name: '콜라', price: 2000, image: '🥤', category: '음료' },
  { id: 11, name: '사이다', price: 2000, image: '🥤', category: '음료' },
  { id: 12, name: '아이스크림', price: 3000, image: '🍦', category: '디저트' }
];

// 결제 성공 페이지
function PaymentSuccess() {
  const [approvalResult, setApprovalResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const approvePayment = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const pgToken = urlParams.get('pg_token');
      
      // localStorage에서 결제 정보 가져오기
      const paymentInfo = JSON.parse(localStorage.getItem('paymentInfo') || '{}');
      
      if (!pgToken) {
        setError('결제 토큰이 없습니다.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/payment/approve`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            tid: paymentInfo.tid,
            partner_order_id: paymentInfo.partner_order_id,
            partner_user_id: paymentInfo.partner_user_id,
            pg_token: pgToken
          })
        });

        const data = await response.json();

        if (!response.ok) {
          setError(`결제 승인 실패: ${data.error || '알 수 없는 오류'}`);
        } else {
          setApprovalResult(data);
          // 결제 정보 삭제
          localStorage.removeItem('paymentInfo');
        }
      } catch (err) {
        setError('결제 승인 중 오류가 발생했습니다: ' + err.message);
      }
      
      setLoading(false);
    };

    approvePayment();
  }, []);

  // 카운트다운 및 자동 리다이렉트
  useEffect(() => {
    if (loading) return;
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = '/';
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading]);

  const goHome = () => {
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="app">
        <div className="card payment-result">
          <div className="result-icon loading">⏳</div>
          <h1>결제 처리 중...</h1>
          <p>잠시만 기다려주세요.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <div className="card payment-result">
          <div className="result-icon error">❌</div>
          <h1>결제 승인 실패</h1>
          <p className="error-text">{error}</p>
          <div className="countdown">
            <span className="countdown-number">{countdown}</span>초 후 주문 페이지로 이동합니다
          </div>
          <button onClick={goHome} className="btn btn-primary">
            지금 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="card payment-result success">
        <div className="result-icon success">✅</div>
        <h1>결제 완료!</h1>
        <p className="success-message">주문이 성공적으로 완료되었습니다.</p>
        
        {approvalResult && (
          <div className="receipt">
            <h3>영수증</h3>
            <div className="receipt-item">
              <span>주문번호</span>
              <span>{approvalResult.partner_order_id}</span>
            </div>
            <div className="receipt-item">
              <span>상품명</span>
              <span>{approvalResult.item_name}</span>
            </div>
            <div className="receipt-item">
              <span>결제금액</span>
              <span className="amount">{approvalResult.amount?.total?.toLocaleString()}원</span>
            </div>
            <div className="receipt-item">
              <span>결제수단</span>
              <span>카카오페이</span>
            </div>
            <div className="receipt-item">
              <span>결제시간</span>
              <span>{new Date(approvalResult.approved_at).toLocaleString('ko-KR')}</span>
            </div>
          </div>
        )}
        
        <div className="countdown">
          <span className="countdown-number">{countdown}</span>초 후 주문 페이지로 이동합니다
        </div>
        <button onClick={goHome} className="btn btn-primary">
          지금 주문하기
        </button>
      </div>
    </div>
  );
}

// 결제 취소 페이지
function PaymentCancel() {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = '/';
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const goHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="app">
      <div className="card payment-result cancel">
        <div className="result-icon cancel">🚫</div>
        <h1>결제 취소</h1>
        <p>결제가 취소되었습니다.</p>
        <p className="sub-text">다시 주문하시려면 아래 버튼을 클릭해주세요.</p>
        <div className="countdown">
          <span className="countdown-number">{countdown}</span>초 후 주문 페이지로 이동합니다
        </div>
        <button onClick={goHome} className="btn btn-primary">
          지금 돌아가기
        </button>
      </div>
    </div>
  );
}

// 결제 실패 페이지
function PaymentFail() {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = '/';
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const goHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="app">
      <div className="card payment-result fail">
        <div className="result-icon fail">❌</div>
        <h1>결제 실패</h1>
        <p>결제 처리 중 문제가 발생했습니다.</p>
        <p className="sub-text">다시 시도해주세요. 문제가 계속되면 고객센터로 문의해주세요.</p>
        <div className="countdown">
          <span className="countdown-number">{countdown}</span>초 후 주문 페이지로 이동합니다
        </div>
        <button onClick={goHome} className="btn btn-primary">
          지금 돌아가기
        </button>
      </div>
    </div>
  );
}

// 메인 주문 페이지
function OrderPage() {
  const [cart, setCart] = useState([]); // 장바구니: [{ menuItem, quantity }]
  const [showQR, setShowQR] = useState(false);
  const [error, setError] = useState('');
  const [paymentReady, setPaymentReady] = useState(null);
  const [orderSummary, setOrderSummary] = useState(null);

  // 백엔드 서버 상태 확인
  useEffect(() => {
    const checkBackendHealth = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/health`);
        const data = await response.json();
        console.log('백엔드 서버 상태:', data);
      } catch (err) {
        console.warn('백엔드 서버 연결 실패:', err.message);
      }
    };
    checkBackendHealth();
  }, []);

  // 장바구니에 메뉴 추가
  const addToCart = (menuItem) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.menuItem.id === menuItem.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.menuItem.id === menuItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prevCart, { menuItem, quantity: 1 }];
      }
    });
    setError('');
  };

  // 장바구니에서 수량 변경
  const updateQuantity = (menuItemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(menuItemId);
      return;
    }
    setCart(prevCart =>
      prevCart.map(item =>
        item.menuItem.id === menuItemId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  // 장바구니에서 메뉴 제거
  const removeFromCart = (menuItemId) => {
    setCart(prevCart => prevCart.filter(item => item.menuItem.id !== menuItemId));
  };

  // 총액 계산
  const calculateTotal = () => {
    return cart.reduce((total, item) => {
      return total + (item.menuItem.price * item.quantity);
    }, 0);
  };

  // 총 수량 계산
  const calculateTotalQuantity = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  // 카카오페이 결제 준비
  const generateKakaoPayPayment = async () => {
    if (cart.length === 0) {
      setError('장바구니가 비어있습니다. 메뉴를 선택해주세요.');
      return;
    }

    const totalAmount = calculateTotal();
    const totalQuantity = calculateTotalQuantity();

    const orderSummaryData = {
      items: cart.map(item => ({
        name: item.menuItem.name,
        price: item.menuItem.price,
        quantity: item.quantity,
        subtotal: item.menuItem.price * item.quantity
      })),
      totalAmount,
      totalQuantity
    };
    setOrderSummary(orderSummaryData);

    try {
      const paymentRequestData = {
        cid: 'CQP987001835703', // 실제 가맹점 코드
        partner_order_id: `ORDER_${Date.now()}`,
        partner_user_id: 'user123',
        item_name: cart.length === 1 
          ? `${cart[0].menuItem.name} ${cart[0].quantity}개`
          : `${cart[0].menuItem.name} 외 ${cart.length - 1}개`,
        quantity: totalQuantity,
        total_amount: totalAmount,
        tax_free_amount: 0,
        approval_url: `${window.location.origin}/payment/success`,
        cancel_url: `${window.location.origin}/payment/cancel`,
        fail_url: `${window.location.origin}/payment/fail`
      };

      console.log('결제 준비 요청:', paymentRequestData);

      const response = await fetch(`${API_BASE_URL}/api/payment/ready`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentRequestData)
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('결제 준비 오류:', data);
        setError(`결제 준비 실패: ${data.error || '알 수 없는 오류'}\n\n${data.details?.msg || ''}`);
        return;
      }

      console.log('결제 준비 성공:', data);
      
      // 결제 정보를 localStorage에 저장 (결제 승인 시 필요)
      const paymentInfo = {
        tid: data.tid,
        partner_order_id: paymentRequestData.partner_order_id,
        partner_user_id: paymentRequestData.partner_user_id
      };
      localStorage.setItem('paymentInfo', JSON.stringify(paymentInfo));
      
      setPaymentReady({
        ...paymentRequestData,
        tid: data.tid,
        next_redirect_pc_url: data.next_redirect_pc_url,
        next_redirect_mobile_url: data.next_redirect_mobile_url,
        next_redirect_app_url: data.next_redirect_app_url,
        android_app_scheme: data.android_app_scheme,
        ios_app_scheme: data.ios_app_scheme,
        created_at: data.created_at
      });
      setShowQR(true);
      setError('');

    } catch (err) {
      console.error('결제 요청 오류:', err);
      
      if (err.message.includes('Failed to fetch')) {
        setError('백엔드 서버에 연결할 수 없습니다.');
      } else {
        setError('결제 정보 생성에 실패했습니다: ' + err.message);
      }
    }
  };

  // 카카오페이 결제 페이지로 이동
  const openKakaoPay = () => {
    if (!paymentReady) return;

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (paymentReady.next_redirect_pc_url || paymentReady.next_redirect_mobile_url) {
      if (isMobile && paymentReady.next_redirect_mobile_url) {
        window.location.href = paymentReady.next_redirect_mobile_url;
      } else if (paymentReady.next_redirect_pc_url) {
        window.location.href = paymentReady.next_redirect_pc_url;
      } else {
        setError('결제 URL을 받을 수 없습니다.');
      }
    } else {
      setError('카카오페이 결제 URL을 받지 못했습니다.');
    }
  };

  // 초기화
  const reset = () => {
    setCart([]);
    setShowQR(false);
    setError('');
    setPaymentReady(null);
    setOrderSummary(null);
  };

  return (
    <div className="app">
      <div className="card">
        <div className="foodtruck-header">
          <div className="foodtruck-icon"><span role="img" aria-label="푸드트럭">🚚</span></div>
          <h1 className="app-title">푸드트럭 주문</h1>
          <div className="foodtruck-subtitle">맛있는 음식을 주문하세요!</div>
        </div>
        
        {error && (
          <div className="error-message">{error}</div>
        )}

        {!showQR ? (
          <>
            <div className="menu-section">
              <h2 className="section-title">메뉴 선택</h2>
              <div className="menu-grid">
                {MENU_ITEMS.map(item => (
                  <div key={item.id} className="menu-item" onClick={() => addToCart(item)}>
                    <div className="menu-icon">{item.image}</div>
                    <div className="menu-name">{item.name}</div>
                    <div className="menu-price">{item.price.toLocaleString()}원</div>
                    <button className="add-btn">담기</button>
                  </div>
                ))}
              </div>
            </div>

            {cart.length > 0 && (
              <div className="cart-section">
                <h2 className="section-title">장바구니 ({calculateTotalQuantity()}개)</h2>
                <div className="cart-items">
                  {cart.map(item => (
                    <div key={item.menuItem.id} className="cart-item">
                      <div className="cart-item-info">
                        <div className="cart-item-name">{item.menuItem.name}</div>
                        <div className="cart-item-price">
                          {(item.menuItem.price * item.quantity).toLocaleString()}원
                        </div>
                      </div>
                      <div className="cart-item-controls">
                        <button 
                          className="quantity-btn"
                          onClick={() => updateQuantity(item.menuItem.id, item.quantity - 1)}
                        >
                          -
                        </button>
                        <span className="quantity">{item.quantity}</span>
                        <button 
                          className="quantity-btn"
                          onClick={() => updateQuantity(item.menuItem.id, item.quantity + 1)}
                        >
                          +
                        </button>
                        <button 
                          className="remove-btn"
                          onClick={() => removeFromCart(item.menuItem.id)}
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="cart-total">
                  <div className="total-label">총 결제금액</div>
                  <div className="total-amount">{calculateTotal().toLocaleString()}원</div>
                </div>
                <button 
                  onClick={generateKakaoPayPayment} 
                  className="btn btn-primary payment-btn"
                >
                  카카오페이로 결제하기
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="payment-section">
            <h2 className="section-title">결제 정보</h2>
            
            {orderSummary && (
              <div className="order-summary">
                <h3>주문 내역</h3>
                {orderSummary.items.map((item, index) => (
                  <div key={index} className="order-item">
                    <div className="order-item-name">{item.name} × {item.quantity}</div>
                    <div className="order-item-price">{item.subtotal.toLocaleString()}원</div>
                  </div>
                ))}
                <div className="order-total">
                  <div>총 결제금액</div>
                  <div className="order-total-amount">{orderSummary.totalAmount.toLocaleString()}원</div>
                </div>
              </div>
            )}

            {paymentReady && (
              <div className="qr-container">
                <div className="qr-display">
                  <QRCode 
                    value={paymentReady.next_redirect_mobile_url || paymentReady.next_redirect_pc_url || ''} 
                    size={256} 
                  />
                </div>
                <div className="payment-buttons">
                  <button onClick={openKakaoPay} className="btn btn-primary">
                    카카오페이로 결제
                  </button>
                  <button onClick={reset} className="btn btn-secondary">
                    주문 취소
                  </button>
                </div>
                <p className="payment-note">
                  QR 코드를 스캔하거나 버튼을 클릭하여 카카오페이 결제를 진행하세요.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// 메인 App 컴포넌트 - URL 경로에 따라 다른 페이지 렌더링
function App() {
  const path = window.location.pathname;

  if (path === '/payment/success') {
    return <PaymentSuccess />;
  } else if (path === '/payment/cancel') {
    return <PaymentCancel />;
  } else if (path === '/payment/fail') {
    return <PaymentFail />;
  } else {
    return <OrderPage />;
  }
}

export default App;
