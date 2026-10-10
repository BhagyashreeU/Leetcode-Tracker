// Creates the secrets the reminder job needs and the SQL that schedules it.
// Run with `npm run setup-reminders`; see README, "Turn on reminders".
//
// Writes two files that stay on this computer (both are in .gitignore):
//   supabase/reminders.env       secrets for `supabase secrets set --env-file`
//   supabase/reminders-cron.sql  paste into the Supabase SQL Editor
//
// Running it again keeps the existing keys, so devices that already turned on
// notifications keep working.

import { generateKeyPairSync, randomBytes } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline'

const ENV_FILE = 'supabase/reminders.env'
const SQL_FILE = 'supabase/reminders-cron.sql'

function readEnv(path) {
  if (!existsSync(path)) return {}
  return Object.fromEntries(
    readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/))
      .filter(Boolean)
      .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]),
  )
}

function vapidKeys() {
  const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
  const pub = publicKey.export({ format: 'jwk' })
  const priv = privateKey.export({ format: 'jwk' })
  const raw = Buffer.concat([Buffer.from([4]), Buffer.from(pub.x, 'base64url'), Buffer.from(pub.y, 'base64url')])
  return { VAPID_PUBLIC_KEY: raw.toString('base64url'), VAPID_PRIVATE_KEY: priv.d }
}

const supabaseUrl = readEnv('.env.local').VITE_SUPABASE_URL
if (!supabaseUrl) {
  console.error('Put VITE_SUPABASE_URL in .env.local first (see README, "Connect Supabase").')
  process.exit(1)
}

const existing = readEnv(ENV_FILE)
const rl = createInterface({ input: process.stdin })
const lines = rl[Symbol.asyncIterator]()
const ask = async (question, current) => {
  process.stdout.write(current ? `${question} [press Enter to keep ${current.slice(0, 12)}…]: ` : `${question}: `)
  const { value } = await lines.next()
  return (value ?? '').trim() || current || ''
}

const resendKey = await ask('Resend API key (starts with re_)', existing.RESEND_API_KEY)
let appUrl = await ask('Your Vercel address, like https://leetcode-tracker.vercel.app', existing.APP_URL)
rl.close()

appUrl = appUrl.replace(/\/+$/, '')
if (appUrl && !/^https:\/\//.test(appUrl)) appUrl = `https://${appUrl.replace(/^http:\/\//, '')}`
if (!resendKey.startsWith('re_')) console.warn('Warning: that Resend key does not start with re_. Emails will fail until it is fixed.')

const secrets = {
  RESEND_API_KEY: resendKey,
  APP_URL: appUrl,
  CRON_SECRET: existing.CRON_SECRET || randomBytes(24).toString('hex'),
  ...(existing.VAPID_PUBLIC_KEY && existing.VAPID_PRIVATE_KEY
    ? { VAPID_PUBLIC_KEY: existing.VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY: existing.VAPID_PRIVATE_KEY }
    : vapidKeys()),
}
if (existing.REMINDER_FROM) secrets.REMINDER_FROM = existing.REMINDER_FROM

writeFileSync(ENV_FILE, Object.entries(secrets).map(([k, v]) => `${k}=${v}`).join('\n') + '\n')

const functionUrl = `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/send-reminders`
writeFileSync(
  SQL_FILE,
  `-- Runs the reminder job every 30 minutes. Paste into the Supabase SQL Editor and click Run.
-- Safe to run again: it replaces the existing schedule.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('send-reminders') where exists (select 1 from cron.job where jobname = 'send-reminders');

select cron.schedule(
  'send-reminders',
  '0,30 * * * *',
  $$
  select net.http_post(
    url := '${functionUrl}',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "${secrets.CRON_SECRET}"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  )
  $$
);
`,
)

console.log(`
Done. Wrote ${ENV_FILE} and ${SQL_FILE} (both stay on this computer).

Next (README, "Turn on reminders", steps 4 and 5):
  npx supabase login
  npx supabase link --project-ref ${new URL(supabaseUrl).hostname.split('.')[0]}
  npx supabase secrets set --env-file ${ENV_FILE}
  npx supabase functions deploy send-reminders --use-api
Then paste ${SQL_FILE} into the Supabase SQL Editor and click Run.
`)
