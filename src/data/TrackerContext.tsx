import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { localToday } from '../lib/dates'
import { DEFAULT_DAILY_REVIEW_CAP, dueToday } from '../lib/schedule'
import { store } from './store'
import type { CuratedProblem, ReviewRecord, Skip, TrackedProblem } from './types'

/** What suggestions and the Progress screen need, loaded apart from the review queue. */
export interface SuggestionData {
  catalog: CuratedProblem[]
  reviews: ReviewRecord[]
  skips: Skip[]
  dailyNewTarget: number
}

interface TrackerState {
  tracked: TrackedProblem[]
  due: TrackedProblem[]
  deferred: number
  /** Reviews (not first solves) already done today. */
  doneToday: number
  /** The next few scheduled reviews after today, soonest first. */
  upcoming: TrackedProblem[]
  today: string
  loading: boolean
  error: string | null
  /** Null until loaded, or when loading failed (see suggestionsError). */
  suggestionData: SuggestionData | null
  suggestionsError: string | null
  reload: () => Promise<void>
}

const TrackerContext = createContext<TrackerState | null>(null)

export function TrackerProvider({ children }: { children: ReactNode }) {
  const [tracked, setTracked] = useState<TrackedProblem[]>([])
  const [cap, setCap] = useState(DEFAULT_DAILY_REVIEW_CAP)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [suggestionData, setSuggestionData] = useState<SuggestionData | null>(null)
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null)
  const today = localToday()

  const reload = useCallback(async () => {
    const message = (e: unknown) => (e instanceof Error ? e.message : String(e))
    // Suggestions load separately, so a missing table or seed can't hide the review queue.
    const suggestions = Promise.all([store.listCurated(), store.listReviews(), store.listSkips()]).then(
      ([catalog, reviews, skips]) => ({ catalog, reviews, skips }),
      (e: unknown) => {
        setSuggestionsError(message(e))
        return null
      },
    )
    try {
      const [items, settings, extra] = await Promise.all([store.listTracked(), store.settings(), suggestions])
      setTracked(items)
      setCap(settings.dailyReviewCap)
      setError(null)
      if (extra) {
        setSuggestionData({ ...extra, dailyNewTarget: settings.dailyNewTarget })
        setSuggestionsError(null)
      }
    } catch (e) {
      setError(message(e))
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
    const doneToday = tracked.filter((t) => t.lastReviewedOn === today && t.timesReviewed > 0).length
    const upcoming = tracked
      .filter((t) => t.nextReviewOn !== null && t.nextReviewOn > today)
      .sort((a, b) => a.nextReviewOn!.localeCompare(b.nextReviewOn!))
      .slice(0, 5)
    return {
      tracked,
      due: shown,
      deferred,
      doneToday,
      upcoming,
      today,
      loading,
      error,
      suggestionData,
      suggestionsError,
      reload,
    }
  }, [tracked, today, cap, loading, error, suggestionData, suggestionsError, reload])

  useEffect(() => {
    document.title = value.due.length ? `(${value.due.length}) LeetCode Tracker` : 'LeetCode Tracker'
    // The count on the installed app's icon, where supported.
    if ('setAppBadge' in navigator) {
      void (value.due.length ? navigator.setAppBadge(value.due.length) : navigator.clearAppBadge()).catch(() => {})
    }
  }, [value.due.length])

  return <TrackerContext.Provider value={value}>{children}</TrackerContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useTracker(): TrackerState {
  const ctx = useContext(TrackerContext)
  if (!ctx) throw new Error('useTracker must be used inside TrackerProvider')
  return ctx
}
