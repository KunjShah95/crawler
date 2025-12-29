import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    updateProfile,
    type User as FirebaseUser,
} from "firebase/auth"
import { auth, googleProvider } from "@/lib/firebase"

interface User {
    id: string
    email: string
    name: string
    avatar?: string
}

interface AuthContextType {
    user: User | null
    isAuthenticated: boolean
    isLoading: boolean
    login: (email: string, password: string) => Promise<void>
    register: (name: string, email: string, password: string) => Promise<void>
    loginWithGoogle: () => Promise<void>
    logout: () => void
    showAuthModal: boolean
    setShowAuthModal: (show: boolean) => void
    authModalMode: "signin" | "register"
    setAuthModalMode: (mode: "signin" | "register") => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Convert Firebase user to our User interface
function mapFirebaseUser(firebaseUser: FirebaseUser): User {
    return {
        id: firebaseUser.uid,
        email: firebaseUser.email || "",
        name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
        avatar: firebaseUser.photoURL || undefined,
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const navigate = useNavigate()
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [showAuthModal, setShowAuthModal] = useState(false)
    const [authModalMode, setAuthModalMode] = useState<"signin" | "register">("signin")

    // Listen for auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                setUser(mapFirebaseUser(firebaseUser))
            } else {
                setUser(null)
            }
            setIsLoading(false)
        })

        return () => unsubscribe()
    }, [])

    const login = async (email: string, password: string) => {
        if (!email || !password) {
            throw new Error("Please enter both email and password")
        }

        try {
            await signInWithEmailAndPassword(auth, email, password)
            setShowAuthModal(false)
            navigate("/dashboard")
        } catch (error: unknown) {
            const firebaseError = error as { code?: string; message?: string }
            if (firebaseError.code === "auth/user-not-found") {
                throw new Error("No account found with this email")
            } else if (firebaseError.code === "auth/wrong-password") {
                throw new Error("Incorrect password")
            } else if (firebaseError.code === "auth/invalid-email") {
                throw new Error("Invalid email address")
            } else if (firebaseError.code === "auth/invalid-credential") {
                throw new Error("Invalid email or password")
            } else {
                throw new Error(firebaseError.message || "Failed to sign in")
            }
        }
    }

    const register = async (name: string, email: string, password: string) => {
        if (!name || !email || !password) {
            throw new Error("Please fill in all fields")
        }

        if (password.length < 6) {
            throw new Error("Password must be at least 6 characters")
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password)
            // Update the user's display name
            await updateProfile(userCredential.user, { displayName: name })
            // Update local state with the name
            setUser(mapFirebaseUser({ ...userCredential.user, displayName: name } as FirebaseUser))
            setShowAuthModal(false)
            navigate("/dashboard")
        } catch (error: unknown) {
            const firebaseError = error as { code?: string; message?: string }
            if (firebaseError.code === "auth/email-already-in-use") {
                throw new Error("An account with this email already exists")
            } else if (firebaseError.code === "auth/invalid-email") {
                throw new Error("Invalid email address")
            } else if (firebaseError.code === "auth/weak-password") {
                throw new Error("Password is too weak")
            } else {
                throw new Error(firebaseError.message || "Failed to create account")
            }
        }
    }



    const loginWithGoogle = async () => {
        try {
            await signInWithPopup(auth, googleProvider)
            setShowAuthModal(false)
            navigate("/dashboard")
        } catch (error: unknown) {
            const firebaseError = error as { code?: string; message?: string }
            if (firebaseError.code === "auth/popup-closed-by-user") {
                // User closed the popup, don't throw error
                return
            }
            throw new Error(firebaseError.message || "Failed to sign in with Google")
        }
    }

    const logout = () => {
        signOut(auth)
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isLoading,
                login,
                register,
                loginWithGoogle,
                logout,
                showAuthModal,
                setShowAuthModal,
                authModalMode,
                setAuthModalMode,
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
