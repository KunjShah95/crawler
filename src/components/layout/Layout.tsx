import { Outlet } from "react-router-dom"
import { Navbar } from "./Navbar"
import { Footer } from "./Footer"
import PrimeHero from "@/components/layout/PrimeHero"

export function Layout() {
    return (
        <div className="min-h-screen flex flex-col">
            {/* Skip link for keyboard users */}
            <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 bg-white text-black px-3 py-2 rounded">Skip to content</a>
            <Navbar />
            <main id="main-content" role="main" className="flex-1 pt-16">
                {/* Global PRIME hero — appears across primary routes as a unified visual anchor */}
                <PrimeHero />
                <Outlet />
            </main>
            <Footer />
        </div>
    )
}
