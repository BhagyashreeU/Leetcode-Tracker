import { NavLink, Route, Routes } from 'react-router-dom'
import { AuthGate } from './components/AuthGate'
import { store } from './data/store'
import { TrackerProvider, useTracker } from './data/TrackerContext'
import { LogPage } from './pages/LogPage'
import { ProblemsPage } from './pages/ProblemsPage'
import { ProgressPage } from './pages/ProgressPage'
import { SettingsPage } from './pages/SettingsPage'
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
          <NavLink to="/progress" className={tab}>
            Progress
          </NavLink>
          <span className="ml-auto flex items-center gap-3">
            <NavLink to="/settings" className={tab} aria-label="Settings" title="Settings">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1-1.187.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.114a7.05 7.05 0 0 1 0-2.227L1.821 7.773a1 1 0 0 1-.206-1.25l1.18-2.045a1 1 0 0 1 1.187-.447l1.598.54A6.992 6.992 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
                  clipRule="evenodd"
                />
              </svg>
            </NavLink>
            <NavLink
              to="/log"
              className="whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-700"
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
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  )
}
