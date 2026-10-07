import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { jwtDecode } from 'jwt-decode'
import { api, setAccessToken } from '../api/client'

const AuthContext = createContext(null)

function decodeUser(token) {
  if (!token) return null
  const payload = jwtDecode(token)
  return { id: payload.sub, role: payload.role, email: payload.email, name: payload.name }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const applyToken = useCallback((token) => {
    setAccessToken(token)
    setUser(decodeUser(token))
  }, [])

  useEffect(() => {
    // attempt silent refresh on load using the httpOnly refresh cookie
    api.post('/auth/refresh')
      .then((res) => applyToken(res.data.accessToken))
      .catch(() => applyToken(null))
      .finally(() => setLoading(false))
  }, [applyToken])

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    applyToken(res.data.accessToken)
    return decodeUser(res.data.accessToken)
  }, [applyToken])

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => {})
    applyToken(null)
  }, [applyToken])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
