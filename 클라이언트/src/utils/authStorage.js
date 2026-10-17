const AUTH_STORAGE_KEY = 'morrow.auth.v1'

function clearStoredAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}

function getStoredAuth() {
  try {
    const value = localStorage.getItem(AUTH_STORAGE_KEY)
    const auth = value ? JSON.parse(value) : null

    if (!auth || typeof auth.token !== 'string' || !auth.token) {
      clearStoredAuth()
      return null
    }

    return auth
  } catch {
    clearStoredAuth()
    return null
  }
}

function saveStoredAuth(data) {
  const auth = {
    token: data.token,
    tokenType: data.tokenType || 'Bearer',
    user: {
      _id: data.user?._id,
      email: data.user?.email,
      name: data.user?.name,
      user_type: data.user?.user_type,
    },
  }

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth))
}

export { clearStoredAuth, getStoredAuth, saveStoredAuth }
