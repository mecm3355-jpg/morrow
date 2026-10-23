import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import ArrowIcon from '../components/ArrowIcon'
import AnnouncementBar from '../components/AnnouncementBar'
import Header from '../components/Header'
import heroImage from '../assets/morrow-hero-men-lifestyle.webp'
import productSheet from '../assets/morrow-products.webp'
import storyImage from '../assets/morrow-story-men-lifestyle.webp'
import { clearStoredAuth, getStoredAuth, saveStoredAuth } from '../utils/authStorage'
import './HomePage.css'

const API_URL = import.meta.env.VITE_API_URL || ''
const PRODUCT_SHEET_STYLE = { '--product-sheet': `url(${productSheet})` }

const categoryDescriptions = {
  상의: '오늘의 인상을 만드는 편안한 실루엣',
  하의: '자연스러운 움직임을 위한 균형',
  악세사리: '일상의 취향을 완성하는 작은 디테일',
}

const MemoizedHeader = memo(Header)

function formatPrice(value) {
  const price = Number(value)
  return Number.isFinite(price) ? `${price.toLocaleString('ko-KR')}원` : '-'
}

function ProductImage({ type, src, alt }) {
  if (src) {
    return <img className="product-image product-image--remote" src={src} alt={alt} loading="lazy" decoding="async" />
  }

  return <div className={`product-image product-image--${type}`} role="img" aria-label={alt} />
}

