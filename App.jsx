import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  Leaf, Search, TrendingUp, TrendingDown, Minus,
  CloudRain, CheckCircle, Zap, ChevronDown, RefreshCw,
  BarChart2, ShieldAlert, Lock, Cloud, Bot, Calculator, AlertTriangle
} from 'lucide-react'

// =====================================================
// 工具函式
// =====================================================

function parseROCDate(dateStr) {
  const s = String(dateStr || '')
  if (s.length === 7) {
    const year  = parseInt(s.substring(0, 3), 10) + 1911
    const month = s.substring(3, 5)
    const day   = s.substring(5, 7)
    return `${year}/${month}/${day}`
  }
  return dateStr || ''
}

function renderMarkdown(text) {
  if (!text) return null
  return text.split('\n').map((line, i) => {
    const html = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    if (line.trim() === '') return <br key={i} />
    if (line.startsWith('### ')) return <h3 key={i} dangerouslySetInnerHTML={{ __html: html.slice(4) }} />
    if (line.startsWith('## '))  return <h3 key={i} dangerouslySetInnerHTML={{ __html: html.slice(3) }} />
    if (line.startsWith('# '))   return <h3 key={i} dangerouslySetInnerHTML={{ __html: html.slice(2) }} />
    if (line.startsWith('- ') || line.startsWith('• ')) {
      return <li key={i} dangerouslySetInnerHTML={{ __html: html.slice(2) }} />
    }
    return <p key={i} dangerouslySetInnerHTML={{ __html: html }} />
  })
}

const CITIES = [
  '全台平均', '臺北市', '新北市', '桃園市', '臺中市', '彰化縣', '南投縣', 
  '雲林縣', '嘉義市', '臺南市', '高雄市', '屏東縣', '宜蘭縣', '花蓮縣', '臺東縣'
]

// =====================================================
// SVG 折線圖元件
// =====================================================
function PriceChart({ data }) {
  const [hovered, setHovered] = useState(null)

  if (!data || data.length < 2) {
    return (
      <div className="empty-state" style={{ padding: '40px 0' }}>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>資料點不足，無法繪製圖表</p>
      </div>
    )
  }

  const W = 580, H = 150
  const PAD = { top: 20, right: 16, bottom: 32, left: 48 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const prices = data.map(d => d.price)
  const minP = Math.min(...prices)
  const maxP = Math.max(...prices)
  const range = maxP - minP || 1

  const toX = i => PAD.left + (i / (data.length - 1)) * innerW
  const toY = p => PAD.top + (1 - (p - minP) / range) * innerH

  const pts = data.map((d, i) => ({ x: toX(i), y: toY(d.price), ...d }))

  let linePath = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const cp = (pts[i - 1].x + pts[i].x) / 2
    linePath += ` C ${cp} ${pts[i-1].y}, ${cp} ${pts[i].y}, ${pts[i].x} ${pts[i].y}`
  }
  const areaPath = `${linePath} L ${pts[pts.length-1].x} ${PAD.top + innerH} L ${pts[0].x} ${PAD.top + innerH} Z`

  const yTicks = [0, 0.5, 1].map(r => ({
    y: PAD.top + (1 - r) * innerH,
    val: (minP + r * range).toFixed(0),
  }))

  const xLabels = [0, Math.floor(data.length / 2), data.length - 1]
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .map(i => ({ x: toX(i), label: parseROCDate(data[i].date).slice(5) }))

  return (
    <div className="chart-wrapper">
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg">
        <defs>
          <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#10b981" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.left} y1={t.y} x2={W - PAD.right} y2={t.y}
              stroke="var(--border-color)" strokeWidth="1" strokeDasharray="4,6" />
            <text x={PAD.left - 8} y={t.y + 4} textAnchor="end"
              fill="var(--text-muted)" fontSize="10" fontFamily="Outfit">
              {t.val}
            </text>
          </g>
        ))}

        {xLabels.map((l, i) => (
          <text key={i} x={l.x} y={H - 4} textAnchor="middle"
            fill="var(--text-muted)" fontSize="10" fontFamily="Outfit">
            {l.label}
          </text>
        ))}

        <path d={areaPath} fill="url(#cg)" />
        <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />

        {pts.map((p, i) => (
          <g key={i}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            style={{ cursor: 'crosshair' }}
          >
            <circle cx={p.x} cy={p.y} r="18" fill="transparent" />
            {hovered === i && (
              <>
                <circle cx={p.x} cy={p.y} r="5" fill="#fff" stroke="var(--accent)" strokeWidth="2" />
                <g className="chart-tooltip">
                  <rect
                    x={Math.min(Math.max(p.x - 44, PAD.left), W - PAD.right - 88)}
                    y={p.y - 42}
                    width="88" height="28" rx="7"
                    fill="var(--text-primary)"
                  />
                  <text
                    x={Math.min(Math.max(p.x, PAD.left + 44), W - PAD.right - 44)}
                    y={p.y - 22}
                    textAnchor="middle"
                    fill="#fff" fontSize="11" fontFamily="Outfit" fontWeight="700"
                  >
                    NT$ {p.price}
                  </text>
                </g>
              </>
            )}
          </g>
        ))}
      </svg>
    </div>
  )
}

