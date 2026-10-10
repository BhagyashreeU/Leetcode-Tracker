import { describe, expect, it } from 'vitest'
import { formatHour, localDayAndHour, reminderDay, reminderMessage } from './reminders'

describe('localDayAndHour', () => {
  it('uses the time zone, including half-hour offsets and day changes', () => {
    const now = new Date('2026-10-10T02:30:00Z')
    expect(localDayAndHour(now, 'UTC')).toEqual({ day: '2026-10-10', hour: 2 })
    expect(localDayAndHour(now, 'Asia/Kolkata')).toEqual({ day: '2026-10-10', hour: 8 })
    expect(localDayAndHour(now, 'America/Los_Angeles')).toEqual({ day: '2026-10-09', hour: 19 })
  })

  it('reports midnight as hour 0', () => {
    expect(localDayAndHour(new Date('2026-10-10T00:00:00Z'), 'UTC').hour).toBe(0)
  })
})

describe('reminderDay', () => {
  const s = { reminderHour: 8, timeZone: 'Asia/Kolkata', lastRemindedOn: null }

  it('fires in the reminder hour, once per local day', () => {
    expect(reminderDay(s, new Date('2026-10-10T02:30:00Z'))).toBe('2026-10-10')
    expect(reminderDay({ ...s, lastRemindedOn: '2026-10-10' }, new Date('2026-10-10T03:00:00Z'))).toBeNull()
    expect(reminderDay({ ...s, lastRemindedOn: '2026-10-09' }, new Date('2026-10-10T03:00:00Z'))).toBe('2026-10-10')
  })

  it('stays quiet outside the reminder hour', () => {
    expect(reminderDay(s, new Date('2026-10-10T02:00:00Z'))).toBeNull()
    expect(reminderDay(s, new Date('2026-10-10T03:30:00Z'))).toBeNull()
  })
})

describe('reminderMessage', () => {
  const item = (title: string, nextReviewOn: string | null, lapses = 0) => ({ title, nextReviewOn, lapses })

  it('sends nothing when nothing is due', () => {
    expect(reminderMessage([item('Two Sum', '2026-10-11'), item('Done', null)], '2026-10-10', 10)).toBeNull()
  })

  it('counts due and overdue problems, most overdue first, up to the cap', () => {
    const items = [item('B', '2026-10-10'), item('A', '2026-10-01'), item('C', '2026-10-09'), item('Later', '2026-10-12')]
    expect(reminderMessage(items, '2026-10-10', 10)).toEqual({
      subject: '3 LeetCode reviews due today',
      body: 'A, C and 1 more',
      titles: ['A', 'C', 'B'],
    })
    expect(reminderMessage(items, '2026-10-10', 2)?.subject).toBe('2 LeetCode reviews due today')
  })

  it('uses the singular for one review', () => {
    expect(reminderMessage([item('Two Sum', '2026-10-10')], '2026-10-10', 10)).toMatchObject({
      subject: '1 LeetCode review due today',
      body: 'Two Sum',
    })
  })
})

it('formats hours', () => {
  expect([0, 8, 12, 18].map(formatHour)).toEqual(['12:00 AM', '8:00 AM', '12:00 PM', '6:00 PM'])
})
