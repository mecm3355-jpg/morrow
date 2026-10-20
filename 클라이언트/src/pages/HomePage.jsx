import { memo, useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ArrowIcon from '../components/ArrowIcon'
import Header from '../components/Header'
import heroImage from '../assets/morrow-hero-v2.webp'
import productSheet from '../assets/morrow-products.webp'
import storyImage from '../assets/morrow-story.webp'
import { clearStoredAuth, getStoredAuth, saveStoredAuth } from '../utils/authStorage'
import './HomePage.css'

const API_URL = import.meta.env.VITE_API_URL || ''
const PRODUCT_SHEET_STYLE = { '--product-sheet': `url(${productSheet})` }

const categories = [
  { name: '조명', description: '공간의 온도를 바꾸는 빛', image: 'lamp' },
  { name: '키친', description: '매일 손이 가는 테이블웨어', image: 'cup' },
  { name: '데스크', description: '몰입을 돕는 작은 도구', image: 'notebook' },
  { name: '향기', description: '장면을 기억하게 하는 향', image: 'candle' },
]

const products = [
  { brand: 'Morrow Object', name: '포그 세라믹 머그', price: '32,000원', image: 'cup', badge: 'BEST' },
  { brand: 'Loom Atelier', name: '모닝 글로우 테이블 램프', price: '78,000원', image: 'lamp', badge: 'NEW' },
  { brand: 'Night Archive', name: '바이올렛 글라스 캔들 220g', price: '39,000원', image: 'candle', badge: 'ONLY' },
  { brand: 'Paper Note', name: '패브릭 노트 & 브라스 펜', price: '42,000원', image: 'notebook', badge: 'NEW' },
  { brand: 'Atelier N°7', name: '오브제 퍼퓸 50ml', price: '59,000원', image: 'perfume', badge: 'BEST' },
  { brand: 'Soft Form', name: '리브드 코튼 타월', price: '28,000원', image: 'towel', badge: 'NEW' },
  { brand: 'Morrow Object', name: '포그 세라믹 머그 세트', price: '61,000원', image: 'cup', badge: 'SET' },
  { brand: 'Loom Atelier', name: '글로우 미니 램프', price: '64,000원', image: 'lamp', badge: 'ONLY' },
]

const newArrivals = products.slice(2, 5)
const MemoizedHeader = memo(Header)

function ProductImage({ type, alt }) {
  return <div className={`product-image product-image--${type}`} role="img" aria-label={alt} />
}

function ProductCard({ product, compact = false }) {
  return (
    <article className={`product-card ${compact ? 'product-card--compact' : ''}`}>
      <div className="product-card-visual">
        <span className="product-badge">{product.badge}</span>
        <button className="wish-button" type="button" aria-label={`${product.name} 찜하기`}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6l1.2 1.2L12 21l7.6-7.6 1.2-1.2a5.4 5.4 0 0 0 0-7.6Z" />
          </svg>
        </button>
        <ProductImage type={product.image} alt={product.name} />
      </div>
      <div className="product-card-copy">
        <p>{product.brand}</p>
        <h3>{product.name}</h3>
        <strong>{product.price}</strong>
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
      <div className="announcement-bar">
        <span>오늘 가입하면 첫 구매 10% 할인</span><span aria-hidden="true">·</span><span>5만원 이상 무료배송</span>
      </div>
      <MemoizedHeader user={currentUser} onLogout={handleLogout} />

      {toastMessage ? (
        <div className="auth-toast" role="status" aria-live="polite"><span aria-hidden="true">✓</span>{toastMessage}</div>
      ) : null}
    </>
  )
}

function HomePage() {
  return (
    <div className="page home-page" style={PRODUCT_SHEET_STYLE}>
      <HomeSession />

      <main>
        <section className="home-hero" aria-labelledby="home-hero-title">
          <img src={heroImage} alt="세라믹 화병과 유리잔이 놓인 차분한 공간" decoding="async" fetchPriority="high" />
          <div className="home-hero-shade" />
          <div className="home-hero-copy">
            <p className="section-kicker">2026 NEW COLLECTION</p>
            <h1 id="home-hero-title">가을의 온도를<span>집 안으로.</span></h1>
            <p>오래 바라봐도 좋은 물건과 함께<br />나만의 속도로 채우는 일상을 만나보세요.</p>
            <div className="home-hero-actions">
              <a className="primary-button" href="#products">컬렉션 쇼핑하기 <ArrowIcon /></a>
              <a className="secondary-link" href="#brand-story">브랜드 이야기</a>
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
            {categories.map((category) => (
              <a className="category-card" href="#products" key={category.name}>
                <ProductImage type={category.image} alt={`${category.name} 카테고리`} />
                <div><h3>{category.name}</h3><p>{category.description}</p></div><span aria-hidden="true">↗</span>
              </a>
            ))}
          </div>
        </section>

        <section className="content-section products-section" id="products" aria-labelledby="products-title">
          <div className="section-heading products-heading">
            <div><p className="section-kicker">BEST ITEMS</p><h2 id="products-title">지금 가장 사랑받는 물건</h2></div>
            <div className="product-filters" aria-label="상품 필터">
              <button className="active" type="button">전체</button><button type="button">리빙</button><button type="button">키친</button><button type="button">패브릭</button>
            </div>
          </div>
          <div className="product-grid">{products.map((product) => <ProductCard product={product} key={product.name} />)}</div>
        </section>

        <section className="brand-story" id="brand-story" aria-labelledby="brand-story-title">
          <img src={storyImage} alt="따뜻한 햇살이 드는 미니멀한 거실" decoding="async" loading="lazy" />
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
          <div className="arrival-grid">{newArrivals.map((product) => <ProductCard compact product={product} key={product.name} />)}</div>
        </section>

        <section className="newsletter" aria-labelledby="newsletter-title">
          <p className="section-kicker">WEEKLY LETTER</p>
          <h2 id="newsletter-title">취향이 머무는 소식을 받아보세요</h2>
          <p>새로운 브랜드와 계절의 물건을 매주 한 번 전해드릴게요.</p>
          <form onSubmit={(event) => event.preventDefault()}>
            <label className="sr-only" htmlFor="newsletter-email">이메일 주소</label>
            <input id="newsletter-email" type="email" placeholder="이메일 주소를 입력해 주세요" />
            <button type="submit">구독하기 <ArrowIcon /></button>
          </form>
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
