import { motion } from "framer-motion"
import { MessageSquare, Send, Bot, User, Sparkles, History, Plus } from "lucide-react"

export default function ChatPage() {
  const messages = [
    { id: "1", role: "assistant", content: "Hello! I'm your research assistant. Ask me anything about your paper library, research gaps, or academic topics.", timestamp: new Date() },
    { id: "2", role: "user", content: "What are the main research gaps in transformer architectures?", timestamp: new Date() },
    { id: "3", role: "assistant", content: "Based on your library, I identified several key gaps: 1) Efficient long-context attention mechanisms (Quadratic complexity), 2) Theoretical understanding of attention patterns, 3) Cross-modal attention generalization. Would you like me to elaborate on any?", timestamp: new Date() },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="h-[calc(100vh-140px)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Research Chat</h1>
          <p className="text-slate-400 mt-1">Chat with your entire paper library using AI</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"><History className="w-4 h-4" /> History</button>
      </div>

      <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === "assistant" ? "bg-violet-500" : "bg-slate-700"}`}>
                {msg.role === "assistant" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <div className={`max-w-[70%] p-4 rounded-2xl ${msg.role === "user" ? "bg-violet-500" : "bg-white/10"}`}>
                <p className="text-sm">{msg.content}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"><Plus className="w-5 h-5" /></button>
            <div className="flex-1 relative">
              <input placeholder="Ask about your research..." className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-violet-500/50" />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-violet-500 rounded-lg hover:bg-violet-600 transition-colors"><Send className="w-4 h-4" /></button>
            </div>
            <button className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-lg"><Sparkles className="w-4 h-4" /> AI Mode</button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
