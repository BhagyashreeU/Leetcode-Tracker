// Reminder rules from docs/design.md, section 5. Shared by the Settings page
// and the send-reminders Edge Function (which runs on Deno, hence the .ts
// import paths).
import { dueToday, type DueItem } from './schedule.ts'

/** The calendar day ("YYYY-MM-DD") and hour (0-23) at `now` in `timeZone`. */
export function localDayAndHour(now: Date, timeZone: string): { day: string; hour: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  )
  return { day: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) }
}

export interface ReminderSchedule {
  reminderHour: number
  timeZone: string
  /** The local day the last reminder went out, so the job never sends twice in a day. */
  lastRemindedOn: string | null
}

/**
 * The local day to remind for, or null when it isn't time. The job runs every
 * 30 minutes, so time zones with half-hour offsets still get their hour.
 */
export function reminderDay(s: ReminderSchedule, now: Date): string | null {
  const { day, hour } = localDayAndHour(now, s.timeZone)
  if (hour !== s.reminderHour || s.lastRemindedOn === day) return null
  return day
}

export interface ReminderMessage {
  subject: string
  /** Short line for the push notification. */
  body: string
  titles: string[]
}

/** What to send for the problems due on `day`, or null when nothing is due. */
export function reminderMessage<T extends DueItem & { title: string }>(items: T[], day: string, cap: number): ReminderMessage | null {
  const { shown } = dueToday(items, day, cap)
  if (shown.length === 0) return null
  const titles = shown.map((i) => i.title)
  const subject = shown.length === 1 ? '1 LeetCode review due today' : `${shown.length} LeetCode reviews due today`
  const body = titles.length <= 2 ? titles.join(' and ') : `${titles.slice(0, 2).join(', ')} and ${titles.length - 2} more`
  return { subject, body, titles }
}

/** "8:00 AM" for 8, "12:00 PM" for 12. */
export function formatHour(hour: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12
  return `${h}:00 ${hour < 12 ? 'AM' : 'PM'}`
}
