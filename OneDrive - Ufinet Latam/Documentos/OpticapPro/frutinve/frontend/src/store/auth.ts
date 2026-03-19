import { createContext, useContext, useReducer, useEffect } from 'react'
import { setToken, clearToken } from '../api/client'

export interface AuthUser {
  id: string | number
  username: string
  name: string
  role: 'admin' | 'bodeguero' | 'ventas' | 'compras' | 'auditor'
}

interface AuthState {
  token: string | null
  user: AuthUser | null
}

type AuthAction =
  | { type: 'LOGIN'; token: string; user: AuthUser }
  | { type: 'LOGOUT' }

const TOKEN_KEY = 'frutinve_token'
const USER_KEY = 'frutinve_user'

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN':
      setToken(action.token)
      localStorage.setItem(USER_KEY, JSON.stringify(action.user))
      return { token: action.token, user: action.user }
    case 'LOGOUT':
      clearToken()
      localStorage.removeItem(USER_KEY)
      return { token: null, user: null }
    default:
      return state
  }
}

function getInitialState(): AuthState {
  const token = localStorage.getItem(TOKEN_KEY)
  const userRaw = localStorage.getItem(USER_KEY)
  if (token && userRaw) {
    try {
      const user = JSON.parse(userRaw) as AuthUser
      return { token, user }
    } catch {
      // ignore
    }
  }
  return { token: null, user: null }
}

import React from 'react'

interface AuthContextValue {
  state: AuthState
  login: (token: string, user: AuthUser) => void
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, undefined, getInitialState)

  useEffect(() => {
    // keep token in sync if it changes externally
  }, [])

  const login = (token: string, user: AuthUser) => {
    dispatch({ type: 'LOGIN', token, user })
  }

  const logout = () => {
    dispatch({ type: 'LOGOUT' })
  }

  return React.createElement(AuthContext.Provider, { value: { state, login, logout } }, children)
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
