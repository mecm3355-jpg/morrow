import { useEffect, useRef, useState } from 'react'
import ArrowIcon from './ArrowIcon'
import useSignupForm from '../hooks/useSignupForm'

function SignupForm() {
  const [openPolicy, setOpenPolicy] = useState('')
  const policyCloseButtonRef = useRef(null)
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

  useEffect(() => {
    if (!openPolicy) return undefined
    policyCloseButtonRef.current?.focus()
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpenPolicy('')
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [openPolicy])

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
          서비스 <button type="button" onClick={() => setOpenPolicy('terms')}>이용약관</button>과 <button type="button" onClick={() => setOpenPolicy('privacy')}>개인정보 처리방침</button>에 동의합니다.
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

      {openPolicy ? (
        <div className="signup-policy-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpenPolicy('') }}>
          <section className="signup-policy-dialog" role="dialog" aria-modal="true" aria-labelledby="signup-policy-title">
            <h2 id="signup-policy-title">{openPolicy === 'terms' ? '서비스 이용약관' : '개인정보 처리방침'}</h2>
            {openPolicy === 'terms' ? (
              <p>morrow는 회원에게 상품 탐색, 장바구니와 주문 서비스를 제공합니다. 회원은 정확한 정보를 입력하고 타인의 계정을 사용하지 않아야 합니다.</p>
            ) : (
              <p>회원가입과 주문 처리를 위해 이름, 이메일, 주소를 수집합니다. 수집한 정보는 계정 관리와 배송 목적에만 사용합니다.</p>
            )}
            <button type="button" ref={policyCloseButtonRef} onClick={() => setOpenPolicy('')}>확인</button>
          </section>
        </div>
      ) : null}
    </form>
  )
}

export default SignupForm
