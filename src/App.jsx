import { useState, useEffect, useCallback } from 'react'

const PRESETS = [150, 250, 350, 500]
const DEFAULT_GOAL = 2000

/* ── Storage helpers (localStorage) ──────────────────────────── */
const getTodayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const getPrevDay = (dateStr) => {
  const d = new Date(dateStr)
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

const loadDay = (dateStr) => {
  try {
    const raw = localStorage.getItem(`water:${dateStr}`)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

const saveDay = (dateStr, data) => {
  localStorage.setItem(`water:${dateStr}`, JSON.stringify(data))
}

const loadGoal = () => {
  const v = localStorage.getItem('water:goal')
  return v ? parseInt(v) : DEFAULT_GOAL
}

const calcStreak = (goal) => {
  let streak = 0
  let day = getPrevDay(getTodayStr())
  for (let i = 0; i < 365; i++) {
    const data = loadDay(day)
    if (!data) break
    const total = (data.entries || []).reduce((s, e) => s + e.amount, 0)
    if (total >= (data.goal || goal)) {
      streak++
      day = getPrevDay(day)
    } else break
  }
  return streak
}

/* ── WaveFill visual ──────────────────────────────────────────── */
function WaveFill({ pct, reached }) {
  const fill = reached ? '#22c55e' : '#3b82f6'
  const fillLight = reached ? '#bbf7d0' : '#bfdbfe'
  const y = 100 - pct

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: 20 }}>
      <defs>
        <clipPath id="bottle">
          <rect x="0" y="0" width="100" height="100" rx="20" />
        </clipPath>
      </defs>
      <g clipPath="url(#bottle)">
        <rect x="0" y="0" width="100" height="100" fill={fillLight} />
        <path
          d={`M0,${y} Q25,${y - 6} 50,${y} Q75,${y + 6} 100,${y} L100,100 L0,100 Z`}
          fill={fill}
          opacity="0.25"
        />
        <path
          d={`M0,${y + 3} Q25,${y - 3} 50,${y + 3} Q75,${y + 9} 100,${y + 3} L100,100 L0,100 Z`}
          fill={fill}
          opacity="0.9"
        />
      </g>
    </svg>
  )
}

