import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Link } from "react-router-dom"
import {
    FileSearch,
    TrendingUp,
    Lightbulb,
    BarChart3,
    ArrowRight,
    Activity,
    Target,
    Layers,
    Sparkles,
    Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AnimatedCounter, CircularProgress, PercentageCounter } from "@/components/ui/animated-counter"
import { KnowledgeGraph, generateMockNodes } from "@/components/ui/knowledge-graph"
import { CompactTimeline } from "@/components/ui/research-timeline"
import { useAuth } from "@/context/AuthContext"
import { getUserStats, getCrawlResults, type UserStats } from "@/lib/firestore"

export function DashboardPage() {
    const { user } = useAuth()
    const [stats, setStats] = useState<UserStats | null>(null)
    const [recentResults, setRecentResults] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const graphNodes = generateMockNodes()

    useEffect(() => {
        if (!user) return

        async function loadData() {
            try {
                const [statsData, resultsData] = await Promise.all([
                    getUserStats(user!.id),
                    getCrawlResults(user!.id)
                ])
                setStats(statsData)
                setRecentResults(resultsData.slice(0, 5))
            } catch (error) {
                console.error("Failed to load dashboard data:", error)
            } finally {
                setIsLoading(false)
            }
        }

        loadData()
    }, [user])

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--brand-primary))]" />
            </div>
        )
    }

    const statCards = [
        {
            label: "Papers Analyzed",
            value: stats?.totalPapers || 0,
            icon: FileSearch,
            trend: "+0 this week",
            color: "hsl(var(--brand-primary))"
        },
        {
            label: "Gaps Discovered",
            value: stats?.totalGaps || 0,
            icon: Lightbulb,
            trend: "+0 this week",
            color: "hsl(var(--gap-data))"
        },
        {
            label: "Research Themes",
            value: 4, // Placeholder for calculated themes
            icon: Layers,
            trend: "Stable",
            color: "hsl(var(--brand-secondary))"
        },
        {
            label: "Collections",
            value: stats?.totalCollections || 0,
            icon: Target,
            trend: "+0 this week",
            color: "hsl(var(--gap-evaluation))"
        }
    ]

    const typeData = [
        { label: "Data Scarcity", value: stats?.typeCounts.data || 0, color: "hsl(var(--gap-data))" },
        { label: "Compute Limits", value: stats?.typeCounts.compute || 0, color: "hsl(var(--gap-compute))" },
        { label: "Evaluation Gaps", value: stats?.typeCounts.evaluation || 0, color: "hsl(var(--gap-evaluation))" },
        { label: "Methodology", value: stats?.typeCounts.methodology || 0, color: "hsl(var(--gap-methodology))" }
    ]

    // Calculate quality percentage based on gap discovery
    const qualityScore = stats?.totalGaps ? Math.min(100, Math.round((stats.totalGaps / 50) * 100)) : 0

    return (
        <div className="min-h-screen py-12">
            <div className="container-wide">
                {/* Header */}
                <div className="mb-8 flex items-start justify-between">
                    <div>
                        <div className="section-number mb-4">DASHBOARD</div>
                        <h1 className="heading-section mb-4">
                            Research
                            <br />
                            <span className="gradient-text">Overview</span>
                        </h1>
                        <p className="text-lg text-[hsl(var(--muted-foreground))] max-w-2xl">
                            Track your research gap discovery progress and explore patterns across papers.
                        </p>
                    </div>
                    <Link to="/crawl">
                        <Button className="gap-2">
                            <FileSearch className="h-4 w-4" />
                            Crawl Papers
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </Link>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {statCards.map((stat, idx) => {
                        const Icon = stat.icon
                        return (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                            >
                                <Card className="card-hover h-full">
                                    <CardContent className="pt-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div
                                                className="flex h-10 w-10 items-center justify-center rounded-lg"
                                                style={{ backgroundColor: stat.color + "20" }}
                                            >
                                                <Icon className="h-5 w-5" style={{ color: stat.color }} />
                                            </div>
                                            <Badge variant="secondary" className="text-[10px]">
                                                <TrendingUp className="h-3 w-3 mr-1" />
                                                {stat.trend}
                                            </Badge>
                                        </div>
                                        <div className="text-3xl font-bold mb-1">
                                            <AnimatedCounter value={stat.value} />
                                        </div>
                                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                                            {stat.label}
                                        </p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )
                    })}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Knowledge Graph */}
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2">
                                    <Sparkles className="h-5 w-5" />
                                    Research Knowledge Graph
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <KnowledgeGraph
                                    nodes={graphNodes}
                                    className="h-[350px] border-0"
                                />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Gap Type Breakdown */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2">
                                <BarChart3 className="h-5 w-5" />
                                Gap Type Breakdown
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-center mb-6">
                                <CircularProgress value={qualityScore} label="Insight" />
                            </div>
                            <div className="space-y-4">
                                {typeData.map((type) => (
                                    <PercentageCounter
                                        key={type.label}
                                        value={type.value}
                                        label={type.label}
                                        color={type.color}
                                    />
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Activity */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="h-5 w-5" />
                                Recent Crawls
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {recentResults.length > 0 ? (
                                    recentResults.map((result, idx) => (
                                        <motion.div
                                            key={result.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.1 }}
                                            className="flex items-center gap-3"
                                        >
                                            <div className="h-2 w-2 rounded-full bg-[hsl(var(--brand-primary))]" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm truncate">
                                                    <span className="font-medium">Crawled</span>{" "}
                                                    <span className="text-[hsl(var(--muted-foreground))]">
                                                        {result.title}
                                                    </span>
                                                </p>
                                            </div>
                                            <span className="text-xs text-[hsl(var(--muted-foreground))] whitespace-nowrap">
                                                {result.createdAt?.toDate ?
                                                    new Date(result.createdAt.toDate()).toLocaleDateString() :
                                                    "Recently"}
                                            </span>
                                        </motion.div>
                                    ))
                                ) : (
                                    <p className="text-sm text-center py-8 text-[hsl(var(--muted-foreground))]">
                                        No recent activity. Start by crawling a paper!
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Timeline Preview */}
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <Lightbulb className="h-5 w-5" />
                                    Recent Discoveries
                                </CardTitle>
                                <Link to="/explore">
                                    <Button variant="ghost" size="sm" className="gap-1 text-xs">
                                        View All
                                        <ArrowRight className="h-3 w-3" />
                                    </Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <CompactTimeline />
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Actions */}
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Link to="/crawl">
                        <Card className="card-hover cursor-pointer">
                            <CardContent className="pt-6 flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[hsl(var(--brand-primary))]/10">
                                    <FileSearch className="h-6 w-6 text-[hsl(var(--brand-primary))]" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">Crawl New Papers</h3>
                                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                                        Extract gaps from URLs
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                    <Link to="/explore">
                        <Card className="card-hover cursor-pointer">
                            <CardContent className="pt-6 flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[hsl(var(--gap-evaluation))]/10">
                                    <BarChart3 className="h-6 w-6 text-[hsl(var(--gap-evaluation))]" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">Explore Gaps</h3>
                                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                                        Browse and filter discoveries
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                    <Link to="/assistant">
                        <Card className="card-hover cursor-pointer">
                            <CardContent className="pt-6 flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[hsl(var(--brand-secondary))]/10">
                                    <Sparkles className="h-6 w-6 text-[hsl(var(--brand-secondary))]" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">Ask AI Assistant</h3>
                                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                                        Get research insights
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                </div>
            </div>
        </div>
    )
}
