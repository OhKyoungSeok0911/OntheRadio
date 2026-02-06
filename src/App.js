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

function App() {
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
        // 이미 장바구니에 있으면 수량 증가
        return prevCart.map(item =>
          item.menuItem.id === menuItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        // 새로 추가
        return [...prevCart, { menuItem, quantity: 1 }];
      }
    });
    setError('');
  };

  // 장바구니에서 수량 변경
  const updateQuantity = (menuItemId, newQuantity) => {
    if (newQuantity <= 0) {
      // 수량이 0 이하면 장바구니에서 제거
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

  // 카카오페이 결제 준비 (백엔드 서버를 통해 호출)
  const generateKakaoPayPayment = async () => {
    if (cart.length === 0) {
      setError('장바구니가 비어있습니다. 메뉴를 선택해주세요.');
      return;
    }

    const totalAmount = calculateTotal();
    const totalQuantity = calculateTotalQuantity();

    // 주문 요약 생성
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
      // 결제 요청 데이터
      const paymentRequestData = {
        cid: 'TC0ONETIME', // 테스트용 가맹점 코드
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

      // 백엔드 서버를 통해 카카오페이 API 호출
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
      
      // 결제 준비 성공
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
        setError('백엔드 서버에 연결할 수 없습니다.\n\n해결 방법:\n1. 백엔드 서버가 실행 중인지 확인하세요\n2. cd server && npm start 명령어로 서버를 시작하세요\n3. 서버가 포트 4000에서 실행 중인지 확인하세요');
      } else {
        setError('결제 정보 생성에 실패했습니다: ' + err.message);
      }
    }
  };

  // 카카오페이 결제 페이지로 이동
  const openKakaoPay = () => {
    if (!paymentReady) return;

    // 카카오페이 결제 준비 API에서 받은 URL로 이동
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (paymentReady.next_redirect_pc_url || paymentReady.next_redirect_mobile_url) {
      // 실제 카카오페이 결제 페이지로 이동
      if (isMobile && paymentReady.next_redirect_mobile_url) {
        window.location.href = paymentReady.next_redirect_mobile_url;
      } else if (paymentReady.next_redirect_pc_url) {
        window.location.href = paymentReady.next_redirect_pc_url;
      } else {
        setError('결제 URL을 받을 수 없습니다. 카카오 비즈프로필 등록 및 가맹점 승인을 확인해주세요.');
      }
    } else {
      // API 호출이 실패한 경우 안내 메시지
      setError('카카오페이 결제 URL을 받지 못했습니다.\n\n가능한 원인:\n1. 비즈프로필이 등록되지 않았습니다\n2. 카카오페이 가맹점 승인이 완료되지 않았습니다\n3. 백엔드 서버를 통해 결제 API를 호출해야 합니다\n\n카카오 비즈프로필 등록 및 가맹점 승인을 완료해주세요.');
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
            {/* 메뉴 선택 영역 */}
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

            {/* 장바구니 영역 */}
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
          /* 결제 QR 코드 및 주문 내역 */
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
                    value={JSON.stringify({
                      type: 'kakaopay_payment',
                      ...paymentReady,
                      payment_url: `https://kakaopay.me/payment?amount=${paymentReady.total_amount}`
                    })} 
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

export default App;
