import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clearStoredAuth, getStoredAuth } from '../../utils/authStorage'
import './AdminPage.css'
import './AdminOrdersPage.css'

const API_URL = import.meta.env.VITE_API_URL || ''
const ORDERS_PER_PAGE = 5

const navigation = [
  { icon: 'dashboard', label: '대시보드', path: '/admin' },
  { icon: 'order', label: '주문 관리', path: '/admin/orders', active: true },
  { icon: 'product', label: '상품 관리', path: '/admin/products' },
  { icon: 'user', label: '고객 관리' },
  { icon: 'megaphone', label: '프로모션' },
  { icon: 'message', label: '리뷰 · 문의' },
  { icon: 'chart', label: '통계' },
]

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

const paymentMethodLabels = {
  card: '신용·체크카드',
  kakaopay: '카카오페이',
  naverpay: '네이버페이',
  vbank: '가상계좌',
  trans: '실시간 계좌이체',
}

const iconPaths = {
  dashboard: <><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v10h13V10M9 20v-6h6v6" /></>,
  order: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" /></>,
  product: <><path d="M6 8h12l1 13H5L6 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
  megaphone: <><path d="m4 13 13-6v10L4 11v2Z" /><path d="M7 14v5h4v-3" /><path d="M20 9v6" /></>,
  message: <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />,
  chart: <><path d="M5 20v-7M10 20V8M15 20V4M20 20H3" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  store: <><path d="M4 10v10h16V10M3 4h18l-1 6a3 3 0 0 1-5 1 3 3 0 0 1-6 0 3 3 0 0 1-5-1L3 4Z" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1A8 8 0 0 0 15 6l-.3-2.6h-4L10.4 6a8 8 0 0 0-1.5.9l-2.4-1-2 3.5 2 1.5a7 7 0 0 0 0 2.1l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 1.5.9l.3 2.6h4l.3-2.6a8 8 0 0 0 1.5-.9l2.4 1 2-3.5-2-1.5a7 7 0 0 0 .1-.9Z" /></>,
}

function Icon({ name, size = 20 }) {
  return (
    <svg className="admin-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {iconPaths[name]}
    </svg>
  )
}

