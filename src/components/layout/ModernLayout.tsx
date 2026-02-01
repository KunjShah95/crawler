import { useState } from "react"
import { Outlet, NavLink } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { useTeam } from "@/context/TeamContext"
import { motion, AnimatePresence } from "framer-motion"
import {
  LayoutDashboard,
  FileText,
  Lightbulb,
  Network,
  GitBranch,
  MessageSquare,
  BookOpen,
  Database,
  Users,
  Settings,
  Download,
  Bell,
  Search,
  Menu,
  X,
  Sparkles,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  User
} from "lucide-react"
import { CommandPalette } from "@/components/ui/command-palette"

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/papers", label: "Papers", icon: FileText },
  { path: "/gaps", label: "Gaps", icon: Lightbulb, badge: "24" },
  { path: "/knowledge-graph", label: "Knowledge", icon: Network },
  { path: "/workflows", label: "Workflows", icon: GitBranch },
  { path: "/chat", label: "Chat", icon: MessageSquare },
  { path: "/literature-review", label: "Reviews", icon: BookOpen },
  { path: "/datasets", label: "Datasets", icon: Database },
]

const bottomNavItems = [
  { path: "/analytics", label: "Analytics", icon: BarChart3 },
  { path: "/export", label: "Export", icon: Download },
  { path: "/team", label: "Team", icon: Users },
  { path: "/settings", label: "Settings", icon: Settings },
]

export function ModernLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user } = useAuth()
  const { currentTeam } = useTeam()

  return (
    <div className="flex h-screen bg-[rgb(var(--background))] overflow-hidden">
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : 256 }}
        className="hidden lg:flex flex-col border-r border-[rgb(var(--border))] bg-[rgb(var(--card))] fixed left-0 top-0 h-full z-40"
      >
        <div className="flex items-center h-14 px-4 border-b border-[rgb(var(--border))]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[linear-gradient(135deg,rgb(var(--primary)),rgb(139,92,246))] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="font-semibold text-sm whitespace-nowrap"
                >
                  GapMiner
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        <nav className="flex-1 py-3 overflow-y-auto">
          <ul className="space-y-0.5 px-2">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? "bg-[rgb(var(--primary))] text-white shadow-sm"
                        : "text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))] hover:bg-[rgb(var(--muted))]"
                    }`
                  }
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        className="whitespace-nowrap overflow-hidden"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {item.badge && !collapsed && (
                    <span className="ml-auto px-1.5 py-0.5 text-xs font-medium bg-white/20 rounded-md">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-[rgb(var(--border))] py-3">
          <ul className="space-y-0.5 px-2">
            {bottomNavItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? "bg-[rgb(var(--primary))] text-white shadow-sm"
                        : "text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))] hover:bg-[rgb(var(--muted))]"
                    }`
                  }
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        className="whitespace-nowrap overflow-hidden"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center h-10 border-t border-[rgb(var(--border))] text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--muted))] transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </motion.aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              className="fixed left-0 top-0 h-full w-72 bg-[rgb(var(--card))] border-r border-[rgb(var(--border))] z-50 lg:hidden flex flex-col"
            >
              <div className="flex items-center justify-between h-14 px-4 border-b border-[rgb(var(--border))]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[linear-gradient(135deg,rgb(var(--primary)),rgb(139,92,246))] flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-semibold text-sm">GapMiner</span>
                </div>
                <button onClick={() => setMobileOpen(false)} className="p-1.5 hover:bg-[rgb(var(--muted))] rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <nav className="flex-1 py-3 overflow-y-auto">
                <ul className="space-y-0.5 px-2">
                  {[...navItems, ...bottomNavItems].map((item) => (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            isActive
                              ? "bg-[rgb(var(--primary))] text-white"
                              : "text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))] hover:bg-[rgb(var(--muted))]"
                          }`
                        }
                      >
                        <item.icon className="w-5 h-5" />
                        <span>{item.label}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className={`flex-1 flex flex-col ${collapsed ? "lg:pl-[72px]" : "lg:pl-[256px]"} transition-all duration-200`}>
        <header className="sticky top-0 z-30 h-14 border-b border-[rgb(var(--border))] bg-[rgb(var(--background))]/80 backdrop-blur-md">
          <div className="flex items-center justify-between h-full px-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden p-1.5 hover:bg-[rgb(var(--muted))] rounded-lg"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[rgb(var(--muted))] border border-[rgb(var(--border))] rounded-lg text-sm text-[rgb(var(--muted-foreground))] w-64">
                <Search className="w-4 h-4" />
                <span>Search...</span>
                <kbd className="ml-auto px-1.5 py-0.5 text-xs bg-[rgb(var(--card))] rounded border border-[rgb(var(--border))] mono">⌘K</kbd>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {currentTeam && (
                <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-[rgb(var(--primary))]/10 border border-[rgb(var(--primary))]/20 rounded-lg">
                  <Users className="w-3.5 h-3.5 text-[rgb(var(--primary))]" />
                  <span className="text-xs font-medium text-[rgb(var(--primary))]">{currentTeam.name}</span>
                </div>
              )}

              <button className="relative p-1.5 hover:bg-[rgb(var(--muted))] rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-[rgb(var(--primary))] rounded-full" />
              </button>

              <div className="flex items-center gap-2 pl-3 border-l border-[rgb(var(--border))]">
                <div className="hidden sm:block text-right leading-tight">
                  <p className="text-sm font-medium">{user?.name || "Guest"}</p>
                  <p className="text-xs text-[rgb(var(--muted-foreground))]">Pro</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-[linear-gradient(135deg,rgb(var(--primary)),rgb(139,92,246))] flex items-center justify-center overflow-hidden">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-white" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <CommandPalette />
    </div>
  )
}
