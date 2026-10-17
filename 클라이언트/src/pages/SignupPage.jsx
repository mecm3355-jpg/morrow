import { Link } from 'react-router-dom'
import Header from '../components/Header'
import SignupForm from '../components/SignupForm'
import './SignupPage.css'

function SignupPage() {
  return (
    <div className="page signup-page">
      <Header />

      <main className="signup-main">
        <Link className="back-button" to="/">
          <span aria-hidden="true">←</span> 메인으로
        </Link>

        <section className="signup-card" aria-labelledby="signup-title">
          <div className="signup-heading">
            <span className="step-label">JOIN MORROW</span>
            <h1 id="signup-title">회원가입</h1>
            <p>새로운 여정을 시작해 보세요. 1분이면 충분합니다.</p>
          </div>

          <SignupForm />

          <p className="login-prompt">
            이미 계정이 있으신가요? <Link to="/login">로그인</Link>
          </p>
        </section>
      </main>
    </div>
  )
}

export default SignupPage
