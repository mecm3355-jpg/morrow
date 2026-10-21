import { Link } from 'react-router-dom'
import './Navbar.css'

function Navbar({ cartItemCount = 0, isOpen = false, isAdmin = false, onNavigate = null }) {
  return (
    <nav className={`main-nav${isOpen ? ' is-open' : ''}`} id="main-navigation" aria-label="주요 메뉴">
      <a href="/#collection" onClick={onNavigate}>카테고리</a>
      <a href="/#products" onClick={onNavigate}>베스트</a>
      <a href="/#brand-story" onClick={onNavigate}>브랜드 이야기</a>
      <Link className="main-nav-cart" to="/cart" onClick={onNavigate}>
        <span>장바구니</span><strong>{cartItemCount > 99 ? '99+' : cartItemCount}</strong>
      </Link>
      {isAdmin ? <a className="main-nav-admin" href="/admin" onClick={onNavigate}>어드민 페이지</a> : null}
    </nav>
  )
}

export default Navbar
