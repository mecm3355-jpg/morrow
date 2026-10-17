import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import useLoginForm from '../hooks/useLoginForm'
import { clearStoredAuth, getStoredAuth } from '../utils/authStorage'
import './LoginPage.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

function LoginPage() {
  const navigate = useNavigate()
  const [storedAuth] = useState(getStoredAuth)
  const [isCheckingAuth, setIsCheckingAuth] = useState(Boolean(storedAuth))
  const {
    form,
    showPassword,
    isSubmitting,
    message,
    handleChange,
    handleSubmit,
    setShowPassword,
  } = useLoginForm()

  useEffect(() => {
    if (!storedAuth) {
      return undefined
    }

    const controller = new AbortController()
    let didRedirect = false

    async function checkCurrentUser() {
      try {
        const response = await fetch(`${API_URL}/api/users/me`, {
          headers: {
            Authorization: `${storedAuth.tokenType || 'Bearer'} ${storedAuth.token}`,
          },
          signal: controller.signal,
        })
        const user = await response.json().catch(() => ({}))

        if (response.ok && user._id) {
          didRedirect = true
          navigate('/', { replace: true })
          return
        }

        if (response.status === 401) {
          clearStoredAuth()
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('로그인 상태를 확인하지 못했습니다.', error)
        }
      } finally {
        if (!controller.signal.aborted && !didRedirect) {
          setIsCheckingAuth(false)
        }
      }
    }

    checkCurrentUser()

    return () => controller.abort()
  }, [navigate, storedAuth])

  return (
    <div className="page login-page">
      <Header />

      <main className="login-main">
        {isCheckingAuth ? (
          <section className="login-card login-auth-check" role="status">
            <span className="login-auth-spinner" aria-hidden="true" />
            <strong>로그인 상태를 확인하고 있습니다.</strong>
            <p>잠시만 기다려 주세요.</p>
          </section>
        ) : (
          <>
            <Link className="login-back-button" to="/">
              <span aria-hidden="true">←</span> 메인으로
            </Link>

            <section className="login-card" aria-labelledby="login-title">
              <header className="login-card-heading">
                <h1 id="login-title">로그인</h1>
                <p>다시 만나서 반가워요. 계정에 로그인해 보세요.</p>
              </header>

              <form className="login-form" onSubmit={handleSubmit} noValidate>
                <div className="login-field">
                  <label htmlFor="login-email">이메일</label>
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    autoComplete="email"
                    inputMode="email"
                    required
                  />
                </div>

                <div className="login-field">
                  <label htmlFor="login-password">비밀번호</label>
                  <div className="login-password-field">
                    <input
                      id="login-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={handleChange}
                      placeholder="8자 이상 입력해 주세요"
                      autoComplete="current-password"
                      minLength="8"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                    >
                      {showPassword ? '숨기기' : '보기'}
                    </button>
                  </div>
                </div>

                {message.text ? (
                  <p
                    className={`login-message ${message.type}`}
                    role={message.type === 'error' ? 'alert' : 'status'}
                  >
                    {message.text}
                  </p>
                ) : null}

                <button className="login-submit" type="submit" disabled={isSubmitting}>
                  <span>{isSubmitting ? '로그인 중...' : '로그인'}</span>
                  {!isSubmitting ? <span aria-hidden="true">→</span> : null}
                </button>
              </form>

              <p className="login-signup-prompt">
                아직 계정이 없으신가요? <Link to="/signup">회원가입</Link>
              </p>
            </section>
          </>
        )}
      </main>
    </div>
  )
}

export default LoginPage
