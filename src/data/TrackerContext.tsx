import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { localToday } from '../lib/dates'
import { DEFAULT_DAILY_REVIEW_CAP, dueToday } from '../lib/schedule'
import { store } from './store'
import type { TrackedProblem } from './types'

interface TrackerState {
  tracked: TrackedProblem[]
  due: TrackedProblem[]
  deferred: number
  today: string
  loading: boolean
  error: string | null
  reload: () => Promise<void>
}

const TrackerContext = createContext<TrackerState | null>(null)

export function TrackerProvider({ children }: { children: ReactNode }) {
  const [tracked, setTracked] = useState<TrackedProblem[]>([])
  const [cap, setCap] = useState(DEFAULT_DAILY_REVIEW_CAP)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const today = localToday()

  const reload = useCallback(async () => {
    try {
      const [items, dailyCap] = await Promise.all([store.listTracked(), store.dailyReviewCap()])
      setTracked(items)
      setCap(dailyCap)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Initial fetch from the store; state is only set once the request resolves.
    // oxlint-disable-next-line react/set-state-in-effect
    void reload()
  }, [reload])

  const value = useMemo(() => {
    const { shown, deferred } = dueToday(tracked, today, cap)
    return { tracked, due: shown, deferred, today, loading, error, reload }
  }, [tracked, today, cap, loading, error, reload])

  useEffect(() => {
    document.title = value.due.length ? `(${value.due.length}) LeetCode Tracker` : 'LeetCode Tracker'
  }, [value.due.length])

  return <TrackerContext.Provider value={value}>{children}</TrackerContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useTracker(): TrackerState {
  const ctx = useContext(TrackerContext)
  if (!ctx) throw new Error('useTracker must be used inside TrackerProvider')
  return ctx
}
