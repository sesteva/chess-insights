import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { LoadingState } from '../../store/gameStore'

interface CountryStat {
  country: string
  count: number
}

interface Props {
  stats: CountryStat[]
  loadingState: LoadingState
  totalOpponents: number
}

/** Convert ISO 2-letter country code to a Unicode flag emoji */
function countryFlag(code: string): string {
  return code
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(c.charCodeAt(0) - 65 + 0x1f1e6))
    .join('')
}

/** Friendly country name from ISO code (best-effort, falls back to code) */
const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States', GB: 'United Kingdom', DE: 'Germany', FR: 'France',
  IN: 'India', RU: 'Russia', BR: 'Brazil', CA: 'Canada', AU: 'Australia',
  ES: 'Spain', IT: 'Italy', TR: 'Turkey', PL: 'Poland', NL: 'Netherlands',
  UA: 'Ukraine', AR: 'Argentina', MX: 'Mexico', CN: 'China', JP: 'Japan',
  KR: 'South Korea', SE: 'Sweden', NO: 'Norway', FI: 'Finland', PT: 'Portugal',
  RO: 'Romania', CZ: 'Czech Rep.', HU: 'Hungary', SK: 'Slovakia', AT: 'Austria',
  CH: 'Switzerland', BE: 'Belgium', DK: 'Denmark', GR: 'Greece', IR: 'Iran',
  EG: 'Egypt', NG: 'Nigeria', ZA: 'South Africa', PH: 'Philippines', VN: 'Vietnam',
  ID: 'Indonesia', MY: 'Malaysia', TH: 'Thailand', PK: 'Pakistan', BD: 'Bangladesh',
  CO: 'Colombia', CL: 'Chile', PE: 'Peru', VE: 'Venezuela', CU: 'Cuba',
}

function countryName(code: string): string {
  return COUNTRY_NAMES[code.toUpperCase()] ?? code.toUpperCase()
}

export function GeographyCard({ stats, loadingState, totalOpponents }: Props) {
  const top15 = stats.slice(0, 15)
  const coveredOpponents = stats.reduce((sum, s) => sum + s.count, 0)

  const chartData = top15.map((s) => ({
    name: `${countryFlag(s.country)} ${countryName(s.country)}`,
    count: s.count,
    code: s.country,
  }))

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-blue-400">{stats.length}</p>
          <p className="text-gray-400 text-sm mt-1">Countries</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-blue-300">{totalOpponents}</p>
          <p className="text-gray-400 text-sm mt-1">Unique Opponents</p>
        </div>
        {stats[0] && (
          <div className="bg-gray-800 rounded-xl p-4 text-center">
            <p className="text-3xl">{countryFlag(stats[0].country)}</p>
            <p className="text-white font-semibold mt-1">{countryName(stats[0].country)}</p>
            <p className="text-gray-400 text-xs">{stats[0].count} opponents</p>
          </div>
        )}
      </div>

      {/* Loading indicator */}
      {loadingState === 'loading' && (
        <p className="text-gray-400 text-sm text-center animate-pulse">
          Fetching opponent countries… ({coveredOpponents}/{totalOpponents} resolved)
        </p>
      )}

      {/* Bar chart */}
      {top15.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-4">
          <h3 className="text-white font-semibold mb-4">Top 15 Opponent Countries</h3>
          <ResponsiveContainer width="100%" height={Math.max(200, top15.length * 32)}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 50, left: 8, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: '#9ca3af', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={160}
                tick={{ fill: '#d1d5db', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                formatter={(value: number) => [`${value} opponents`, 'Opponents']}
                labelFormatter={(label) => label}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} label={{ position: 'right', fill: '#9ca3af', fontSize: 11 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {loadingState === 'idle' && stats.length === 0 && (
        <p className="text-gray-500 text-sm text-center">Opponent country data not yet loaded.</p>
      )}
    </div>
  )
}
