import { useState } from "react"
import { motion } from "framer-motion"
import {
  FileText,
  Search,
  Filter,
  Download,
  Star,
  Eye,
  MessageSquare,
  Share2,
  MoreHorizontal,
  Plus,
  Grid,
  List,
  SortAsc,
  Calendar,
  Tag,
  ChevronDown,
  Loader2
} from "lucide-react"

const papers = [
  { id: "1", title: "Attention Is All You Need", authors: ["Vaswani et al."], year: 2017, venue: "NeurIPS", citations: 125000, tags: ["Transformers", "Attention", "NLP"], starred: true, analyzed: true },
  { id: "2", title: "BERT: Pre-training of Deep Bidirectional Transformers", authors: ["Devlin et al."], year: 2018, venue: "NAACL", citations: 85000, tags: ["BERT", "Pre-training", "Language Models"], starred: false, analyzed: true },
  { id: "3", title: "GPT-4 Technical Report", authors: ["OpenAI"], year: 2023, venue: "arXiv", citations: 12000, tags: ["GPT-4", "LLMs", "AI"], starred: true, analyzed: false },
  { id: "4", title: "LLaMA: Open and Efficient Foundation Models", authors: ["Touvron et al."], year: 2023, venue: "arXiv", citations: 8500, tags: ["LLaMA", "Open Source", "Foundation Models"], starred: false, analyzed: true },
  { id: "5", title: "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models", authors: ["Wei et al."], year: 2022, venue: "NeurIPS", citations: 4500, tags: ["CoT", "Reasoning", "Prompting"], starred: false, analyzed: false },
]

const filters = [
  { label: "Year", options: ["2024", "2023", "2022", "2021", "2020", "All"] },
  { label: "Venue", options: ["NeurIPS", "ICML", "ICLR", "CVPR", "ACL", "arXiv", "All"] },
  { label: "Domain", options: ["NLP", "Computer Vision", "ML", "AI", "Robotics", "All"] },
]

export default function PapersPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("list")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

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
            Papers Library
          </h1>
          <p className="text-slate-400 mt-1">Manage and analyze your research papers</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-xl font-medium hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" />
          Add Paper
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search papers by title, author, or keyword..."
            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors"
          />
        </div>
        <div className="flex items-center gap-3">
          {filters.map((filter) => (
            <div key={filter.label} className="relative group">
              <button className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
                <span className="text-sm">{filter.label}</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>
              <div className="absolute top-full left-0 mt-2 w-40 bg-slate-800 border border-white/10 rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                {filter.options.map((option) => (
                  <button
                    key={option}
                    onClick={() => setSelectedFilters({ ...selectedFilters, [filter.label]: option })}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-white/5 first:rounded-t-xl last:rounded-b-xl ${
                      selectedFilters[filter.label] === option ? "text-violet-400" : "text-slate-300"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
            <Filter className="w-4 h-4" />
            <span className="text-sm">More Filters</span>
          </button>
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-colors ${viewMode === "list" ? "bg-violet-500 text-white" : "text-slate-400 hover:text-white"}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-colors ${viewMode === "grid" ? "bg-violet-500 text-white" : "text-slate-400 hover:text-white"}`}
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Papers", value: papers.length.toString(), icon: FileText },
          { label: "Analyzed", value: papers.filter(p => p.analyzed).length.toString(), icon: Eye },
          { label: "Starred", value: papers.filter(p => p.starred).length.toString(), icon: Star },
          { label: "This Month", value: "12", icon: Calendar },
        ].map((stat, index) => (
          <div key={stat.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-500/20">
                <stat.icon className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-slate-400">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Papers List */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">Showing {papers.length} papers</span>
            <button className="flex items-center gap-2 text-sm text-slate-400 hover:text-white">
              <SortAsc className="w-4 h-4" />
              Sort by: Recent
            </button>
          </div>
          <button className="flex items-center gap-2 text-sm text-slate-400 hover:text-white">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
          </div>
        ) : (
          <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6" : "divide-y divide-white/10"}>
            {papers.map((paper, index) => (
              <motion.div
                key={paper.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`${viewMode === "grid" ? "bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-colors cursor-pointer" : "px-6 py-4 hover:bg-white/5 transition-colors cursor-pointer"}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold ${viewMode === "list" ? "text-lg" : "text-base"}`}>{paper.title}</h3>
                    <p className="text-sm text-slate-400 mt-1">{paper.authors.join(", ")}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs px-2 py-0.5 bg-slate-700 rounded text-slate-300">{paper.year}</span>
                      <span className="text-xs px-2 py-0.5 bg-slate-700 rounded text-slate-300">{paper.venue}</span>
                      <span className="text-xs text-violet-400">{paper.citations.toLocaleString()} citations</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {paper.tags.map((tag) => (
                        <span key={tag} className="text-xs px-2 py-1 bg-violet-500/20 text-violet-300 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className={`p-2 rounded-lg transition-colors ${paper.starred ? "text-yellow-400" : "text-slate-400 hover:text-white"}`}>
                      <Star className="w-4 h-4" fill={paper.starred ? "currentColor" : "none"} />
                    </button>
                    <button className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {viewMode === "list" && (
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/10">
                    <button className="flex items-center gap-2 text-sm text-slate-400 hover:text-white">
                      <Eye className="w-4 h-4" />
                      {paper.analyzed ? "View Analysis" : "Analyze"}
                    </button>
                    <button className="flex items-center gap-2 text-sm text-slate-400 hover:text-white">
                      <MessageSquare className="w-4 h-4" />
                      Discuss
                    </button>
                    <button className="flex items-center gap-2 text-sm text-slate-400 hover:text-white">
                      <Share2 className="w-4 h-4" />
                      Share
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
