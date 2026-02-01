import { motion } from "framer-motion"
import { BarChart3, TrendingUp, Activity } from "lucide-react"

export default function AnalyticsPage() {
  const metrics = [
    { label: "Papers Analyzed", value: "2,847", change: "+12%", trend: "up" },
    { label: "Gaps Found", value: "456", change: "+8%", trend: "up" },
    { label: "Citations Tracked", value: "125K", change: "+23%", trend: "up" },
    { label: "Workflows Run", value: "89", change: "+5%", trend: "up" },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Analytics</h1>
        <p className="text-slate-400 mt-1">Track your research productivity and impact</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <motion.div key={metric.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">{metric.label}</p>
                <p className="text-3xl font-bold mt-1">{metric.value}</p>
                <p className="text-sm text-emerald-400 mt-1">{metric.change}</p>
              </div>
              <Activity className="w-8 h-8 text-violet-400 opacity-50" />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4">Activity Over Time</h2>
        <div className="h-64 flex items-center justify-center text-slate-500">Chart Visualization</div>
      </div>
    </motion.div>
  )
}
