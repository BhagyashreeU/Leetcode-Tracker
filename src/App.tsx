import { NavLink, Route, Routes } from 'react-router-dom'
import { AuthGate } from './components/AuthGate'
import { signOut, store } from './data/store'
import { TrackerProvider, useTracker } from './data/TrackerContext'
import { LogPage } from './pages/LogPage'
import { ProblemsPage } from './pages/ProblemsPage'
import { TodayPage } from './pages/TodayPage'

export default function App() {
  return (
    <AuthGate>
      <TrackerProvider>
        <Shell />
      </TrackerProvider>
    </AuthGate>
  )
}

const tab = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`

function Shell() {
  const { due } = useTracker()
  return (
    <div className="min-h-screen bg-slate-50">
      {store.isDemo && (
        <p className="bg-amber-100 px-4 py-1.5 text-center text-xs text-amber-900">
          Demo mode: data is saved only in this browser until Supabase is connected.
        </p>
      )}
      <nav className="mx-auto flex max-w-2xl items-center gap-1 px-4 pt-4">
        <NavLink to="/" end className={tab}>
          Today
          {due.length > 0 && <span className="ml-1.5 rounded-full bg-rose-500 px-1.5 text-xs text-white">{due.length}</span>}
        </NavLink>
        <NavLink to="/log" className={tab}>
          Log
        </NavLink>
        <NavLink to="/problems" className={tab}>
          All problems
        </NavLink>
        {!store.isDemo && (
          <button onClick={signOut} className="ml-auto text-sm text-slate-500 hover:text-slate-800">
            Sign out
          </button>
        )}
      </nav>
      <main className="mx-auto max-w-2xl px-4 py-6">
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/log" element={<LogPage />} />
          <Route path="/problems" element={<ProblemsPage />} />
        </Routes>
      </main>
    </div>
  )
}
