import { useState } from 'react'
import type { DayActivity } from '../../utils/gameAnalysis'

interface Props {
  activity: DayActivity[]
}

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

/** Return a color class based on game count */
function cellColor(count: number, max: number): string {
  if (count === 0) return 'bg-gray-800'
  const intensity = count / max
  if (intensity < 0.25) return 'bg-green-900'
  if (intensity < 0.5)  return 'bg-green-700'
  if (intensity < 0.75) return 'bg-green-500'
  return 'bg-green-400'
}

/** Build a 7×N week grid for the past 52 weeks (364 days) */
function buildGrid(activity: DayActivity[]): Array<Array<DayActivity | null>> {
  const actMap = new Map(activity.map((d) => [d.date, d]))

  // Start from the Sunday of the week 52 weeks ago
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(today)
  // Align end to the upcoming Saturday so the grid ends on a full week
  end.setDate(end.getDate() + (6 - end.getDay()))

  const start = new Date(end)
  start.setDate(start.getDate() - 52 * 7 + 1)
  // Align start to the Sunday
  start.setDate(start.getDate() - start.getDay())

  const weeks: Array<Array<DayActivity | null>> = []
  const cur = new Date(start)

  while (cur <= end) {
    const week: Array<DayActivity | null> = []
    for (let d = 0; d < 7; d++) {
      const dateStr = cur.toISOString().slice(0, 10)
      week.push(actMap.get(dateStr) ?? (cur <= today ? { date: dateStr, count: 0, wins: 0, losses: 0, draws: 0 } : null))
      cur.setDate(cur.getDate() + 1)
    }
    weeks.push(week)
  }

  return weeks
}

/** Determine which weeks should show a month label */
function getMonthLabels(weeks: Array<Array<DayActivity | null>>): Array<string | null> {
  return weeks.map((week, i) => {
    const firstDay = week.find((d) => d !== null)
    if (!firstDay) return null
    const date = new Date(firstDay.date)
    // Show month label on the first week that contains the 1st of the month
    if (date.getDate() <= 7 && (i === 0 || new Date(weeks[i - 1].find((d) => d !== null)?.date ?? '').getMonth() !== date.getMonth())) {
      return MONTH_LABELS[date.getMonth()]
    }
    return null
  })
}

export function ActivityHeatmap({ activity }: Props) {
  const [tooltip, setTooltip] = useState<{ day: DayActivity; x: number; y: number } | null>(null)

  const weeks = buildGrid(activity)
  const monthLabels = getMonthLabels(weeks)
  const maxCount = Math.max(1, ...activity.map((d) => d.count))
  const totalGames = activity.reduce((s, d) => s + d.count, 0)
  const activeDays = activity.filter((d) => d.count > 0).length

  return (
    <div className="bg-gray-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-white font-semibold">Activity Heatmap</h3>
        <div className="flex gap-4 text-xs text-gray-400">
          <span><span className="text-white font-semibold">{totalGames.toLocaleString()}</span> games</span>
          <span><span className="text-white font-semibold">{activeDays}</span> active days</span>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="relative inline-block">
          {/* Month labels row */}
          <div className="flex mb-1 ml-8">
            {weeks.map((_, i) => (
              <div key={i} className="w-3.5 text-xs text-gray-500 shrink-0">
                {monthLabels[i] ?? ''}
              </div>
            ))}
          </div>

          <div className="flex gap-0.5">
            {/* Day-of-week labels column */}
            <div className="flex flex-col gap-0.5 mr-1 w-7 shrink-0">
              {DAY_LABELS.map((label, d) => (
                <div key={d} className={`h-3.5 text-xs text-gray-500 flex items-center ${d % 2 === 1 ? '' : 'invisible'}`}>
                  {label}
                </div>
              ))}
            </div>

            {/* Weeks */}
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-0.5">
                {week.map((day, di) => (
                  <div
                    key={di}
                    className={`w-3.5 h-3.5 rounded-sm cursor-default ${
                      day === null ? 'bg-transparent' : cellColor(day.count, maxCount)
                    }`}
                    onMouseEnter={(e) => {
                      if (day && day.count > 0) {
                        setTooltip({ day, x: e.clientX, y: e.clientY })
                      }
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs pointer-events-none shadow-lg"
          style={{ left: tooltip.x + 12, top: tooltip.y - 60 }}
        >
          <p className="text-white font-semibold">{tooltip.day.date}</p>
          <p className="text-gray-300">{tooltip.day.count} games</p>
          <p className="text-green-400">{tooltip.day.wins}W · <span className="text-red-400">{tooltip.day.losses}L</span> · <span className="text-gray-400">{tooltip.day.draws}D</span></p>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500 justify-end">
        <span>Less</span>
        {['bg-gray-800','bg-green-900','bg-green-700','bg-green-500','bg-green-400'].map((c) => (
          <div key={c} className={`w-3.5 h-3.5 rounded-sm ${c}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  )
}
