import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStoredAuth } from '../utils/authStorage'
import './ProductListPage.css'

const API_URL = import.meta.env.VITE_API_URL || ''
const INITIAL_PAGINATION = {
  page: 1,
  pageSize: 2,
  total: 0,
  totalPages: 1,
}

const INITIAL_SUMMARY = {
  totalProducts: 0,
  categoryCount: 0,
  averagePrice: 0,
  recentProducts: 0,
}

const navigation = [
  { icon: 'dashboard', label: '대시보드', path: '/admin' },
  { icon: 'order', label: '주문 관리' },
  { icon: 'product', label: '상품 관리', path: '/admin/products', active: true },
  { icon: 'user', label: '고객 관리' },
  { icon: 'megaphone', label: '프로모션' },
  { icon: 'message', label: '리뷰 · 문의' },
  { icon: 'chart', label: '통계' },
]

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
  plus: <><path d="M12 5v14M5 12h14" /></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
  close: <><path d="m6 6 12 12M18 6 6 18" /></>,
  store: <><path d="M4 10v10h16V10M3 4h18l-1 6a3 3 0 0 1-5 1 3 3 0 0 1-6 0 3 3 0 0 1-5-1L3 4Z" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1A8 8 0 0 0 15 6l-.3-2.6h-4L10.4 6a8 8 0 0 0-1.5.9l-2.4-1-2 3.5 2 1.5a7 7 0 0 0 0 2.1l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 1.5.9l.3 2.6h4l.3-2.6a8 8 0 0 0 1.5-.9l2.4 1 2-3.5-2-1.5a7 7 0 0 0 .1-.9Z" /></>,
  box: <><path d="m4 7 8-4 8 4-8 4-8-4Z" /><path d="m4 7 8 4 8-4v10l-8 4-8-4V7Z" /><path d="M12 11v10" /></>,
  layers: <><path d="m12 2 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 17l9 5 9-5" /></>,
  won: <><path d="M4 5l3 14 5-14 5 14 3-14M3 10h18M3 14h18" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  chevronLeft: <path d="m15 18-6-6 6-6" />,
  chevronRight: <path d="m9 18 6-6-6-6" />,
  eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /></>,
  refresh: <><path d="M20 7v5h-5" /><path d="M19 12a7 7 0 1 1-2-5" /></>,
}

function Icon({ name, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {iconPaths[name]}
    </svg>
  )
}

