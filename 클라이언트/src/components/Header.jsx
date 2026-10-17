import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import './Header.css'

function Header({ userName = '', onLogout = null }) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)
  const userMenuButtonRef = useRef(null)

  useEffect(() => {
    if (!isUserMenuOpen) {
      return undefined
    }

    function handlePointerDown(event) {
      if (!userMenuRef.current?.contains(event.target)) {
        setIsUserMenuOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsUserMenuOpen(false)
        userMenuButtonRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isUserMenuOpen])

  function handleLogout() {
    setIsUserMenuOpen(false)
    onLogout?.()
  }

  return (
    <header className="site-header">
      <Link className="brand" to="/" aria-label="morrow 메인 페이지">
        <span className="brand-mark">M</span>
        <span>morrow</span>
      </Link>

      <nav className="main-nav" aria-label="주요 메뉴">
        <Link to="/#collection">컬렉션</Link>
        <Link to="/#story">브랜드 이야기</Link>
      </nav>

      {userName ? (
        <div className="header-user-menu" ref={userMenuRef}>
          <button
            className="header-greeting"
            type="button"
            ref={userMenuButtonRef}
            aria-expanded={isUserMenuOpen}
            aria-controls="header-user-dropdown"
            onClick={() => setIsUserMenuOpen((current) => !current)}
          >
            <span>
              <strong>{userName}</strong>님 반갑습니다.
            </span>
            <span
              className={`header-greeting-arrow ${isUserMenuOpen ? 'open' : ''}`}
              aria-hidden="true"
            >
              ▾
            </span>
          </button>

          {isUserMenuOpen ? (
            <div className="header-user-dropdown" id="header-user-dropdown">
              <button type="button" onClick={handleLogout}>
                로그아웃
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="header-actions">
          <Link className="header-login" to="/login">
            로그인
          </Link>
          <Link className="header-signup" to="/signup">
            회원가입
          </Link>
        </div>
      )}
    </header>
  )
}

export default Header
