import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getStoredAuth } from '../utils/authStorage'
import Navbar from './Navbar'
import './Header.css'

const API_URL = import.meta.env.VITE_API_URL || ''

function Header({ user = null, onLogout = null }) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [cartItemCount, setCartItemCount] = useState(0)
  const headerRef = useRef(null)
  const userMenuRef = useRef(null)
  const userMenuButtonRef = useRef(null)
  const mobileMenuButtonRef = useRef(null)
  const userType = typeof user?.user_type === 'string' ? user.user_type.trim().toLowerCase() : ''
  const isAdmin = userType === 'admin'
  const displayedCartItemCount = user ? cartItemCount : 0

  useEffect(() => {
    if (!user) return undefined
    let active = true

    async function loadCartCount() {
      const auth = getStoredAuth()
      if (!auth?.token) return

      try {
        const response = await fetch(`${API_URL}/api/cart`, {
          headers: {
            Accept: 'application/json',
            Authorization: `${auth.tokenType || 'Bearer'} ${auth.token}`,
          },
        })
        const data = await response.json().catch(() => ({}))
        if (active && response.ok) setCartItemCount(Number(data.summary?.totalQuantity) || 0)
      } catch (error) {
        if (active) console.error('장바구니 수량을 가져오지 못했습니다.', error)
      }
    }

    loadCartCount()
    window.addEventListener('cart:updated', loadCartCount)
    return () => {
      active = false
      window.removeEventListener('cart:updated', loadCartCount)
    }
  }, [user])

  useEffect(() => {
    if (!isUserMenuOpen && !isMobileNavOpen) return undefined

    function handlePointerDown(event) {
      if (!userMenuRef.current?.contains(event.target)) setIsUserMenuOpen(false)
      if (!headerRef.current?.contains(event.target)) setIsMobileNavOpen(false)
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        const shouldFocusMobileMenu = isMobileNavOpen
        setIsUserMenuOpen(false)
        setIsMobileNavOpen(false)
        if (shouldFocusMobileMenu) mobileMenuButtonRef.current?.focus()
        else userMenuButtonRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isMobileNavOpen, isUserMenuOpen])

  function handleLogout() {
    setIsUserMenuOpen(false)
    onLogout?.()
  }

  return (
    <header className="site-header" ref={headerRef}>
      <Link className="brand" to="/" aria-label="morrow 메인 페이지">
        <span className="brand-mark">M</span><span>morrow</span>
      </Link>

      <button className="header-menu-button" type="button" ref={mobileMenuButtonRef} aria-label="주요 메뉴 열기" aria-expanded={isMobileNavOpen} aria-controls="main-navigation" onClick={() => setIsMobileNavOpen((current) => !current)}>
        <span /><span /><span />
      </button>

      <Navbar cartItemCount={displayedCartItemCount} isOpen={isMobileNavOpen} isAdmin={isAdmin} onNavigate={() => setIsMobileNavOpen(false)} />

      <div className="header-tools">
        <a className="header-icon-button" href="/#products" aria-label="상품 보러 가기">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>
        </a>
        <Link className="header-icon-button header-cart" to="/cart" aria-label={`장바구니, 상품 ${displayedCartItemCount}개`}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h2l1.7 9.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L20.5 8H7" /><circle cx="10" cy="19" r="1" /><circle cx="18" cy="19" r="1" /></svg>
          {displayedCartItemCount > 0 ? <span className="header-cart-count">{displayedCartItemCount > 99 ? '99+' : displayedCartItemCount}</span> : null}
        </Link>

        {isAdmin ? <Link className="header-admin" to="/admin">어드민 페이지</Link> : null}

        {user ? (
          <div className="header-user-menu" ref={userMenuRef}>
            <button className="header-greeting" type="button" ref={userMenuButtonRef} aria-expanded={isUserMenuOpen} aria-haspopup="menu" aria-controls="header-user-dropdown" onClick={() => setIsUserMenuOpen((current) => !current)}>
              <span><strong>{user.name || '회원'}</strong>님 환영합니다</span>
              <span className={`header-greeting-arrow ${isUserMenuOpen ? 'open' : ''}`} aria-hidden="true">▾</span>
            </button>
            {isUserMenuOpen ? <div className="header-user-dropdown" id="header-user-dropdown" role="menu"><button type="button" role="menuitem" onClick={handleLogout}>로그아웃</button></div> : null}
          </div>
        ) : <Link className="header-login" to="/login">로그인</Link>}
      </div>
    </header>
  )
}

export default Header
