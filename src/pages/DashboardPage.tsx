import { motion } from "framer-motion"
import { useState } from "react"
import { useAuth } from "@/context/AuthContext"
import {
  FileText,
  Lightbulb,
  TrendingUp,
  Users,
  Plus,
  ChevronRight,
  Calendar,
  Target,
  Zap,
  Brain,
  GitBranch,
  MessageSquare,
  Award,
  Activity
} from "lucide-react"
import { Link } from "react-router-dom"
import PrimeHero from "@/components/layout/PrimeHero"

const stats = [
  { label: "Papers Analyzed", value: "12,847", change: "+12%", icon: FileText },
  { label: "Gaps Discovered", value: "3,291", change: "+8%", icon: Lightbulb },
  { label: "Research Impact", value: "847", change: "+23%", icon: TrendingUp },
  { label: "Team Members", value: "24", change: "+2", icon: Users },
]

const recentGaps = [
  { id: "1", title: "Efficient long-context attention mechanisms", domain: "NLP", impact: "High", votes: 47 },
  { id: "2", title: "Robust few-shot learning under distribution shift", domain: "Computer Vision", impact: "High", votes: 38 },
  { id: "3", title: "Theoretical guarantees for diffusion models", domain: "Generative AI", impact: "Medium", votes: 29 },
  { id: "4", title: "Causal representation learning without supervision", domain: "Causality", impact: "High", votes: 25 },
]

const trendingPapers = [
  { id: "1", title: "Attention Is All You Need", citations: 125000, year: 2017 },
  { id: "2", title: "BERT: Pre-training of Deep Bidirectional Transformers", citations: 85000, year: 2018 },
  { id: "3", title: "GPT-4 Technical Report", citations: 12000, year: 2023 },
  { id: "4", title: "LLaMA: Open and Efficient Foundation Models", citations: 8500, year: 2023 },
]

const quickActions = [
  { label: "Analyze Paper", icon: FileText, path: "/papers" },
  { label: "Find Gaps", icon: Lightbulb, path: "/gaps" },
  { label: "Knowledge Graph", icon: Activity, path: "/knowledge-graph" },
  { label: "Workflows", icon: GitBranch, path: "/workflows" },
  { label: "Research Chat", icon: MessageSquare, path: "/chat" },
  { label: "Roadmap", icon: Calendar, path: "/roadmap" },
]

const achievements = [
  { id: "1", name: "First Gap Found", icon: Target, earned: true },
  { id: "2", name: "Gap Hunter", icon: Zap, earned: true },
  { id: "3", name: "Trendsetter", icon: TrendingUp, earned: false },
  { id: "4", name: "Researcher", icon: Brain, earned: false },
]

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState<"week" | "month" | "year">("month")
  const { user } = useAuth()

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "High": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      case "Medium": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
      default: return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* PRIME Header */}
      <PrimeHero />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Research Dashboard</h1>
          <p className="text-sm text-[rgb(var(--muted-foreground))] mt-1">
            Welcome back, {user?.name || "Researcher"}. Here's your research overview.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[rgb(var(--muted))] border border-[rgb(var(--border))] rounded-lg p-1">
            {(["week", "month", "year"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  timeRange === range
                    ? "bg-[rgb(var(--card))] shadow-sm"
                    : "text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]"
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
          <button className="btn-primary text-sm">
            <Plus className="w-4 h-4" />
            New Analysis
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="metric-card"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-[rgb(var(--muted-foreground))]">{stat.label}</p>
                <p className="text-2xl font-semibold mt-1">{stat.value}</p>
                <p className="text-xs text-green-600 mt-1">{stat.change} this month</p>
              </div>
              <div className="p-2.5 rounded-lg bg-[rgb(var(--primary))]/10">
                <stat.icon className="w-5 h-5 text-[rgb(var(--primary))]" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {quickActions.map((action, i) => (
          <motion.div
            key={action.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 + i * 0.05 }}
          >
            <Link
              to={action.path}
              className="flex flex-col items-center gap-2 p-4 card text-center hover:border-[rgb(var(--primary))]/30 transition-colors"
            >
              <div className="p-2.5 rounded-lg bg-[rgb(var(--primary))]/10">
                <action.icon className="w-5 h-5 text-[rgb(var(--primary))]" />
              </div>
              <span className="text-sm font-medium">{action.label}</span>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Gaps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 card"
        >
          <div className="flex items-center justify-between p-6 border-b border-[rgb(var(--border))]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[rgb(var(--primary))]/10">
                <Lightbulb className="w-5 h-5 text-[rgb(var(--primary))]" />
              </div>
              <div>
                <h2 className="font-semibold">Recent Research Gaps</h2>
                <p className="text-sm text-[rgb(var(--muted-foreground))]">Latest discoveries from your papers</p>
              </div>
            </div>
            <Link to="/gaps" className="text-sm text-[rgb(var(--primary))] hover:underline flex items-center gap-1">
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-[rgb(var(--border))]">
            {recentGaps.map((gap) => (
              <div key={gap.id} className="flex items-center gap-4 p-4 hover:bg-[rgb(var(--muted))]/30 transition-colors cursor-pointer">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{gap.title}</h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs px-2 py-0.5 bg-[rgb(var(--muted))] rounded text-[rgb(var(--muted-foreground))]">
                      {gap.domain}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${getImpactColor(gap.impact)}`}>
                      {gap.impact} Impact
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-[rgb(var(--muted-foreground))]">
                  <Target className="w-4 h-4" />
                  <span>{gap.votes}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Achievements */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="card"
          >
            <div className="flex items-center gap-3 p-4 border-b border-[rgb(var(--border))]">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Award className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="font-semibold">Achievements</h2>
                <p className="text-sm text-[rgb(var(--muted-foreground))]">Your research milestones</p>
              </div>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`p-3 rounded-lg border transition-colors ${
                    achievement.earned
                      ? "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800"
                      : "bg-[rgb(var(--muted))] border-[rgb(var(--border))] opacity-50"
                  }`}
                >
                  <div className={`p-1.5 rounded-md w-fit ${
                    achievement.earned ? "bg-amber-100 dark:bg-amber-900/40" : "bg-[rgb(var(--secondary))]"
                  }`}>
                    <achievement.icon className={`w-4 h-4 ${
                      achievement.earned ? "text-amber-600" : "text-[rgb(var(--muted-foreground))]"
                    }`} />
                  </div>
                  <p className="text-sm font-medium mt-2">{achievement.name}</p>
                  {achievement.earned && (
                    <p className="text-xs text-amber-600 mt-0.5">Earned!</p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Trending Papers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card"
          >
            <div className="flex items-center gap-3 p-4 border-b border-[rgb(var(--border))]">
              <div className="p-2 rounded-lg bg-[rgb(var(--primary))]/10">
                <TrendingUp className="w-5 h-5 text-[rgb(var(--primary))]" />
              </div>
              <div>
                <h2 className="font-semibold">Trending Papers</h2>
                <p className="text-sm text-[rgb(var(--muted-foreground))]">Most discussed in your field</p>
              </div>
            </div>
            <div className="divide-y divide-[rgb(var(--border))]">
              {trendingPapers.map((paper, i) => (
                <div key={paper.id} className="flex items-center gap-3 p-3">
                  <span className="text-sm font-medium text-[rgb(var(--muted-foreground))] w-5">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{paper.title}</p>
                    <p className="text-xs text-[rgb(var(--muted-foreground))]">
                      {paper.year} · {paper.citations.toLocaleString()} citations
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}
