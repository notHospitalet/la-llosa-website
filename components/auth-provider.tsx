"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"

type User = {
  id: string
  name: string
  email: string
  tipo: string
  dni?: string
  imagenPerfil?: string
}

type AuthContextType = {
  user: User | null
  isLoggedIn: boolean
  isLoading: boolean
  login: (user: User, token: string) => void
  logout: () => void
  checkAuth: () => boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoggedIn: false,
  isLoading: true,
  login: () => {},
  logout: () => {},
  checkAuth: () => false,
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Verificar si hay una sesión guardada
    const checkSession = () => {
      const token = localStorage.getItem("auth_token")
      const storedUser = localStorage.getItem("user")

      if (token && storedUser) {
        try {
          // Verificar si el token ha expirado
          const tokenData = JSON.parse(atob(token))
          if (tokenData.exp < Date.now()) {
            // Token expirado
            localStorage.removeItem("auth_token")
            localStorage.removeItem("user")
            setIsLoggedIn(false)
            setUser(null)
          } else {
            const parsedUser = JSON.parse(storedUser)
            setUser(parsedUser)
            setIsLoggedIn(true)
            // Actualizar localStorage para mantener la sesión activa
            localStorage.setItem("isLoggedIn", "true")
          }
        } catch (error) {
          console.error("Error parsing user data:", error)
          localStorage.removeItem("auth_token")
          localStorage.removeItem("user")
          localStorage.removeItem("isLoggedIn")
          setIsLoggedIn(false)
          setUser(null)
        }
      } else {
        localStorage.removeItem("isLoggedIn")
        setIsLoggedIn(false)
        setUser(null)
      }

      setIsLoading(false)
    }

    checkSession()
  }, [])

  const login = (userData: User, token: string) => {
    setUser(userData)
    setIsLoggedIn(true)
    localStorage.setItem("auth_token", token)
    localStorage.setItem("user", JSON.stringify(userData))
    localStorage.setItem("isLoggedIn", "true")
  }

  const logout = () => {
    setUser(null)
    setIsLoggedIn(false)
    localStorage.removeItem("auth_token")
    localStorage.removeItem("user")
    localStorage.removeItem("isLoggedIn")
    router.push("/")
  }

  const checkAuth = (): boolean => {
    const token = localStorage.getItem("auth_token")
    if (!token) return false

    try {
      const tokenData = JSON.parse(atob(token))
      return tokenData.exp > Date.now()
    } catch {
      return false
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoggedIn, isLoading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

