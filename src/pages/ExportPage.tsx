import { motion } from "framer-motion"
import { Download, FileText, FileJson, FileCode } from "lucide-react"

const formats = [
  { id: "bibtex", name: "BibTeX", icon: FileText, description: "For LaTeX documents" },
  { id: "json", name: "JSON", icon: FileJson, description: "Structured data format" },
  { id: "markdown", name: "Markdown", icon: FileCode, description: "For Obsidian, Notion" },
  { id: "csv", name: "CSV", icon: FileText, description: "Spreadsheet compatible" },
]

export default function ExportPage() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Export & Integration</h1>
        <p className="text-slate-400 mt-1">Export your research in various formats</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {formats.map((format, index) => (
          <motion.div key={format.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all cursor-pointer">
            <format.icon className="w-8 h-8 text-violet-400 mb-3" />
            <h3 className="text-lg font-semibold">{format.name}</h3>
            <p className="text-sm text-slate-400 mt-1">{format.description}</p>
          </motion.div>
        ))}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Export</h2>
        <div className="flex gap-4">
          <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"><Download className="w-4 h-4" /> Export All Papers</button>
          <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"><Download className="w-4 h-4" /> Export All Gaps</button>
          <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-xl font-medium"><Download className="w-4 h-4" /> Export Complete</button>
        </div>
      </div>
    </motion.div>
  )
}
