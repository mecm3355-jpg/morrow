import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStoredAuth } from '../utils/authStorage'
import './AdminPage.css'

const API_URL = import.meta.env.VITE_API_URL || ''

const navigation = [
  { icon: 'grid', label: '대시보드' },
  { icon: 'cart', label: '주문 관리' },
  { icon: 'boxes', label: '상품 관리', path: '/admin/products' },
  { icon: 'users', label: '고객 관리' },
  { icon: 'tag', label: '프로모션' },
  { icon: 'message', label: '리뷰 · 문의', badge: '4' },
  { icon: 'chart', label: '통계' },
]

const categoryColors = ['#5437f5', '#826cf4', '#a29ee9', '#38339b', '#c2baf8']
const dashboardTimestamp = Date.now()
const formattedToday = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
}).format(new Date(dashboardTimestamp))

const iconPaths = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  cart: <><circle cx="9" cy="20" r="1" /><circle cx="19" cy="20" r="1" /><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L21 8H6" /></>,
  boxes: <><path d="m12 2 4.8 2.7L12 7.5 7.2 4.7 12 2Z" /><path d="m6.5 8 4.8 2.7-4.8 2.8L2 10.7 6.5 8Z" /><path d="m17.5 8 4.5 2.7-4.5 2.8-4.8-2.8L17.5 8Z" /><path d="M12 8v5m-5.5.5v5L11 21v-5l-4.5-2.5Zm11 0v5L13 21v-5l4.5-2.5Z" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  tag: <><path d="M20.6 13.6 11 23.2 1.8 14V4.8H11l9.6 9.6a1.4 1.4 0 0 1 0 2Z" transform="scale(.9) translate(1 0)" /><circle cx="7.2" cy="9" r="1.2" /></>,
  message: <path d="M21 15a4 4 0 0 1-4 4H7l-4 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  store: <><path d="M4 10v10h16V10M3 4h18l-1 6a3 3 0 0 1-5 1 3 3 0 0 1-6 0 3 3 0 0 1-5-1L3 4Z" /><path d="M9 20v-6h6v6" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
  download: <><path d="M12 3v12m0 0 4-4m-4 4-4-4" /><path d="M5 17v3h14v-3" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  warning: <><path d="M10.3 3.7 2.2 18a2 2 0 0 0 1.8 3h16a2 2 0 0 0 1.8-3L13.7 3.7a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4m0 4h.01" /></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
  close: <><path d="m6 6 12 12M18 6 6 18" /></>,
}

function Icon({ name, size = 20 }) {
  return (
    <svg className="admin-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {iconPaths[name]}
    </svg>
  )
}

function formatPrice(value) {
  const price = Number(value)
  return Number.isFinite(price) ? `${price.toLocaleString('ko-KR')}원` : '-'
}

function ProductThumb({ src, name = '' }) {
  return <span className="product-thumb" aria-hidden="true">{src ? <img src={src} alt="" /> : <span>{name.charAt(0) || 'M'}</span>}</span>
}

