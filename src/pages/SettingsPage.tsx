import { useEffect, useState, type FormEvent } from 'react'
import { ErrorNote, Notice } from '../components/ui'
import {
  browserTimeZone,
  disablePush,
  enablePush,
  loadReminderSettings,
  pushState,
  saveReminderSettings,
  sendTestReminder,
  type PushState,
  type ReminderSettings,
} from '../data/reminderSettings'
import { signOut, store } from '../data/store'
import { useTracker } from '../data/TrackerContext'
import { formatHour } from '../lib/reminders'

const input =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none'
const label = 'block text-sm font-medium text-slate-700'
const card = 'space-y-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200'
const secondary =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50'

const message = (e: unknown) => (e instanceof Error ? e.message : String(e))

export function SettingsPage() {
  if (store.isDemo) {
    return (
      <section className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Settings</h1>
        <Notice>Reminders need a Supabase project. Connect one (see the README) and sign in to set them up.</Notice>
      </section>
    )
  }
  return <ReminderSettingsForm />
}

function ReminderSettingsForm() {
  const { reload } = useTracker()
  const [settings, setSettings] = useState<ReminderSettings | null>(null)
  const [saved, setSaved] = useState(true)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    loadReminderSettings().then(
      (r) => {
        setSettings(r.settings)
        setSaved(r.saved)
      },
      (e: unknown) => setError(message(e)),
    )
  }, [])

  if (!settings) {
    return error ? <ErrorNote message={`Couldn't load settings: ${error}`} /> : <p className="text-slate-500">Loading…</p>
  }

  const set = (patch: Partial<ReminderSettings>) => setSettings({ ...settings, ...patch })

  async function run(action: () => Promise<string | null>) {
    setBusy(true)
    setError(null)
    setStatus(null)
    try {
      setStatus(await action())
    } catch (e) {
      setError(message(e))
    } finally {
      setBusy(false)
    }
  }

  function save(e: FormEvent) {
    e.preventDefault()
    void run(async () => {
      await saveReminderSettings(settings!)
      setSaved(true)
      await reload()
      return 'Settings saved.'
    })
  }

  function test() {
    void run(async () => {
      const r = await sendTestReminder()
      return `Test reminder: email ${r.email}; push ${r.push}.`
    })
  }

  const zones = Intl.supportedValuesOf('timeZone')
  const here = browserTimeZone()

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Settings</h1>
      {!saved && <Notice>Save these settings once to start getting reminders.</Notice>}

      <form onSubmit={save} className="space-y-6">
        <div className={card}>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Reminders</h2>
            <p className="text-sm text-slate-500">One reminder a day when reviews are due. Nothing is sent on days with nothing due.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="hour" className={label}>
                Time
              </label>
              <select id="hour" value={settings.reminderHour} onChange={(e) => set({ reminderHour: Number(e.target.value) })} className={input}>
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {formatHour(h)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="zone" className={label}>
                Time zone
              </label>
              <select id="zone" value={settings.timeZone} onChange={(e) => set({ timeZone: e.target.value })} className={input}>
                {!zones.includes(settings.timeZone) && <option value={settings.timeZone}>{settings.timeZone}</option>}
                {zones.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
              {settings.timeZone !== here && (
                <button type="button" onClick={() => set({ timeZone: here })} className="text-xs text-sky-700 hover:underline">
                  Use this device's time zone ({here})
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={settings.emailEnabled} onChange={(e) => set({ emailEnabled: e.target.checked })} className="h-4 w-4" />
              Email me
            </label>
            {settings.emailEnabled && (
              <input
                type="email"
                aria-label="Reminder email"
                value={settings.reminderEmail ?? ''}
                onChange={(e) => set({ reminderEmail: e.target.value })}
                placeholder="Your sign-in email"
                className={input}
              />
            )}
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" checked={settings.pushEnabled} onChange={(e) => set({ pushEnabled: e.target.checked })} className="h-4 w-4" />
            Send notifications to my devices
          </label>
          {settings.pushEnabled && <DevicePush onError={setError} onStatus={setStatus} />}
        </div>

        <div className={card}>
          <h2 className="text-lg font-semibold text-slate-900">Daily targets</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="cap" className={label}>
                Reviews per day (most)
              </label>
              <input
                id="cap"
                type="number"
                min={1}
                value={settings.dailyReviewCap}
                onChange={(e) => set({ dailyReviewCap: Math.max(1, Number(e.target.value)) })}
                className={input}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="target" className={label}>
                New problems per day
              </label>
              <input
                id="target"
                type="number"
                min={0}
                value={settings.dailyNewTarget}
                onChange={(e) => set({ dailyNewTarget: Math.max(0, Number(e.target.value)) })}
                className={input}
              />
            </div>
          </div>
        </div>

        <ErrorNote message={error} />
        {status && <Notice tone="success">{status}</Notice>}

        <div className="flex flex-wrap gap-2">
          <button
            disabled={busy}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
          >
            Save
          </button>
          <button type="button" disabled={busy || !saved} onClick={test} className={secondary}>
            Send a test reminder
          </button>
        </div>
      </form>

      <button onClick={signOut} className="text-sm text-slate-500 hover:text-slate-900">
        Sign out
      </button>
    </section>
  )
}

const pushHelp: Record<Exclude<PushState, 'on' | 'off'>, string> = {
  unsupported: "This browser can't receive notifications. Try Chrome, Edge, Firefox or Safari.",
  'needs-install': 'On iPhone and iPad, tap Share, then "Add to Home Screen", and open the app from there to turn on notifications.',
  denied: 'Notifications are blocked for this site. Allow them in your browser settings for this site, then reload.',
}

function DevicePush(props: { onError: (m: string | null) => void; onStatus: (m: string | null) => void }) {
  const [state, setState] = useState<PushState | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    pushState().then(setState, () => setState('unsupported'))
  }, [])

  async function toggle() {
    setBusy(true)
    props.onError(null)
    props.onStatus(null)
    try {
      if (state === 'on') await disablePush()
      else await enablePush()
      const next = await pushState()
      setState(next)
      props.onStatus(next === 'on' ? 'Notifications are on for this device.' : 'Notifications are off for this device.')
    } catch (e) {
      props.onError(message(e))
      setState(await pushState().catch(() => 'unsupported' as const))
    } finally {
      setBusy(false)
    }
  }

  if (state === null) return null
  if (state !== 'on' && state !== 'off') return <p className="text-sm text-slate-500">{pushHelp[state]}</p>
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 px-3 py-2">
      <span className="text-sm text-slate-700">This device: {state === 'on' ? 'on' : 'off'}</span>
      <button type="button" disabled={busy} onClick={toggle} className={secondary}>
        {state === 'on' ? 'Turn off on this device' : 'Turn on for this device'}
      </button>
    </div>
  )
}
