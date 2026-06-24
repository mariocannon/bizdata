'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, CartesianGrid
} from 'recharts'

// ── Types ──────────────────────────────────────────────────────
type Listing = { industry: string; location: string; price_numeric: number; week: string }
type TurnoverRow = { industry: string; active_count: number; removed_last_week: number; turnover_pct: number }
type DOMRow = { industry: string; listings_sold: number; avg_days_on_market: number }
type VelocityRow = { week: string; industry: string; new_listings: number }
type PriceReduction = { listing_id: string; title: string; industry: string; old_price: number; new_price: number; pct_change: number }
type RegionalRow = { location: string; active_count: number; removed_last_week: number; turnover_pct: number }

// ── Metric card ────────────────────────────────────────────────
function Metric({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-medium ${color || 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

// ── Section card ───────────────────────────────────────────────
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">{title}</p>
      {children}
    </div>
  )
}

const COLORS = ['#3266ad','#1D9E75','#D85A30','#BA7517','#993556','#534AB7','#3B6D11','#185FA5','#639922','#D4537E']

export default function Dashboard() {
  const [listings, setListings] = useState<Listing[]>([])
  const [turnover, setTurnover] = useState<TurnoverRow[]>([])
  const [dom, setDom] = useState<DOMRow[]>([])
  const [velocity, setVelocity] = useState<VelocityRow[]>([])
  const [reductions, setReductions] = useState<PriceReduction[]>([])
  const [regional, setRegional] = useState<RegionalRow[]>([])
  const [newCount, setNewCount] = useState(0)
  const [removedCount, setRemovedCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'overview'|'velocity'|'price'|'location'|'reductions'>('overview')

  useEffect(() => {
    async function load() {
      const [
        { data: l },
        { data: t },
        { data: d },
        { data: v },
        { data: r },
        { data: reg },
        { count: nc },
        { count: rc },
      ] = await Promise.all([
        supabase.from('link_listings').select('industry,location,price_numeric,week').order('week', { ascending: false }).limit(2000),
        supabase.from('turnover_by_industry').select('*'),
        supabase.from('avg_days_on_market_by_industry').select('*'),
        supabase.from('new_listing_velocity').select('*').order('week', { ascending: true }).limit(200),
        supabase.from('price_reductions').select('*').limit(50),
        supabase.from('regional_turnover').select('*'),
        supabase.from('new_this_week').select('*', { count: 'exact', head: true }),
        supabase.from('removed_this_week').select('*', { count: 'exact', head: true }),
      ])
      setListings(l || [])
      setTurnover(t || [])
      setDom(d || [])
      setVelocity(v || [])
      setReductions(r || [])
      setRegional(reg || [])
      setNewCount(nc || 0)
      setRemovedCount(rc || 0)
      setLoading(false)
    }
    load()
  }, [])

  // ── Derived data ─────────────────────────────────────────────
  const latestWeek = listings[0]?.week
  const thisWeek = listings.filter(l => l.week === latestWeek)
  const prices = thisWeek.filter(l => l.price_numeric).map(l => l.price_numeric)
  const avgPrice = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0

  const byIndustry = thisWeek.reduce((acc, l) => {
    const k = l.industry || 'Unknown'
    acc[k] = (acc[k] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const industryChart = Object.entries(byIndustry).sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([industry, count]) => ({ industry: industry.replace('/', '/\n'), count }))

  // Velocity: pivot last 8 weeks, top 5 industries
  const top5 = Object.entries(byIndustry).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k)
const weeks = Array.from(new Set(velocity /* ... */));
  const velocityChart = weeks.map(w => {
    const row: Record<string, string | number> = { week: w.slice(5) }
    top5.forEach(ind => {
      row[ind] = velocity.find(v => v.week === w && v.industry === ind)?.new_listings || 0
    })
    return row
  })

  // Price brackets for this week
  const brackets = [
    { label: 'Under $100k', count: thisWeek.filter(l => l.price_numeric && l.price_numeric < 100000).length },
    { label: '$100k–$250k', count: thisWeek.filter(l => l.price_numeric >= 100000 && l.price_numeric < 250000).length },
    { label: '$250k–$500k', count: thisWeek.filter(l => l.price_numeric >= 250000 && l.price_numeric < 500000).length },
    { label: '$500k–$1M',   count: thisWeek.filter(l => l.price_numeric >= 500000 && l.price_numeric < 1000000).length },
    { label: 'Over $1M',    count: thisWeek.filter(l => l.price_numeric >= 1000000).length },
    { label: 'Price on req',count: thisWeek.filter(l => !l.price_numeric).length },
  ]

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-gray-400 text-sm">Loading dashboard...</p>
    </div>
  )

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'velocity', label: 'Velocity' },
    { id: 'price', label: 'Price' },
    { id: 'location', label: 'Location' },
    { id: 'reductions', label: 'Price drops' },
  ] as const

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-medium text-gray-900">LINK Business NZ</h1>
        <p className="text-sm text-gray-400 mt-1">
          {thisWeek.length} listings · week of {latestWeek || '—'}
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Metric label="Total listings" value={thisWeek.length.toString()} sub="this week" />
        <Metric label="New this week" value={newCount.toString()} color="text-emerald-600" />
        <Metric label="Removed" value={removedCount.toString()} sub="sold or delisted" color="text-red-500" />
        <Metric label="Avg asking price" value={avgPrice ? '$' + Math.round(avgPrice / 1000) + 'k' : '—'} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-100">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm rounded-t-lg transition-colors ${tab === t.id ? 'bg-white border border-b-white border-gray-100 text-gray-900 font-medium -mb-px' : 'text-gray-400 hover:text-gray-600'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card title="Listings by industry">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={industryChart} margin={{ bottom: 40 }}>
                <XAxis dataKey="industry" tick={{ fontSize: 11 }} interval={0} angle={-35} textAnchor="end" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3266ad" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Turnover rate by industry">
            <div className="space-y-2">
              {turnover.slice(0, 10).map((row, i) => (
                <div key={row.industry} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-36 truncate">{row.industry}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(row.turnover_pct, 100)}%`, background: row.turnover_pct > 20 ? '#D85A30' : row.turnover_pct > 10 ? '#BA7517' : '#3266ad' }} />
                  </div>
                  <span className="text-xs font-medium w-10 text-right">{row.turnover_pct}%</span>
                  <span className="text-xs text-gray-400 w-16 text-right">{row.active_count} active</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Avg days on market by industry (sold listings)">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dom.slice(0, 10)} layout="vertical" margin={{ left: 80 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="industry" tick={{ fontSize: 11 }} width={80} />
                <Tooltip formatter={(v) => [`${v} days`, 'Avg DOM']} />
                <Bar dataKey="avg_days_on_market" fill="#1D9E75" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Regional turnover">
            <div className="space-y-2">
              {regional.slice(0, 10).map(row => (
                <div key={row.location} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-36 truncate">{row.location}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="h-2 rounded-full"
                      style={{ width: `${Math.min(row.turnover_pct, 100)}%`, background: '#534AB7' }} />
                  </div>
                  <span className="text-xs font-medium w-10 text-right">{row.turnover_pct}%</span>
                  <span className="text-xs text-gray-400 w-16 text-right">{row.active_count} active</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── VELOCITY ── */}
      {tab === 'velocity' && (
        <Card title="New listings per week — top 5 industries">
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={velocityChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              {top5.map((ind, i) => (
                <Line key={ind} type="monotone" dataKey={ind} stroke={COLORS[i]} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* ── PRICE ── */}
      {tab === 'price' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card title="Price bracket distribution this week">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={brackets}>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#BA7517" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Avg price by industry this week">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={Object.entries(
                  thisWeek.filter(l => l.price_numeric).reduce((acc, l) => {
                    const k = l.industry || 'Unknown'
                    if (!acc[k]) acc[k] = []
                    acc[k].push(l.price_numeric)
                    return acc
                  }, {} as Record<string, number[]>)
                ).map(([industry, prices]) => ({
                  industry,
                  avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length / 1000)
                })).sort((a, b) => b.avg - a.avg).slice(0, 10)}
                layout="vertical" margin={{ left: 80 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `$${v}k`} />
                <YAxis type="category" dataKey="industry" tick={{ fontSize: 11 }} width={80} />
                <Tooltip formatter={v => [`$${v}k`, 'Avg price']} />
                <Bar dataKey="avg" fill="#3266ad" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* ── LOCATION ── */}
      {tab === 'location' && (
        <Card title="Listings by region this week">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-xs text-gray-400 font-medium">Region</th>
                  <th className="text-right py-2 px-3 text-xs text-gray-400 font-medium">Listings</th>
                  <th className="text-right py-2 px-3 text-xs text-gray-400 font-medium">Removed</th>
                  <th className="text-right py-2 px-3 text-xs text-gray-400 font-medium">Turnover</th>
                  <th className="py-2 px-3 text-xs text-gray-400 font-medium">Rate</th>
                </tr>
              </thead>
              <tbody>
                {regional.map(row => (
                  <tr key={row.location} className="border-b border-gray-50">
                    <td className="py-2 px-3 text-gray-700">{row.location}</td>
                    <td className="py-2 px-3 text-right text-gray-600">{row.active_count}</td>
                    <td className="py-2 px-3 text-right text-red-400">{row.removed_last_week}</td>
                    <td className="py-2 px-3 text-right font-medium">{row.turnover_pct}%</td>
                    <td className="py-2 px-3 w-24">
                      <div className="bg-gray-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-purple-500"
                          style={{ width: `${Math.min(row.turnover_pct, 100)}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── PRICE REDUCTIONS ── */}
      {tab === 'reductions' && (
        <Card title="Price reductions — listings where asking price has dropped">
          {reductions.length === 0 ? (
            <p className="text-sm text-gray-400">No price reductions detected yet — needs at least 2 weeks of data.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-3 text-xs text-gray-400 font-medium">Listing</th>
                    <th className="text-left py-2 px-3 text-xs text-gray-400 font-medium">Industry</th>
                    <th className="text-right py-2 px-3 text-xs text-gray-400 font-medium">Old price</th>
                    <th className="text-right py-2 px-3 text-xs text-gray-400 font-medium">New price</th>
                    <th className="text-right py-2 px-3 text-xs text-gray-400 font-medium">Drop</th>
                  </tr>
                </thead>
                <tbody>
                  {reductions.map(row => (
                    <tr key={row.listing_id} className="border-b border-gray-50">
                      <td className="py-2 px-3 text-gray-700 max-w-xs truncate">{row.title}</td>
                      <td className="py-2 px-3 text-gray-500">{row.industry}</td>
                      <td className="py-2 px-3 text-right text-gray-400">${row.old_price?.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right text-gray-700">${row.new_price?.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right font-medium text-red-500">{row.pct_change}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

    </div>
  )
}