// =====================================================
// 主 App 元件
// =====================================================
export default function App() {
  const [veggieNames, setVeggieNames]       = useState([])
  
  // 搜尋與選擇狀態
  const [searchTerm, setSearchTerm]         = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedVeggie, setSelectedVeggie] = useState('')
  const [selectedCity, setSelectedCity]     = useState('全台平均')
  
  const [priceData, setPriceData]           = useState(null)
  const [timeRange, setTimeRange]           = useState('month')
  const [loadingNames, setLoadingNames]     = useState(true)
  const [loadingData, setLoadingData]       = useState(false)
  const [dataError, setDataError]           = useState(null)
  const [namesError, setNamesError]         = useState(null)

  // AI 分析
  const [aiResult, setAiResult]     = useState(null)
  const [loadingAI, setLoadingAI]   = useState(false)
  const [showAI, setShowAI]         = useState(false)

  // 天氣資料
  const [weather, setWeather]       = useState(null)
  const [loadingWeather, setLoadingWeather] = useState(false)

  // 管理員同步面板
  const [showAdmin, setShowAdmin]   = useState(false)
  const [syncToken, setSyncToken]   = useState('')
  const [syncing, setSyncing]       = useState(false)
  const [syncMsg, setSyncMsg]       = useState(null)

  // 零售價試算
  const [retailPrice, setRetailPrice] = useState('')
  const [retailUnit, setRetailUnit]   = useState('jin') // 'jin' (臺斤) 或 'kg' (公斤)

  const searchContainerRef = useRef(null)

  // 點擊外部關閉自動完成
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // --- 切換縣市時自動抓天氣 ---
  useEffect(() => {
    setWeather(null)
    setLoadingWeather(true)
    fetch(`/api/weather?city=${encodeURIComponent(selectedCity)}`)
      .then(r => r.json())
      .then(data => {
        if (!data.error) setWeather(data)
      })
      .catch(() => {})
      .finally(() => setLoadingWeather(false))
  }, [selectedCity])

  // --- 啟動時取得品項清單 ---
  useEffect(() => {
    setLoadingNames(true)
    fetch('/api/veggies?action=names')
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setVeggieNames(data.names || [])
        if (data.names?.length > 0) {
          const defaultItem = data.names.includes('高麗菜') ? '高麗菜' : data.names[0]
          setSelectedVeggie(defaultItem)
          setSearchTerm(defaultItem)
        }
      })
      .catch(err => setNamesError(err.message))
      .finally(() => setLoadingNames(false))
  }, [])

  // --- 切換品項或縣市時取得價格資料 ---
  useEffect(() => {
    if (!selectedVeggie) return
    setLoadingData(true)
    setDataError(null)
    setPriceData(null)
    setAiResult(null)
    setShowAI(false)

    const url = `/api/veggies?name=${encodeURIComponent(selectedVeggie)}&city=${encodeURIComponent(selectedCity)}`
    
    fetch(url)
      .then(async r => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || '請求失敗')
        return data
      })
      .then(data => setPriceData(data))
      .catch(err => setDataError(err.message))
      .finally(() => setLoadingData(false))
  }, [selectedVeggie, selectedCity])

  const filteredNames = useMemo(() => {
    if (!searchTerm) return veggieNames.slice(0, 50)
    return veggieNames.filter(n => n.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 50)
  }, [searchTerm, veggieNames])

  const handleSelectVeggie = (name) => {
    setSearchTerm(name)
    setSelectedVeggie(name)
    setShowSuggestions(false)
  }

  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter') {
      if (filteredNames.length > 0) handleSelectVeggie(filteredNames[0])
      setShowSuggestions(false)
    }
  }

  // --- 計算圖表資料 ---
  const chartData = useMemo(() => {
    if (!priceData?.history) return []
    const h = priceData.history
    if (timeRange === 'week')  return h.slice(-7)
    if (timeRange === 'month') return h.slice(-30)
    if (timeRange === 'year') {
      const map = {}
      h.forEach(({ date, price }) => {
        const key = String(date).substring(0, 5)
        if (!map[key]) map[key] = { prices: [], date }
        map[key].prices.push(price)
      })
      return Object.entries(map)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-12)
        .map(([, { prices, date }]) => ({
          date,
          price: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length * 10) / 10,
        }))
    }
    return h
  }, [priceData, timeRange])

  // --- AI 分析 ---
  const handleAnalyze = useCallback(async () => {
    if (!priceData) return
    setLoadingAI(true)
    setShowAI(true)
    try {
      const resp = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedVeggie,
          currentPrice: priceData.currentPrice,
          city: selectedCity,
          history: priceData.history?.slice(-14) || [],
        }),
      })
      const data = await resp.json()
      setAiResult(data)
    } catch (err) {
      setAiResult({ error: err.message })
    } finally {
      setLoadingAI(false)
    }
  }, [priceData, selectedVeggie, selectedCity])

  // --- 資料同步 ---
  const handleSync = async () => {
    if (!syncToken.trim()) return setSyncMsg({ type: 'error', text: '請輸入密碼' })
    setSyncing(true)
    try {
      const resp = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-sync-token': syncToken }
      })
      const data = await resp.json()
      if (data.error) throw new Error(data.error)
      setSyncMsg({ type: 'success', text: data.message })
    } catch (err) {
      setSyncMsg({ type: 'error', text: err.message })
    } finally {
      setSyncing(false)
    }
  }

  const changeDir = priceData?.priceChange > 0 ? 'up' : priceData?.priceChange < 0 ? 'down' : 'flat'

  // --- 計算換算後零售價與指標 ---
  const retailCalc = useMemo(() => {
    if (!priceData || !retailPrice || isNaN(retailPrice)) return null
    const priceVal = parseFloat(retailPrice)
    const pricePerKg = retailUnit === 'jin' ? priceVal / 0.6 : priceVal
    const wholesale = priceData.currentPrice
    const ratio = pricePerKg / wholesale

    let status = 'green'
    let text = '合理範圍'
    let progress = 50

    if (ratio < 1.3) {
      status = 'green'
      text = '非常划算'
      progress = (ratio - 1) * 100 // 1.0 = 0%, 1.3 = 30%
    } else if (ratio <= 1.8) {
      status = 'green'
      text = '合理範圍 (含運銷利潤)'
      progress = 30 + ((ratio - 1.3) / 0.5) * 40 // 30% ~ 70%
    } else if (ratio <= 2.2) {
      status = 'yellow'
      text = '價格稍微偏高'
      progress = 70 + ((ratio - 1.8) / 0.4) * 20 // 70% ~ 90%
    } else {
      status = 'red'
      text = '價格昂貴'
      progress = Math.min(100, 90 + ((ratio - 2.2) / 1.0) * 10)
    }

    return {
      pricePerKg: Math.round(pricePerKg * 10) / 10,
      diffPercent: Math.round((ratio - 1) * 100),
      status, text, progress: Math.max(0, Math.min(100, progress))
    }
  }, [retailPrice, retailUnit, priceData])


  return (
    <div className="app-wrapper">
      <nav className="navbar">
        <div className="container navbar-inner">
          <div className="navbar-logo">
            <div className="navbar-logo-icon">🌿</div>
            <span>蔬果匯率</span>
          </div>
          <div className="navbar-badge">
            <span className="live-dot" /> 農業部即時資料
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="container">
          <div className="hero-eyebrow">Taiwan Vegetable Exchange Rate</div>
          <h1 className="hero-title">精準掌握菜價行情</h1>
          <p className="hero-subtitle">全台市場批發價即時查詢、零售價試算，不再被當盤子。</p>

          {/* 天氣小卡 */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: 'var(--bg-card)', border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-full)', padding: '8px 20px',
              boxShadow: 'var(--shadow-sm)', minWidth: 220, justifyContent: 'center',
              minHeight: 38
            }}>
              {loadingWeather ? (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>📡 載入天氣中...</span>
              ) : weather ? (
                <>
                  <span style={{ fontSize: '1.2rem' }}>{weather.emoji}</span>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{weather.city}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {weather.wx}・{weather.minT}~{weather.maxT}°C
                  </span>
                  <span style={{
                    background: parseInt(weather.pop) > 50 ? 'var(--safe-light)' : 'var(--accent-light)',
                    color: parseInt(weather.pop) > 50 ? 'var(--safe-dark)' : 'var(--accent-dark)',
                    borderRadius: 'var(--radius-full)', padding: '2px 10px', fontSize: '0.8rem', fontWeight: 600
                  }}>☂️ {weather.pop}%</span>
                </>
              ) : (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>🌤️ 天氣資料暫時無法取得</span>
              )}
            </div>
          </div>

          <div className="search-area">
            <div className="search-box" ref={searchContainerRef}>
              <Search size={20} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="輸入蔬果名稱 (例：高麗菜)"
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setShowSuggestions(true) }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={handleSearchSubmit}
              />
              {showSuggestions && filteredNames.length > 0 && (
                <div className="search-suggestions">
                  {filteredNames.map(name => (
                    <div key={name} className="suggestion-item" onClick={() => handleSelectVeggie(name)}>
                      <Leaf size={14} color="var(--accent)" /> {name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="city-select-wrapper">
              <select 
                className="city-select" 
                value={selectedCity} 
                onChange={e => setSelectedCity(e.target.value)}
              >
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>
      </section>

      <main style={{ flex: 1 }}>
        <div className="container" style={{ paddingBottom: 60 }}>
          
          {(loadingData || loadingNames) && (
            <div className="loading-wrapper">
              <div className="spinner" />
              <p style={{ marginTop: 16, color: 'var(--text-secondary)' }}>正在載入市場行情...</p>
            </div>
          )}

          {dataError && !loadingData && (
            <div className="error-card">
              <ShieldAlert size={40} color="var(--warning)" style={{ margin: '0 auto 16px' }} />
              <h3 className="empty-state-title">哎呀，找不到該蔬果的資料</h3>
              <p className="empty-state-msg">{dataError}</p>
            </div>
          )}

          {priceData && !loadingData && !dataError && (
            <>
              {priceData.isFallback && (
                <div className="fallback-alert">
                  <AlertTriangle size={18} />
                  這段期間 {selectedCity} 當地批發市場沒有 {selectedVeggie} 的交易紀錄，已為您自動切換顯示「全台平均價」。
                </div>
              )}

              <div className="stats-row">
                <div className="stat-card">
                  <div className="stat-label">批發均價 ({priceData.usedCity})</div>
                  <div className="stat-value">
                    {priceData.currentPrice.toFixed(1)} <span className="stat-value-unit">元/公斤</span>
                  </div>
                  <div className={`stat-change ${changeDir}`}>
                    {changeDir === 'up' && <TrendingUp size={12} />}
                    {changeDir === 'down' && <TrendingDown size={12} />}
                    {changeDir === 'flat' && <Minus size={12} />}
                    較前次 {Math.abs(priceData.priceChange)}%
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-label">最新交易量</div>
                  <div className="stat-value">
                    {priceData.lastVolume?.toLocaleString() || '—'} <span className="stat-value-unit">公斤</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-label">最後資料日期</div>
                  <div className="stat-value" style={{ fontSize: '1.6rem', marginTop: 4 }}>
                    {parseROCDate(priceData.lastDate)}
                  </div>
                </div>
              </div>

              <div className="main-grid">
                <div className="card">
                  <div className="chart-header">
                    <div className="card-title" style={{ marginBottom: 0 }}>
                      <BarChart2 size={18} color="var(--accent)" /> 歷史走勢
                    </div>
                    <div style={{ display: 'flex', gap: 4, background: 'var(--bg-input)', padding: 4, borderRadius: 8 }}>
                      {['week', 'month', 'year'].map(key => (
                        <button
                          key={key}
                          onClick={() => setTimeRange(key)}
                          style={{
                            border: 'none', padding: '4px 12px', fontSize: '0.85rem', fontWeight: 600,
                            borderRadius: 4, cursor: 'pointer',
                            background: timeRange === key ? 'var(--bg-card)' : 'transparent',
                            color: timeRange === key ? 'var(--text-primary)' : 'var(--text-secondary)',
                            boxShadow: timeRange === key ? 'var(--shadow-sm)' : 'none'
                          }}
                        >
                          {key === 'week' ? '7天' : key === 'month' ? '30天' : '12月'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <PriceChart data={chartData} />
                </div>

                <div className="card">
                  <div className="card-title">
                    <Calculator size={18} color="var(--safe)" /> 零售價試算
                  </div>
                  
                  <div className="calculator-box">
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                      您在市場看到的價格是多少？
                    </label>
                    <div className="calc-input-group">
                      <input
                        type="number"
                        className="calc-input"
                        placeholder="例: 60"
                        value={retailPrice}
                        onChange={e => setRetailPrice(e.target.value)}
                      />
                      <div className="calc-unit-toggle">
                        <button 
                          className={`calc-unit-btn ${retailUnit === 'jin' ? 'active' : ''}`}
                          onClick={() => setRetailUnit('jin')}
                        >臺斤</button>
                        <button 
                          className={`calc-unit-btn ${retailUnit === 'kg' ? 'active' : ''}`}
                          onClick={() => setRetailUnit('kg')}
                        >公斤</button>
                      </div>
                    </div>

                    {retailCalc && (
                      <div className="calc-result">
                        <span className="calc-result-label">換算公斤價格：</span>
                        <span className="calc-result-value">NT$ {retailCalc.pricePerKg}</span>
                      </div>
                    )}
                  </div>

                  {retailCalc && (
                    <div className="indicator-wrapper">
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600 }}>
                        <span>價格指標</span>
                        <span className={`status-${retailCalc.status}`}>
                          {retailCalc.diffPercent > 0 ? `高於批發價 +${retailCalc.diffPercent}%` : `低於批發價 ${retailCalc.diffPercent}%`}
                        </span>
                      </div>
                      
                      <div className="indicator-bar-container">
                        <div 
                          className="indicator-bar-fill" 
                          style={{ 
                            width: `${retailCalc.progress}%`,
                            background: retailCalc.status === 'green' ? 'var(--accent)' : retailCalc.status === 'yellow' ? 'var(--warning)' : 'var(--danger)'
                          }}
                        />
                      </div>
                      
                      <div className="indicator-labels">
                        <span>便宜</span>
                        <span>合理</span>
                        <span>昂貴</span>
                      </div>
                      <div className={`indicator-status status-${retailCalc.status}`}>
                        {retailCalc.text}
                      </div>
                    </div>
                  )}

                  {!retailCalc && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 24 }}>
                      輸入價格以比對批發價行情<br/>(1 臺斤 = 0.6 公斤)
                    </p>
                  )}
                </div>
              </div>

              <div className="ai-section">
                <button className="ai-trigger-btn" onClick={handleAnalyze} disabled={loadingAI}>
                  <div className="ai-trigger-left">
                    <div className="ai-trigger-icon">🤖</div>
                    <div>
                      <div className="ai-trigger-title">啟動 AI 智能採購建議</div>
                      <div className="ai-trigger-sub">由 Gemini 分析近期走勢與當天天氣</div>
                    </div>
                  </div>
                  {loadingAI ? <div className="spinner" style={{ width: 22, height: 22, borderWidth: 2 }} /> : <Bot size={24} color="var(--accent)" />}
                </button>

                {showAI && (
                  <div className="ai-panel">
                    {loadingAI ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> 分析中...
                      </div>
                    ) : aiResult?.error ? (
                      <p style={{ color: 'var(--danger)' }}>⚠️ {aiResult.error}</p>
                    ) : (
                      <>
                        <div className="ai-panel-header">
                          <span style={{ fontWeight: 600 }}>AI 分析報告</span>
                          {aiResult?.weather && <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}><Cloud size={14} style={{ display: 'inline', verticalAlign: 'text-bottom' }}/> {priceData.usedCity}天氣：{aiResult.weather}</span>}
                        </div>
                        <div className="ai-content">
                          {renderMarkdown(aiResult?.analysis)}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          <div className="admin-section">
            <button className="admin-toggle" onClick={() => setShowAdmin(!showAdmin)}>
              <Lock size={12} style={{ marginRight: 6 }} /> 資料庫管理
            </button>

            {showAdmin && (
              <div className="admin-panel">
                <h4>🔄 同步最新農業部市場資料</h4>
                <div className="admin-row">
                  <input
                    type="password"
                    className="admin-input"
                    placeholder="輸入密碼"
                    value={syncToken}
                    onChange={e => setSyncToken(e.target.value)}
                  />
                  <button className="btn btn-primary" onClick={handleSync} disabled={syncing}>
                    {syncing ? '同步中...' : '立即同步'}
                  </button>
                </div>
                {syncMsg && <div className={`result-msg ${syncMsg.type}`}>{syncMsg.text}</div>}
              </div>
            )}
          </div>

        </div>
      </main>

      <footer className="footer">
        <div className="container">
          蔬果匯率 © 2025 · 資料來源：農業部開放資料、中央氣象署
        </div>
      </footer>
    </div>
  )
}
