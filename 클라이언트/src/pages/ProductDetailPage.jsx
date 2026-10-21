import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import AnnouncementBar from '../components/AnnouncementBar'
import ArrowIcon from '../components/ArrowIcon'
import Header from '../components/Header'
import { clearStoredAuth, getStoredAuth, saveStoredAuth } from '../utils/authStorage'
import './ProductDetailPage.css'

const API_URL = import.meta.env.VITE_API_URL || ''

const iconPaths = {
  home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></>,
  heart: <path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6l1.2 1.2L12 21l7.6-7.6 1.2-1.2a5.4 5.4 0 0 0 0-7.6Z" />,
  share: <><circle cx="18" cy="5" r="2.4" /><circle cx="6" cy="12" r="2.4" /><circle cx="18" cy="19" r="2.4" /><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4" /></>,
  truck: <><path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z" /><circle cx="7" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></>,
  minus: <path d="M5 12h14" />,
  plus: <path d="M12 5v14M5 12h14" />,
  star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" />,
  refresh: <><path d="M20 7v5h-5" /><path d="M19 12a7 7 0 1 1-2-5" /></>,
  check: <path d="m5 12 4 4L19 6" />,
}

function Icon({ name, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {iconPaths[name]}
    </svg>
  )
}

function formatPrice(value) {
  const price = Number(value)
  return Number.isFinite(price) ? `${price.toLocaleString('ko-KR')}원` : '-'
}