function ProductCard({ product, compact = false }) {
  const [isWished, setIsWished] = useState(false)

  return (
    <article className={`product-card ${compact ? 'product-card--compact' : ''}`}>
      <Link className="product-card-click-target" to={`/products/${product._id}`} aria-label={`${product.name} 상세페이지로 이동`} />
      <div className="product-card-visual">
        <span className="product-badge">{product.badge || product.category || 'ITEM'}</span>
        <button className={`wish-button${isWished ? ' is-active' : ''}`} type="button" aria-label={`${product.name} ${isWished ? '찜 해제' : '찜하기'}`} aria-pressed={isWished} onClick={() => setIsWished((current) => !current)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6l1.2 1.2L12 21l7.6-7.6 1.2-1.2a5.4 5.4 0 0 0 0-7.6Z" />
          </svg>
        </button>
        <ProductImage type={product.imageType} src={product.image} alt={product.name} />
      </div>
      <div className="product-card-copy">
        <p>{product.brand || product.category || 'Morrow Selection'}</p>
        <h3>{product.name}</h3>
        <strong>{formatPrice(product.price)}</strong>
        <span className="product-delivery">무료배송 · 내일 출발</span>
      </div>
    </article>
  )
}

function HomeSession() {
  const location = useLocation()
  const navigate = useNavigate()
  const routeToastMessage = location.state?.toastMessage || ''
  const [currentUser, setCurrentUser] = useState(() => getStoredAuth()?.user ?? null)
  const [toastMessage, setToastMessage] = useState(routeToastMessage)

  useEffect(() => {
    if (!routeToastMessage) return
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
  }, [location.pathname, location.search, navigate, routeToastMessage])

  useEffect(() => {
    if (!toastMessage) return undefined
    const timer = window.setTimeout(() => setToastMessage(''), 2800)
    return () => window.clearTimeout(timer)
  }, [toastMessage])

  useEffect(() => {
    const auth = getStoredAuth()
    if (!auth) return undefined
    const controller = new AbortController()

    async function getCurrentUser() {
      try {
        const response = await fetch(`${API_URL}/api/users/me`, {
          headers: { Authorization: `${auth.tokenType || 'Bearer'} ${auth.token}` },
          signal: controller.signal,
        })
        const user = await response.json().catch(() => ({}))

        if (!response.ok) {
          if (response.status === 401) {
            clearStoredAuth()
            setCurrentUser(null)
          }
          return
        }

        saveStoredAuth({ ...auth, user })
        setCurrentUser(user)
      } catch (error) {
        if (error.name !== 'AbortError') console.error('사용자 정보를 가져오지 못했습니다.', error)
      }
    }

    getCurrentUser()
    return () => controller.abort()
  }, [])

  const handleLogout = useCallback(() => {
    clearStoredAuth()
    setCurrentUser(null)
    setToastMessage('로그아웃되었습니다.')
  }, [])

  return (
    <>
      <AnnouncementBar />
      <MemoizedHeader user={currentUser} onLogout={handleLogout} />

      {toastMessage ? (
        <div className="auth-toast" role="status" aria-live="polite"><span aria-hidden="true">✓</span>{toastMessage}</div>
      ) : null}
    </>
  )
}

function HomePage() {
  const [products, setProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [productsError, setProductsError] = useState('')
  const [productsRequest, setProductsRequest] = useState(0)
  const [activeCategory, setActiveCategory] = useState('전체')
  const [newsletterMessage, setNewsletterMessage] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function loadProducts() {
      try {
        setProductsLoading(true)
        setProductsError('')
        const response = await fetch(`${API_URL}/api/products/all`, {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        })
        const data = await response.json().catch(() => [])

        if (!response.ok) {
          throw new Error(data.message || '상품을 불러오지 못했습니다.')
        }

        setProducts(Array.isArray(data) ? data : [])
      } catch (error) {
        if (error.name !== 'AbortError') {
          setProductsError(error.message || '서버에 연결할 수 없습니다.')
        }
      } finally {
        if (!controller.signal.aborted) setProductsLoading(false)
      }
    }

    loadProducts()
    return () => controller.abort()
  }, [productsRequest])

  const productCategories = useMemo(
    () => ['전체', ...new Set(products.map((product) => product.category).filter(Boolean))],
    [products],
  )
  const visibleProducts = useMemo(
    () => activeCategory === '전체'
      ? products
      : products.filter((product) => product.category === activeCategory),
    [activeCategory, products],
  )
  const categoryCards = useMemo(() => productCategories
    .filter((category) => category !== '전체')
    .map((category) => ({
      name: category,
      description: categoryDescriptions[category] || '매일 손이 가는 좋은 선택',
      image: products.find((product) => product.category === category)?.image || '',
    })), [productCategories, products])
  const newArrivals = products.slice(0, 3)

  return (
    <div className="page home-page" style={PRODUCT_SHEET_STYLE}>
      <HomeSession />

      <main>
        <section className="home-hero" aria-labelledby="home-hero-title">
          <img src={heroImage} alt="크림색 니트와 차콜 팬츠를 입고 골목을 걷는 남성" decoding="async" fetchPriority="high" />
          <div className="home-hero-shade" />
          <div className="home-hero-copy">
            <p className="section-kicker">2026 NEW COLLECTION</p>
            <h1 id="home-hero-title">오늘 고른 스타일이<span>내일의 취향이 됩니다.</span></h1>
            <p>매일 손이 가는 옷과 액세서리로<br />나다운 스타일을 완성해 보세요.</p>
            <div className="home-hero-actions">
              <a className="primary-button" href="#products">오늘의 셀렉션 보기 <ArrowIcon /></a>
              <a className="secondary-link" href="#brand-story">morrow 이야기</a>
            </div>
          </div>
          <div className="hero-stats" aria-label="morrow 서비스 정보">
            <div><strong>120+</strong><span>엄선한 브랜드</span></div>
            <div><strong>4.9</strong><span>고객 만족도</span></div>
            <div><strong>24h</strong><span>빠른 출고</span></div>
          </div>
        </section>

        <section className="service-points" aria-label="쇼핑 서비스 안내">
          <article><span>01</span><div><strong>엄선된 셀렉션</strong><p>기준을 통과한 물건만 소개해요.</p></div></article>
          <article><span>02</span><div><strong>첫 구매 무료배송</strong><p>처음 만나는 부담을 덜었어요.</p></div></article>
          <article><span>03</span><div><strong>간편한 반품</strong><p>7일 안에 편하게 신청하세요.</p></div></article>
          <article><span>04</span><div><strong>안전한 결제</strong><p>개인정보를 안전하게 보호해요.</p></div></article>
        </section>

        <section className="content-section category-section" id="collection" aria-labelledby="category-title">
          <div className="section-heading">
            <div><p className="section-kicker">CATEGORIES</p><h2 id="category-title">카테고리별 둘러보기</h2></div>
            <a href="#products">전체 보기 <span aria-hidden="true">↗</span></a>
          </div>
          <div className="category-grid">
            {categoryCards.map((category) => (
              <a className="category-card" href="#products" key={category.name} onClick={() => setActiveCategory(category.name)}>
                <ProductImage src={category.image} alt={`${category.name} 카테고리`} />
                <div><h3>{category.name}</h3><p>{category.description}</p></div><span aria-hidden="true">↗</span>
              </a>
            ))}
          </div>
        </section>

        <section className="content-section products-section" id="products" aria-labelledby="products-title">
          <div className="section-heading products-heading">
            <div><p className="section-kicker">BEST ITEMS</p><h2 id="products-title">지금 가장 사랑받는 물건</h2></div>
            <div className="product-filters" aria-label="상품 필터">
              {productCategories.map((category) => (
                <button className={activeCategory === category ? 'active' : ''} type="button" key={category} aria-pressed={activeCategory === category} onClick={() => setActiveCategory(category)}>{category}</button>
              ))}
            </div>
          </div>
          {productsLoading ? (
            <div className="home-products-state" role="status"><span className="home-products-spinner" /><strong>상품을 불러오고 있습니다.</strong></div>
          ) : productsError ? (
            <div className="home-products-state is-error" role="alert"><strong>{productsError}</strong><button type="button" onClick={() => setProductsRequest((request) => request + 1)}>다시 시도</button></div>
          ) : visibleProducts.length ? (
            <div className="product-grid">{visibleProducts.map((product) => <ProductCard product={product} key={product._id || product.sku} />)}</div>
          ) : (
            <div className="home-products-state"><strong>등록된 상품이 없습니다.</strong></div>
          )}
        </section>

        <section className="brand-story" id="brand-story" aria-labelledby="brand-story-title">
          <img src={storyImage} alt="카페 앞에서 니트 소매를 정리하는 남성과 크로스백" decoding="async" loading="lazy" />
          <div className="brand-story-panel">
            <p className="section-kicker">MORROW STORY</p>
            <h2 id="brand-story-title">매일의 장면을 조금 더 나답게.</h2>
            <p>빠르게 소비되는 것보다 오래 곁에 남을 물건을 고릅니다. 만든 이의 태도와 쓰는 이의 시간을 함께 생각합니다.</p>
            <ul>
              <li><span>01</span><div><strong>오래 쓰는 물건</strong><small>시간이 지날수록 좋아지는 선택</small></div></li>
              <li><span>02</span><div><strong>분명한 이야기</strong><small>만든 사람의 마음이 보이는 브랜드</small></div></li>
              <li><span>03</span><div><strong>더 나은 일상</strong><small>작지만 기분 좋은 변화</small></div></li>
            </ul>
            <a className="story-button" href="#collection">이야기 더 보기 <ArrowIcon /></a>
          </div>
        </section>

        <section className="content-section arrivals-section" aria-labelledby="arrivals-title">
          <div className="section-heading">
            <div><p className="section-kicker">NEW ARRIVALS</p><h2 id="arrivals-title">이번 주 새로 들어온 물건</h2></div>
            <a href="#products">전체 보기 <span aria-hidden="true">↗</span></a>
          </div>
          {newArrivals.length ? (
            <div className="arrival-grid">{newArrivals.map((product) => <ProductCard compact product={product} key={product._id || product.sku} />)}</div>
          ) : (
            <div className="home-products-state"><strong>{productsLoading ? '신상품을 불러오고 있습니다.' : '새로 등록된 상품이 없습니다.'}</strong></div>
          )}
        </section>

        <section className="newsletter" aria-labelledby="newsletter-title">
          <p className="section-kicker">WEEKLY LETTER</p>
          <h2 id="newsletter-title">취향이 머무는 소식을 받아보세요</h2>
          <p>새로운 브랜드와 계절의 물건을 매주 한 번 전해드릴게요.</p>
          <form onSubmit={(event) => { event.preventDefault(); setNewsletterMessage('뉴스레터 구독 기능을 준비하고 있습니다.') }}>
            <label className="sr-only" htmlFor="newsletter-email">이메일 주소</label>
            <input id="newsletter-email" type="email" placeholder="이메일 주소를 입력해 주세요" required />
            <button type="submit">구독하기 <ArrowIcon /></button>
          </form>
          {newsletterMessage ? <p className="newsletter-status" role="status">{newsletterMessage}</p> : null}
        </section>
      </main>

      <footer className="site-footer" id="footer">
        <div className="footer-brand"><span className="brand-mark">M</span><strong>morrow</strong><p>오늘보다 더 나은 내일의 물건.</p></div>
        <div><strong>쇼핑</strong><a href="#products">베스트</a><a href="#collection">카테고리</a><a href="#products">신상품</a></div>
        <div><strong>고객지원</strong><a href="#footer">배송 안내</a><a href="#footer">교환 및 반품</a><a href="#footer">문의하기</a></div>
        <div><strong>morrow</strong><a href="#brand-story">브랜드 이야기</a><a href="#footer">입점 문의</a><a href="#footer">이용약관</a></div>
      </footer>
    </div>
  )
}

export default HomePage
