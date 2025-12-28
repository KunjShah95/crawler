import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { X, Sparkles } from "lucide-react"
import { Button } from "./ui/button"

interface AnalysisModalProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    title: string
    description?: string
    content: string | any
}

export function AnalysisModal({ isOpen, onOpenChange, title, description, content }: AnalysisModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => onOpenChange(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[hsl(var(--background))] border border-[hsl(var(--border))] w-full max-w-2xl max-h-[85vh] rounded-xl shadow-2xl overflow-hidden flex flex-col relative"
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-[hsl(var(--border))] flex items-start justify-between bg-gradient-to-r from-[hsl(var(--brand-primary))]/5 to-transparent">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="h-2 w-2 rounded-full bg-[hsl(var(--brand-primary))] animate-pulse" />
                                        <Badge variant="outline" className="bg-[hsl(var(--brand-primary))]/10 text-[hsl(var(--brand-primary))] border-[hsl(var(--brand-primary))]/20 font-mono text-[10px] tracking-wider">
                                            AI INSIGHT ENGINE
                                        </Badge>
                                    </div>
                                    <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">{title}</h2>
                                    {description && <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">{description}</p>}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onOpenChange(false)}
                                    className="rounded-full hover:bg-[hsl(var(--muted))] -mr-2"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                                <div className="text-sm leading-relaxed text-[hsl(var(--foreground))] prose dark:prose-invert max-w-none">
                                    {typeof content === 'string' ? (
                                        <div className="whitespace-pre-wrap font-sans">
                                            {content}
                                        </div>
                                    ) : (
                                        <pre className="p-4 bg-[hsl(var(--muted))]/30 rounded-lg overflow-x-auto text-xs font-mono">
                                            {JSON.stringify(content, null, 2)}
                                        </pre>
                                    )}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-[10px] text-[hsl(var(--muted-foreground))] font-medium uppercase tracking-tighter">
                                    <Sparkles className="h-3 w-3 text-brand-primary" />
                                    Powered by Gemini 1.5 Pro
                                </div>
                                <Button size="sm" onClick={() => onOpenChange(false)}>
                                    Dismiss
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
