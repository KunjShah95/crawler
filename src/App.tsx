import { Suspense, lazy } from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { Layout } from "@/components/layout"
import { AuthProvider } from "@/context/AuthContext"
import { AuthModal } from "@/components/ui/auth-modal"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { FloatingAssistant } from "@/components/FloatingAssistant"
import { PageLoader } from "@/components/ui/LoadingSpinner"

// Helper function for retrying lazy imports
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

// Lazy load pages
const HomePage = lazyWithRetry(() => import("@/pages/HomePage").then(module => ({ default: module.HomePage })))
const DashboardPage = lazyWithRetry(() => import("@/pages/DashboardPage").then(module => ({ default: module.DashboardPage })))
const CrawlPage = lazyWithRetry(() => import("@/pages/CrawlPage").then(module => ({ default: module.CrawlPage })))
const ExplorePage = lazyWithRetry(() => import("@/pages/ExplorePage").then(module => ({ default: module.ExplorePage })))
const InsightsPage = lazyWithRetry(() => import("@/pages/InsightsPage").then(module => ({ default: module.InsightsPage })))
const ComparisonPage = lazyWithRetry(() => import("@/pages/ComparisonPage").then(module => ({ default: module.ComparisonPage })))
const KnowledgeMapPage = lazyWithRetry(() => import("@/pages/KnowledgeMapPage").then(module => ({ default: module.KnowledgeMapPage })))
const AssistantPage = lazyWithRetry(() => import("@/pages/AssistantPage").then(module => ({ default: module.AssistantPage })))
const CollectionsPage = lazyWithRetry(() => import("@/pages/CollectionsPage").then(module => ({ default: module.CollectionsPage })))

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AuthModal />
          <FloatingAssistant />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<HomePage />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/crawl"
                  element={
                    <ProtectedRoute>
                      <CrawlPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/explore"
                  element={
                    <ProtectedRoute>
                      <ExplorePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/insights"
                  element={
                    <ProtectedRoute>
                      <InsightsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/compare"
                  element={
                    <ProtectedRoute>
                      <ComparisonPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/map"
                  element={
                    <ProtectedRoute>
                      <KnowledgeMapPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/assistant"
                  element={
                    <ProtectedRoute>
                      <AssistantPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/collections"
                  element={
                    <ProtectedRoute>
                      <CollectionsPage />
                    </ProtectedRoute>
                  }
                />
              </Route>
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