function StoreHeader({ notice, setNotice }) {
  const [currentUser, setCurrentUser] = useState(() => getStoredAuth()?.user ?? null)

  useEffect(() => {
    const auth = getStoredAuth()
    if (!auth) return undefined
    const controller = new AbortController()

    async function refreshUser() {
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

    refreshUser()
    return () => controller.abort()
  }, [])

  const handleLogout = useCallback(() => {
    clearStoredAuth()
    setCurrentUser(null)
    setNotice('로그아웃되었습니다.')
  }, [setNotice])

  return (
    <>
      <AnnouncementBar />
      <Header user={currentUser} onLogout={handleLogout} />
      {notice ? <div className="product-detail-toast" role="status"><Icon name="check" size={14} />{notice}</div> : null}
    </>
  )
}

function ProductDetailPage() {
  const { productId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [requestVersion, setRequestVersion] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [selectedOption, setSelectedOption] = useState('')
  const [isWished, setIsWished] = useState(false)
  const [notice, setNotice] = useState('')
  const [isAddingToCart, setIsAddingToCart] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    async function loadProduct() {
      try {
        setIsLoading(true)
        setError('')
        const response = await fetch(`${API_URL}/api/products/${productId}`, {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data.message || '상품 정보를 불러오지 못했습니다.')
        setProduct(data)
        setSelectedOption(data.category === '상의' || data.category === '하의' ? 'M' : '기본 옵션')
      } catch (requestError) {
        if (requestError.name !== 'AbortError') setError(requestError.message || '서버에 연결할 수 없습니다.')
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    loadProduct()
    return () => controller.abort()
  }, [productId, requestVersion])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [productId])

  useEffect(() => {
    if (!product) return undefined
    const previousTitle = document.title
    document.title = `${product.name} | morrow`
    return () => { document.title = previousTitle }
  }, [product])

  useEffect(() => {
    if (!notice) return undefined
    const timer = window.setTimeout(() => setNotice(''), 2600)
    return () => window.clearTimeout(timer)
  }, [notice])

  const optionLabel = useMemo(
    () => product?.category === '상의' || product?.category === '하의' ? '사이즈' : '옵션',
    [product],
  )
  const options = optionLabel === '사이즈' ? ['S', 'M', 'L', 'XL'] : ['기본 옵션']
  const productTagline = useMemo(() => {
    if (product?.category === '상의') return '편안한 실루엣으로 완성하는 오늘의 균형'
    if (product?.category === '하의') return '자연스러운 움직임을 위한 단정한 선택'
    if (product?.category === '악세사리') return '일상의 장면을 완성하는 섬세한 디테일'
    return '공간의 온도를 바꾸는 부드러운 빛'
  }, [product])
  const totalPrice = Number(product?.price || 0) * quantity

  function moveToSection(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function addToCart(goToCart = false) {
    if (!selectedOption) {
      setNotice(`${optionLabel} 옵션을 선택해 주세요.`)
      return
    }

    const auth = getStoredAuth()
    if (!auth?.token) {
      navigate('/login', {
        state: {
          from: location.pathname,
          message: '장바구니를 이용하려면 로그인해 주세요.',
        },
      })
      return
    }

    try {
      setIsAddingToCart(true)
      const response = await fetch(`${API_URL}/api/cart/items`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `${auth.tokenType || 'Bearer'} ${auth.token}`,
        },
        body: JSON.stringify({
          productId: product._id,
          selectedOption,
          quantity,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || '장바구니에 상품을 담지 못했습니다.')
      window.dispatchEvent(new Event('cart:updated'))
      if (goToCart) navigate('/cart')
      else setNotice(`${product.name} ${quantity}개를 장바구니에 담았습니다.`)
    } catch (requestError) {
      setNotice(requestError.message || '장바구니 요청 중 오류가 발생했습니다.')
    } finally {
      setIsAddingToCart(false)
    }
  }

  function buyNow() {
    addToCart(true)
  }

  async function shareProduct() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setNotice('상품 링크를 복사했습니다.')
    } catch {
      setNotice('주소창의 링크를 복사해 공유해 주세요.')
    }
  }

  if (isLoading) {
    return (
      <div className="page product-detail-page">
        <StoreHeader notice={notice} setNotice={setNotice} />
        <main className="product-detail-state" role="status"><span className="product-detail-spinner" /><strong>상품 정보를 불러오고 있습니다.</strong></main>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="page product-detail-page">
        <StoreHeader notice={notice} setNotice={setNotice} />
        <main className="product-detail-state is-error">
          <span>!</span><h1>상품을 찾을 수 없어요</h1><p>{error || '존재하지 않는 상품입니다.'}</p>
          <div><button type="button" onClick={() => setRequestVersion((version) => version + 1)}><Icon name="refresh" size={15} />다시 시도</button><Link to="/">홈으로 가기</Link></div>
        </main>
      </div>
    )
  }

  return (
    <div className="page product-detail-page">
      <StoreHeader notice={notice} setNotice={setNotice} />

      <main>
        <nav className="product-detail-breadcrumb" aria-label="현재 위치">
          <Link to="/" aria-label="홈"><Icon name="home" size={12} /></Link><span>›</span><Link to="/#products">{product.category}</Link><span>›</span><strong>{product.name}</strong>
        </nav>

        <section className="product-detail-overview" aria-labelledby="product-detail-title">
          <div className="product-detail-gallery">
            <div className="product-detail-thumbs" aria-label="상품 이미지 목록">
              <button className="is-active" type="button" aria-label="상품 이미지 1" aria-pressed="true">
                <img src={product.image} alt="" />
              </button>
            </div>
            <div className="product-detail-main-image">
              <img src={product.image} alt={product.name} fetchPriority="high" />
              <span>01 / 01</span>
            </div>
          </div>

          <div className="product-detail-summary">
            <div className="product-detail-category-row">
              <span>{product.category}</span>
              <div>
                <button className={isWished ? 'is-active' : ''} type="button" aria-label={isWished ? '찜 해제' : '찜하기'} aria-pressed={isWished} onClick={() => setIsWished((current) => !current)}><Icon name="heart" /></button>
                <button type="button" aria-label="상품 공유" onClick={shareProduct}><Icon name="share" /></button>
              </div>
            </div>
            <h1 id="product-detail-title">{product.name}</h1>
            <p className="product-detail-tagline">{productTagline}</p>
            <button className="product-detail-rating is-empty" type="button" onClick={() => moveToSection('product-reviews')}>
              <span><Icon name="star" size={15} /></span><strong>아직 리뷰가 없습니다</strong>
            </button>
            <strong className="product-detail-price">{formatPrice(product.price)}</strong>

            <div className="product-detail-shipping"><Icon name="truck" size={18} /><strong>무료배송 · 내일 출발</strong></div>

            <label className="product-detail-option is-size">
              <span>{optionLabel}</span>
              <div><i aria-hidden="true" /><select value={selectedOption} onChange={(event) => setSelectedOption(event.target.value)}><option value="">{optionLabel}을 선택해 주세요</option>{options.map((option) => <option value={option} key={option}>{option}</option>)}</select></div>
            </label>

            <div className="product-detail-quantity-row">
              <span>수량</span>
              <div className="product-detail-quantity">
                <button type="button" aria-label="수량 줄이기" disabled={quantity === 1} onClick={() => setQuantity((current) => Math.max(1, current - 1))}><Icon name="minus" size={15} /></button>
                <strong>{quantity}</strong>
                <button type="button" aria-label="수량 늘리기" disabled={quantity === 10} onClick={() => setQuantity((current) => Math.min(10, current + 1))}><Icon name="plus" size={15} /></button>
              </div>
            </div>

            <div className="product-detail-total"><span>총 상품금액</span><strong>{formatPrice(totalPrice)}</strong></div>
            <div className="product-detail-actions"><button type="button" disabled={isAddingToCart} onClick={() => addToCart(false)}>{isAddingToCart ? '담는 중...' : '장바구니'}</button><button type="button" disabled={isAddingToCart} onClick={buyNow}>{isAddingToCart ? '이동 중...' : '바로 구매'}</button></div>
          </div>
        </section>

        <nav className="product-detail-tabs" aria-label="상품 상세 메뉴">
          <button type="button" onClick={() => moveToSection('product-story')}>상품 상세</button>
          <button type="button" onClick={() => moveToSection('product-guide')}>배송 · 교환 안내</button>
          <button type="button" onClick={() => moveToSection('product-reviews')}>리뷰 <span>0</span></button>
        </nav>

        <section className="product-detail-story" id="product-story">
          <div className="product-detail-story-hero">
            <div><p>DESIGNED FOR YOUR TOMORROW</p><h2>내일도 손이 가는<br />좋은 물건의 기준</h2></div>
            <img src={product.image} alt={`${product.name} 연출 이미지`} loading="lazy" />
          </div>

          <div className="product-detail-feature-grid">
            <article><div className="product-detail-feature-symbol"><span>01</span></div><h3>선별된 디자인</h3><p>유행보다 오래 곁에 둘 수 있는 균형 잡힌 디자인을 선택했습니다.</p></article>
            <article><div className="product-detail-feature-symbol"><span>02</span></div><h3>일상을 위한 선택</h3><p>특별한 날뿐 아니라 매일 자연스럽게 손이 가는 물건을 소개합니다.</p></article>
            <article><div className="product-detail-feature-symbol"><span>03</span></div><h3>morrow 셀렉션</h3><p>오늘의 선택이 내일의 취향으로 이어질 수 있도록 세심하게 골랐습니다.</p></article>
          </div>

          {product.description ? <div className="product-detail-description"><span>PRODUCT STORY</span><h2>{product.name}</h2><p>{product.description}</p></div> : null}

          <div className="product-detail-specification">
            <div className="product-detail-spec-image"><img src={product.image} alt="" loading="lazy" /></div>
            <div><h2>제품 정보</h2><dl><div><dt>상품명</dt><dd>{product.name}</dd></div><div><dt>색상 / 옵션</dt><dd>{selectedOption || '상세페이지 참조'}</dd></div><div><dt>카테고리</dt><dd>{product.category}</dd></div><div><dt>상품 코드</dt><dd>{product.sku || '-'}</dd></div><div><dt>제조 및 판매</dt><dd>Morrow Selection</dd></div></dl></div>
          </div>
        </section>

        <section className="product-detail-guide" id="product-guide" aria-labelledby="product-guide-title">
          <div><p>SHOPPING GUIDE</p><h2 id="product-guide-title">배송 · 교환 안내</h2></div>
          <dl><div><dt>배송 안내</dt><dd>평일 오후 2시 이전 결제 완료 시 당일 출고됩니다. 제주 및 도서산간 지역은 추가 배송비가 발생할 수 있습니다.</dd></div><div><dt>교환 및 반품</dt><dd>상품 수령 후 7일 이내 신청할 수 있습니다. 사용 흔적이나 상품 가치 훼손 시 교환 및 반품이 제한될 수 있습니다.</dd></div></dl>
        </section>

        <section className="product-detail-reviews" id="product-reviews" aria-labelledby="product-review-title">
          <header><h2 id="product-review-title">리뷰 <span>0</span></h2></header>
          <div className="product-detail-reviews-empty"><Icon name="star" size={24} /><strong>아직 작성된 리뷰가 없습니다.</strong><p>이 상품의 첫 번째 후기를 남겨보세요.</p></div>
        </section>

        <section className="product-detail-cta"><h2>좋은 물건과 함께하는 기분 좋은 내일</h2><button type="button" onClick={buyNow}>바로 구매하기 <ArrowIcon /></button></section>
      </main>

      <footer className="product-detail-footer"><Link className="brand" to="/"><span className="brand-mark">M</span><span>morrow</span></Link><nav><a href="#product-guide">이용약관</a><a href="#product-guide">개인정보처리방침</a><a href="#product-guide">고객센터</a></nav><span>© 2026 MORROW</span></footer>

      <div className="product-detail-mobile-buy"><div><span>총 상품금액</span><strong>{formatPrice(totalPrice)}</strong></div><button type="button" onClick={buyNow}>구매하기</button></div>
    </div>
  )
}

export default ProductDetailPage
