import { BrowserRouter, Routes, Route } from "react-router-dom"
import { Layout } from "@/components/layout"
import { HomePage, CrawlPage, ExplorePage, InsightsPage, ComparisonPage, KnowledgeMapPage } from "@/pages"
import { AssistantPage } from "@/pages/AssistantPage"
import { CollectionsPage } from "@/pages/CollectionsPage"
import { DashboardPage } from "@/pages/DashboardPage"
import { AuthProvider } from "@/context/AuthContext"
import { AuthModal } from "@/components/ui/auth-modal"
import { ProtectedRoute } from "@/components/ProtectedRoute"

import { FloatingAssistant } from "@/components/FloatingAssistant"

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AuthModal />
        <FloatingAssistant />
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
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
