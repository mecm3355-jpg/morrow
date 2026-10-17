import ArrowIcon from './ArrowIcon'
import useSignupForm from '../hooks/useSignupForm'

function SignupForm() {
  const {
    form,
    agreed,
    showPassword,
    isSubmitting,
    message,
    handleChange,
    handleSubmit,
    setAgreed,
    setShowPassword,
  } = useSignupForm()

  return (
    <form onSubmit={handleSubmit}>
      <div className="field-group">
        <label htmlFor="name">이름</label>
        <input
          id="name"
          name="name"
          type="text"
          value={form.name}
          onChange={handleChange}
          placeholder="홍길동"
          autoComplete="name"
          required
        />
      </div>

      <div className="field-group">
        <label htmlFor="email">이메일</label>
        <input
          id="email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
      </div>

      <div className="field-group">
        <label htmlFor="password">비밀번호</label>
        <div className="password-field">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            onChange={handleChange}
            placeholder="8자 이상 입력해 주세요"
            autoComplete="new-password"
            minLength="8"
            required
          />
          <button type="button" onClick={() => setShowPassword((current) => !current)}>
            {showPassword ? '숨기기' : '보기'}
          </button>
        </div>
      </div>

      <div className="field-group">
        <label htmlFor="user_type">회원 유형</label>
        <select id="user_type" name="user_type" value={form.user_type} onChange={handleChange} required>
          <option value="customer">일반 회원</option>
          <option value="seller">판매자</option>
        </select>
      </div>

      <div className="field-group">
        <label htmlFor="address">
          주소 <span>선택</span>
        </label>
        <input
          id="address"
          name="address"
          type="text"
          value={form.address}
          onChange={handleChange}
          placeholder="서울시 마포구"
          autoComplete="street-address"
        />
      </div>

      <label className="agreement">
        <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
        <span>
          서비스 <button type="button">이용약관</button>과 <button type="button">개인정보 처리방침</button>에 동의합니다.
        </span>
      </label>

      {message.text && (
        <p className={`form-message ${message.type}`} role="status">
          {message.text}
        </p>
      )}

      <button className="submit-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? '계정을 만들고 있어요...' : '계정 만들기'}
        {!isSubmitting && <ArrowIcon />}
      </button>
    </form>
  )
}

export default SignupForm
