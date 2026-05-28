'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { TravelFormData } from '@/lib/types'
import { getAllCities, CityInfo } from '@/data/china-regions'
import { cities } from '@/data/mock-data'

interface Props {
  onSubmit: (data: TravelFormData) => void
  loading: boolean
  initialData?: TravelFormData
}

interface StationOption {
  name: string
  code: string
  type: 'railway' | 'airport'
  pinyin: string
}

export default function TravelForm({ onSubmit, loading, initialData }: Props) {
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const defaultEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3).toISOString().split('T')[0]
  const [form, setForm] = useState<TravelFormData>(() => initialData || {
    destinationCity: '', destinationStation: '',
    startDate: today, endDate: defaultEndDate, arrivalTime: '09:00', departureTime: '17:00',
    pace: 'moderate', interests: [],
  })

  const [destSuggestions, setDestSuggestions] = useState<CityInfo[]>([])
  const [showDestSuggest, setShowDestSuggest] = useState(false)
  const [destStations, setDestStations] = useState<StationOption[]>([])
  const [destLoading, setDestLoading] = useState(false)
  const destRef = useRef<HTMLDivElement>(null)
  const destCityRef = useRef('')

  const update = useCallback((key: keyof TravelFormData, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (destRef.current && !destRef.current.contains(e.target as Node)) setShowDestSuggest(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const getSuggestions = (input: string): CityInfo[] => {
    if (!input.trim()) return []
    const pool = getAllCities()
    const kw = input.trim()
    return pool
      .filter(c => c.name.includes(kw) || kw.includes(c.name))
      .slice(0, 8)
  }

  const fetchStations = useCallback(async (city: string) => {
    setDestStations([])
    update('destinationStation', '')
    setDestLoading(true)

    try {
      const res = await fetch(`/api/stations?city=${encodeURIComponent(city)}`)
      const data = await res.json()
      const stations: StationOption[] = []

      if (data.stations && Array.isArray(data.stations)) {
        for (const s of data.stations) {
          stations.push({ name: s.name, code: s.code, type: 'railway', pinyin: s.pinyin || '' })
        }
      }
      if (data.airports && Array.isArray(data.airports)) {
        for (const a of data.airports) {
          stations.push({ name: a.name, code: a.code, type: 'airport', pinyin: '' })
        }
      }

      if (stations.length > 0) {
        setDestStations(stations)
        update('destinationStation', stations[0].name)
      } else {
        update('destinationStation', `${city}`)
      }
    } catch {
      update('destinationStation', `${city}`)
    } finally {
      setDestLoading(false)
    }
  }, [update])

  const handleDestInput = (value: string) => {
    destCityRef.current = value
    update('destinationCity', value)
    setDestStations([])
    update('destinationStation', '')
    const s = getSuggestions(value)
    setDestSuggestions(s)
    setShowDestSuggest(s.length > 0)
  }

  const selectDestSuggestion = (city: CityInfo) => {
    destCityRef.current = city.name
    update('destinationCity', city.name)
    setShowDestSuggest(false)
    fetchStations(city.name)
  }

  const handleDestBlur = () => {
    const v = destCityRef.current
    if (v && !destSuggestions.find(s => s.name === v)) {
      fetchStations(v)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.destinationCity || !form.startDate || !form.endDate) return
    const station = form.destinationStation || form.destinationCity
    onSubmit({ ...form, destinationStation: station })
  }

  const hotCities = useMemo(() => ['北京', '上海', '成都', '西安', '广州', '杭州', '深圳', '南京', '武汉', '长沙', '重庆'], [])

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-slide-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Destination Section */}
        <div className="md:col-span-2 bg-gradient-to-br from-[#FFB6C1]/20 via-[#FFD700]/10 to-white rounded-3xl p-6 border-2 border-white/80 shadow-lg">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#87CEEB] to-[#A8D8EA] flex items-center justify-center shadow-md">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <div>
              <span className="text-sm font-bold bg-gradient-to-r from-[#87CEEB] to-[#FFD700] bg-clip-text text-transparent uppercase tracking-wider">选择目的地</span>
              <p className="text-xs text-gray-500 mt-0.5">想去哪里玩呢？豆豆帮你找～</p>
            </div>
          </div>
          <div ref={destRef} className="relative">
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input type="text" className="input !pl-12 text-base !rounded-2xl !border-2 !py-3" placeholder="输入城市名称，如：北京、上海、成都..."
                value={form.destinationCity}
                onChange={e => handleDestInput(e.target.value)}
                onFocus={() => {
                  if (form.destinationCity) setDestSuggestions(getSuggestions(form.destinationCity))
                  setShowDestSuggest(true)
                }}
                onBlur={handleDestBlur} />
            </div>
            {showDestSuggest && destSuggestions.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 mt-3 bg-white border-2 border-[#FFB6C1] rounded-2xl shadow-2xl max-h-64 overflow-y-auto py-2">
                {destSuggestions.map(c => (
                  <button key={c.name} type="button"
                    className="w-full text-left px-5 py-3 text-sm hover:bg-gradient-to-r from-[#87CEEB]/5 to-[#FFD700]/5 transition-all duration-200 flex items-center gap-3 group"
                    onMouseDown={() => selectDestSuggestion(c)}>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#87CEEB]/20 to-[#FFD700]/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-[#87CEEB]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    </div>
                    <span className="font-medium text-gray-700 group-hover:text-[#87CEEB]">{c.name}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <span className="text-xs text-gray-500 font-medium px-3 py-1.5 bg-white/50 rounded-full border border-gray-200">热门：</span>
              {hotCities.filter(c => cities.includes(c)).map(c => (
                <button key={c} type="button"
                  className={`px-4 py-2 rounded-full font-medium transition-all duration-300 ${
                    form.destinationCity === c
                      ? 'bg-gradient-to-r from-[#87CEEB] to-[#A8D8EA] text-white shadow-lg shadow-[#87CEEB]/30 transform scale-105'
                      : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-[#87CEEB] hover:text-[#87CEEB] hover:shadow-md'
                  }`}
                  onMouseDown={() => selectDestSuggestion({ name: c, lat: 0, lng: 0 })}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          {destLoading && (
            <div className="flex items-center gap-3 mt-4 px-4 py-3 bg-gradient-to-r from-[#FFB6C1]/20 to-[#FFD700]/10 rounded-2xl border border-[#FFB6C1]">
              <svg className="animate-spin h-4 w-4 text-[#87CEEB]" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              <span className="text-sm text-gray-600">正在查找交通站点...</span>
            </div>
          )}
          {destStations.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-[#FFD700]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
                选择到达站点：
              </p>
              <div className="flex flex-wrap gap-2">
                {destStations.map(s => (
                  <button key={`${s.type}-${s.code}`} type="button"
                    className={`px-4 py-2.5 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 ${
                      form.destinationStation === s.name
                        ? 'bg-gradient-to-r from-[#FFD700] to-[#DAA520] text-white shadow-lg shadow-[#FFD700]/30 transform scale-105'
                        : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-[#FFD700] hover:text-[#FFD700] hover:shadow-md'
                    }`}
                    onClick={() => update('destinationStation', s.name)}>
                    {s.type === 'airport' ? (
                      <span className="text-lg">✈️</span>
                    ) : (
                      <span className="text-lg">🚄</span>
                    )}
                    <span>{s.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Date Section */}
        <div className="md:col-span-2">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FFD700] to-[#DAA520] flex items-center justify-center shadow-md">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
            <div>
              <span className="text-sm font-bold bg-gradient-to-r from-[#FFD700] to-[#DAA520] bg-clip-text text-transparent uppercase tracking-wider">日期 & 时间</span>
              <p className="text-xs text-gray-500 mt-0.5">规划你的旅行时间</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="label flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-[#87CEEB]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 2h4v4"/><path d="M21 13v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4"/></svg>
                到达日期
              </label>
              <input type="date" className="input !rounded-2xl !border-2 !py-3" value={form.startDate} min={today}
                onChange={e => { update('startDate', e.target.value); if (form.endDate && e.target.value > form.endDate) update('endDate', e.target.value) }} />
            </div>
            <div className="space-y-2">
              <label className="label flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-[#87CEEB]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 2h4v4"/><path d="M21 13v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4"/></svg>
                离开日期
              </label>
              <input type="date" className="input !rounded-2xl !border-2 !py-3" value={form.endDate} min={form.startDate || today} onChange={e => update('endDate', e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="label flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-[#FFD700]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                到达时间
              </label>
              <input type="time" className="input !rounded-2xl !border-2 !py-3" value={form.arrivalTime} onChange={e => update('arrivalTime', e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="label flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-[#FFD700]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                离开时间
              </label>
              <input type="time" className="input !rounded-2xl !border-2 !py-3" value={form.departureTime} onChange={e => update('departureTime', e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {/* Pace */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FFB6C1] to-[#FF9AAE] flex items-center justify-center shadow-md">
            <svg className="w-5 h-5 text-gray-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
          <div>
            <span className="text-sm font-bold bg-gradient-to-r from-[#FFB6C1] to-[#FF9AAE] bg-clip-text text-transparent uppercase tracking-wider">行程节奏</span>
            <p className="text-xs text-gray-500 mt-0.5">选择适合你的旅行节奏</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {([{ v: 'relaxed', l: '悠闲漫步', d: '每天 2-3 个景点', icon: '🐢' }, { v: 'moderate', l: '舒适适中', d: '每天 3-4 个景点', icon: '🚶' }, { v: 'intense', l: '紧凑探索', d: '每天 4-5 个景点', icon: '🏃' }] as const).map(o => (
            <button key={o.v} type="button"
              className={`p-5 rounded-2xl border-3 text-left transition-all duration-300 flex flex-col items-center text-center ${
                form.pace === o.v
                  ? 'border-[#87CEEB] bg-gradient-to-br from-[#87CEEB]/10 to-[#A8D8EA]/5 shadow-lg transform scale-105'
                  : 'border-gray-200 bg-white hover:border-[#87CEEB]/50 hover:bg-gradient-to-br hover:from-white hover:to-gray-50/50 hover:shadow-md'
              }`}
              onClick={() => update('pace', o.v)}>
              <span className="text-3xl mb-3">{o.icon}</span>
              <div className="font-bold text-gray-800 mb-1">{o.l}</div>
              <div className="text-xs text-gray-500">{o.d}</div>
              {form.pace === o.v && (
                <div className="mt-3 w-6 h-6 rounded-full bg-gradient-to-r from-[#87CEEB] to-[#A8D8EA] flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M20.285 2l-11.285 11.567-5.286-5.011-3.714 3.716 9 8.728 15-15.285z"/></svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <button type="submit"
        className="btn btn-primary w-full text-base py-4 rounded-2xl shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 group"
        disabled={loading || !form.destinationCity || !form.startDate || !form.endDate}>
        {loading ? (
          <span className="flex items-center gap-3">
            <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            <span className="font-medium">豆豆正在搜索景点...</span>
          </span>
        ) : (
          <span className="flex items-center gap-3">
            <span className="text-xl">✨</span>
            <span className="font-bold">开始规划我的旅行</span>
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </span>
        )}
      </button>
    </form>
  )
}
