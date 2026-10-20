import './Navbar.css'

function Navbar() {
  return (
    <nav className="main-nav" aria-label="주요 메뉴">
      <a href="/#collection">카테고리</a>
      <a href="/#products">베스트</a>
      <a href="/#brand-story">브랜드 이야기</a>
    </nav>
  )
}

export default Navbar
