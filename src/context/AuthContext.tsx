import { createContext, useContext, useState, useEffect, useCallback } from "react"
import type { ReactNode } from "react"
import * as authApi from "@/auth/api"

interface User {
  id: string
  email: string
  name: string
  avatar?: string
  created_at?: Date
  updated_at?: Date
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  register: (name: string, email: string, password: string) => Promise<boolean>
  logout: () => void
  updateProfile: (updates: { name?: string; avatar?: string }) => Promise<boolean>
  showAuthModal: boolean
  setShowAuthModal: (show: boolean) => void
  authModalMode: 'login' | 'register'
  setAuthModalMode: (mode: 'login' | 'register') => void
  loginWithGoogle: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login')

  const loadUser = useCallback(async () => {
    try {
      const response = await authApi.getCurrentUser()
      if (response.success && response.data) {
        setUser(response.data)
      }
    } catch {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    try {
      const response = await authApi.login(email, password)
      if (response.success && response.data) {
        setUser(response.data.user)
        return true
      }
      return false
    } catch {
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    try {
      const response = await authApi.register(email, password, name)
      if (response.success && response.data) {
        setUser(response.data.user)
        return true
      }
      return false
    } catch {
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    await authApi.logout()
    setUser(null)
  }

  const loginWithGoogle = async (): Promise<boolean> => {
    setIsLoading(true)
    try {
      const response = await authApi.loginWithGoogle()
      if (response.success && response.data) {
        setUser(response.data.user)
        return true
      }
      return false
    } catch {
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const updateProfile = async (updates: { name?: string; avatar?: string }): Promise<boolean> => {
    try {
      const response = await authApi.updateProfile(updates)
      if (response.success && response.data) {
        setUser(response.data)
        return true
      }
      return false
    } catch {
      return false
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
        showAuthModal,
        setShowAuthModal,
        authModalMode,
        setAuthModalMode,
        loginWithGoogle,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