function AdminPage() {
  const navigate = useNavigate()
  const [auth] = useState(getStoredAuth)
  const [activeNav, setActiveNav] = useState('대시보드')
  const [search, setSearch] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function loadDashboard() {
      try {
        const productsResponse = await fetch(`${API_URL}/api/products/all`, { signal: controller.signal })
        const productsData = await productsResponse.json().catch(() => [])
        if (!productsResponse.ok) throw new Error(productsData.message || '상품 현황을 불러오지 못했습니다.')
        setProducts(Array.isArray(productsData) ? productsData : [])
      } catch (requestError) {
        if (requestError.name !== 'AbortError') setError(requestError.message || '대시보드 정보를 불러오지 못했습니다.')
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    loadDashboard()
    return () => controller.abort()
  }, [])

  const stats = useMemo(() => {
    const categories = new Set(products.map((product) => product.category).filter(Boolean))
    const averagePrice = products.length
      ? Math.round(products.reduce((sum, product) => sum + Number(product.price || 0), 0) / products.length)
      : 0
    const catalogValue = products.reduce((sum, product) => sum + Number(product.price || 0), 0)
    return [
      { title: '상품 가격 합계', value: formatPrice(catalogValue), caption: '등록 상품 판매가 합계', featured: true },
      { title: '등록 상품', value: products.length.toLocaleString('ko-KR'), caption: '판매 중인 전체 상품' },
      { title: '카테고리', value: categories.size.toLocaleString('ko-KR'), caption: '현재 운영 카테고리' },
      { title: '평균 판매가', value: formatPrice(averagePrice), caption: '등록 상품 기준' },
    ]
  }, [products])

  const categories = useMemo(() => {
    const counts = new Map()
    products.forEach((product) => counts.set(product.category || '미분류', (counts.get(product.category || '미분류') || 0) + 1))
    return [...counts.entries()].map(([label, count], index) => ({
      label,
      value: products.length ? Math.round((count / products.length) * 100) : 0,
      color: categoryColors[index % categoryColors.length],
    }))
  }, [products])

  const highestPricedProducts = useMemo(
    () => [...products].sort((first, second) => Number(second.price || 0) - Number(first.price || 0)).slice(0, 5),
    [products],
  )
  const recentProducts = products.slice(0, 3)
  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return products
    return products.filter((product) => `${product.name} ${product.category || ''}`.toLowerCase().includes(keyword))
  }, [products, search])

  const handleAction = (message) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2200)
  }

  const goToStorefront = () => {
    setSidebarOpen(false)
    navigate('/')
  }

  return (
    <div className="admin-page">
      <button className="admin-mobile-menu" type="button" aria-label="메뉴 열기" onClick={() => setSidebarOpen(true)}><Icon name="menu" /></button>
      {sidebarOpen && <button className="admin-sidebar-backdrop" type="button" aria-label="메뉴 닫기" onClick={() => setSidebarOpen(false)} />}

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
            <button className={`admin-nav-item${activeNav === item.label ? ' is-active' : ''}`} key={item.label} type="button" onClick={() => { if (item.path) navigate(item.path); else if (item.label !== '대시보드') handleAction(`${item.label} 기능은 준비 중입니다.`); else setActiveNav('대시보드'); setSidebarOpen(false) }}>
              <Icon name={item.icon} /><span>{item.label}</span>{item.badge && <span className="admin-nav-badge">{item.badge}</span>}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <button type="button" onClick={goToStorefront}><Icon name="store" /><span>쇼핑몰 바로가기</span></button>
          <button type="button" onClick={() => handleAction('설정 기능은 준비 중입니다.')}><Icon name="settings" /><span>설정</span></button>
        </div>
      </aside>

      <div className="admin-app">
        <header className="admin-topbar">
          <label className="admin-search">
            <Icon name="search" size={18} />
            <input type="search" placeholder="상품명, 카테고리 검색" value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
          <div className="admin-account-area">
            <button className="admin-notification" type="button" aria-label="알림 1개" onClick={() => handleAction('확인하지 않은 알림이 1개 있습니다.')}><Icon name="bell" size={18} /><span /></button>
            <button className="admin-profile" type="button" onClick={() => handleAction('로그인한 관리자 계정입니다.')}><span className="admin-avatar">{auth?.user?.name?.charAt(0) || '관'}</span><span><strong>{auth?.user?.name || '관리자'}</strong><small>{auth?.user?.email || ''}</small></span></button>
          </div>
        </header>

        <main className="admin-main">
          <section className="admin-heading">
            <div><p>{formattedToday}</p><h1>안녕하세요, 관리자님</h1></div>
            <div className="admin-heading-actions">
              <button className="admin-secondary-button" type="button" onClick={() => handleAction('리포트 다운로드 기능은 준비 중입니다.')}><Icon name="download" size={18} /> 리포트</button>
              <button className="admin-primary-button" type="button" onClick={() => navigate('/admin/products/new')}><Icon name="plus" size={18} /> 상품 등록</button>
            </div>
          </section>

          {isLoading ? <div className="admin-data-state" role="status">상품 정보를 불러오고 있습니다.</div> : null}
          {error ? <div className="admin-data-state is-error" role="alert">{error}</div> : null}

          <section className="admin-stat-grid" aria-label="오늘의 주요 지표">
            {stats.map((stat) => (
              <article className={`admin-stat-card${stat.featured ? ' is-featured' : ''}`} key={stat.title}>
                <p>{stat.title}</p><strong>{stat.value}</strong><span>{stat.caption}</span>
              </article>
            ))}
          </section>

          <section className="admin-overview-grid">
            <article className="admin-card sales-chart-card">
              <div className="admin-card-title-row"><div><h2>상품 운영 현황</h2><strong>{products.length.toLocaleString('ko-KR')}개</strong></div><span>실제 등록 상품 기준</span></div>
              <p className="admin-empty-copy">주문·매출 통계는 주문 기능이 연결된 뒤 이 영역에서 확인할 수 있습니다.</p>
            </article>

            <article className="admin-card admin-category-card">
              <h2>카테고리별 상품 비중</h2>
              <div className="category-stacked-bar" aria-hidden="true">{categories.map((category) => <span key={category.label} style={{ width: `${category.value}%`, background: category.color }} />)}</div>
              <div className="category-list">
                {categories.length ? categories.map((category) => <div key={category.label}><span className="category-dot" style={{ background: category.color }} /><span>{category.label}</span><strong>{category.value}%</strong></div>) : <div><span>등록된 상품이 없습니다.</span></div>}
              </div>
            </article>
          </section>

          <section className="admin-lower-grid">
            <article className="admin-card recent-orders-card">
              <div className="orders-heading"><h2>등록 상품</h2><button type="button" onClick={() => setSearch('')}>전체 보기</button></div>
              <div className="orders-table-wrap">
                <table className="orders-table">
                  <thead><tr><th>상품</th><th>카테고리</th><th>판매가</th></tr></thead>
                  <tbody>
                    {filteredProducts.map((product) => <tr key={product._id}>
                      <td><div className="order-product"><ProductThumb src={product.image} name={product.name} /><span><strong>{product.name}</strong><small>{product._id}</small></span></div></td>
                      <td>{product.category || '미분류'}</td>
                      <td className="order-price">{formatPrice(product.price)}</td>
                    </tr>)}
                  </tbody>
                </table>
                {filteredProducts.length === 0 && <div className="orders-empty">검색 결과가 없습니다.</div>}
              </div>
            </article>

            <div className="admin-side-stack">
              <article className="admin-card top-products-card">
                <h2>가격 상위 상품</h2>
                {highestPricedProducts.length ? <ol className="top-products-list">
                  {highestPricedProducts.map((product, index) => (
                    <li key={product._id}><span className="rank">{index + 1}</span><ProductThumb src={product.image} name={product.name} /><span className="top-product-copy"><strong>{product.name}</strong><small>{product.category || '미분류'}</small></span><b>{formatPrice(product.price)}</b></li>
                  ))}
                </ol> : <p className="admin-empty-copy">등록된 상품이 없습니다.</p>}
              </article>

              <article className="admin-card low-stock-card">
                <h2><Icon name="warning" size={17} /> 최근 등록 상품</h2>
                <div className="low-stock-list">
                  {recentProducts.map((product) => <div className="low-stock-item" key={product._id}><p><strong>{product.name}</strong><b>{formatPrice(product.price)}</b></p><span><i style={{ width: '100%' }} /></span></div>)}
                </div>
                <button type="button" onClick={() => navigate('/admin/products')}>상품 관리로 이동</button>
              </article>
            </div>
          </section>
        </main>
      </div>
      {notice && <div className="admin-toast" role="status">{notice}</div>}
    </div>
  )
}

export default AdminPage
