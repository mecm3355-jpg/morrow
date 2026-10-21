import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AnnouncementBar from '../components/AnnouncementBar'
import Header from '../components/Header'
import { clearStoredAuth, getStoredAuth } from '../utils/authStorage'
import './OrderPage.css'

const API_URL = import.meta.env.VITE_API_URL || ''
const PORTONE_MERCHANT_CODE = (import.meta.env.VITE_PORTONE_MERCHANT_CODE || '').trim()
const MIN_PAYMENT_AMOUNT = 10

const paymentRequestOptions = {
  card: { pg: 'html5_inicis', pay_method: 'card' },
  kakao: { pg: 'kakaopay', pay_method: 'card' },
  naver: { pg: 'naverpay', pay_method: 'card' },
  bank: { pg: 'html5_inicis', pay_method: 'vbank' },
}

const paymentMethods = [
  { id: 'card', icon: '▣', label: '신용·체크카드' },
  { id: 'kakao', icon: 'pay', label: '카카오페이' },
  { id: 'naver', icon: 'N', label: '네이버페이' },
  { id: 'bank', icon: '▥', label: '무통장입금' },
]

function formatPrice(value) {
  const price = Number(value)
  return Number.isFinite(price) ? `${price.toLocaleString('ko-KR')}원` : '-'
}

function OrderPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const addressInputRef = useRef(null)
  const portOneInitializedRef = useRef('')
  const [auth, setAuth] = useState(getStoredAuth)
  const [cart, setCart] = useState(() => location.state?.cart || null)
  const [isLoading, setIsLoading] = useState(() => !location.state?.cart)
  const [loadError, setLoadError] = useState('')
  const [formError, setFormError] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [isPaying, setIsPaying] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [paymentConfiguration, setPaymentConfiguration] = useState(() => (
    PORTONE_MERCHANT_CODE
      ? { status: 'checking', message: '결제 설정을 확인하고 있습니다.' }
      : { status: 'error', message: 'VITE_PORTONE_MERCHANT_CODE가 설정되지 않았습니다.' }
  ))
  const [delivery, setDelivery] = useState(() => ({
    recipientName: getStoredAuth()?.user?.name || '',
    phone: '',
    postalCode: '',
    address1: '',
    address2: '',
    deliveryMemo: '문 앞에 놓아주세요',
  }))

  useEffect(() => {
    if (!auth?.token) return undefined
    if (!PORTONE_MERCHANT_CODE) return undefined

    const controller = new AbortController()

    async function verifyPaymentConfiguration() {
      try {
        await Promise.resolve()
        if (controller.signal.aborted) return
        setPaymentConfiguration({ status: 'checking', message: '결제 설정을 확인하고 있습니다.' })

        const { IMP } = window
        if (!IMP) {
          throw new Error('결제 모듈을 불러오지 못했습니다. 잠시 후 새로고침해 주세요.')
        }

        const response = await fetch(
          `${API_URL}/api/orders/payment-config?merchantCode=${encodeURIComponent(PORTONE_MERCHANT_CODE)}`,
          {
            headers: {
              Accept: 'application/json',
              Authorization: `${auth.tokenType || 'Bearer'} ${auth.token}`,
            },
            signal: controller.signal,
          },
        )
        const data = await response.json().catch(() => ({}))

        if (response.status === 401) clearStoredAuth()
        if (!response.ok || !data.ready || data.merchantCode !== PORTONE_MERCHANT_CODE) {
          throw new Error(data.message || '포트원 결제 설정을 확인하지 못했습니다.')
        }

        if (portOneInitializedRef.current !== data.merchantCode) {
          IMP.init(data.merchantCode)
          portOneInitializedRef.current = data.merchantCode
        }
        setPaymentConfiguration({ status: 'ready', message: '' })
      } catch (error) {
        if (error.name !== 'AbortError') {
          setPaymentConfiguration({
            status: 'error',
            message: error.message || '포트원 결제 설정을 확인하지 못했습니다.',
          })
        }
      }
    }

    verifyPaymentConfiguration()
    return () => controller.abort()
  }, [auth?.token, auth?.tokenType])

  useEffect(() => {
    if (!auth?.token) {
      navigate('/login', {
        replace: true,
        state: { from: '/order', message: '주문하려면 로그인해 주세요.' },
      })
      return undefined
    }

    const controller = new AbortController()

    async function loadCart() {
      try {
        const response = await fetch(`${API_URL}/api/cart`, {
          headers: {
            Accept: 'application/json',
            Authorization: `${auth.tokenType || 'Bearer'} ${auth.token}`,
          },
          signal: controller.signal,
        })
        const data = await response.json().catch(() => ({}))

        if (response.status === 401) {
          clearStoredAuth()
          setAuth(null)
          navigate('/login', {
            replace: true,
            state: { from: '/order', message: '로그인 정보가 만료되었습니다. 다시 로그인해 주세요.' },
          })
          return
        }

        if (!response.ok) throw new Error(data.message || '주문 상품을 불러오지 못했습니다.')
        setCart(data)
        setLoadError('')
      } catch (error) {
        if (error.name !== 'AbortError') {
          setLoadError(error.message || '주문 상품을 불러오지 못했습니다.')
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    loadCart()
    return () => controller.abort()
  }, [auth, navigate])

  function updateDelivery(event) {
    const { name, value } = event.target
    setDelivery((current) => ({ ...current, [name]: value }))
    if (formError) setFormError('')
  }

  function handleLogout() {
    clearStoredAuth()
    setAuth(null)
    navigate('/')
  }

  function showOrderFailure(message, paymentApproved = false) {
    navigate('/order/result', {
      replace: true,
      state: {
        result: 'failure',
        message: message || '주문 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
        paymentApproved,
      },
    })
  }

  async function createOrder(paymentResponse) {
    const response = await fetch(`${API_URL}/api/orders`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `${auth.tokenType || 'Bearer'} ${auth.token}`,
      },
      body: JSON.stringify({
        imp_uid: paymentResponse.imp_uid,
        merchant_uid: paymentResponse.merchant_uid,
        merchantCode: PORTONE_MERCHANT_CODE,
        items: items.map((item) => ({
          productId: item.product?._id || item.product,
          selectedOption: item.selectedOption || '',
          quantity: item.quantity,
        })),
        shippingAddress: {
          recipientName: delivery.recipientName.trim(),
          phone: delivery.phone.trim(),
          postalCode: delivery.postalCode.trim(),
          address1: delivery.address1.trim(),
          address2: delivery.address2.trim(),
        },
        deliveryMemo: delivery.deliveryMemo,
      }),
    })
    const data = await response.json().catch(() => ({}))

    if (response.status === 401) clearStoredAuth()
    if (!response.ok) throw new Error(data.message || '주문을 생성하지 못했습니다.')

    try {
      const clearCartResponse = await fetch(`${API_URL}/api/cart`, {
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
          Authorization: `${auth.tokenType || 'Bearer'} ${auth.token}`,
        },
      })
      if (clearCartResponse.ok) window.dispatchEvent(new Event('cart:updated'))
    } catch {
      // 주문은 이미 생성되었으므로 장바구니 정리 실패가 결과에 영향을 주지 않게 합니다.
    }

    navigate(`/order/result/${data._id}`, {
      replace: true,
      state: { result: 'success', order: data },
    })
  }

  function handleSubmit(event) {
    event.preventDefault()
    const requiredFields = ['recipientName', 'phone', 'postalCode', 'address1']
    const hasEmptyField = requiredFields.some((field) => !delivery[field].trim())

    if (hasEmptyField) {
      setFormError('배송 정보를 모두 입력해 주세요.')
      return
    }
    if (!agreed) {
      setFormError('주문 내용 확인 및 결제 동의가 필요합니다.')
      return
    }

    if (paymentConfiguration.status !== 'ready') {
      setFormError(paymentConfiguration.message || '결제 설정을 먼저 확인해 주세요.')
      return
    }

    const { IMP } = window

    if (!IMP) {
      setFormError('결제 모듈을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')
      return
    }

    if (paymentTotal < MIN_PAYMENT_AMOUNT) {
      setFormError(`최소 결제 금액은 ${formatPrice(MIN_PAYMENT_AMOUNT)}입니다. 상품 가격을 확인해 주세요.`)
      return
    }

    setFormError('')
    setIsPaying(true)

    const firstProductName = items[0]?.product?.name || 'MORROW 상품'
    const orderName = items.length > 1
      ? `${firstProductName} 외 ${items.length - 1}건`
      : firstProductName

    try {
      IMP.request_pay({
        ...paymentRequestOptions[paymentMethod],
        merchant_uid: `order_${window.crypto.randomUUID()}`,
        name: orderName,
        amount: paymentTotal,
        buyer_email: auth?.user?.email || '',
        buyer_name: delivery.recipientName.trim(),
        buyer_tel: delivery.phone.trim(),
        buyer_postcode: delivery.postalCode.trim(),
        buyer_addr: `${delivery.address1.trim()} ${delivery.address2.trim()}`.trim(),
      }, async (response) => {
        setIsPaying(false)

        if (response.success === false || !response.imp_uid || !response.merchant_uid) {
          showOrderFailure(response.error_msg || '결제가 취소되었거나 실패했습니다.')
          return
        }

        try {
          await createOrder(response)
        } catch (error) {
          showOrderFailure(error.message || '주문을 생성하지 못했습니다.', true)
        }
      })
    } catch {
      setIsPaying(false)
      showOrderFailure('결제를 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    }
  }

  const items = cart?.items || []
  const itemAmount = Number(cart?.summary?.currentTotalPrice) || 0
  const discountAmount = 0
  const paymentTotal = itemAmount - discountAmount

  return (
    <div className="page order-page">
      <AnnouncementBar />
      <Header user={auth?.user || null} onLogout={handleLogout} />

      <main>
        <nav className="order-breadcrumb" aria-label="현재 위치">
          <Link to="/">홈</Link><span>›</span><Link to="/cart">장바구니</Link><span>›</span><strong>주문/결제</strong>
        </nav>

        <header className="order-heading">
          <p>CHECKOUT</p>
          <h1>주문/결제</h1>
        </header>

        <ol className="order-progress" aria-label="주문 단계">
          <li className="is-complete"><span aria-hidden="true">✓</span><strong>01 장바구니</strong></li>
          <li className="is-active" aria-current="step"><span>02</span><strong>주문/결제</strong></li>
          <li><span>03</span><strong>주문 완료</strong></li>
        </ol>

        {isLoading ? (
          <section className="order-state" role="status"><i /><strong>주문 상품을 불러오고 있습니다.</strong></section>
        ) : loadError && !cart ? (
          <section className="order-state is-error"><span>!</span><h2>주문 상품을 불러오지 못했어요</h2><p>{loadError}</p><Link to="/cart">장바구니로 돌아가기</Link></section>
        ) : !items.length ? (
          <section className="order-state"><span>0</span><h2>주문할 상품이 없어요</h2><p>장바구니에 상품을 담은 후 다시 시도해 주세요.</p><Link to="/cart">장바구니로 돌아가기</Link></section>
        ) : (
          <form className="order-layout" onSubmit={handleSubmit}>
            <div className="order-content">
              <section className="order-card order-products" aria-labelledby="order-products-title">
                <div className="order-card-heading"><h2 id="order-products-title">주문 상품</h2><Link to="/cart">변경</Link></div>
                <div className="order-product-list">
                  {items.map((item) => {
                    const product = item.product || {}
                    return (
                      <article className="order-product" key={item._id}>
                        <div className="order-product-image"><img src={product.image} alt={product.name || '상품 이미지'} /></div>
                        <div className="order-product-copy">
                          <h3>{product.name || '판매 중지된 상품'}</h3>
                          <p>{item.selectedOption || '기본 옵션'} · {item.quantity}개</p>
                          <strong>{formatPrice(item.currentLineTotal)}</strong>
                        </div>
                        <span>수량 <strong>{item.quantity}</strong></span>
                      </article>
                    )
                  })}
                </div>
              </section>

              <section className="order-card order-delivery" aria-labelledby="order-delivery-title">
                <h2 id="order-delivery-title">배송 정보</h2>
                <div className="order-fields">
                  <label><span>받는 분</span><input name="recipientName" value={delivery.recipientName} onChange={updateDelivery} autoComplete="name" placeholder="이름을 입력해 주세요" /></label>
                  <label><span>연락처</span><input name="phone" type="tel" value={delivery.phone} onChange={updateDelivery} autoComplete="tel" placeholder="010-0000-0000" /></label>
                  <div className="order-address-row">
                    <span>배송지</span>
                    <div>
                      <div className="order-postcode"><input name="postalCode" value={delivery.postalCode} onChange={updateDelivery} autoComplete="postal-code" placeholder="우편번호" /><button type="button" onClick={() => addressInputRef.current?.focus()}>주소 찾기</button></div>
                      <input ref={addressInputRef} name="address1" value={delivery.address1} onChange={updateDelivery} autoComplete="address-line1" placeholder="기본 주소를 입력해 주세요" />
                      <input name="address2" value={delivery.address2} onChange={updateDelivery} autoComplete="address-line2" placeholder="상세 주소를 입력해 주세요" />
                    </div>
                  </div>
                  <label><span>배송 요청사항</span><select name="deliveryMemo" value={delivery.deliveryMemo} onChange={updateDelivery}><option>문 앞에 놓아주세요</option><option>경비실에 맡겨주세요</option><option>배송 전에 연락해 주세요</option><option value="">요청사항 없음</option></select></label>
                </div>
              </section>

              <section className="order-card order-payment" aria-labelledby="order-payment-title">
                <h2 id="order-payment-title">결제 수단</h2>
                <div className="payment-methods">
                  {paymentMethods.map((method) => (
                    <label className={paymentMethod === method.id ? 'is-selected' : ''} key={method.id}>
                      <input type="radio" name="paymentMethod" value={method.id} checked={paymentMethod === method.id} onChange={(event) => setPaymentMethod(event.target.value)} />
                      <i className={`payment-icon payment-icon-${method.id}`} aria-hidden="true">{method.icon}</i>
                      <span>{method.label}</span><b aria-hidden="true" />
                    </label>
                  ))}
                </div>
                {paymentMethod === 'card' ? <div className="card-options"><select aria-label="카드사 선택" defaultValue=""><option value="" disabled>카드사 선택</option><option>신한카드</option><option>KB국민카드</option><option>삼성카드</option><option>현대카드</option></select><select aria-label="할부 기간" defaultValue="일시불"><option>일시불</option><option>2개월</option><option>3개월</option><option>6개월</option></select></div> : <p className="payment-helper">결제하기 버튼을 누르면 선택한 결제 서비스로 이동합니다.</p>}
              </section>
            </div>

            <aside className="order-summary">
              <h2>결제 금액</h2>
              <dl>
                <div><dt>상품 금액</dt><dd>{formatPrice(itemAmount)}</dd></div>
                <div><dt>할인 금액</dt><dd className="order-discount">{discountAmount ? `-${formatPrice(discountAmount)}` : '0원'}</dd></div>
              </dl>
              <div className="order-summary-total"><span>총 결제 금액</span><strong>{formatPrice(paymentTotal)}</strong></div>
              <label className="order-agreement"><input type="checkbox" checked={agreed} onChange={(event) => { setAgreed(event.target.checked); setFormError('') }} /><span aria-hidden="true">✓</span><em>주문 내용을 확인했으며, 결제에 동의합니다.</em></label>
              {paymentConfiguration.status === 'error'
                ? <p className="order-form-error" role="alert">{paymentConfiguration.message}</p>
                : (formError ? <p className="order-form-error" role="alert">{formError}</p> : null)}
              <button type="submit" disabled={isPaying || paymentConfiguration.status !== 'ready'} aria-busy={isPaying || paymentConfiguration.status === 'checking'}>
                {paymentConfiguration.status === 'checking'
                  ? '결제 설정 확인 중...'
                  : (paymentConfiguration.status === 'error'
                      ? '결제 설정 확인 필요'
                      : (isPaying ? '결제창 여는 중...' : `${formatPrice(paymentTotal)} 결제하기`))}
              </button>
              <p className="order-safe"><span aria-hidden="true">▣</span> 안전한 결제를 위해 정보는 암호화됩니다.</p>
            </aside>
          </form>
        )}
      </main>
    </div>
  )
}

export default OrderPage
