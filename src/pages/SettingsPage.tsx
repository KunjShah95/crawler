import { motion } from "framer-motion"
import { Settings, Bell, Moon, Shield, CreditCard, User, Palette, Globe } from "lucide-react"

const sections = [
  { id: "profile", name: "Profile", icon: User },
  { id: "notifications", name: "Notifications", icon: Bell },
  { id: "appearance", name: "Appearance", icon: Palette },
  { id: "billing", name: "Billing", icon: CreditCard },
  { id: "security", name: "Security", icon: Shield },
  { id: "api", name: "API Keys", icon: Globe },
]

export default function SettingsPage() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Settings</h1>
        <p className="text-slate-400 mt-1">Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-2">
          {sections.map((section) => (
            <button key={section.id} className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors text-left">
              <section.icon className="w-5 h-5 text-slate-400" />
              <span>{section.name}</span>
            </button>
          ))}
        </div>

        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-6">Profile Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Display Name</label>
              <input type="text" defaultValue="John Doe" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-violet-500/50" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Email</label>
              <input type="email" defaultValue="john@example.com" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-violet-500/50" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Research Interests</label>
              <input type="text" defaultValue="Machine Learning, NLP, Computer Vision" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-violet-500/50" />
            </div>
            <button className="px-6 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-xl font-medium">Save Changes</button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