/* ── Main App ─────────────────────────────────────────────────── */
export default function App() {
  const [entries, setEntries] = useState([])
  const [goal, setGoal] = useState(DEFAULT_GOAL)
  const [customAmount, setCustomAmount] = useState('')
  const [streak, setStreak] = useState(0)
  const [editingGoal, setEditingGoal] = useState(false)
  const [tempGoal, setTempGoal] = useState('')
  const [flash, setFlash] = useState(null)
  const [tab, setTab] = useState('today') // 'today' | 'log'

  const today = getTodayStr()

  useEffect(() => {
    const g = loadGoal()
    setGoal(g)
    const data = loadDay(today)
    if (data) setEntries(data.entries || [])
    setStreak(calcStreak(g))
  }, [])

  const persistDay = useCallback((newEntries, currentGoal) => {
    saveDay(today, { entries: newEntries, goal: currentGoal })
    setStreak(calcStreak(currentGoal))
  }, [today])

  const addWater = (amount) => {
    const entry = {
      id: Date.now(),
      amount,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    const next = [...entries, entry]
    setEntries(next)
    persistDay(next, goal)
    setFlash(amount)
    setTimeout(() => setFlash(null), 700)
  }

  const removeEntry = (id) => {
    const next = entries.filter((e) => e.id !== id)
    setEntries(next)
    persistDay(next, goal)
  }

  const handleCustomAdd = () => {
    const val = parseInt(customAmount)
    if (val > 0 && val <= 5000) {
      addWater(val)
      setCustomAmount('')
    }
  }

  const handleSaveGoal = () => {
    const g = parseInt(tempGoal)
    if (g >= 100 && g <= 10000) {
      setGoal(g)
      localStorage.setItem('water:goal', String(g))
      persistDay(entries, g)
    }
    setEditingGoal(false)
  }

  /* derived */
  const total = entries.reduce((s, e) => s + e.amount, 0)
  const pct = Math.min(Math.round((total / goal) * 100), 100)
  const remaining = Math.max(goal - total, 0)
  const reached = total >= goal

  /* ── History (last 7 days) ── */
  const history = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    const data = loadDay(dateStr)
    const dayTotal = data ? (data.entries || []).reduce((s, e) => s + e.amount, 0) : 0
    const dayGoal = data?.goal || goal
    return {
      dateStr,
      label: i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' }),
      total: dayTotal,
      goal: dayGoal,
      pct: Math.min(Math.round((dayTotal / dayGoal) * 100), 100),
    }
  }).reverse()

  /* ── Styles ── */
  const s = {
    page: {
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #e0f0ff 0%, #f0f7ff 60%, #e8f5e9 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '24px 16px 48px',
    },
    card: {
      background: '#fff',
      borderRadius: 20,
      boxShadow: '0 2px 16px rgba(59,130,246,0.08)',
      padding: '20px',
      marginBottom: 12,
      width: '100%',
      maxWidth: 420,
    },
    label: {
      fontSize: 12,
      fontWeight: 500,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      color: '#6b7280',
      marginBottom: 10,
    },
  }

  return (
    <div style={s.page}>

      {/* App title */}
      <div style={{ width: '100%', maxWidth: 420, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 600, color: '#1e3a5f', letterSpacing: '-0.5px' }}>
              💧 Hydration
            </h1>
            <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          {streak > 0 && (
            <div style={{
              background: '#fff7ed',
              border: '1.5px solid #fed7aa',
              borderRadius: 14,
              padding: '8px 14px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 20 }}>🔥</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#c2410c', marginTop: 2 }}>
                {streak} day streak
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Wave card */}
      <div style={{ ...s.card, padding: 0, overflow: 'hidden', position: 'relative', minHeight: 180 }}>
        <WaveFill pct={pct} reached={reached} />
        <div style={{ position: 'relative', zIndex: 1, padding: '28px 24px 22px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: 52, fontWeight: 600, color: reached ? '#15803d' : '#1d4ed8', lineHeight: 1, letterSpacing: '-2px' }}>
            {total}
            <span style={{ fontSize: 18, fontWeight: 400, marginLeft: 4 }}>ml</span>
          </div>
          <div style={{ fontSize: 14, color: reached ? '#166534' : '#1e40af', marginTop: 6, fontWeight: 500 }}>
            {reached
              ? '🎉 Goal reached! Great job!'
              : `${remaining} ml to reach your goal`}
          </div>
          <div style={{
            marginTop: 16,
            width: '100%',
            background: 'rgba(255,255,255,0.55)',
            borderRadius: 100,
            height: 8,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${pct}%`,
              background: reached ? '#22c55e' : '#3b82f6',
              borderRadius: 100,
              transition: 'width 0.5s cubic-bezier(.4,0,.2,1)',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: 6 }}>
            <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>{pct}%</span>
            <button
              onClick={() => { setTempGoal(String(goal)); setEditingGoal(true) }}
              style={{ fontSize: 12, color: '#2563eb', background: 'none', fontWeight: 500, textDecoration: 'underline' }}
            >
              Goal: {goal} ml
            </button>
          </div>
        </div>
      </div>

      {/* Edit goal */}
      {editingGoal && (
        <div style={{ ...s.card, background: '#eff6ff', border: '1.5px solid #bfdbfe' }}>
          <div style={s.label}>Set daily goal</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="number"
              value={tempGoal}
              onChange={e => setTempGoal(e.target.value)}
              placeholder="e.g. 2500"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSaveGoal()}
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 10,
                border: '1.5px solid #93c5fd', fontSize: 15,
                background: '#fff', color: '#1e3a5f',
              }}
            />
            <button onClick={handleSaveGoal} style={{
              padding: '10px 18px', borderRadius: 10, background: '#3b82f6',
              color: '#fff', fontSize: 14, fontWeight: 500,
            }}>Save</button>
            <button onClick={() => setEditingGoal(false)} style={{
              padding: '10px 12px', borderRadius: 10, background: '#e5e7eb',
              color: '#374151', fontSize: 14,
            }}>✕</button>
          </div>
        </div>
      )}

      {/* Quick add presets */}
      <div style={s.card}>
        <div style={s.label}>Quick add</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {PRESETS.map(amount => (
            <button
              key={amount}
              onClick={() => addWater(amount)}
              style={{
                padding: '12px 4px',
                borderRadius: 12,
                background: flash === amount ? '#dbeafe' : '#f0f7ff',
                color: flash === amount ? '#1d4ed8' : '#374151',
                border: `1.5px solid ${flash === amount ? '#93c5fd' : '#e5e7eb'}`,
                fontSize: 14,
                fontWeight: 500,
                transition: 'all 0.15s ease',
              }}
            >
              {amount} ml
            </button>
          ))}
        </div>
      </div>

      {/* Custom amount */}
      <div style={s.card}>
        <div style={s.label}>Custom amount</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="number"
            value={customAmount}
            onChange={e => setCustomAmount(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCustomAdd()}
            placeholder="Enter ml amount"
            min="1"
            max="5000"
            style={{
              flex: 1, padding: '11px 14px', borderRadius: 12,
              border: '1.5px solid #e5e7eb', fontSize: 15,
              background: '#f9fafb', color: '#1e3a5f',
            }}
          />
          <button
            onClick={handleCustomAdd}
            style={{
              padding: '11px 20px', borderRadius: 12,
              background: '#3b82f6', color: '#fff',
              fontSize: 15, fontWeight: 500,
              transition: 'background 0.15s',
            }}
          >
            + Add
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ ...s.card, padding: '6px' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {['today', 'history'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '9px', borderRadius: 12,
                background: tab === t ? '#3b82f6' : 'transparent',
                color: tab === t ? '#fff' : '#6b7280',
                fontSize: 14, fontWeight: 500,
                transition: 'all 0.2s',
              }}
            >
              {t === 'today' ? "Today's Log" : '7-Day History'}
            </button>
          ))}
        </div>
      </div>

      {/* Today's log */}
      {tab === 'today' && (
        <div style={{ ...s.card }}>
          <div style={s.label}>Today's entries ({entries.length})</div>
          {entries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#9ca3af', fontSize: 14 }}>
              No entries yet. Start logging!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[...entries].reverse().map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 12px', borderRadius: 12,
                    background: '#f0f7ff', border: '1px solid #dbeafe',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />
                    <span style={{ fontSize: 15, fontWeight: 500, color: '#1e3a5f', fontFamily: 'var(--mono)' }}>
                      {entry.amount} ml
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>{entry.time}</span>
                    <button
                      onClick={() => removeEntry(entry.id)}
                      style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: '#fee2e2', color: '#dc2626',
                        fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History tab */}
      {tab === 'history' && (
        <div style={s.card}>
          <div style={s.label}>Last 7 days</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {history.map(day => (
              <div key={day.dateStr}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: day.dateStr === today ? '#2563eb' : '#374151' }}>
                    {day.label}
                    {day.dateStr === today && <span style={{ fontSize: 11, color: '#60a5fa', marginLeft: 6 }}>(today)</span>}
                  </span>
                  <span style={{ fontSize: 13, color: day.pct >= 100 ? '#16a34a' : '#6b7280', fontFamily: 'var(--mono)' }}>
                    {day.total} / {day.goal} ml {day.pct >= 100 ? '✓' : ''}
                  </span>
                </div>
                <div style={{ background: '#e5e7eb', borderRadius: 100, height: 6, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${day.pct}%`,
                    background: day.pct >= 100 ? '#22c55e' : '#3b82f6',
                    borderRadius: 100,
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
