import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { clearStoredAuth, getStoredAuth, saveStoredAuth } from '../utils/authStorage'

const API_URL = import.meta.env.VITE_API_URL || ''

function AdminRoute() {
  const location = useLocation()
  const [auth] = useState(getStoredAuth)
  const [access, setAccess] = useState(() => auth
    ? { status: 'checking', reason: '' }
    : { status: 'denied', reason: 'login' })

  useEffect(() => {
    if (!auth) return undefined

    const controller = new AbortController()

    async function verifyAdmin() {
      try {
        const response = await fetch(`${API_URL}/api/users/me`, {
          headers: {
            Accept: 'application/json',
            Authorization: `${auth.tokenType || 'Bearer'} ${auth.token}`,
          },
          signal: controller.signal,
        })
        const user = await response.json().catch(() => ({}))

        if (!response.ok) {
          if (response.status === 401) clearStoredAuth()
          setAccess({ status: 'denied', reason: response.status === 401 ? 'login' : 'forbidden' })
          return
        }

        const userType = typeof user.user_type === 'string' ? user.user_type.trim().toLowerCase() : ''
        if (userType !== 'admin') {
          setAccess({ status: 'denied', reason: 'forbidden' })
          return
        }

        saveStoredAuth({ ...auth, user })
        setAccess({ status: 'allowed', reason: '' })
      } catch (error) {
        if (error.name !== 'AbortError') {
          setAccess({ status: 'denied', reason: 'unavailable' })
        }
      }
    }

    verifyAdmin()
    return () => controller.abort()
  }, [auth])

  if (access.status === 'checking') {
    return <div className="page-loading" role="status">관리자 권한을 확인하고 있습니다...</div>
  }

  if (access.status === 'denied') {
    if (access.reason === 'login') {
      return <Navigate to="/login" replace state={{ from: location.pathname, message: '관리자 로그인이 필요합니다.' }} />
    }

    const toastMessage = access.reason === 'unavailable'
      ? '서버에 연결할 수 없어 관리자 권한을 확인하지 못했습니다.'
      : '관리자만 접근할 수 있는 페이지입니다.'
    return <Navigate to="/" replace state={{ toastMessage }} />
  }

  return <Outlet />
}

export default AdminRoute
