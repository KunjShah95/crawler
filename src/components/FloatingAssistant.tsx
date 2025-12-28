import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Sparkles,
    X,
    MessageSquare,
    Send,
    Loader2,
    Maximize2,
    Minimize2,
    Bot,
    ChevronDown,
    Brain
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"
import { getCrawlResults, type CrawlResult } from "@/lib/firestore"
import { chatWithPapers } from "@/lib/api"
import { cn } from "@/lib/utils"

interface Message {
    role: "user" | "assistant"
    content: string
}

export function FloatingAssistant() {
    const { user } = useAuth()
    const [isOpen, setIsOpen] = useState(false)
    const [isExpanded, setIsExpanded] = useState(false)
    const [input, setInput] = useState("")
    const [messages, setMessages] = useState<Message[]>([
        { role: "assistant", content: "Hi! I'm your Research Assistant. I can help you analyze the papers in your library. What would you like to know?" }
    ])
    const [isTyping, setIsTyping] = useState(false)
    const [papers, setPapers] = useState<CrawlResult[]>([])
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages, isTyping])

    useEffect(() => {
        async function load() {
            if (!user) return
            const data = await getCrawlResults(user.id)
            setPapers(data)
        }
        load()
    }, [user])

    const handleSend = async () => {
        if (!input.trim() || isTyping) return

        const userMsg = input.trim()
        setInput("")
        setMessages(prev => [...prev, { role: "user", content: userMsg }])
        setIsTyping(true)

        try {
            const paperContext = papers.map(p => ({
                title: p.title,
                content: p.content,
                gaps: p.gaps,
                venue: p.venue
            }))

            const responseText = await chatWithPapers(
                userMsg,
                paperContext,
                messages.map(m => ({ role: m.role, content: m.content }))
            )
            setMessages(prev => [...prev, { role: "assistant", content: responseText }])
        } catch (error) {
            setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I had trouble processing that request." }])
        } finally {
            setIsTyping(false)
        }
    }

    if (!user) return null

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20, transformOrigin: "bottom right" }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className={cn(
                            "mb-2 w-[350px] shadow-2xl rounded-2xl overflow-hidden border border-[hsl(var(--border))] glass transition-all duration-300",
                            isExpanded ? "w-[500px] h-[600px]" : "h-[450px]"
                        )}
                    >
                        <div className="flex flex-col h-full bg-[hsl(var(--card))]/80 backdrop-blur-xl">
                            {/* Header */}
                            <div className="p-4 border-b border-[hsl(var(--border))] flex items-center justify-between bg-gradient-to-r from-[hsl(var(--brand-primary))]/10 to-[hsl(var(--brand-secondary))]/10">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-[hsl(var(--brand-primary))] text-white">
                                        <Brain className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold">Research Assistant</h3>
                                        <p className="text-[10px] text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                                            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                                            {papers.length} papers in context
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-[hsl(var(--muted-foreground))]"
                                        onClick={() => setIsExpanded(!isExpanded)}
                                    >
                                        {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-[hsl(var(--muted-foreground))] hover:text-red-500"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <X className="h-4 x-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Messages */}
                            <div
                                ref={scrollRef}
                                className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
                            >
                                {messages.map((msg, i) => (
                                    <div
                                        key={i}
                                        className={cn(
                                            "flex gap-2 max-w-[85%]",
                                            msg.role === "user" ? "ml-auto flex-row-reverse" : ""
                                        )}
                                    >
                                        <div className={cn(
                                            "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                                            msg.role === "assistant" ? "bg-[hsl(var(--brand-primary))] text-white" : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                                        )}>
                                            {msg.role === "assistant" ? <Sparkles className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                                        </div>
                                        <div className={cn(
                                            "p-3 rounded-2xl text-sm leading-relaxed",
                                            msg.role === "assistant"
                                                ? "bg-[hsl(var(--muted))]/50 border border-[hsl(var(--border))]"
                                                : "bg-[hsl(var(--brand-primary))] text-white shadow-md shadow-[hsl(var(--brand-primary))]/20"
                                        )}>
                                            {msg.content}
                                        </div>
                                    </div>
                                ))}
                                {isTyping && (
                                    <div className="flex gap-2 max-w-[85%]">
                                        <div className="h-8 w-8 rounded-full bg-[hsl(var(--brand-primary))] text-white flex items-center justify-center shrink-0">
                                            <Sparkles className="h-4 w-4" />
                                        </div>
                                        <div className="p-3 rounded-2xl bg-[hsl(var(--muted))]/50 border border-[hsl(var(--border))]">
                                            <Loader2 className="h-4 w-4 animate-spin text-[hsl(var(--brand-primary))]" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Input */}
                            <div className="p-4 border-t border-[hsl(var(--border))]">
                                <div className="relative group">
                                    <input
                                        type="text"
                                        placeholder="Ask about your research..."
                                        className="w-full bg-[hsl(var(--muted))]/30 border border-[hsl(var(--border))] rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand-primary))]/20 focus:border-[hsl(var(--brand-primary))] transition-all"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                                    />
                                    <Button
                                        size="icon"
                                        className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))]/90 text-white rounded-lg transition-transform active:scale-95"
                                        disabled={!input.trim() || isTyping}
                                        onClick={handleSend}
                                    >
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </div>
                                <p className="mt-2 text-[8px] text-center text-[hsl(var(--muted-foreground))] uppercase tracking-widest font-bold">
                                    Powered by Gemini 2.0 Flash
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bubble Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "h-14 w-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 relative group",
                    isOpen
                        ? "bg-[hsl(var(--card))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))]"
                        : "bg-[hsl(var(--brand-primary))] text-white"
                )}
            >
                <div className="absolute inset-0 rounded-full bg-[hsl(var(--brand-primary))] blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                {isOpen ? <ChevronDown className="h-6 w-6 z-10" /> : <MessageSquare className="h-6 w-6 z-10" />}
                {!isOpen && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full border-2 border-[hsl(var(--background))] z-20 pulse-soft" />
                )}
            </motion.button>
        </div>
    )
}
