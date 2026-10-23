import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AnnouncementBar from '../components/AnnouncementBar'
import Header from '../components/Header'
import { clearStoredAuth, getStoredAuth } from '../utils/authStorage'
import './MyOrdersPage.css'

const API_URL = import.meta.env.VITE_API_URL || ''
const ORDERS_PER_PAGE = 5

const orderStatusLabels = {
  pending: '주문 접수',
  confirmed: '결제 완료',
  preparing: '상품 준비 중',
  shipped: '배송 중',
  delivered: '배송 완료',
  cancelled: '주문 취소',
}

const orderStatusTabs = [
  { value: '', label: '전체' },
  ...Object.entries(orderStatusLabels).map(([value, label]) => ({ value, label })),
]

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

function MyOrdersPage() {
  const navigate = useNavigate()
  const [auth, setAuth] = useState(getStoredAuth)
  const [orders, setOrders] = useState([])
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 })
  const [activeStatus, setActiveStatus] = useState('')
  const [requestedPage, setRequestedPage] = useState(1)
  const [reloadCount, setReloadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!auth?.token) {
      navigate('/login', {
        replace: true,
        state: { from: '/orders', message: '주문 목록을 확인하려면 로그인해 주세요.' },
      })
      return undefined
    }

    const controller = new AbortController()

    async function loadOrders() {
      setIsLoading(true)
      setError('')

      try {
        const searchParams = new URLSearchParams({
          page: String(requestedPage),
          limit: String(ORDERS_PER_PAGE),
        })
        if (activeStatus) searchParams.set('status', activeStatus)

        const response = await fetch(
          `${API_URL}/api/orders?${searchParams.toString()}`,
          {
            headers: {
              Accept: 'application/json',
              Authorization: `${auth.tokenType || 'Bearer'} ${auth.token}`,
            },
            signal: controller.signal,
          },
        )
        const data = await response.json().catch(() => ({}))

        if (response.status === 401) {
          clearStoredAuth()
          setAuth(null)
          navigate('/login', {
            replace: true,
            state: { from: '/orders', message: '로그인 정보가 만료되었습니다. 다시 로그인해 주세요.' },
          })
          return
        }

        if (!response.ok) throw new Error(data.message || '주문 목록을 불러오지 못했습니다.')
        setOrders(Array.isArray(data.orders) ? data.orders : [])
        setPagination(data.pagination || { page: requestedPage, total: 0, totalPages: 1 })
      } catch (requestError) {
        if (requestError.name !== 'AbortError') {
          setError(requestError.message || '주문 목록을 불러오지 못했습니다.')
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    loadOrders()
    return () => controller.abort()
  }, [activeStatus, auth, navigate, reloadCount, requestedPage])

  function selectStatus(status) {
    setActiveStatus(status)
    setRequestedPage(1)
  }

  function handleLogout() {
    clearStoredAuth()
    setAuth(null)
    navigate('/')
  }

  return (
    <div className="page my-orders-page">
      <AnnouncementBar />
      <Header user={auth?.user || null} onLogout={handleLogout} />

      <main>
        <nav className="my-orders-breadcrumb" aria-label="현재 위치">
          <Link to="/">홈</Link><span>›</span><strong>내 주문</strong>
        </nav>

        <header className="my-orders-heading">
          <div>
            <p>MY ORDERS</p>
            <h1>내 주문 목록</h1>
          </div>
          <span><strong>{pagination.total}</strong>개의 주문</span>
        </header>

        <section className="my-orders-panel" aria-labelledby="my-orders-list-title">
          <div className="my-orders-panel-heading">
            <div>
              <span aria-hidden="true">✓</span>
              <div><h2 id="my-orders-list-title">주문 내역</h2><p>최근 주문부터 순서대로 확인할 수 있어요.</p></div>
            </div>
            <Link to="/#products">쇼핑 계속하기</Link>
          </div>

          <div className="my-orders-status-tabs" role="tablist" aria-label="주문 상태별 보기">
            {orderStatusTabs.map((tab) => (
              <button
                className={activeStatus === tab.value ? 'is-active' : ''}
                type="button"
                role="tab"
                aria-selected={activeStatus === tab.value}
                key={tab.value || 'all'}
                onClick={() => selectStatus(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="my-orders-state" role="status">
              <i aria-hidden="true" />
              <strong>주문 목록을 불러오고 있습니다.</strong>
              <p>잠시만 기다려 주세요.</p>
            </div>
          ) : error ? (
            <div className="my-orders-state is-error" role="alert">
              <span aria-hidden="true">!</span>
              <strong>주문 목록을 불러오지 못했습니다.</strong>
              <p>{error}</p>
              <button type="button" onClick={() => setReloadCount((count) => count + 1)}>다시 시도</button>
            </div>
          ) : orders.length === 0 ? (
            <div className="my-orders-state is-empty">
              <span aria-hidden="true">M</span>
              <strong>{activeStatus ? `${orderStatusLabels[activeStatus]} 주문이 없어요.` : '아직 주문 내역이 없어요.'}</strong>
              <p>{activeStatus ? '다른 주문 상태를 선택해 확인해 보세요.' : '마음에 드는 상품을 둘러보고 첫 주문을 시작해 보세요.'}</p>
              <Link to="/#products">상품 둘러보기</Link>
            </div>
          ) : (
            <div className="my-orders-list">
              {orders.map((order) => (
                <article className="my-order-card" key={order._id}>
                  <header>
                    <div>
                      <time dateTime={order.createdAt}>{formatOrderDate(order.createdAt)}</time>
                      <span>{order.orderNumber}</span>
                    </div>
                    <b className={`my-order-status is-${order.status || 'pending'}`}>
                      {orderStatusLabels[order.status] || '주문 확인 중'}
                    </b>
                  </header>

                  <div className="my-order-body">
                    <ul className="my-order-items">
                      {(order.items || []).map((item, index) => {
                        const product = item.product || {}
                        return (
                          <li key={item._id || `${order._id}-${index}`}>
                            <div className="my-order-image">
                              {product.image ? <img src={product.image} alt="" /> : <span aria-hidden="true">M</span>}
                            </div>
                            <div>
                              <strong>{product.name || '상품 정보'}</strong>
                              <small>{item.selectedOption || '기본 옵션'} · {item.quantity}개</small>
                            </div>
                            <b>{formatPrice(item.lineAmount ?? (item.unitPrice * item.quantity))}</b>
                          </li>
                        )
                      })}
                    </ul>

                    <aside className="my-order-summary">
                      <dl>
                        <div><dt>총 결제 금액</dt><dd>{formatPrice(order.amounts?.totalAmount)}</dd></div>
                        <div><dt>받는 분</dt><dd>{order.shippingAddress?.recipientName || '-'}</dd></div>
                        <div><dt>배송지</dt><dd>{order.shippingAddress ? `${order.shippingAddress.address1 || ''} ${order.shippingAddress.address2 || ''}`.trim() : '-'}</dd></div>
                      </dl>
                      <Link to={`/order/result/${order._id}`}>주문 상세 보기 <span aria-hidden="true">›</span></Link>
                    </aside>
                  </div>
                </article>
              ))}
            </div>
          )}

          {!isLoading && !error && pagination.totalPages > 1 ? (
            <nav className="my-orders-pagination" aria-label="주문 목록 페이지">
              <button type="button" disabled={pagination.page <= 1} onClick={() => setRequestedPage(pagination.page - 1)}>이전</button>
              <span><strong>{pagination.page}</strong> / {pagination.totalPages}</span>
              <button type="button" disabled={pagination.page >= pagination.totalPages} onClick={() => setRequestedPage(pagination.page + 1)}>다음</button>
            </nav>
          ) : null}
        </section>
      </main>
    </div>
  )
}

export default MyOrdersPage
