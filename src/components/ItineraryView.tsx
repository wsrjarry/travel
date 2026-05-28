'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Itinerary, DayPlan, CandidatePoi, POI } from '@/lib/types'
import { saveItinerary, hasSavedItinerary } from '@/lib/storage'
import WeatherPanel from './WeatherPanel'
import DayCard from './DayCard'

interface RouteMapPoint {
  lat: number; lng: number; name: string; order: number; type?: 'hotel' | 'poi'
  rating?: number
  category?: string
  duration?: string
  address?: string
  tags?: string[]
  description?: string
  dayIndex?: number
  activityIndex?: number
}

const RouteMap = dynamic(() => import('./RouteMap'), { ssr: false })

interface Props {
  itinerary: Itinerary
  onReset: () => void
  onBack?: () => void
  weather?: any
  planB?: Itinerary | null
  candidates?: CandidatePoi[]
  onReplan?: (poiIds: string[], customPois: POI[], dayAssignments?: string[][], dayTimeConstraints?: { startTime?: string; endTime?: string; lunchTime?: string; dinnerTime?: string }[]) => void
  loading?: boolean
}

const typeLabels: Record<string, string> = {
  food: '美食', museum: '博物馆', scenic: '景点', shopping: '购物', entertainment: '娱乐', restaurant: '餐厅',
}

const DAY_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1']

function DayMap({ day, dayIndex, allDays, onMarkerClick }: {
  day: DayPlan; dayIndex: number; allDays: DayPlan[]
  onMarkerClick?: (dayIndex: number, actIndex: number) => void
}) {
  const multiDay = useMemo(() => allDays.map((d, di) => {
    const pts: RouteMapPoint[] = []
    let order = 0
    d.activities.forEach((act, origIdx) => {
      if (act.isMealBreak) return
      order++
      pts.push({
        lat: act.poi.lat, lng: act.poi.lng, name: act.poi.name,
        order, type: 'poi' as const,
        rating: act.poi.rating,
        category: act.poi.category,
        duration: act.poi.duration ? `${act.poi.duration}h` : undefined,
        address: act.poi.address,
        tags: act.poi.tags,
        description: act.poi.description,
        dayIndex: di,
        activityIndex: origIdx,
      })
    })
    return { label: `第${d.day}天`, points: pts, color: DAY_COLORS[di % DAY_COLORS.length] }
  }), [allDays])

  const currentDay = useMemo(() => multiDay[dayIndex]?.points || [], [multiDay, dayIndex])

  const handleMarkerClick = (point: RouteMapPoint) => {
    if (point.dayIndex !== undefined && point.activityIndex !== undefined) {
      onMarkerClick?.(point.dayIndex, point.activityIndex)
    }
  }

  if (currentDay.length === 0) return null

  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-gray-100 shadow-sm">
      <RouteMap points={currentDay} height={350} multiDay={multiDay} activeDay={dayIndex} onMarkerClick={handleMarkerClick} />
      {multiDay.length > 1 && (
        <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500 flex flex-wrap gap-x-6 gap-y-1 border-t border-gray-100">
          {multiDay.map((md, di) => (
            <span key={di} style={{ color: md.color }}><span className="font-semibold">{md.label}</span></span>
          ))}
        </div>
      )}
      <div className="px-4 py-2.5 bg-gray-50 text-xs text-gray-500 flex flex-wrap gap-x-5 gap-y-1 border-t border-gray-100">
        {day.startPointName && <span><span className="font-semibold text-orange-500">起</span> {day.startPointName}</span>}
        {day.activities.filter(a => !a.isMealBreak).map((a, i) => (
          <span key={i}><span className="font-semibold text-blue-500">{i + 1}</span> {a.poi.name}</span>
        ))}
        {day.endPointName && <span><span className="font-semibold text-red-500">终</span> {day.endPointName}</span>}
      </div>
    </div>
  )
}

