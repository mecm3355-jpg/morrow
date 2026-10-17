import { useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const initialForm = {
  name: '',
  email: '',
  password: '',
  user_type: 'customer',
  address: '',
}

function useSignupForm() {
  const [form, setForm] = useState(initialForm)
  const [agreed, setAgreed] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage({ type: '', text: '' })

    if (form.password.length < 8) {
      setMessage({ type: 'error', text: '비밀번호를 8자 이상 입력해 주세요.' })
      return
    }

    if (!agreed) {
      setMessage({ type: 'error', text: '서비스 이용약관과 개인정보 처리방침에 동의해 주세요.' })
      return
    }

    const payload = { ...form }
    if (!payload.address.trim()) {
      delete payload.address
    }

    try {
      setIsSubmitting(true)
      const response = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.message || '회원가입에 실패했습니다.')
      }

      setForm(initialForm)
      setAgreed(false)
      setMessage({ type: 'success', text: `${data.name || '회원'}님, 계정이 만들어졌습니다!` })
    } catch (error) {
      setMessage({ type: 'error', text: error.message || '서버에 연결할 수 없습니다.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    form,
    agreed,
    showPassword,
    isSubmitting,
    message,
    handleChange,
    handleSubmit,
    setAgreed,
    setShowPassword,
  }
}

export default useSignupForm
