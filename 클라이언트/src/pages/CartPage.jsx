import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AnnouncementBar from '../components/AnnouncementBar'
import CartVirtualTryOn from '../components/CartVirtualTryOn'
import Header from '../components/Header'
import { clearStoredAuth, getStoredAuth } from '../utils/authStorage'
import './CartPage.css'

const API_URL = import.meta.env.VITE_API_URL || ''

const iconPaths = {
  cart: <><path d="M4 5h2l1.7 9.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L20.5 8H7" /><circle cx="10" cy="19" r="1" /><circle cx="18" cy="19" r="1" /></>,
  minus: <path d="M5 12h14" />,
  plus: <path d="M12 5v14M5 12h14" />,
  trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13" /><path d="M10 11v5M14 11v5" /></>,
  arrow: <><path d="M4 12h16" /><path d="m14 6 6 6-6 6" /></>,
  refresh: <><path d="M20 7v5h-5" /><path d="M19 12a7 7 0 1 1-2-5" /></>,
  shield: <><path d="M12 3 5 6v5c0 4.8 2.9 8 7 10 4.1-2 7-5.2 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></>,
  tryOn: <><path d="M9 4a3 3 0 0 1 6 0c0 1.7-1.4 2.2-3 3" /><path d="m12 7 8 5-2 3-6-3-6 3-2-3 8-5Z" /><path d="M6 15v5h12v-5" /></>,
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

function CartPage() {
  const navigate = useNavigate()
  const [auth, setAuth] = useState(getStoredAuth)
  const [cart, setCart] = useState(null)
  const [isLoading, setIsLoading] = useState(Boolean(auth))
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busyItemId, setBusyItemId] = useState('')
  const [isClearing, setIsClearing] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [isOutfitTryOnOpen, setIsOutfitTryOnOpen] = useState(false)

  const requestCart = useCallback(async (path = '', options = {}) => {
    const currentAuth = getStoredAuth()
    if (!currentAuth?.token) throw new Error('로그인이 필요한 요청입니다.')

    const response = await fetch(`${API_URL}/api/cart${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        Authorization: `${currentAuth.tokenType || 'Bearer'} ${currentAuth.token}`,
        ...options.headers,
      },
    })
    const data = await response.json().catch(() => ({}))

    if (response.status === 401) {
      clearStoredAuth()
      setAuth(null)
    }
    if (!response.ok) throw new Error(data.message || '장바구니 요청을 처리하지 못했습니다.')
    return data
  }, [])

  const loadCart = useCallback(async () => {
    if (!auth) return
    try {
      const data = await requestCart()
      setCart(data)
      setError('')
    } catch (requestError) {
      setError(requestError.message || '장바구니를 불러오지 못했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [auth, requestCart])

  function retryLoadCart() {
    setIsLoading(true)
    setError('')
    loadCart()
  }

  useEffect(() => {
    if (!auth) return undefined
    let active = true

    async function loadInitialCart() {
      try {
        const data = await requestCart()
        if (!active) return
        setCart(data)
        setError('')
      } catch (requestError) {
        if (active) setError(requestError.message || '장바구니를 불러오지 못했습니다.')
      } finally {
        if (active) setIsLoading(false)
      }
    }

    loadInitialCart()
    return () => { active = false }
  }, [auth, requestCart])

  useEffect(() => {
    if (!notice) return undefined
    const timer = window.setTimeout(() => setNotice(''), 2600)
    return () => window.clearTimeout(timer)
  }, [notice])

  function notifyCartUpdated() {
    window.dispatchEvent(new Event('cart:updated'))
  }

  async function updateQuantity(item, nextQuantity) {
    if (nextQuantity < 1 || nextQuantity > 99) return
    try {
      setBusyItemId(item._id)
      setError('')
      const data = await requestCart(`/items/${item._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity: nextQuantity }),
      })
      setCart(data)
      notifyCartUpdated()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusyItemId('')
    }
  }

  async function removeItem(item) {
    try {
      setBusyItemId(item._id)
      setError('')
      const data = await requestCart(`/items/${item._id}`, { method: 'DELETE' })
      setCart(data)
      setNotice('상품을 장바구니에서 삭제했습니다.')
      notifyCartUpdated()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusyItemId('')
    }
  }

  async function clearCart() {
    if (!window.confirm('장바구니를 모두 비울까요?')) return
    try {
      setIsClearing(true)
      setError('')
      const data = await requestCart('', { method: 'DELETE' })
      setCart(data)
      setNotice('장바구니를 비웠습니다.')
      notifyCartUpdated()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsClearing(false)
    }
  }

  async function checkout() {
    try {
      setIsCheckingOut(true)
      setError('')
      const result = await requestCart('/validate', { method: 'POST' })
      setCart(result.cart)

      if (result.unavailableItemIds?.length || (!result.valid && !result.priceChanges?.length)) {
        setNotice('구매할 수 없는 상품이 포함되어 있습니다.')
        return
      }
      navigate('/order', { state: { cart: result.cart } })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsCheckingOut(false)
    }
  }

  function handleLogout() {
    clearStoredAuth()
    setAuth(null)
    setCart(null)
    notifyCartUpdated()
    navigate('/')
  }

  const items = cart?.items || []
  const summary = cart?.summary || { totalQuantity: 0, totalPrice: 0, currentTotalPrice: 0, hasPriceChanges: false }
  const paymentTotal = summary.currentTotalPrice

  return (
    <div className="page cart-page">
      <AnnouncementBar />
      <Header user={auth?.user || null} onLogout={handleLogout} />
      {notice ? <div className="cart-toast" role="status">{notice}</div> : null}

      <main>
        <nav className="cart-breadcrumb" aria-label="현재 위치"><Link to="/">홈</Link><span>›</span><strong>장바구니</strong></nav>
        <header className="cart-heading"><div><p>SHOPPING CART</p><h1>장바구니</h1></div>{items.length ? <button type="button" disabled={isClearing} onClick={clearCart}><Icon name="trash" size={15} />{isClearing ? '비우는 중...' : '전체 삭제'}</button> : null}</header>

        {!auth ? (
          <section className="cart-empty cart-login-required"><span><Icon name="cart" size={27} /></span><h2>로그인이 필요해요</h2><p>로그인하면 담아둔 상품을 확인할 수 있습니다.</p><Link to="/login" state={{ from: '/cart', message: '장바구니를 확인하려면 로그인해 주세요.' }}>로그인하기 <Icon name="arrow" size={16} /></Link></section>
        ) : isLoading ? (
          <section className="cart-loading" role="status"><i /><strong>장바구니를 불러오고 있습니다.</strong></section>
        ) : error && !cart ? (
          <section className="cart-empty is-error"><span>!</span><h2>장바구니를 불러오지 못했어요</h2><p>{error}</p><button type="button" onClick={retryLoadCart}><Icon name="refresh" size={15} />다시 시도</button></section>
        ) : !items.length ? (
          <section className="cart-empty"><span><Icon name="cart" size={27} /></span><h2>장바구니가 비어 있어요</h2><p>마음에 드는 물건을 천천히 골라보세요.</p><Link to="/#products">상품 둘러보기 <Icon name="arrow" size={16} /></Link></section>
        ) : (
          <div className="cart-layout">
            <section className="cart-items" aria-label="장바구니 상품">
              <div className="cart-outfit-check">
                <span><Icon name="tryOn" size={19} /></span>
                <div><small>FINAL OUTFIT CHECK</small><strong>담은 상품을 한 번에 입어보세요</strong><p>상의·하의·악세사리를 마네킹에 함께 배치해 주문 전 코디를 확인할 수 있어요.</p></div>
                <button type="button" onClick={() => setIsOutfitTryOnOpen(true)}>선택한 코디 입어보기</button>
              </div>
              {error ? <div className="cart-error" role="alert">{error}</div> : null}
              {summary.hasPriceChanges ? <div className="cart-price-notice"><Icon name="refresh" size={16} />가격이 변경된 상품이 있습니다. 현재 가격을 확인해 주세요.</div> : null}
              {items.map((item) => {
                const product = item.product || {}
                const isBusy = busyItemId === String(item._id)
                return (
                  <article className="cart-item" key={item._id}>
                    <Link className="cart-item-image" to={product._id ? `/products/${product._id}` : '/'}><img src={product.image} alt={product.name || '상품 이미지'} /></Link>
                    <div className="cart-item-copy"><span>{product.category || 'MORROW SELECTION'}</span><h2><Link to={product._id ? `/products/${product._id}` : '/'}>{product.name || '판매 중지된 상품'}</Link></h2><p>{item.selectedOption ? `옵션 · ${item.selectedOption}` : '기본 옵션'}</p>{item.priceChanged ? <small><del>{formatPrice(item.price)}</del> 현재 가격으로 변경</small> : null}</div>
                    <div className="cart-item-controls"><div className="cart-item-quantity"><button type="button" aria-label="수량 줄이기" disabled={isBusy || item.quantity <= 1} onClick={() => updateQuantity(item, item.quantity - 1)}><Icon name="minus" size={14} /></button><strong>{item.quantity}</strong><button type="button" aria-label="수량 늘리기" disabled={isBusy || item.quantity >= 99} onClick={() => updateQuantity(item, item.quantity + 1)}><Icon name="plus" size={14} /></button></div><button className="cart-item-remove" type="button" aria-label={`${product.name || '상품'} 삭제`} disabled={isBusy} onClick={() => removeItem(item)}><Icon name="trash" size={16} /></button></div>
                    <strong className="cart-item-price">{formatPrice(item.currentLineTotal)}</strong>
                  </article>
                )
              })}
            </section>

            <aside className="cart-summary">
              <h2>결제 예정 금액</h2>
              <dl><div><dt>상품 금액</dt><dd>{formatPrice(summary.currentTotalPrice)}</dd></div></dl>
              <div className="cart-summary-total"><span>총 결제 금액</span><strong>{formatPrice(paymentTotal)}</strong></div>
              <div className="cart-fit-reminder"><Icon name="tryOn" size={17} /><span><strong>선택한 코디를 입어보셨나요?</strong>장바구니 상품을 한 번에 조합해 확인할 수 있어요.</span></div>
              <button type="button" disabled={isCheckingOut} onClick={checkout}>{isCheckingOut ? '가격 확인 중...' : `${summary.totalQuantity}개 상품 구매하기`}</button>
              <p><Icon name="shield" size={17} />결제 직전 상품 가격을 다시 확인합니다.</p>
              <Link to="/#products">쇼핑 계속하기 <span>›</span></Link>
            </aside>
          </div>
        )}
      </main>
      {isOutfitTryOnOpen ? <CartVirtualTryOn items={items} isOpen onClose={() => setIsOutfitTryOnOpen(false)} /> : null}
    </div>
  )
}

export default CartPage
