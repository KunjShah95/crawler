import { Link, useLocation, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import {
    FileSearch,
    Menu,
    X,
    Sparkles,
    FolderOpen,
    LogIn,
    LogOut,
    ChevronDown,
    Search,
    Lightbulb,
    LayoutDashboard
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { CommandPalette } from "@/components/ui/command-palette"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { useAuth } from "@/context/AuthContext"

// Public navigation items (visible on landing page)
const publicNavItems = [
    { name: "About", href: "#about" },
    { name: "Features", href: "#features" },
    { name: "How It Works", href: "#how-it-works" },
    { name: "Pricing", href: "#pricing" },
    { name: "FAQ", href: "#faq" },
    { name: "Contact", href: "#contact" },
]

const appNavItems = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Crawl", path: "/crawl", icon: FileSearch },
    { name: "Explore", path: "/explore", icon: Search },
    { name: "Insights", path: "/insights", icon: Lightbulb },
    { name: "Assistant", path: "/assistant", icon: Sparkles },
    { name: "Collections", path: "/collections", icon: FolderOpen },
]

export function Navbar() {
    const location = useLocation()
    const navigate = useNavigate()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [userMenuOpen, setUserMenuOpen] = useState(false)
    const { isAuthenticated, user, logout, setShowAuthModal, setAuthModalMode } = useAuth()

    const isHomePage = location.pathname === "/"
    const showPublicNav = isHomePage && !isAuthenticated

    const handleSignIn = () => {
        setAuthModalMode("login")
        setShowAuthModal(true)
        setMobileMenuOpen(false)
    }

    const handleSignUp = () => {
        setAuthModalMode("register")
        setShowAuthModal(true)
        setMobileMenuOpen(false)
    }

    const handleLogout = () => {
        logout()
        setUserMenuOpen(false)
        setMobileMenuOpen(false)
        navigate("/")
    }

    const handleNavClick = (item: typeof appNavItems[0]) => {
        if (!isAuthenticated) {
            setAuthModalMode("login")
            setShowAuthModal(true)
            setMobileMenuOpen(false)
            return
        }
        navigate(item.path)
        setMobileMenuOpen(false)
    }

    const scrollToSection = (href: string) => {
        setMobileMenuOpen(false)
        if (location.pathname !== "/") {
            navigate("/")
            setTimeout(() => {
                document.querySelector(href)?.scrollIntoView({ behavior: "smooth" })
            }, 100)
        } else {
            document.querySelector(href)?.scrollIntoView({ behavior: "smooth" })
        }
    }

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/80 backdrop-blur-lg">
            <div className="container-wide">
                <div className="flex h-16 items-center justify-between">
                    {/* Logo */}
                    <Link to={isAuthenticated ? "/dashboard" : "/"} className="flex items-center gap-2 group">
                        <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] transition-transform group-hover:scale-105">
                            <FileSearch className="h-5 w-5" />
                            <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[hsl(var(--brand-primary))] text-[8px] font-bold text-white">
                                AI
                            </div>
                        </div>
                        <span className="text-xl font-bold tracking-tight">
                            Gap<span className="text-[hsl(var(--brand-primary))]">Miner</span>
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden lg:flex items-center gap-1">
                        {showPublicNav ? (
                            // Public navigation for landing page
                            <>
                                {publicNavItems.map((item) => (
                                    <button
                                        key={item.name}
                                        onClick={() => scrollToSection(item.href)}
                                        className="px-4 py-2 text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                                    >
                                        {item.name}
                                    </button>
                                ))}
                            </>
                        ) : isAuthenticated ? (
                            // App navigation for authenticated users
                            <>
                                {appNavItems.slice(0, 5).map((item) => {
                                    const isActive = location.pathname === item.path
                                    return (
                                        <button
                                            key={item.name}
                                            onClick={() => handleNavClick(item)}
                                            className="relative"
                                        >
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className={cn(
                                                    "gap-1.5 transition-all",
                                                    isActive && "bg-[hsl(var(--accent))]"
                                                )}
                                            >
                                                <item.icon className="h-4 w-4" />
                                                {item.name}
                                                {isActive && (
                                                    <motion.div
                                                        layoutId="activeTab"
                                                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-[hsl(var(--primary))]"
                                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                    />
                                                )}
                                            </Button>
                                        </button>
                                    )
                                })}
                                <div className="border-l border-[hsl(var(--border))] pl-1 ml-1">
                                    <button onClick={() => handleNavClick(appNavItems[5])}>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className={cn(
                                                "gap-1.5",
                                                location.pathname === "/collections" && "bg-[hsl(var(--accent))]"
                                            )}
                                        >
                                            <FolderOpen className="h-4 w-4" />
                                            Collections
                                        </Button>
                                    </button>
                                </div>
                            </>
                        ) : (
                            // Show public nav for unauthenticated users not on home page
                            <>
                                {publicNavItems.map((item) => (
                                    <button
                                        key={item.name}
                                        onClick={() => scrollToSection(item.href)}
                                        className="px-4 py-2 text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                                    >
                                        {item.name}
                                    </button>
                                ))}
                            </>
                        )}
                    </div>

                    {/* Right Side Actions */}
                    <div className="hidden md:flex items-center gap-2">
                        {isAuthenticated && <CommandPalette />}
                        <ThemeToggle />

                        {isAuthenticated ? (
                            <div className="relative">
                                <button
                                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[hsl(var(--accent))] transition-colors"
                                >
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--brand-primary))] text-white font-medium text-sm">
                                        {user?.name?.charAt(0).toUpperCase() || "U"}
                                    </div>
                                    <span className="text-sm font-medium max-w-[100px] truncate">
                                        {user?.name}
                                    </span>
                                    <ChevronDown className={cn("h-4 w-4 transition-transform", userMenuOpen && "rotate-180")} />
                                </button>

                                {/* User Dropdown */}
                                {userMenuOpen && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-40"
                                            onClick={() => setUserMenuOpen(false)}
                                        />
                                        <motion.div
                                            initial={{ opacity: 0, y: 8, scale: 0.96 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 8, scale: 0.96 }}
                                            className="absolute right-0 top-full mt-2 w-56 z-50"
                                        >
                                            <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg shadow-lg overflow-hidden">
                                                <div className="p-3 border-b border-[hsl(var(--border))]">
                                                    <p className="font-medium text-sm">{user?.name}</p>
                                                    <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                                                        {user?.email}
                                                    </p>
                                                </div>
                                                <div className="p-1">
                                                    <Link
                                                        to="/dashboard"
                                                        onClick={() => setUserMenuOpen(false)}
                                                        className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-[hsl(var(--accent))] transition-colors"
                                                    >
                                                        <LayoutDashboard className="h-4 w-4" />
                                                        Dashboard
                                                    </Link>
                                                    <button
                                                        onClick={handleLogout}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-red-500/10 text-red-500 transition-colors"
                                                    >
                                                        <LogOut className="h-4 w-4" />
                                                        Sign Out
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" className="gap-1" onClick={handleSignIn}>
                                    <LogIn className="h-4 w-4" />
                                    Sign In
                                </Button>
                                <Button size="sm" className="gap-1" onClick={handleSignUp}>
                                    Get Started
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Mobile Menu Toggle */}
                    <div className="flex md:hidden items-center gap-2">
                        <ThemeToggle />
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="md:hidden border-t border-[hsl(var(--border))] bg-[hsl(var(--background))]"
                >
                    <div className="container-wide py-4 space-y-2">
                        {/* User Info for authenticated users */}
                        {isAuthenticated && (
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-[hsl(var(--muted))] mb-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--brand-primary))] text-white font-medium">
                                    {user?.name?.charAt(0).toUpperCase() || "U"}
                                </div>
                                <div>
                                    <p className="font-medium">{user?.name}</p>
                                    <p className="text-xs text-[hsl(var(--muted-foreground))]">{user?.email}</p>
                                </div>
                            </div>
                        )}

                        {/* Navigation Items */}
                        {showPublicNav || !isAuthenticated ? (
                            // Public navigation
                            <>
                                {publicNavItems.map((item) => (
                                    <button
                                        key={item.name}
                                        onClick={() => scrollToSection(item.href)}
                                        className="w-full text-left"
                                    >
                                        <Button variant="ghost" className="w-full justify-start">
                                            {item.name}
                                        </Button>
                                    </button>
                                ))}
                            </>
                        ) : (
                            // App navigation
                            <>
                                {appNavItems.map((item) => {
                                    const isActive = location.pathname === item.path
                                    return (
                                        <button
                                            key={item.name}
                                            onClick={() => handleNavClick(item)}
                                            className="w-full"
                                        >
                                            <Button
                                                variant={isActive ? "secondary" : "ghost"}
                                                className="w-full justify-start gap-2"
                                            >
                                                <item.icon className="h-4 w-4" />
                                                {item.name}
                                            </Button>
                                        </button>
                                    )
                                })}
                            </>
                        )}

                        <div className="pt-4 border-t border-[hsl(var(--border))] space-y-2">
                            {isAuthenticated ? (
                                <Button
                                    variant="outline"
                                    className="w-full gap-2 text-red-500 border-red-500/30 hover:bg-red-500/10"
                                    onClick={handleLogout}
                                >
                                    <LogOut className="h-4 w-4" />
                                    Sign Out
                                </Button>
                            ) : (
                                <>
                                    <Button className="w-full gap-2" onClick={handleSignUp}>
                                        <Sparkles className="h-4 w-4" />
                                        Get Started Free
                                    </Button>
                                    <Button variant="outline" className="w-full gap-2" onClick={handleSignIn}>
                                        <LogIn className="h-4 w-4" />
                                        Sign In
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
        </nav>
    )
}
