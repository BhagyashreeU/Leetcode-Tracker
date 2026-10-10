import { DEFAULT_DAILY_REVIEW_CAP } from '../lib/schedule'
import { DEFAULT_DAILY_NEW_TARGET } from '../lib/suggest'
import { supabase } from './store'

// Settings and push subscriptions for reminders. These need Supabase: in demo
// mode there is no server to send reminders from.

export interface ReminderSettings {
  /** Null sends to the sign-in email. */
  reminderEmail: string | null
  emailEnabled: boolean
  pushEnabled: boolean
  reminderHour: number
  timeZone: string
  dailyNewTarget: number
  dailyReviewCap: number
}

interface SettingsRow {
  reminder_email: string | null
  email_enabled: boolean
  push_enabled: boolean
  reminder_hour: number
  time_zone: string
  daily_new_target: number
  daily_review_cap: number
}

export const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone

function db() {
  if (!supabase) throw new Error('Reminders need Supabase')
  return supabase
}

/** Saved settings, or defaults with `saved: false` when the user hasn't saved any yet. */
export async function loadReminderSettings(): Promise<{ settings: ReminderSettings; saved: boolean }> {
  const { data, error } = await db()
    .from('settings')
    .select('reminder_email, email_enabled, push_enabled, reminder_hour, time_zone, daily_new_target, daily_review_cap')
    .maybeSingle()
  if (error) throw new Error(error.message)
  const row = data as SettingsRow | null
  if (!row) {
    return {
      saved: false,
      settings: {
        reminderEmail: null,
        emailEnabled: true,
        pushEnabled: true,
        reminderHour: 8,
        timeZone: browserTimeZone(),
        dailyNewTarget: DEFAULT_DAILY_NEW_TARGET,
        dailyReviewCap: DEFAULT_DAILY_REVIEW_CAP,
      },
    }
  }
  return {
    saved: true,
    settings: {
      reminderEmail: row.reminder_email,
      emailEnabled: row.email_enabled,
      pushEnabled: row.push_enabled,
      reminderHour: row.reminder_hour,
      timeZone: row.time_zone,
      dailyNewTarget: row.daily_new_target,
      dailyReviewCap: row.daily_review_cap,
    },
  }
}

export async function saveReminderSettings(s: ReminderSettings): Promise<void> {
  const client = db()
  const { data } = await client.auth.getSession()
  if (!data.session) throw new Error('Not signed in')
  const { error } = await client.from('settings').upsert({
    user_id: data.session.user.id,
    reminder_email: s.reminderEmail?.trim() || null,
    email_enabled: s.emailEnabled,
    push_enabled: s.pushEnabled,
    reminder_hour: s.reminderHour,
    time_zone: s.timeZone,
    daily_new_target: s.dailyNewTarget,
    daily_review_cap: s.dailyReviewCap,
    updated_at: new Date().toISOString(),
  })
  if (error) throw new Error(error.message)
}

async function callReminders<T>(action: string): Promise<T> {
  const { data, error } = await db().functions.invoke('send-reminders', { body: { action } })
  if (error) {
    // The function's own error message is in the response body.
    const body = await (error as { context?: Response }).context?.json?.().catch(() => null)
    throw new Error(body?.error ?? 'The reminder service is not set up yet (see README, "Turn on reminders")')
  }
  return data as T
}

/** Sends a reminder now, whatever the time and even if nothing is due. */
export function sendTestReminder() {
  return callReminders<{ email: string; push: string }>('test')
}

// Web Push on this device.

export type PushState = 'unsupported' | 'needs-install' | 'denied' | 'off' | 'on'

const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent)
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches

export async function pushState(): Promise<PushState> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    // iPhone and iPad only offer push to apps added to the Home Screen.
    return isIos() && !isStandalone() ? 'needs-install' : 'unsupported'
  }
  if (Notification.permission === 'denied') return 'denied'
  const reg = await navigator.serviceWorker.ready
  return (await reg.pushManager.getSubscription()) ? 'on' : 'off'
}

function base64UrlToBytes(s: string): Uint8Array<ArrayBuffer> {
  const raw = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export async function enablePush(): Promise<void> {
  if ((await Notification.requestPermission()) !== 'granted') throw new Error('Notifications were blocked for this site')
  const { publicKey } = await callReminders<{ publicKey: string | null }>('public-key')
  if (!publicKey) throw new Error('VAPID keys are not set on the server yet (see README, "Turn on reminders")')

  const reg = await navigator.serviceWorker.ready
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(publicKey) }))
  const json = sub.toJSON()
  const { error } = await db()
    .from('push_subscriptions')
    .upsert({ endpoint: sub.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth }, { onConflict: 'endpoint' })
  if (error) throw new Error(error.message)
}

export async function disablePush(): Promise<void> {
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return
  await db().from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}