function ProductImage({ product }) {
  const [failed, setFailed] = useState(false)
  const image = product?.image

  if (!image || failed) {
    return <span className="admin-order-product-image is-placeholder" aria-hidden="true">{product?.name?.trim()?.charAt(0) || 'M'}</span>
  }

  return <img className="admin-order-product-image" src={image} alt="" onError={() => setFailed(true)} />
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

function AdminOrdersPage() {
  const navigate = useNavigate()
  const [auth] = useState(getStoredAuth)
  const [orders, setOrders] = useState([])
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 })
  const [activeStatus, setActiveStatus] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [requestVersion, setRequestVersion] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function loadOrders() {
      setIsLoading(true)
      setError('')

      try {
        const query = new URLSearchParams({
          page: String(currentPage),
          limit: String(ORDERS_PER_PAGE),
        })
        if (activeStatus) query.set('status', activeStatus)

        const response = await fetch(`${API_URL}/api/orders/admin?${query.toString()}`, {
          headers: {
            Accept: 'application/json',
            Authorization: `${auth?.tokenType || 'Bearer'} ${auth?.token || ''}`,
          },
          signal: controller.signal,
        })
        const data = await response.json().catch(() => ({}))

        if (response.status === 401) {
          clearStoredAuth()
          navigate('/login', { replace: true, state: { from: '/admin/orders', message: '관리자 로그인이 필요합니다.' } })
          return
        }
        if (response.status === 403) {
          navigate('/', { replace: true, state: { toastMessage: '관리자만 접근할 수 있는 페이지입니다.' } })
          return
        }
        if (!response.ok) throw new Error(data.message || '전체 주문 목록을 불러오지 못했습니다.')

        setOrders(Array.isArray(data.orders) ? data.orders : [])
        setPagination(data.pagination || { page: currentPage, total: 0, totalPages: 1 })
        if (data.pagination?.page && data.pagination.page !== currentPage) {
          setCurrentPage(data.pagination.page)
        }
      } catch (requestError) {
        if (requestError.name !== 'AbortError') {
          setError(requestError.message || '전체 주문 목록을 불러오지 못했습니다.')
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    loadOrders()
    return () => controller.abort()
  }, [activeStatus, auth?.token, auth?.tokenType, currentPage, navigate, requestVersion])

  function selectStatus(status) {
    setActiveStatus(status)
    setCurrentPage(1)
  }

  function showNotice(message) {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2200)
  }

  return (
    <div className="admin-page admin-orders-page">
      <button className="admin-mobile-menu" type="button" aria-label="메뉴 열기" onClick={() => setSidebarOpen(true)}><Icon name="menu" /></button>
      {sidebarOpen ? <button className="admin-sidebar-backdrop" type="button" aria-label="메뉴 닫기" onClick={() => setSidebarOpen(false)} /> : null}

      <aside className={`admin-sidebar${sidebarOpen ? ' is-open' : ''}`}>
        <div className="admin-brand">
          <button className="admin-brand-link" type="button" onClick={() => navigate('/admin')} aria-label="관리자 대시보드로 이동">
            <span className="admin-brand-mark">M</span><strong>morrow.</strong>
          </button>
          <span className="admin-badge">ADMIN</span>
          <button className="admin-sidebar-close" type="button" aria-label="메뉴 닫기" onClick={() => setSidebarOpen(false)}><Icon name="close" /></button>
        </div>
        <nav className="admin-nav" aria-label="관리자 메뉴">
          {navigation.map((item) => (
            <button className={`admin-nav-item${item.active ? ' is-active' : ''}`} key={item.label} type="button" onClick={() => { if (item.path) navigate(item.path); else showNotice(`${item.label} 기능은 준비 중입니다.`); setSidebarOpen(false) }}>
              <Icon name={item.icon} /><span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <button type="button" onClick={() => navigate('/')}><Icon name="store" /><span>쇼핑몰 바로가기</span></button>
          <button type="button" onClick={() => showNotice('설정 기능은 준비 중입니다.')}><Icon name="settings" /><span>설정</span></button>
        </div>
      </aside>

      <div className="admin-app">
        <header className="admin-topbar">
          <div className="admin-orders-topbar-copy"><Icon name="search" size={18} /><span>전체 주문을 상태별로 확인할 수 있습니다.</span></div>
          <div className="admin-account-area">
            <button className="admin-notification" type="button" aria-label="알림 확인" onClick={() => showNotice('새로운 주문을 확인해 주세요.')}><Icon name="bell" size={18} /><span /></button>
            <button className="admin-profile" type="button" onClick={() => showNotice('로그인한 관리자 계정입니다.')}><span className="admin-avatar">{auth?.user?.name?.charAt(0) || '관'}</span><span><strong>{auth?.user?.name || '관리자'}</strong><small>{auth?.user?.email || ''}</small></span></button>
          </div>
        </header>

        <main className="admin-main admin-orders-main">
          <div className="admin-orders-breadcrumb"><button type="button" onClick={() => navigate('/admin')}>관리자</button><span>/</span><strong>주문 관리</strong></div>
          <section className="admin-orders-heading">
            <div><p>ORDER MANAGEMENT</p><h1>주문 관리</h1><span>모든 고객의 주문을 최근 순서대로 확인합니다.</span></div>
            <b><strong>{pagination.total}</strong>개의 주문</b>
          </section>

          <section className="admin-orders-panel" aria-labelledby="admin-orders-list-title">
            <header className="admin-orders-panel-heading">
              <div><span aria-hidden="true">✓</span><div><h2 id="admin-orders-list-title">전체 주문 내역</h2><p>주문 상태에 따라 목록을 빠르게 확인할 수 있어요.</p></div></div>
            </header>

            <div className="admin-orders-tabs" role="tablist" aria-label="주문 상태별 보기">
              {orderStatusTabs.map((tab) => (
                <button className={activeStatus === tab.value ? 'is-active' : ''} type="button" role="tab" aria-selected={activeStatus === tab.value} key={tab.value || 'all'} onClick={() => selectStatus(tab.value)}>
                  {tab.label}
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="admin-orders-state" role="status"><i aria-hidden="true" /><strong>주문 목록을 불러오고 있습니다.</strong><p>잠시만 기다려 주세요.</p></div>
            ) : error ? (
              <div className="admin-orders-state is-error" role="alert"><span aria-hidden="true">!</span><strong>주문 목록을 불러오지 못했습니다.</strong><p>{error}</p><button type="button" onClick={() => setRequestVersion((version) => version + 1)}>다시 시도</button></div>
            ) : orders.length === 0 ? (
              <div className="admin-orders-state"><span aria-hidden="true">M</span><strong>{activeStatus ? `${orderStatusLabels[activeStatus]} 주문이 없습니다.` : '등록된 주문이 없습니다.'}</strong><p>{activeStatus ? '다른 주문 상태를 선택해 확인해 보세요.' : '새 주문이 접수되면 이곳에 표시됩니다.'}</p></div>
            ) : (
              <div className="admin-orders-list">
                {orders.map((order) => (
                  <article className="admin-order-card" key={order._id}>
                    <header>
                      <div><time dateTime={order.createdAt}>{formatOrderDate(order.createdAt)}</time><span>{order.orderNumber}</span></div>
                      <b className={`admin-order-status is-${order.status || 'pending'}`}>{orderStatusLabels[order.status] || '주문 확인 중'}</b>
                    </header>

                    <div className="admin-order-body">
                      <ul className="admin-order-items">
                        {(order.items || []).map((item, index) => {
                          const product = item.product || {}
                          return (
                            <li key={item._id || `${order._id}-${index}`}>
                              <ProductImage product={product} />
                              <div><strong>{product.name || '상품 정보'}</strong><small>{item.selectedOption || '기본 옵션'} · {item.quantity}개</small></div>
                              <b>{formatPrice(item.lineAmount ?? (item.unitPrice * item.quantity))}</b>
                            </li>
                          )
                        })}
                      </ul>

                      <aside className="admin-order-summary">
                        <dl>
                          <div><dt>총 결제 금액</dt><dd>{formatPrice(order.amounts?.totalAmount)}</dd></div>
                          <div><dt>주문자</dt><dd>{order.user?.name || '탈퇴한 회원'}</dd></div>
                          <div><dt>이메일</dt><dd>{order.user?.email || '-'}</dd></div>
                          <div><dt>받는 분</dt><dd>{order.shippingAddress?.recipientName || '-'}</dd></div>
                          <div><dt>결제 수단</dt><dd>{paymentMethodLabels[order.payment?.payMethod] || order.payment?.payMethod || '-'}</dd></div>
                          <div><dt>배송지</dt><dd>{order.shippingAddress ? `${order.shippingAddress.address1 || ''} ${order.shippingAddress.address2 || ''}`.trim() : '-'}</dd></div>
                        </dl>
                      </aside>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {!isLoading && !error && pagination.totalPages > 1 ? (
              <nav className="admin-orders-pagination" aria-label="전체 주문 페이지">
                <button type="button" disabled={pagination.page <= 1} onClick={() => setCurrentPage(pagination.page - 1)}>이전</button>
                <span><strong>{pagination.page}</strong> / {pagination.totalPages}</span>
                <button type="button" disabled={pagination.page >= pagination.totalPages} onClick={() => setCurrentPage(pagination.page + 1)}>다음</button>
              </nav>
            ) : null}
          </section>
        </main>
      </div>

      {notice ? <div className="admin-toast" role="status">{notice}</div> : null}
    </div>
  )
}

export default AdminOrdersPage