function ExportButton({ itinerary, weather, currentDays }: {
  itinerary: Itinerary
  weather?: any
  currentDays?: DayPlan[]
}) {
  const [open, setOpen] = useState(false)

  const buildContent = (): string => {
    const dest = itinerary.formData.destinationCity
    const days = currentDays || itinerary.days
    const dayCount = days.length
    const fmt = itinerary.formData

    let c = `# ${dest} ${dayCount}日旅游行程\n\n`
    c += `## 基本信息\n\n`
    c += `| 项目 | 详情 |\n|------|------|\n`
    c += `| 目的地 | ${dest} |\n`
    c += `| 日期 | ${fmt.startDate} 至 ${fmt.endDate}（共${dayCount}天）|\n`
    c += `| 节奏 | ${fmt.pace === 'relaxed' ? '轻松游' : fmt.pace === 'moderate' ? '适中' : '紧凑'} |\n`
    c += `| 到达时间 | ${fmt.arrivalTime} |\n`
    c += `| 出发时间 | ${fmt.departureTime} |\n`
    c += `| 兴趣偏好 | ${fmt.interests.join('、')} |\n`
    c += `\n`

    if (itinerary.overview) {
      c += `## 路线总览\n\n${itinerary.overview}\n\n`
    }

    if (weather && weather.forecast) {
      c += `## 天气预报\n\n`
      c += `> 数据来源：${weather.source || '--'}\n\n`
      c += `| 日期 | 天气 | 温度 | 降水量 |\n|------|------|------|--------|\n`
      weather.forecast.slice(0, dayCount).forEach((w: any) => {
        c += `| ${w.date.slice(5)} | ${w.weatherIcon} ${w.weatherDesc} | ${w.tempMin}~${w.tempMax}℃ | ${w.precipitation > 0 ? w.precipitation + 'mm' : '--'} |\n`
      })
      c += `\n`
    }

    c += `## 每日行程\n\n`
    days.forEach(day => {
      c += `### Day ${day.day} — ${day.date}（${day.theme}）\n\n`
      if (day.weather) {
        c += `> 🌤 ${day.weather.weatherIcon} ${day.weather.weatherDesc} ${day.weather.tempMin}~${day.weather.tempMax}℃`
        if (day.weather.precipitation > 0) c += ` 降水${day.weather.precipitation}mm`
        c += `\n\n`
      }
      if (day.startTime || day.endTime) {
        c += `> ⏰ 游玩时间：${day.startTime || '--'} ~ ${day.endTime || '--'}\n\n`
      }
      c += `| 时间 | 地点 | 类型 | 时长 | 费用 |\n|------|------|------|------|------|\n`
      day.activities.forEach(act => {
        const label = act.isMealBreak
          ? `🍽️ ${act.mealBreak?.type === 'lunch' ? '午餐' : '晚餐'}`
          : `${typeLabels[act.poi.category] || act.poi.category}`
        const duration = act.isMealBreak ? '--' : `${act.poi.duration}h`
        c += `| ${act.arrivalTime}-${act.departureTime} | ${act.poi.name} | ${label} | ${duration} | ¥${act.cost} |\n`
      })
      c += `\n> 💰 当天费用：¥${day.totalCost} | ⏱ 游览时长：${day.totalDuration}h\n\n`
      if (day.hotel) {
        c += `> 🏨 推荐住宿：${day.hotel.name}（${day.hotel.address}）\n\n`
      }
      c += `---\n\n`
    })

    c += `## 预算明细\n\n`
    c += `| 类别 | 金额 |\n|------|------|\n`
    c += `| 🚗 交通 | ¥${itinerary.budget.transport} |\n`
    c += `| 🏨 住宿 | ¥${itinerary.budget.accommodation} |\n`
    c += `| 🍜 餐饮 | ¥${itinerary.budget.food} |\n`
    c += `| 🎫 门票 | ¥${itinerary.budget.tickets} |\n`
    c += `| 🛍 购物 | ¥${itinerary.budget.shopping} |\n`
    c += `| **总计** | **¥${itinerary.budget.total}** |\n\n`

    if (itinerary.hotelRecommendations.length > 0) {
      c += `## 酒店推荐\n\n`
      c += `| 酒店 | 价格 | 星级 | 位置 |\n|------|------|------|------|\n`
      itinerary.hotelRecommendations.forEach(h => {
        c += `| ${h.name} | ¥${h.price} | ${'⭐'.repeat(h.stars)} | ${h.address} |\n`
      })
      c += `\n`
    }

    if (itinerary.warnings && itinerary.warnings.length > 0) {
      c += `## ⚠️ 注意事项\n\n`
      itinerary.warnings.forEach(w => {
        c += `- **${w.type}**：${w.message}（跳过${w.skippedCount}个，建议上限${w.suggestedMax}个）\n`
      })
      c += `\n`
    }

    c += `---\n\n> 由 AI 智能旅游攻略规划生成 · ${itinerary.createdAt.slice(0, 10)}\n`
    return c
  }

  const exportMarkdown = () => {
    const md = buildContent()
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${itinerary.formData.destinationCity}行程_${itinerary.createdAt.slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(url)
    setOpen(false)
  }

  const exportTxt = () => {
    const md = buildContent()
    const txt = md
      .replace(/^###\s/gm, '【')
      .replace(/^##\s/gm, '【')
      .replace(/^#\s/gm, '【')
      .replace(/\*\*(.+?)\*\*/g, '「$1」')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/`(.+?)`/g, '$1')
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${itinerary.formData.destinationCity}行程_${itinerary.createdAt.slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
    setOpen(false)
  }

  return (
    <div className="relative inline-block">
      <button
        className="px-5 py-2.5 rounded-2xl font-medium transition-all duration-200 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-600 border-2 border-gray-200 hover:border-gray-300 hover:text-gray-800 hover:shadow-md flex items-center gap-2"
        onClick={() => setOpen(!open)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        导出
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-2xl shadow-xl border-2 border-gray-100 py-2 z-50 animate-in slide-in-from-top-2 fade-in">
          <button
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-[#FFD700]/10 hover:to-[#DAA520]/5 hover:text-[#FFD700] transition-all rounded-lg mx-2"
            onClick={exportMarkdown}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FFD700]/20 to-[#DAA520]/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-[#FFD700]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
            <div className="text-left">
              <div className="font-bold text-gray-800">Markdown</div>
              <div className="text-xs text-gray-400">.md · 表格 · 排版</div>
            </div>
          </button>
          <button
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-[#87CEEB]/10 hover:to-[#A8D8EA]/5 hover:text-[#87CEEB] transition-all rounded-lg mx-2"
            onClick={exportTxt}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#87CEEB]/20 to-[#A8D8EA]/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-[#87CEEB]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>
              </svg>
            </div>
            <div className="text-left">
              <div className="font-bold text-gray-800">纯文本</div>
              <div className="text-xs text-gray-400">.txt · 方便复制</div>
            </div>
          </button>
        </div>
      )}
    </div>
  )
}

export default function ItineraryView({ itinerary, onReset, onBack, weather, planB, candidates, onReplan, loading }: Props) {
  const [activeDay, setActiveDay] = useState(0)
  const [showPlanB, setShowPlanB] = useState(false)
  const [scrollTarget, setScrollTarget] = useState<{ version: number; actIdx: number } | null>(null)
  const [saved, setSaved] = useState(false)
  const currentItinerary = showPlanB && planB ? planB : itinerary

  const [editableDays, setEditableDays] = useState<DayPlan[]>(() =>
    currentItinerary.days.map(d => ({ ...d, activities: [...d.activities] }))
  )

  // 追踪当前生效的 itinerary ID，仅在 ID 变更时才重置 editableDays
  const currentItinIdRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    const activeId = currentItinerary.id
    if (activeId !== currentItinIdRef.current) {
      currentItinIdRef.current = activeId
      setEditableDays(currentItinerary.days.map(d => ({ ...d, activities: [...d.activities] })))
      setActiveDay(0)
      setSaved(hasSavedItinerary(currentItinerary.id))
    }
  }, [currentItinerary])

  const allPoiIds = useMemo(() => {
    const ids = new Set<string>()
    editableDays.forEach(d => d.activities.forEach(a => { if (!a.isMealBreak && a.poi.id) ids.add(a.poi.id) }))
    return Array.from(ids)
  }, [editableDays])

  // 提取自定义景点（id 以 "custom-" 开头），用于重新规划时传递给 planner
  const customPois = useMemo(() => {
    const seen = new Map<string, POI>()
    editableDays.forEach(d => d.activities.forEach(a => {
      if (!a.isMealBreak && a.poi.id.startsWith('custom-') && !seen.has(a.poi.id)) {
        seen.set(a.poi.id, a.poi)
      }
    }))
    return Array.from(seen.values())
  }, [editableDays])

  // 合并 candidates + customPois，确保编辑行程时可选到之前添加的自定义景点
  const mergedCandidates = useMemo(() => {
    const base = candidates || []
    const customCandidates: CandidatePoi[] = customPois.map(p => ({
      poi: p,
      score: 0,
      selected: true,
    } satisfies CandidatePoi))
    // 去重：自定义景点可能已存在于 candidates 中
    const existingIds = new Set(base.map(c => c.poi.id))
    const uniqueCustom = customCandidates.filter(c => !existingIds.has(c.poi.id))
    return [...base, ...uniqueCustom]
  }, [candidates, customPois])

  const handleReplan = () => {
    const seen = new Set<string>()
    const dayAssignments: string[][] = editableDays.map(d => {
      const ids: string[] = []
      d.activities.forEach(a => {
        if (!a.isMealBreak && a.poi.id && !seen.has(a.poi.id)) {
          seen.add(a.poi.id)
          ids.push(a.poi.id)
        }
      })
      return ids
    })
    const dayTimeConstraints = editableDays.map(d => ({
      startTime: d.startTime,
      endTime: d.endTime,
      lunchTime: d.lunchTime,
      dinnerTime: d.dinnerTime,
    }))
    onReplan?.(allPoiIds, customPois, dayAssignments, dayTimeConstraints)
  }

  const resetEditableDays = (itin: Itinerary) => {
    setEditableDays(itin.days.map(d => ({ ...d, activities: [...d.activities] })))
    setActiveDay(0)
  }

  const handleMapMarkerClick = (dayIdx: number, actIdx: number) => {
    setActiveDay(dayIdx)
    setScrollTarget(prev => ({ version: (prev?.version ?? 0) + 1, actIdx }))
  }

  const togglePlanB = () => {
    const target = showPlanB ? itinerary : (planB || itinerary)
    resetEditableDays(target)
    setShowPlanB(!showPlanB)
  }

  const updateDay = (dayIdx: number) => (updater: (d: DayPlan) => DayPlan) => {
    setEditableDays(prev => prev.map((d, i) => i === dayIdx ? updater(d) : d))
  }

  const currentDay = editableDays[activeDay]

  return (
    <div className="space-y-6 relative">
      {loading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-3xl flex items-center justify-center z-10">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#87CEEB]/20 to-[#A8D8EA]/10 flex items-center justify-center animate-bounce">
              <svg className="w-10 h-10 text-[#87CEEB]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <p className="text-gray-600 text-sm font-medium">正在重新规划行程...</p>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#87CEEB] to-[#A8D8EA] flex items-center justify-center shadow-lg shadow-[#87CEEB]/30">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{currentItinerary.formData.destinationCity} <span className="text-gray-400 font-normal text-lg">{currentItinerary.days.length}日行程</span></h2>
          </div>
          <p className="text-sm text-gray-500 mt-2 ml-13">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-[#FFB6C1]/30 to-[#FF9AAE]/20 rounded-full text-sm border border-[#FFB6C1]/50 font-medium">
              <svg className="w-4 h-4 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              {currentItinerary.formData.arrivalTime} 到达 · {currentItinerary.formData.departureTime} 出发
            </span>
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            className={`px-5 py-2.5 rounded-2xl font-medium transition-all duration-200 flex items-center gap-2 ${
              saved ? 'bg-gradient-to-r from-[#FFD700] to-[#DAA520] text-white shadow-lg shadow-[#FFD700]/30' : 'bg-gradient-to-r from-[#87CEEB]/10 to-[#A8D8EA]/5 text-[#87CEEB] border-2 border-[#87CEEB]/30 hover:border-[#87CEEB] hover:shadow-md'
            }`}
            onClick={() => {
              saveItinerary(currentItinerary)
              setSaved(true)
            }}
            disabled={saved}
          >
            {saved ? (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                已保存
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                保存到我的
              </>
            )}
          </button>
          {planB && (
            <button
              className={`px-5 py-2.5 rounded-2xl font-medium transition-all duration-200 flex items-center gap-2 ${
                showPlanB ? 'bg-gradient-to-r from-[#FFB6C1] to-[#FF9AAE] text-amber-800 shadow-lg shadow-[#FFB6C1]/30' : 'bg-gradient-to-r from-[#FFD700]/10 to-[#DAA520]/5 text-[#FFD700] border-2 border-[#FFD700]/30 hover:border-[#FFD700] hover:shadow-md'
              }`}
              onClick={togglePlanB}>
              {showPlanB ? (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                  返回主计划
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>
                  雨天备选
                </>
              )}
            </button>
          )}
          <ExportButton itinerary={currentItinerary} weather={weather} currentDays={editableDays} />
          {onBack && <button className="px-5 py-2.5 rounded-2xl font-medium transition-all duration-200 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-600 border-2 border-gray-200 hover:border-gray-300 hover:text-gray-800 hover:shadow-md flex items-center gap-2" onClick={onBack}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            修改景点选择
          </button>}
          <button className="px-5 py-2.5 rounded-2xl font-medium transition-all duration-200 bg-gradient-to-r from-[#87CEEB]/10 to-[#A8D8EA]/5 text-[#87CEEB] border-2 border-[#87CEEB]/30 hover:border-[#87CEEB] hover:shadow-md flex items-center gap-2" onClick={onReset}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            重新规划
          </button>
        </div>
      </div>

      {showPlanB && planB && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-[#FFB6C1]/30 to-[#FF9AAE]/20 border-2 border-[#FFB6C1] text-amber-800 font-medium">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FFB6C1] to-[#FF9AAE] flex items-center justify-center shadow-md">
              <svg className="w-5 h-5 text-amber-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>
            </div>
            已切换到室内活动为主的雨天备选方案（博物馆、购物中心等室内景点）
          </div>
        </div>
      )}

      {currentDay && (
        <DayMap day={currentDay} dayIndex={activeDay} allDays={editableDays} onMarkerClick={handleMapMarkerClick} />
      )}

      {weather && !showPlanB && <WeatherPanel weather={weather} />}

      <div className="flex gap-3 overflow-x-auto pb-2">
        {editableDays.map((day, idx) => (
          <button key={idx}
            className={`px-5 py-3 rounded-2xl text-sm whitespace-nowrap font-medium transition-all duration-200 flex items-center gap-2 ${
              activeDay === idx
                ? 'bg-gradient-to-r from-[#87CEEB] to-[#A8D8EA] text-white shadow-lg shadow-[#87CEEB]/30'
                : 'bg-gradient-to-r from-white to-gray-50/50 text-gray-600 border-2 border-gray-200 hover:border-[#87CEEB]/30 hover:text-[#87CEEB] hover:shadow-md'
            }`}
            onClick={() => setActiveDay(idx)}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${activeDay === idx ? 'bg-white/30' : 'bg-[#87CEEB]/10'}`}>
              <span className={`text-xs font-bold ${activeDay === idx ? 'text-white' : 'text-[#87CEEB]'}`}>D{day.day}</span>
            </div>
            {day.date.slice(5)}
          </button>
        ))}
      </div>

      {currentDay && <DayCard day={currentDay} candidates={mergedCandidates} onUpdateDay={updateDay(activeDay)} onFinishEdit={handleReplan} onCancelEdit={() => {
        setEditableDays(prev => {
          const newDays = [...prev]
          newDays[activeDay] = { ...currentItinerary.days[activeDay], activities: [...currentItinerary.days[activeDay].activities] }
          return newDays
        })
      }} scrollToVersion={scrollTarget?.version} scrollToActivityIndex={scrollTarget?.actIdx} />}

    </div>
  )
}