import { Suspense, lazy } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { ModernLayout } from "@/components/layout/ModernLayout"
import { AuthProvider } from "@/context/AuthContext"
import { SubscriptionProvider } from "@/context/SubscriptionContext"
import { TeamProvider } from "@/context/TeamContext"
import { AuthModal } from "@/components/ui/auth-modal"
import { UpgradeModal } from "@/components/ui/upgrade-modal"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { FloatingAssistant } from "@/components/FloatingAssistant"
import { PageLoader } from "@/components/ui/LoadingSpinner"

const lazyWithRetry = (componentImport: () => Promise<any>) =>
  lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.localStorage.getItem('page-has-been-force-refreshed') || 'false'
    );
    try {
      const component = await componentImport();
      window.localStorage.setItem('page-has-been-force-refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        window.localStorage.setItem('page-has-been-force-refreshed', 'true');
        return window.location.reload();
      }
      throw error;
    }
  });

const DashboardPage = lazyWithRetry(() => import("@/pages/DashboardPage").then(m => ({ default: m.default })))
const PapersPage = lazyWithRetry(() => import("@/pages/PapersPage").then(m => ({ default: m.default })))
const GapsPage = lazyWithRetry(() => import("@/pages/GapsPage").then(m => ({ default: m.default })))
const KnowledgeGraphPage = lazyWithRetry(() => import("@/pages/KnowledgeGraphPage").then(m => ({ default: m.default })))
const WorkflowsPage = lazyWithRetry(() => import("@/pages/WorkflowsPage").then(m => ({ default: m.default })))
const ChatPage = lazyWithRetry(() => import("@/pages/ChatPage").then(m => ({ default: m.default })))
const LiteratureReviewPage = lazyWithRetry(() => import("@/pages/LiteratureReviewPage").then(m => ({ default: m.default })))
const DatasetsPage = lazyWithRetry(() => import("@/pages/DatasetsPage").then(m => ({ default: m.default })))
const GrantsPage = lazyWithRetry(() => import("@/pages/GrantsPage").then(m => ({ default: m.default })))
const RoadmapPage = lazyWithRetry(() => import("@/pages/RoadmapPage").then(m => ({ default: m.default })))
const CompetitorPage = lazyWithRetry(() => import("@/pages/CompetitorPage").then(m => ({ default: m.default })))
const ImpactPage = lazyWithRetry(() => import("@/pages/ImpactPage").then(m => ({ default: m.default })))
const TeamPage = lazyWithRetry(() => import("@/pages/TeamPage").then(m => ({ default: m.default })))
const SettingsPage = lazyWithRetry(() => import("@/pages/SettingsPage").then(m => ({ default: m.default })))
const AnalyticsPage = lazyWithRetry(() => import("@/pages/AnalyticsPage").then(m => ({ default: m.default })))
const ExportPage = lazyWithRetry(() => import("@/pages/ExportPage").then(m => ({ default: m.default })))
const HomePage = lazyWithRetry(() => import("@/pages/HomePage").then(m => ({ default: m.HomePage })))

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <SubscriptionProvider>
            <TeamProvider>
              <AuthModal />
              <UpgradeModal />
              <FloatingAssistant />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route element={<ProtectedRoute><ModernLayout /></ProtectedRoute>}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/papers" element={<PapersPage />} />
                    <Route path="/gaps" element={<GapsPage />} />
                    <Route path="/knowledge-graph" element={<KnowledgeGraphPage />} />
                    <Route path="/workflows" element={<WorkflowsPage />} />
                    <Route path="/chat" element={<ChatPage />} />
                    <Route path="/literature-review" element={<LiteratureReviewPage />} />
                    <Route path="/datasets" element={<DatasetsPage />} />
                    <Route path="/grants" element={<GrantsPage />} />
                    <Route path="/roadmap" element={<RoadmapPage />} />
                    <Route path="/competitors" element={<CompetitorPage />} />
                    <Route path="/impact" element={<ImpactPage />} />
                    <Route path="/analytics" element={<AnalyticsPage />} />
                    <Route path="/export" element={<ExportPage />} />
                    <Route path="/team" element={<TeamPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                  </Route>
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Suspense>
            </TeamProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
