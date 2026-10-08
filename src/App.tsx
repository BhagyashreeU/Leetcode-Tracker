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
  `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900'}`

function Shell() {
  const { due } = useTracker()
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {store.isDemo && (
        <p className="bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-900">
          Demo mode: your data is saved only in this browser.
        </p>
      )}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <nav className="mx-auto flex max-w-2xl items-center gap-1 px-4 py-2.5" aria-label="Main">
          <span className="mr-2 hidden text-sm font-semibold sm:inline">LeetCode Tracker</span>
          <NavLink to="/" end className={tab}>
            Today
            {due.length > 0 && (
              <span className="rounded-full bg-rose-500 px-1.5 text-xs leading-5 text-white" aria-label={`${due.length} due`}>
                {due.length}
              </span>
            )}
          </NavLink>
          <NavLink to="/problems" className={tab}>
            Problems
          </NavLink>
          <span className="ml-auto flex items-center gap-3">
            {!store.isDemo && (
              <button onClick={signOut} className="text-sm text-slate-500 hover:text-slate-900">
                Sign out
              </button>
            )}
            <NavLink
              to="/log"
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              + Log problem
            </NavLink>
          </span>
        </nav>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/log" element={<LogPage />} />
          <Route path="/problems" element={<ProblemsPage />} />
        </Routes>
      </main>
    </div>
  )
}
