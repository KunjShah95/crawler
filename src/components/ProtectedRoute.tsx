import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { motion } from "framer-motion"
import { Loader2 } from "lucide-react"
import { useEffect } from "react"

interface ProtectedRouteProps {
    children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { isAuthenticated, isLoading, setShowAuthModal, setAuthModalMode } = useAuth()
    const location = useLocation()

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            setAuthModalMode("login")
            setShowAuthModal(true)
        }
    }, [isLoading, isAuthenticated, setAuthModalMode, setShowAuthModal])

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-4"
                >
                    <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--brand-primary))]" />
                    <p className="text-[hsl(var(--muted-foreground))]">Loading...</p>
                </motion.div>
            </div>
        )
    }

    if (!isAuthenticated) {
        // Navigate to home page where the modal will appear
        return <Navigate to="/" state={{ from: location }} replace />
    }

    return <>{children}</>
}
