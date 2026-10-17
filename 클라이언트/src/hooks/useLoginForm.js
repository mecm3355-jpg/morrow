import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { saveStoredAuth } from '../utils/authStorage'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const initialForm = {
  email: '',
  password: '',
}

function useLoginForm() {
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
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

    if (!form.email.trim() || !form.password) {
      setMessage({ type: 'error', text: '이메일과 비밀번호를 모두 입력해 주세요.' })
      return
    }

    if (form.password.length < 8) {
      setMessage({ type: 'error', text: '비밀번호를 8자 이상 입력해 주세요.' })
      return
    }

    try {
      setIsSubmitting(true)
      const response = await fetch(`${API_URL}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
        }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.message || '로그인에 실패했습니다.')
      }

      saveStoredAuth({
        token: data.token,
        tokenType: data.tokenType,
        user: data.user,
      })
      navigate('/', {
        replace: true,
        state: {
          toastMessage: `${data.user?.name || '회원'}님, 환영합니다.`,
        },
      })
    } catch (error) {
      setMessage({ type: 'error', text: error.message || '서버에 연결할 수 없습니다.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    form,
    showPassword,
    isSubmitting,
    message,
    handleChange,
    handleSubmit,
    setShowPassword,
  }
}

export default useLoginForm
