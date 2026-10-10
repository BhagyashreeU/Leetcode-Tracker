// Daily review reminders (docs/design.md, section 5). pg_cron calls this every
// 30 minutes; it emails and pushes to each user whose reminder hour it is and
// who has reviews due. The Settings page also calls it to fetch the VAPID
// public key and to send a test reminder.
//
// Secrets (see README, "Turn on reminders"): CRON_SECRET, RESEND_API_KEY,
// VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, APP_URL, and optionally REMINDER_FROM.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { DEFAULT_DAILY_REVIEW_CAP } from '../../../src/lib/schedule.ts'
import { localDayAndHour, reminderDay, reminderMessage, type ReminderMessage } from '../../../src/lib/reminders.ts'

const env = (name: string) => Deno.env.get(name) ?? ''

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

/** The service key: the legacy service_role key, or the new default secret key. */
function serviceKey(): string {
  if (env('SUPABASE_SERVICE_ROLE_KEY')) return env('SUPABASE_SERVICE_ROLE_KEY')
  try {
    const keys = JSON.parse(env('SUPABASE_SECRET_KEYS') || '{}') as Record<string, string>
    return keys.default ?? Object.values(keys)[0] ?? ''
  } catch {
    return ''
  }
}

interface SettingsRow {
  user_id: string
  reminder_email: string | null
  email_enabled: boolean
  push_enabled: boolean
  reminder_hour: number
  time_zone: string
  daily_review_cap: number
  last_reminded_on: string | null
}

interface Outcome {
  email: string
  push: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const body = (await req.json().catch(() => ({}))) as { action?: string }
  if (body.action === 'public-key') return json({ publicKey: env('VAPID_PUBLIC_KEY') || null })

  const db = createClient(env('SUPABASE_URL'), serviceKey(), { auth: { persistSession: false } })

  if (body.action === 'test') {
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer /, '')
    const { data } = await db.auth.getUser(token)
    if (!data.user) return json({ error: 'Sign in first' }, 401)
    const settings = await loadSettings(db, data.user.id)
    if (!settings) return json({ error: 'Save your settings first' }, 400)
    const { day } = localDayAndHour(new Date(), settings.time_zone)
    const message = (await dueMessage(db, settings, day)) ?? {
      subject: 'Test reminder: nothing due today',
      body: 'Reminders are working. You have no reviews due today.',
      titles: [],
    }
    return json(await remind(db, settings, message))
  }

  const secret = env('CRON_SECRET')
  if (!secret || req.headers.get('x-cron-secret') !== secret) return json({ error: 'Unauthorized' }, 401)

  const { data: rows, error } = await db.from('settings').select('*')
  if (error) return json({ error: error.message }, 500)
  const now = new Date()
  const results: Record<string, Outcome | string> = {}
  for (const settings of rows as SettingsRow[]) {
    const day = reminderDay(
      { reminderHour: settings.reminder_hour, timeZone: settings.time_zone, lastRemindedOn: settings.last_reminded_on },
      now,
    )
    if (!day || (!settings.email_enabled && !settings.push_enabled)) continue
    try {
      const message = await dueMessage(db, settings, day)
      results[settings.user_id] = message ? await remind(db, settings, message) : 'nothing due'
      await db.from('settings').update({ last_reminded_on: day }).eq('user_id', settings.user_id)
    } catch (e) {
      results[settings.user_id] = e instanceof Error ? e.message : String(e)
    }
  }
  console.log(JSON.stringify(results))
  return json(results)
})

async function loadSettings(db: SupabaseClient, userId: string): Promise<SettingsRow | null> {
  const { data } = await db.from('settings').select('*').eq('user_id', userId).maybeSingle()
  return data as SettingsRow | null
}

async function dueMessage(db: SupabaseClient, settings: SettingsRow, day: string): Promise<ReminderMessage | null> {
  const { data, error } = await db
    .from('user_problems')
    .select('next_review_on, lapses, problem:problems(title)')
    .eq('user_id', settings.user_id)
    .lte('next_review_on', day)
  if (error) throw new Error(error.message)
  const items = (data as unknown as { next_review_on: string; lapses: number; problem: { title: string } }[]).map((r) => ({
    title: r.problem.title,
    nextReviewOn: r.next_review_on,
    lapses: r.lapses,
  }))
  return reminderMessage(items, day, settings.daily_review_cap ?? DEFAULT_DAILY_REVIEW_CAP)
}

async function remind(db: SupabaseClient, settings: SettingsRow, message: ReminderMessage): Promise<Outcome> {
  const [email, push] = await Promise.all([
    settings.email_enabled ? sendEmail(db, settings, message) : 'off',
    settings.push_enabled ? sendPush(db, settings.user_id, message) : 'off',
  ])
  return { email, push }
}

async function sendEmail(db: SupabaseClient, settings: SettingsRow, message: ReminderMessage): Promise<string> {
  let to = settings.reminder_email
  if (!to) {
    const { data } = await db.auth.admin.getUserById(settings.user_id)
    to = data.user?.email ?? null
  }
  if (!to) return 'no email address'
  if (!env('RESEND_API_KEY')) return 'RESEND_API_KEY is not set'

  const appUrl = env('APP_URL')
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env('REMINDER_FROM') || 'LeetCode Tracker <onboarding@resend.dev>',
      to,
      subject: message.subject,
      html: emailHtml(message, appUrl),
      text: [message.subject, '', ...message.titles.map((t) => `- ${t}`), '', appUrl].join('\n'),
    }),
  })
  if (res.ok) return `sent to ${to}`
  return `Resend error ${res.status}: ${await res.text()}`
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

function emailHtml(message: ReminderMessage, appUrl: string): string {
  const items = message.titles.map((t) => `<li style="margin:4px 0">${escapeHtml(t)}</li>`).join('')
  const button = appUrl
    ? `<p><a href="${escapeHtml(appUrl)}" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Open LeetCode Tracker</a></p>`
    : ''
  return `<div style="font-family:system-ui,sans-serif;color:#0f172a;max-width:480px">
<h2 style="font-size:18px">${escapeHtml(message.subject)}</h2>
${items ? `<ul style="padding-left:20px">${items}</ul>` : `<p>${escapeHtml(message.body)}</p>`}
${button}
<p style="color:#64748b;font-size:12px">You can change reminder times or turn them off in Settings.</p>
</div>`
}

async function sendPush(db: SupabaseClient, userId: string, message: ReminderMessage): Promise<string> {
  try {
    webpush.setVapidDetails(env('APP_URL') || 'mailto:reminders@example.com', env('VAPID_PUBLIC_KEY'), env('VAPID_PRIVATE_KEY'))
  } catch (e) {
    return `VAPID keys are missing or invalid: ${e instanceof Error ? e.message : e}`
  }
  const { data, error } = await db.from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('user_id', userId)
  if (error) throw new Error(error.message)
  const subs = data as { id: string; endpoint: string; p256dh: string; auth: string }[]
  if (subs.length === 0) return 'no devices'

  const payload = JSON.stringify({ title: message.subject, body: message.body, url: '/' })
  let sent = 0
  const failures: string[] = []
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 12 * 3600 })
      sent++
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode
      // The browser dropped this subscription (unsubscribed or expired).
      if (status === 404 || status === 410) await db.from('push_subscriptions').delete().eq('id', s.id)
      else failures.push(e instanceof Error ? e.message : String(e))
    }
  }
  return `sent to ${sent} of ${subs.length} devices${failures.length ? ` (${failures.join('; ')})` : ''}`
}
