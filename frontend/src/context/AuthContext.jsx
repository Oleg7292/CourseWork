import React, { createContext, useState, useCallback } from 'react'
import { setToken, clearToken, setUnauthorizedHandler, api } from '../api'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setTokenState] = useState(null)
  const [loading, setLoading] = useState(false)

  const logout = useCallback(() => {
    clearToken()
    setTokenState(null)
    setUser(null)
  }, [])

  React.useEffect(() => {
    setUnauthorizedHandler(logout)
  }, [logout])

  const login = async (username, password) => {
    setLoading(true)
    try {
      const data = await api.login({ username, password })
      setToken(data.token)
      setTokenState(data.token)
      setUser(data.user)
      return data
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
