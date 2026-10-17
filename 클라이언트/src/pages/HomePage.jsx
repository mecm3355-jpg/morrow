import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import ArrowIcon from '../components/ArrowIcon'
import Header from '../components/Header'
import heroImage from '../assets/hero.png'
import { clearStoredAuth, getStoredAuth, saveStoredAuth } from '../utils/authStorage'
import './HomePage.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

function HomePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const routeToastMessage = location.state?.toastMessage || ''
  const [userName, setUserName] = useState('')
  const [toastMessage, setToastMessage] = useState(routeToastMessage)

  useEffect(() => {
    if (!routeToastMessage) {
      return
    }

    navigate(`${location.pathname}${location.search}`, {
      replace: true,
      state: null,
    })
  }, [location.pathname, location.search, navigate, routeToastMessage])

  useEffect(() => {
    if (!toastMessage) {
      return undefined
    }

    const timer = window.setTimeout(() => setToastMessage(''), 2800)

    return () => window.clearTimeout(timer)
  }, [toastMessage])

  useEffect(() => {
    const auth = getStoredAuth()

    if (!auth) {
      return undefined
    }

    const controller = new AbortController()

    async function getCurrentUser() {
      try {
        const response = await fetch(`${API_URL}/api/users/me`, {
          headers: {
            Authorization: `${auth.tokenType || 'Bearer'} ${auth.token}`,
          },
          signal: controller.signal,
        })
        const user = await response.json().catch(() => ({}))

        if (!response.ok) {
          if (response.status === 401) {
            clearStoredAuth()
          }
          return
        }

        saveStoredAuth({ ...auth, user })

        setUserName(user.name || '회원')
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('사용자 정보를 가져오지 못했습니다.', error)
        }
      }
    }

    getCurrentUser()

    return () => controller.abort()
  }, [])

  function handleLogout() {
    clearStoredAuth()
    setUserName('')
    setToastMessage('로그아웃되었습니다.')
  }

  return (
    <div className="page home-page">
      <Header userName={userName} onLogout={handleLogout} />

      {toastMessage ? (
        <div className="auth-toast" role="status" aria-live="polite">
          <span aria-hidden="true">✓</span>
          {toastMessage}
        </div>
      ) : null}

      <main>
        <section className="hero-section">
          <div className="hero-copy">
            <p className="eyebrow">A BETTER EVERYDAY OBJECT</p>
            <h1>
              매일의 장면을
              <span>조금 더 나답게.</span>
            </h1>
            <p className="hero-description">
              오래 곁에 두고 싶은 물건을 소개합니다.
              <br />취향이 머무는 새로운 쇼핑을 시작해 보세요.
            </p>

            <div className="hero-actions">
              <Link className="primary-button" to="/signup">
                회원가입하고 시작하기
                <ArrowIcon />
              </Link>
              <a className="text-link" href="#collection">
                컬렉션 둘러보기
              </a>
            </div>

            <div className="trust-row" aria-label="서비스 특징">
              <span>✓ 엄선된 브랜드</span>
              <span>✓ 첫 구매 무료배송</span>
              <span>✓ 간편한 반품</span>
            </div>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="visual-orbit orbit-one" />
            <div className="visual-orbit orbit-two" />
            <div className="image-glow" />
            <img src={heroImage} alt="" />
            <div className="floating-note note-top">CURATED FOR YOU</div>
            <div className="floating-note note-bottom">NEW PERSPECTIVE</div>
          </div>
        </section>

        <section className="collection-strip" id="collection" aria-label="상품 컬렉션">
          <article>
            <span>01</span>
            <div>
              <h2>오래 쓰는 물건</h2>
              <p>시간이 지날수록 좋아지는 선택</p>
            </div>
          </article>
          <article>
            <span>02</span>
            <div>
              <h2>새로운 감각</h2>
              <p>일상에 더하는 작은 영감</p>
            </div>
          </article>
          <article id="story">
            <span>03</span>
            <div>
              <h2>분명한 이야기</h2>
              <p>만든 사람의 마음이 보이는 브랜드</p>
            </div>
          </article>
        </section>
      </main>
    </div>
  )
}

export default HomePage
