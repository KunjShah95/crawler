import { motion } from "framer-motion"
import { Loader2 } from "lucide-react"

export const LoadingSpinner = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] w-full gap-4">
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
                <Loader2 className="w-12 h-12 text-primary" />
            </motion.div>
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-muted-foreground font-medium animate-pulse"
            >
                Loading GapMiner...
            </motion.p>
        </div>
    )
}

export const PageLoader = () => {
    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <LoadingSpinner />
        </div>
    )
}
