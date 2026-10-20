import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './AdminPage.css'

const navigation = [
  { icon: 'grid', label: '대시보드' },
  { icon: 'cart', label: '주문 관리', badge: '12' },
  { icon: 'boxes', label: '상품 관리', path: '/admin/products' },
  { icon: 'users', label: '고객 관리' },
  { icon: 'tag', label: '프로모션' },
  { icon: 'message', label: '리뷰 · 문의', badge: '4' },
  { icon: 'chart', label: '통계' },
]

const stats = [
  { title: '오늘 매출', value: '4,862,000원', change: '+12.4%', direction: 'up', featured: true },
  { title: '신규 주문', value: '128', change: '+8.1%', direction: 'up' },
  { title: '방문자', value: '9,430', change: '-3.2%', direction: 'down' },
  { title: '전환율', value: '3.6%', change: '+0.4%', direction: 'up' },
]

const categories = [
  { label: '리빙', value: 38, color: '#5437f5' },
  { label: '키친', value: 27, color: '#826cf4' },
  { label: '향', value: 21, color: '#a29ee9' },
  { label: '데스크', value: 14, color: '#38339b' },
]

const orders = [
  { id: 'MR-240518', type: 'lamp', product: '프로스티드 머쉬룸 램프', quantity: 1, customer: '김서연', price: '129,000원', status: '결제완료', statusClass: 'paid', date: '10.20' },
  { id: 'MR-240517', type: 'mug', product: '핸드메이드 세라믹 머그', quantity: 2, customer: '이도윤', price: '64,000원', status: '배송준비', statusClass: 'ready', date: '10.20' },
  { id: 'MR-240516', type: 'candle', product: '라벤더 소이 캔들 220g', quantity: 3, customer: '박지민', price: '114,000원', status: '배송중', statusClass: 'shipping', date: '10.19' },
  { id: 'MR-240515', type: 'blanket', product: '와플 코튼 블랭킷', quantity: 1, customer: '최하은', price: '89,000원', status: '배송완료', statusClass: 'done', date: '10.19' },
  { id: 'MR-240514', type: 'tray', product: '오크 라운드 트레이 세트', quantity: 1, customer: '정우진', price: '58,000원', status: '취소요청', statusClass: 'cancel', date: '10.18' },
  { id: 'MR-240513', type: 'diffuser', product: '모닝 미스트 디퓨저 200ml', quantity: 2, customer: '한소희', price: '84,000원', status: '배송중', statusClass: 'shipping', date: '10.18' },
]

const topProducts = [
  { type: 'mug', name: '핸드메이드 세라믹 머그', brand: 'Atelier Soi', sales: '1,284개' },
  { type: 'diffuser', name: '모닝 미스트 디퓨저', brand: 'Nuit', sales: '731개' },
  { type: 'lamp', name: '프로스티드 머쉬룸 램프', brand: 'Lumen Studio', sales: '642개' },
  { type: 'tray', name: '오크 라운드 트레이 세트', brand: 'Woodnote', sales: '487개' },
  { type: 'candle', name: '라벤더 소이 캔들 220g', brand: 'Nuit', sales: '318개' },
]

const lowStock = [
  { name: '프로스티드 머쉬룸 램프', stock: '8개 남음', level: 53 },
  { name: '린넨 커버 노트 & 브라스 펜', stock: '5개 남음', level: 32 },
  { name: '모닝 미스트 디퓨저 200ml', stock: '12개 남음', level: 80 },
]

const weeklySales = [68, 80, 64, 91, 102, 102, 102]
const weekdays = ['월', '화', '수', '목', '금', '토', '일']
const formattedToday = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
}).format(new Date())

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

function ProductThumb({ type }) {
  return <span className={`product-thumb product-thumb--${type}`} aria-hidden="true"><span /></span>
}

