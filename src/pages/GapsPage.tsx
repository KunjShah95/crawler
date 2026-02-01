import { useState } from "react"
import { motion } from "framer-motion"
import {
  Lightbulb,
  Search,
  Filter,
  TrendingUp,
  Target,
  Brain,
  Zap,
  ChevronRight,
  Star,
  Plus,
  Tag,
  Calendar,
  Users,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock
} from "lucide-react"

const gapCategories = [
  { id: "all", label: "All Gaps", count: 24 },
  { id: "data", label: "Data Gaps", count: 8 },
  { id: "methodology", label: "Methodology", count: 6 },
  { id: "theory", label: "Theoretical", count: 5 },
  { id: "evaluation", label: "Evaluation", count: 5 },
]

const gaps = [
  { id: "1", title: "Efficient long-context attention mechanisms", domain: "NLP", type: "methodology", impact: "high", difficulty: "hard", status: "active", votes: 47, papers: 3, description: "Current attention mechanisms scale quadratically with sequence length, limiting practical applications to longer contexts." },
  { id: "2", title: "Robust few-shot learning under distribution shift", domain: "Computer Vision", type: "data", impact: "high", difficulty: "hard", status: "active", votes: 38, papers: 2, description: "Existing few-shot methods fail when test distribution differs significantly from training distribution." },
  { id: "3", title: "Theoretical guarantees for diffusion models", domain: "Generative AI", type: "theory", impact: "medium", difficulty: "expert", status: "active", votes: 29, papers: 4, description: "Despite empirical success, theoretical understanding of diffusion model convergence remains limited." },
  { id: "4", title: "Causal representation learning without supervision", domain: "Causality", type: "methodology", impact: "high", difficulty: "expert", status: "new", votes: 25, papers: 1, description: "Learning causal representations typically requires intervention or strong assumptions." },
  { id: "5", title: "Efficient dataset distillation for billion-scale data", domain: "Data", type: "evaluation", impact: "medium", difficulty: "medium", status: "active", votes: 22, papers: 2, description: "Current dataset distillation methods don't scale to real-world large-scale datasets." },
  { id: "6", title: "Cross-modal retrieval with unseen concepts", domain: "Multimodal", type: "methodology", impact: "high", difficulty: "hard", status: "active", votes: 20, papers: 3, description: "Zero-shot cross-modal retrieval remains challenging for novel concept categories." },
]

const impactColors: Record<string, string> = {
  high: "bg-red-500/20 text-red-400 border-red-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-green-500/20 text-green-400 border-green-500/30",
}

const difficultyColors: Record<string, string> = {
  expert: "from-purple-500 to-pink-500",
  hard: "from-red-500 to-orange-500",
  medium: "from-yellow-500 to-amber-500",
  easy: "from-green-500 to-emerald-500",
}

export default function GapsPage() {
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Research Gaps
          </h1>
          <p className="text-slate-400 mt-1">Discover and prioritize research opportunities</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-xl font-medium hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" />
          Propose New Gap
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Gaps", value: "24", icon: Lightbulb, color: "from-violet-500 to-purple-500" },
          { label: "High Impact", value: "8", icon: TrendingUp, color: "from-red-500 to-orange-500" },
          { label: "Active Research", value: "12", icon: Zap, color: "from-yellow-500 to-amber-500" },
          { label: "Team Contributed", value: "6", icon: Users, color: "from-blue-500 to-cyan-500" },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white/5 border border-white/10 rounded-xl p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">{stat.label}</p>
                <p className="text-3xl font-bold mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} opacity-80`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search gaps by title, domain, or keyword..."
            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors"
          />
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
            <Filter className="w-4 h-4" />
            <span className="text-sm">Filters</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="text-sm">AI Sort</span>
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        {gapCategories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              selectedCategory === category.id
                ? "bg-violet-500 text-white"
                : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <span>{category.label}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              selectedCategory === category.id ? "bg-white/20" : "bg-white/10"
            }`}>
              {category.count}
            </span>
          </button>
        ))}
      </div>

      {/* Gaps Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {gaps.map((gap, index) => (
          <motion.div
            key={gap.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-violet-500/30 transition-all cursor-pointer"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${impactColors[gap.impact]}`}>
                    {gap.impact} impact
                  </span>
                  <span className="text-xs text-slate-500">{gap.domain}</span>
                </div>
                <h3 className="text-lg font-semibold group-hover:text-violet-400 transition-colors">
                  {gap.title}
                </h3>
                <p className="text-sm text-slate-400 mt-2 line-clamp-2">
                  {gap.description}
                </p>
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-1 text-sm text-slate-400">
                    <Star className="w-4 h-4 text-yellow-400" />
                    <span>{gap.votes} votes</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-slate-400">
                    <FileText className="w-4 h-4" />
                    <span>{gap.papers} papers</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-slate-400">
                    <Brain className="w-4 h-4" />
                    <span className={`text-xs px-2 py-0.5 rounded-full bg-gradient-to-r ${difficultyColors[gap.difficulty]}`}>
                      {gap.difficulty}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button className="p-2 rounded-lg bg-violet-500/20 text-violet-400 hover:bg-violet-500 hover:text-white transition-all">
                  <ArrowUpRight className="w-5 h-5" />
                </button>
                <button className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                  <CheckCircle2 className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-slate-500" />
                <span className="text-xs text-slate-500">{gap.type}</span>
              </div>
              <button className="flex items-center gap-1 text-sm text-violet-400 hover:text-violet-300">
                View Details <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

function FileText(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}