function formatPrice(value) {
  const price = Number(value)
  return Number.isFinite(price) ? `${price.toLocaleString('ko-KR')}원` : '-'
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

function ProductImage({ src, name, large = false }) {
  const [failed, setFailed] = useState(false)
  const className = large ? 'product-list-image is-large' : 'product-list-image'

  if (!src || failed) {
    return <span className={`${className} is-placeholder`} aria-hidden="true">{name?.trim()?.charAt(0) || 'P'}</span>
  }

  return <img className={className} src={src} alt="" onError={() => setFailed(true)} />
}

function ProductListPage() {
  const navigate = useNavigate()
  const [auth] = useState(getStoredAuth)
  const [products, setProducts] = useState([])
  const [pagination, setPagination] = useState(INITIAL_PAGINATION)
  const [summary, setSummary] = useState(INITIAL_SUMMARY)
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState('전체')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedProduct, setSelectedProduct] = useState(null)

  const currentUser = auth?.user

  useEffect(() => {
    const controller = new AbortController()

    async function loadProducts() {
      try {
        setIsLoading(true)
        setError('')
        const query = new URLSearchParams({ page: String(currentPage) })
        if (keyword) query.set('search', keyword)
        if (category !== '전체') query.set('category', category)

        const response = await fetch(`${API_URL}/api/products?${query}`, {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data.message || '상품 목록을 불러오지 못했습니다.')
        setProducts(Array.isArray(data.products) ? data.products : [])
        setPagination(data.pagination || INITIAL_PAGINATION)
        setSummary(data.summary || INITIAL_SUMMARY)
        setCategories(Array.isArray(data.filters?.categories) ? data.filters.categories : [])

        if (data.pagination?.page && data.pagination.page !== currentPage) {
          setCurrentPage(data.pagination.page)
        }
      } catch (requestError) {
        if (requestError.name !== 'AbortError') {
          setError(requestError.message || '서버에 연결할 수 없습니다.')
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    loadProducts()
    return () => controller.abort()
  }, [currentPage, keyword, category])

  const totalPages = pagination.totalPages || 1
  const visiblePage = pagination.page || currentPage

  function handleSearch(event) {
    event.preventDefault()
    setKeyword(searchInput)
    setCurrentPage(1)
  }

  function resetFilters() {
    setSearchInput('')
    setKeyword('')
    setCategory('전체')
    setCurrentPage(1)
  }

  return (
    <div className="product-list-page">
      <button className="product-list-mobile-menu" type="button" aria-label="메뉴 열기" onClick={() => setSidebarOpen(true)}><Icon name="menu" /></button>
      {sidebarOpen && <button className="product-list-backdrop" type="button" aria-label="메뉴 닫기" onClick={() => setSidebarOpen(false)} />}

      <aside className={`product-list-sidebar${sidebarOpen ? ' is-open' : ''}`}>
        <div className="product-list-brand">
          <button className="product-list-brand-link" type="button" onClick={() => navigate('/admin')} aria-label="관리자 대시보드로 이동">
            <span>m</span><strong>morrow.</strong>
          </button>
          <small>ADMIN</small>
          <button className="product-list-sidebar-close" type="button" aria-label="메뉴 닫기" onClick={() => setSidebarOpen(false)}><Icon name="close" /></button>
        </div>
        <nav aria-label="관리자 메뉴">
          {navigation.map((item) => (
            <button className={item.active ? 'is-active' : ''} type="button" key={item.label} onClick={() => { if (item.path) navigate(item.path); setSidebarOpen(false) }}>
              <Icon name={item.icon} /><span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="product-list-sidebar-footer">
          <button type="button" onClick={() => navigate('/')}><Icon name="store" /><span>쇼핑몰 바로가기</span></button>
          <button type="button"><Icon name="settings" /><span>설정</span></button>
        </div>
      </aside>

      <div className="product-list-app">
        <header className="product-list-topbar">
          <form onSubmit={handleSearch}>
            <Icon name="search" size={19} />
            <input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="상품, 주문, 고객을 검색해 보세요." aria-label="통합 검색" />
          </form>
          <div className="product-list-account">
            <button type="button" aria-label="알림"><Icon name="bell" size={19} /><i /></button>
            <span className="product-list-avatar">{currentUser?.name?.charAt(0) || '관'}</span>
            <span><strong>{currentUser?.name || '관리자'}</strong><small>{currentUser?.email || 'admin@morrow.kr'}</small></span>
          </div>
        </header>

        <main className="product-list-main">
          <div className="product-list-breadcrumb"><button type="button" onClick={() => navigate('/admin')}>관리자</button><span>/</span><strong>상품 관리</strong></div>
          <header className="product-list-heading">
            <div><h1>상품 관리</h1><p>등록된 상품을 조회하고 상품 정보를 확인해 보세요.</p></div>
            <button type="button" onClick={() => navigate('/admin/products/new')}><Icon name="plus" size={18} /> 상품 등록</button>
          </header>

          <section className="product-list-stats" aria-label="상품 요약">
            <article><span className="is-neutral"><Icon name="box" /></span><div><small>전체 상품</small><strong>{summary.totalProducts.toLocaleString('ko-KR')}</strong></div></article>
            <article><span className="is-purple"><Icon name="layers" /></span><div><small>카테고리</small><strong>{summary.categoryCount.toLocaleString('ko-KR')}</strong></div></article>
            <article><span className="is-green"><Icon name="won" /></span><div><small>평균 판매가</small><strong>{formatPrice(summary.averagePrice)}</strong></div></article>
            <article><span className="is-orange"><Icon name="clock" /></span><div><small>최근 7일 등록</small><strong>{summary.recentProducts.toLocaleString('ko-KR')}</strong></div></article>
          </section>

          <section className="product-list-panel">
            <form className="product-list-filters" onSubmit={handleSearch}>
              <label className="product-list-search-field">
                <Icon name="search" size={19} />
                <input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="상품명 또는 SKU 검색" aria-label="상품명 또는 SKU 검색" />
              </label>
              <label className="product-list-select-field">
                <span>카테고리</span>
                <select value={category} onChange={(event) => { setCategory(event.target.value); setCurrentPage(1) }}>
                  <option value="전체">전체</option>
                  {categories.map((item) => <option value={item} key={item}>{item}</option>)}
                </select>
              </label>
              <button className="product-list-search-button" type="submit">검색</button>
              <button className="product-list-reset-button" type="button" onClick={resetFilters}>초기화</button>
            </form>

            {error && <div className="product-list-error" role="alert"><span>{error}</span><button type="button" onClick={() => window.location.reload()}><Icon name="refresh" size={16} /> 다시 시도</button></div>}

            <div className="product-list-table-wrap">
              <table className="product-list-table">
                <thead><tr><th>상품 정보</th><th>SKU</th><th>카테고리</th><th>판매가</th><th>등록일</th><th>관리</th></tr></thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product._id || product.sku}>
                      <td><div className="product-list-product"><ProductImage src={product.image} name={product.name} /><span><strong>{product.name}</strong><small>{product.description || '등록된 상품 설명이 없습니다.'}</small></span></div></td>
                      <td><code>{product.sku || '-'}</code></td>
                      <td><span className="product-list-category">{product.category || '-'}</span></td>
                      <td><b>{formatPrice(product.price)}</b></td>
                      <td>{formatDate(product.createdAt)}</td>
                      <td><button className="product-list-detail-button" type="button" onClick={() => setSelectedProduct(product)}><Icon name="eye" size={16} /> 상세</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {isLoading && <div className="product-list-state"><span className="product-list-spinner" /><strong>상품 목록을 불러오고 있습니다.</strong></div>}
              {!isLoading && !error && products.length === 0 && (
                <div className="product-list-state"><span className="product-list-empty-icon"><Icon name="box" size={26} /></span><strong>{summary.totalProducts ? '검색 결과가 없습니다.' : '등록된 상품이 없습니다.'}</strong><p>{summary.totalProducts ? '검색어나 카테고리 조건을 변경해 보세요.' : '첫 번째 상품을 등록해 상품 관리를 시작해 보세요.'}</p>{!summary.totalProducts && <button type="button" onClick={() => navigate('/admin/products/new')}>상품 등록</button>}</div>
              )}
            </div>

            {!isLoading && !error && products.length > 0 && (
              <footer className="product-list-pagination">
                <p>총 <strong>{pagination.total.toLocaleString('ko-KR')}</strong>개 상품 · 페이지당 {pagination.pageSize}개</p>
                <nav aria-label="상품 목록 페이지">
                  <button type="button" aria-label="이전 페이지" disabled={visiblePage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}><Icon name="chevronLeft" size={17} /></button>
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => <button className={visiblePage === page ? 'is-active' : ''} type="button" key={page} aria-current={visiblePage === page ? 'page' : undefined} onClick={() => setCurrentPage(page)}>{page}</button>)}
                  <button type="button" aria-label="다음 페이지" disabled={visiblePage === totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}><Icon name="chevronRight" size={17} /></button>
                </nav>
              </footer>
            )}
          </section>
        </main>
      </div>

      {selectedProduct && (
        <div className="product-list-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedProduct(null) }}>
          <section className="product-list-modal" role="dialog" aria-modal="true" aria-labelledby="product-detail-title">
            <button className="product-list-modal-close" type="button" aria-label="상품 상세 닫기" onClick={() => setSelectedProduct(null)}><Icon name="close" /></button>
            <ProductImage src={selectedProduct.image} name={selectedProduct.name} large />
            <div className="product-list-modal-copy">
              <span>{selectedProduct.category || '카테고리 없음'}</span>
              <h2 id="product-detail-title">{selectedProduct.name}</h2>
              <strong>{formatPrice(selectedProduct.price)}</strong>
              <dl><div><dt>SKU</dt><dd>{selectedProduct.sku || '-'}</dd></div><div><dt>등록일</dt><dd>{formatDate(selectedProduct.createdAt)}</dd></div></dl>
              <p>{selectedProduct.description || '등록된 상품 설명이 없습니다.'}</p>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

export default ProductListPage
