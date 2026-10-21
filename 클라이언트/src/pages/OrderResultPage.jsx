import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import AnnouncementBar from '../components/AnnouncementBar'
import Header from '../components/Header'
import { clearStoredAuth, getStoredAuth } from '../utils/authStorage'
import './OrderResultPage.css'

const API_URL = import.meta.env.VITE_API_URL || ''

const paymentMethodLabels = {
  card: '신용·체크카드',
  kakaopay: '카카오페이',
  naverpay: '네이버페이',
  vbank: '가상계좌',
  trans: '실시간 계좌이체',
}

function formatPrice(value) {
  const price = Number(value)
  return Number.isFinite(price) ? `${price.toLocaleString('ko-KR')}원` : '-'
}

function formatOrderDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function OrderResultPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { orderId } = useParams()
  const auth = getStoredAuth()
  const [order, setOrder] = useState(() => location.state?.order || null)
  const [isLoadingOrder, setIsLoadingOrder] = useState(() => Boolean(orderId && !location.state?.order))
  const [loadError, setLoadError] = useState('')
  const isSuccess = Boolean(order)
  const paymentApproved = Boolean(location.state?.paymentApproved)
  const isVirtualBank = order?.payment?.status === 'ready'
  const shippingAddress = order?.shippingAddress
    ? `${order.shippingAddress.address1 || ''} ${order.shippingAddress.address2 || ''}`.trim()
    : '-'
  const failureMessage = loadError || location.state?.message || '주문 결과를 확인할 수 없습니다. 장바구니에서 다시 시도해 주세요.'
  const receiptUrl = order?.payment?.receiptUrl?.startsWith('https://') ? order.payment.receiptUrl : ''

  useEffect(() => {
    if (!orderId) return undefined
    const controller = new AbortController()

    async function loadOrder() {
      if (order?._id === orderId) return

      if (!auth?.token) {
        setOrder(null)
        setLoadError('주문 내역을 확인하려면 로그인해 주세요.')
        setIsLoadingOrder(false)
        return
      }

      setOrder(null)
      setIsLoadingOrder(true)
      setLoadError('')

      try {
        const response = await fetch(`${API_URL}/api/orders/${orderId}`, {
          headers: {
            Accept: 'application/json',
            Authorization: `${auth.tokenType || 'Bearer'} ${auth.token}`,
          },
          signal: controller.signal,
        })
        const data = await response.json().catch(() => ({}))
        if (response.status === 401) clearStoredAuth()
        if (!response.ok) throw new Error(data.message || '주문 정보를 다시 불러오지 못했습니다.')
        setOrder(data)
      } catch (error) {
        if (error.name !== 'AbortError') {
          setLoadError(error.message || '주문 정보를 다시 불러오지 못했습니다.')
        }
      } finally {
        if (!controller.signal.aborted) setIsLoadingOrder(false)
      }
    }

    loadOrder()
    return () => controller.abort()
  }, [auth?.token, auth?.tokenType, order?._id, orderId])

  function handleLogout() {
    clearStoredAuth()
    navigate('/')
  }

  if (isLoadingOrder && !order) {
    return (
      <div className="page order-result-page is-loading">
        <AnnouncementBar />
        <Header user={auth?.user || null} onLogout={handleLogout} />
        <main className="order-result-loading" role="status">
          <span aria-hidden="true" />
          <strong>주문 정보를 확인하고 있습니다.</strong>
          <p>잠시만 기다려 주세요.</p>
        </main>
      </div>
    )
  }

  return (
    <div className={`page order-result-page ${isSuccess ? 'is-success' : 'is-failure'}`}>
      <AnnouncementBar />
      <Header user={auth?.user || null} onLogout={handleLogout} />

      <main>
        <nav className="order-result-breadcrumb" aria-label="현재 위치">
          <Link to="/">홈</Link><span>›</span><Link to="/order">주문/결제</Link><span>›</span><strong>{isSuccess ? '주문 완료' : '주문 실패'}</strong>
        </nav>

        <header className="order-result-heading">
          <p>{isSuccess ? 'ORDER COMPLETE' : 'ORDER FAILED'}</p>
          <h1>{isSuccess ? '주문 완료' : '주문 실패'}</h1>
        </header>

        <ol className="order-result-progress" aria-label="주문 단계">
          <li className="is-complete"><span aria-hidden="true">✓</span><strong>01 장바구니</strong></li>
          <li className="is-complete"><span aria-hidden="true">✓</span><strong>02 주문/결제</strong></li>
          <li className={isSuccess ? 'is-active' : 'is-failed'} aria-current="step"><span>{isSuccess ? '03' : '!'}</span><strong>{isSuccess ? '주문 완료' : '주문 실패'}</strong></li>
        </ol>

        <section className="order-result-card" aria-labelledby="order-result-title">
          <div className="order-result-icon" aria-hidden="true">{isSuccess ? '✓' : '!'}</div>
          <h2 id="order-result-title">
            {isSuccess
              ? (isVirtualBank ? '주문이 접수되었습니다' : '주문이 완료되었습니다')
              : '주문을 완료하지 못했습니다'}
          </h2>
          <p className="order-result-description">
            {isSuccess
              ? (isVirtualBank ? '가상계좌 입금이 확인되면 주문 처리가 시작됩니다.' : '주문해 주셔서 감사합니다.')
              : failureMessage}
          </p>

          {isSuccess ? (
            <dl className="order-result-details">
              <div><dt>주문번호</dt><dd>{order.orderNumber}</dd></div>
              <div><dt>주문 일시</dt><dd>{formatOrderDate(order.createdAt)}</dd></div>
              <div><dt>결제 금액</dt><dd className="is-price">{formatPrice(order.amounts?.totalAmount)}</dd></div>
              <div><dt>결제 수단</dt><dd>{paymentMethodLabels[order.payment?.payMethod] || order.payment?.payMethod || '-'}</dd></div>
              <div><dt>배송지</dt><dd>{shippingAddress}</dd></div>
            </dl>
          ) : (
            <div className="order-result-error" role="alert">
              {paymentApproved
                ? '결제는 승인되었을 수 있습니다. 중복 결제하지 말고 관리자에게 문의해 주세요.'
                : '입력한 주문 정보를 확인한 후 다시 시도해 주세요.'}
            </div>
          )}

          {isSuccess && order.items?.length ? (
            <section className="order-result-items" aria-labelledby="order-result-items-title">
              <header><h3 id="order-result-items-title">주문 상품</h3><span>{order.items.length}종</span></header>
              <ul>
                {order.items.map((item, index) => {
                  const itemProduct = item.product || {}
                  return (
                    <li key={item._id || `${itemProduct._id || 'product'}-${index}`}>
                      <div className="order-result-item-image">
                        {itemProduct.image ? <img src={itemProduct.image} alt="" /> : <span aria-hidden="true">M</span>}
                      </div>
                      <div className="order-result-item-copy">
                        <strong>{itemProduct.name || '상품 정보'}</strong>
                        <small>{item.selectedOption || '기본 옵션'} · {item.quantity}개</small>
                      </div>
                      <b>{formatPrice(item.lineAmount ?? (item.unitPrice * item.quantity))}</b>
                    </li>
                  )
                })}
              </ul>
            </section>
          ) : null}

          <div className="order-result-actions">
            <Link className="is-primary" to={isSuccess || paymentApproved ? '/' : '/order'}>
              {isSuccess ? '쇼핑 계속하기' : (paymentApproved ? '홈으로 이동' : '다시 시도하기')}
            </Link>
            {receiptUrl
              ? <a className="is-secondary" href={receiptUrl} target="_blank" rel="noreferrer">결제 영수증</a>
              : <Link className="is-secondary" to={isSuccess ? '/' : '/cart'}>{isSuccess ? '홈으로 이동' : '장바구니 보기'}</Link>}
          </div>

          <p className="order-result-note">
            <span aria-hidden="true">{isSuccess ? '●' : '◆'}</span>
            {isSuccess ? '배송이 시작되면 알림으로 안내해 드릴게요.' : '문제가 계속되면 잠시 후 다시 시도해 주세요.'}
          </p>
        </section>
      </main>
    </div>
  )
}

export default OrderResultPage