function AdminPage() {
  const navigate = useNavigate()
  const [activeNav, setActiveNav] = useState('대시보드')
  const [search, setSearch] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notice, setNotice] = useState('')

  const filteredOrders = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return orders
    return orders.filter((order) => `${order.id} ${order.product} ${order.customer}`.toLowerCase().includes(keyword))
  }, [search])

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
            <button className={`admin-nav-item${activeNav === item.label ? ' is-active' : ''}`} key={item.label} type="button" onClick={() => { if (item.path) navigate(item.path); else setActiveNav(item.label); setSidebarOpen(false) }}>
              <Icon name={item.icon} /><span>{item.label}</span>{item.badge && <span className="admin-nav-badge">{item.badge}</span>}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <button type="button" onClick={goToStorefront}><Icon name="store" /><span>쇼핑몰 바로가기</span></button>
          <button type="button" onClick={() => setActiveNav('설정')}><Icon name="settings" /><span>설정</span></button>
        </div>
      </aside>

      <div className="admin-app">
        <header className="admin-topbar">
          <label className="admin-search">
            <Icon name="search" size={18} />
            <input type="search" placeholder="주문번호, 상품명, 고객명 검색" value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
          <div className="admin-account-area">
            <button className="admin-notification" type="button" aria-label="알림 1개" onClick={() => handleAction('확인하지 않은 알림이 1개 있습니다.')}><Icon name="bell" size={18} /><span /></button>
            <button className="admin-profile" type="button" onClick={() => handleAction('관리자 프로필입니다.')}><span className="admin-avatar">관</span><span><strong>관리자</strong><small>admin@morrow.kr</small></span></button>
          </div>
        </header>

        <main className="admin-main">
          <section className="admin-heading">
            <div><p>{formattedToday}</p><h1>안녕하세요, 관리자님</h1></div>
            <div className="admin-heading-actions">
              <button className="admin-secondary-button" type="button" onClick={() => handleAction('매출 리포트를 준비했습니다.')}><Icon name="download" size={18} /> 리포트</button>
              <button className="admin-primary-button" type="button" onClick={() => navigate('/admin/products/new')}><Icon name="plus" size={18} /> 상품 등록</button>
            </div>
          </section>

          <section className="admin-stat-grid" aria-label="오늘의 주요 지표">
            {stats.map((stat) => (
              <article className={`admin-stat-card${stat.featured ? ' is-featured' : ''}`} key={stat.title}>
                <p>{stat.title}</p><strong>{stat.value}</strong><span className={stat.direction}><b>{stat.direction === 'up' ? '↗' : '↘'} {stat.change}</b> 지난주 대비</span>
              </article>
            ))}
          </section>

          <section className="admin-overview-grid">
            <article className="admin-card sales-chart-card">
              <div className="admin-card-title-row"><div><h2>주간 매출</h2><strong>30,212,000원</strong></div><span>10.14 - 10.20</span></div>
              <div className="weekly-chart" aria-label="월요일부터 일요일까지의 주간 매출 막대 차트">
                {weeklySales.map((height, index) => (
                  <div className={`chart-column${index === 6 ? ' is-current' : ''}`} key={weekdays[index]}><span className="chart-bar" style={{ height: `${height}%` }} /><small>{weekdays[index]}</small></div>
                ))}
              </div>
            </article>

            <article className="admin-card category-card">
              <h2>카테고리별 매출 비중</h2>
              <div className="category-stacked-bar" aria-hidden="true">{categories.map((category) => <span key={category.label} style={{ width: `${category.value}%`, background: category.color }} />)}</div>
              <div className="category-list">
                {categories.map((category) => <div key={category.label}><span className="category-dot" style={{ background: category.color }} /><span>{category.label}</span><strong>{category.value}%</strong></div>)}
              </div>
            </article>
          </section>

          <section className="admin-lower-grid">
            <article className="admin-card recent-orders-card">
              <div className="orders-heading"><h2>최근 주문</h2><button type="button" onClick={() => setSearch('')}>전체 보기</button></div>
              <div className="orders-table-wrap">
                <table className="orders-table">
                  <thead><tr><th>주문번호</th><th>상품</th><th>고객</th><th>금액</th><th>상태</th><th>주문일</th></tr></thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr key={order.id}>
                        <td className="order-id">{order.id}</td>
                        <td><div className="order-product"><ProductThumb type={order.type} /><span><strong>{order.product}</strong><small>수량 {order.quantity}</small></span></div></td>
                        <td>{order.customer}</td><td className="order-price">{order.price}</td><td><span className={`order-status order-status--${order.statusClass}`}>{order.status}</span></td><td className="order-date">{order.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredOrders.length === 0 && <div className="orders-empty">검색 결과가 없습니다.</div>}
              </div>
            </article>

            <div className="admin-side-stack">
              <article className="admin-card top-products-card">
                <h2>판매 TOP 5</h2>
                <ol className="top-products-list">
                  {topProducts.map((product, index) => (
                    <li key={product.name}><span className="rank">{index + 1}</span><ProductThumb type={product.type} /><span className="top-product-copy"><strong>{product.name}</strong><small>{product.brand}</small></span><b>{product.sales}</b></li>
                  ))}
                </ol>
              </article>

              <article className="admin-card low-stock-card">
                <h2><Icon name="warning" size={17} /> 재고 부족 알림</h2>
                <div className="low-stock-list">
                  {lowStock.map((item) => <div className="low-stock-item" key={item.name}><p><strong>{item.name}</strong><b>{item.stock}</b></p><span><i style={{ width: `${item.level}%` }} /></span></div>)}
                </div>
                <button type="button" onClick={() => handleAction('발주 요청이 전송되었습니다.')}>발주 요청하기</button>
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
