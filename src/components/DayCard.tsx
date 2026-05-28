'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { DayPlan, TransitOption, CandidatePoi } from '@/lib/types'

const typeColors: Record<string, string> = {
  food: 'from-[#87CEEB]/20 to-[#A8D8EA]/10 text-[#87CEEB] border-[#87CEEB]/30',
  museum: 'from-[#FFD700]/20 to-[#DAA520]/10 text-[#FFD700] border-[#FFD700]/30',
  scenic: 'from-[#22C55E]/20 to-[#16A34A]/10 text-[#22C55E] border-[#22C55E]/30',
  shopping: 'from-[#8B5CF6]/20 to-[#7C3AED]/10 text-[#8B5CF6] border-[#8B5CF6]/30',
  entertainment: 'from-[#EC4899]/20 to-[#DB2777]/10 text-[#EC4899] border-[#EC4899]/30',
  restaurant: 'from-[#F59E0B]/20 to-[#D97706]/10 text-[#F59E0B] border-[#F59E0B]/30',
}
const typeLabels: Record<string, string> = {
  food: '美食', museum: '博物馆', scenic: '景点', shopping: '购物', entertainment: '娱乐', restaurant: '餐厅',
}

function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return 0
  return h * 60 + m
}

function formatMinutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

function TransitBadge({ transit }: { transit?: TransitOption }) {
  if (!transit) return null
  const map: Record<string, { c: string; l: string }> = {
    walking: { c: 'bg-gradient-to-r from-green-50 to-green-100 text-green-700 border border-green-200', l: '步行' },
    transit: { c: 'bg-gradient-to-r from-[#FFD700]/20 to-[#DAA520]/10 text-[#FFD700] border border-[#FFD700]/30', l: '公交/地铁' },
    taxi: { c: 'bg-gradient-to-r from-[#FFB6C1]/30 to-[#FF9AAE]/20 text-amber-700 border border-[#FFB6C1]', l: '打车' },
    driving: { c: 'bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 border border-purple-200', l: '自驾' },
  }
  const m = map[transit.mode] || { c: 'bg-gray-100', l: transit.mode }
  return (
    <div className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${m.c}`}>
      <span>{m.l}</span><span>·</span><span>{transit.durationText}</span>
      {transit.price > 0 && <span>·¥{transit.price}</span>}
    </div>
  )
}

function WeatherBadge({ weather }: { weather?: any }) {
  if (!weather) return null
  return (
    <div className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-[#FFD700]/20 to-[#DAA520]/10 border border-[#FFD700]/30 shadow-sm">
      <span className="text-lg">{weather.weatherIcon}</span>
      <span className="font-bold text-gray-800">{weather.weatherDesc}</span>
      <span className="text-gray-600">{weather.tempMin}~{weather.tempMax}℃</span>
      {weather.precipitation > 0 && <span className="text-[#FFD700] font-bold">{weather.precipitation}mm</span>}
    </div>
  )
}

function MealBadge({ meal }: { meal?: import('@/lib/types').MealBreak }) {
  if (!meal) return null
  return (
    <div className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 border border-amber-200">
      <span>{meal.type === 'lunch' ? '🍱' : '🍽️'}</span>
      <span className="font-medium">{meal.startTime}-{meal.endTime}</span>
    </div>
  )
}

export default function DayCard({ day, candidates, onUpdateDay, onFinishEdit, onCancelEdit, scrollToVersion, scrollToActivityIndex }: {
  day: DayPlan
  candidates: CandidatePoi[]
  onUpdateDay?: (updater: (d: DayPlan) => DayPlan) => void
  onFinishEdit?: () => void
  onCancelEdit?: () => void
  scrollToVersion?: number
  scrollToActivityIndex?: number
}) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dropTarget, setDropTarget] = useState<number | null>(null)

  useEffect(() => {
    if (scrollToVersion !== undefined && scrollToActivityIndex !== undefined) {
      setExpanded(true)
      const timer = setTimeout(() => {
        document.getElementById(`activity-${day.day}-${scrollToActivityIndex}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [scrollToVersion, scrollToActivityIndex, day.day])

  const nonMealActs = day.activities.filter(a => !a.isMealBreak)
  const startPointOptions = [{ name: '酒店/住处', value: '' }, ...nonMealActs.map(a => ({ name: a.poi.name, value: a.poi.name }))]
  const endPointOptions = [{ name: '酒店/住处', value: '' }, ...nonMealActs.map(a => ({ name: a.poi.name, value: a.poi.name }))]

  const updateDay = (partial: Partial<DayPlan>) => {
    onUpdateDay?.(d => ({ ...d, ...partial }))
  }

  const removeActivity = (idx: number) => {
    onUpdateDay?.(d => {
      const newActs = d.activities.filter((_, i) => i !== idx)
      return { ...d, activities: newActs }
    })
  }

  const moveActivity = (fromIdx: number, toIdx: number) => {
    onUpdateDay?.(d => {
      if (toIdx < 0 || toIdx >= d.activities.length) return d
      const newActs = [...d.activities]
      const [item] = newActs.splice(fromIdx, 1)
      newActs.splice(toIdx, 0, item)
      return { ...d, activities: newActs }
    })
  }

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDragIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(idx))
  }

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (idx !== dragIdx) {
      setDropTarget(idx)
    }
  }

  const handleDragLeave = () => {
    setDropTarget(null)
  }

  const handleDrop = (idx: number) => {
    if (dragIdx !== null && dragIdx !== idx) {
      moveActivity(dragIdx, idx)
    }
    setDragIdx(null)
    setDropTarget(null)
  }

  const handleDragEnd = () => {
    setDragIdx(null)
    setDropTarget(null)
  }

  const [selectedPoiId, setSelectedPoiId] = useState('')

  const addPoi = (candidate: CandidatePoi) => {
    const existingIds = new Set(day.activities.filter(a => !a.isMealBreak).map(a => a.poi.id))
    if (existingIds.has(candidate.poi.id)) return
    onUpdateDay?.(d => {
      const mealIdx = d.activities.findIndex(a => a.isMealBreak)
      const insertIdx = mealIdx >= 0 ? mealIdx : d.activities.length

      // 根据前一个活动的 departureTime 自动计算时间
      let arrivalTime = ''
      let departureTime = ''
      let prevDepartureTime = ''
      for (let i = insertIdx - 1; i >= 0; i--) {
        if (!d.activities[i].isMealBreak && d.activities[i].departureTime) {
          prevDepartureTime = d.activities[i].departureTime
          break
        }
      }
      if (prevDepartureTime) {
        const prevDepMin = parseTimeToMinutes(prevDepartureTime)
        const arrMin = prevDepMin + 30
        const durationHours = candidate.poi.duration || 1
        const depMin = arrMin + Math.round(durationHours * 60)
        arrivalTime = formatMinutesToTime(arrMin)
        departureTime = formatMinutesToTime(depMin)
      }

      const newActs = [...d.activities]
      newActs.splice(insertIdx, 0, {
        poi: candidate.poi,
        arrivalTime,
        departureTime,
        cost: candidate.poi.price || 0,
        isMealBreak: false,
      })
      return { ...d, activities: newActs }
    })
  }

  const availableCandidates = candidates.filter(candidate => {
    const existingIds = new Set(day.activities.filter(a => !a.isMealBreak).map(a => a.poi.id))
    return !existingIds.has(candidate.poi.id)
  })

  return (
    <div className="card border-l-4 border-l-[#87CEEB] mb-6 p-6 rounded-3xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#87CEEB] to-[#A8D8EA] flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-lg">D{day.day}</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{day.date}</div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="inline-block px-4 py-1.5 bg-gradient-to-r from-[#87CEEB]/10 to-[#A8D8EA]/5 text-[#87CEEB] text-sm rounded-full font-bold border border-[#87CEEB]/30">{day.theme}</span>
                {day.weather && <WeatherBadge weather={day.weather} />}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 mb-6">
          <button
            className={`px-5 py-2.5 rounded-2xl font-medium transition-all duration-300 flex items-center gap-2 ${
              editing
                ? 'bg-gradient-to-r from-[#FFD700] to-[#DAA520] text-white shadow-lg shadow-[#FFD700]/30 transform scale-105'
                : 'bg-gradient-to-r from-[#87CEEB]/10 to-[#A8D8EA]/5 text-[#87CEEB] border-2 border-[#87CEEB]/30 hover:border-[#87CEEB] hover:shadow-md'
            }`}
            onClick={() => {
              if (editing) { setEditing(false); onFinishEdit?.() }
              else setEditing(true)
            }}>
            {editing ? (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                完成编辑并重新规划
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                编辑行程
              </>
            )}
          </button>
          {editing && (
            <button
              className="px-5 py-2.5 rounded-2xl font-medium transition-all duration-300 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-600 border-2 border-gray-200 hover:border-gray-300 hover:text-gray-800 hover:shadow-md"
              onClick={() => { setEditing(false); onCancelEdit?.() }}>
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                取消
              </span>
            </button>
          )}
        </div>
      </div>

      {editing && (
        <div className="bg-gradient-to-br from-[#FFB6C1]/20 to-[#FFD700]/10 rounded-2xl p-5 mb-6 space-y-4 border-2 border-[#FFB6C1]">
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FFB6C1] to-[#FF9AAE] flex items-center justify-center shadow-md">
              <svg className="w-4 h-4 text-gray-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/>
                <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
                <circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/>
              </svg>
            </div>
            <span className="font-medium">拖拽景点可调整顺序 · 点击 ↑↓ 微调 · 点 × 删除 · 下方添加新景点</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-700 font-medium flex items-center gap-2">
                <svg className="w-4 h-4 text-[#87CEEB]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                开始游玩时间
              </label>
              <input type="time" className="input !rounded-2xl !border-2 !py-3"
                value={day.startTime || ''}
                onChange={e => updateDay({ startTime: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-700 font-medium flex items-center gap-2">
                <svg className="w-4 h-4 text-[#87CEEB]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                结束游玩时间
              </label>
              <input type="time" className="input !rounded-2xl !border-2 !py-3"
                value={day.endTime || ''}
                onChange={e => updateDay({ endTime: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-700 font-medium flex items-center gap-2">
                <svg className="w-4 h-4 text-[#87CEEB]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 2h4v4"/><path d="M21 13v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4"/></svg>
                午餐时间
              </label>
              <input type="time" className="input !rounded-2xl !border-2 !py-3"
                value={day.lunchTime || ''}
                onChange={e => updateDay({ lunchTime: e.target.value })}
                placeholder="12:00"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-700 font-medium flex items-center gap-2">
                <svg className="w-4 h-4 text-[#87CEEB]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 2h4v4"/><path d="M21 13v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4"/></svg>
                晚餐时间
              </label>
              <input type="time" className="input !rounded-2xl !border-2 !py-3"
                value={day.dinnerTime || ''}
                onChange={e => updateDay({ dinnerTime: e.target.value })}
                placeholder="18:00"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-700 font-medium flex items-center gap-2">
                <svg className="w-4 h-4 text-[#FFD700]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                当天起点
              </label>
              <select className="input !rounded-2xl !border-2 !py-3"
                value={day.startPointName || ''}
                onChange={e => updateDay({ startPointName: e.target.value || undefined })}
              >
                {startPointOptions.map(o => <option key={o.value} value={o.value}>{o.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-700 font-medium flex items-center gap-2">
                <svg className="w-4 h-4 text-[#FFD700]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                当天终点
              </label>
              <select className="input !rounded-2xl !border-2 !py-3"
                value={day.endPointName || ''}
                onChange={e => updateDay({ endPointName: e.target.value || undefined })}
              >
                {endPointOptions.map(o => <option key={o.value} value={o.value}>{o.name}</option>)}
              </select>
            </div>
          </div>
          {availableCandidates.length > 0 && (
            <div className="flex items-center gap-3 pt-4 border-t border-gray-200/50">
              <select className="input !rounded-2xl !border-2 !py-3 flex-1"
                value={selectedPoiId}
                onChange={e => setSelectedPoiId(e.target.value)}>
                <option value="">+ 新增景点...</option>
                {availableCandidates.map(c => (
                  <option key={c.poi.id} value={c.poi.id}>{c.poi.name} ({typeLabels[c.poi.category] || c.poi.category})</option>
                ))}
              </select>
              <button className="btn btn-primary px-6 py-3 rounded-2xl font-medium disabled:opacity-30"
                disabled={!selectedPoiId}
                onClick={() => {
                  const c = availableCandidates.find(c => c.poi.id === selectedPoiId)
                  if (c) { addPoi(c); setSelectedPoiId('') }
                }}>
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  添加
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {day.meals && day.meals.length > 0 && (
        <div className="flex gap-2 mb-3 flex-wrap">
          {day.meals.map((m, i) => <MealBadge key={i} meal={m} />)}
        </div>
      )}

      <div className="relative">
        {day.activities.map((act, idx) => {
          // Timeline dot color mapping
          const dotColors: Record<string, string> = {
            food: 'bg-gradient-to-r from-[#87CEEB] to-[#A8D8EA]',
            museum: 'bg-gradient-to-r from-[#FFD700] to-[#DAA520]',
            scenic: 'bg-gradient-to-r from-[#22C55E] to-[#16A34A]',
            shopping: 'bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED]',
            entertainment: 'bg-gradient-to-r from-[#EC4899] to-[#DB2777]',
            restaurant: 'bg-gradient-to-r from-[#F59E0B] to-[#D97706]',
          }
          
          return (
          <div key={idx} id={!act.isMealBreak ? `activity-${day.day}-${idx}` : undefined} className="relative pl-10 pb-1">
            {/* Transit between activities */}
            {idx > 0 && act.transitFromPrev && !act.isMealBreak && (
              <div className="flex items-center gap-3 py-3 mb-1">
                <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[#FFB6C1] to-[#FFD700] opacity-50"></div>
                <TransitBadge transit={act.transitFromPrev} />
              </div>
            )}
            
            {/* Timeline connector */}
            {idx < day.activities.length - 1 && (
              <div className="absolute left-4 top-7 bottom-0 w-0.5 bg-gradient-to-b from-gray-200 to-gray-100"></div>
            )}
            
            {/* Timeline dot */}
            <div className={`absolute left-1.5 top-2 w-5 h-5 rounded-full ring-4 ring-white shadow-md z-10 ${
              act.isMealBreak ? 'bg-gradient-to-r from-[#FFB6C1] to-[#FF9AAE]' : 
              (dotColors[act.poi.category] || 'bg-gradient-to-r from-gray-400 to-gray-500')
            }`}>
              {act.isMealBreak && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs">🍴</span>
                </div>
              )}
            </div>
            
            <div className={`rounded-2xl p-4 mb-2 transition-all duration-300 ${
              act.isMealBreak
                ? 'bg-gradient-to-br from-[#FFB6C1]/30 to-[#FF9AAE]/10 border-2 border-[#FFB6C1]/50'
                : dragIdx === idx
                  ? 'opacity-40 scale-95'
                  : dropTarget === idx
                    ? 'border-t-2 border-[#87CEEB] bg-gradient-to-br from-[#87CEEB]/10 to-[#A8D8EA]/5'
                    : 'bg-gradient-to-br from-white to-gray-50/50 border border-gray-200 hover:border-[#87CEEB]/30 hover:shadow-lg'
            }`}
              draggable={editing && !act.isMealBreak}
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(idx)}
              onDragEnd={handleDragEnd}
            >
              {/* Drag handle */}
              {editing && !act.isMealBreak && (
                <div className="absolute -left-1 top-4 cursor-grab active:cursor-grabbing hover:text-[#87CEEB] transition-colors p-1 rounded-full hover:bg-[#87CEEB]/10">
                  <svg className="w-5 h-5 text-gray-300 hover:text-[#87CEEB]" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/>
                    <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
                    <circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/>
                  </svg>
                </div>
              )}
              
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`font-bold text-lg ${act.isMealBreak ? 'text-amber-700' : 'text-gray-900'}`}>{act.poi.name}</span>
                  {!act.isMealBreak && (
                    <span className={`text-xs px-3 py-1.5 rounded-full font-bold bg-gradient-to-r ${typeColors[act.poi.category] || 'from-gray-200 to-gray-100 text-gray-600 border-gray-300'} border`}>
                      {typeLabels[act.poi.category] || act.poi.category}
                    </span>
                  )}
                  {act.isMealBreak && (
                    <span className="text-xs px-3 py-1.5 rounded-full font-bold bg-gradient-to-r from-[#FFB6C1]/50 to-[#FF9AAE]/30 text-amber-700 border border-[#FFB6C1]">
                      {act.mealBreak?.type === 'lunch' ? '🥗 午餐' : '🍽️ 晚餐'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 ml-2">
                  {act.cost > 0 && (
                    <div className="text-sm font-bold text-[#87CEEB] bg-gradient-to-r from-[#87CEEB]/10 to-[#A8D8EA]/5 px-3 py-1 rounded-full border border-[#87CEEB]/20">
                      ¥{act.cost}
                    </div>
                  )}
                  {editing && (
                    <div className="flex gap-1">
                      <button className="w-8 h-8 rounded-full bg-gradient-to-r from-[#87CEEB]/10 to-[#A8D8EA]/5 hover:from-[#87CEEB]/20 hover:to-[#A8D8EA]/10 transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                        disabled={idx === 0} title="上移"
                        onClick={() => moveActivity(idx, idx - 1)}>
                        <svg className="w-4 h-4 text-[#87CEEB]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 15l-6-6-6 6"/></svg>
                      </button>
                      <button className="w-8 h-8 rounded-full bg-gradient-to-r from-[#FFD700]/10 to-[#DAA520]/5 hover:from-[#FFD700]/20 hover:to-[#DAA520]/10 transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                        disabled={idx === day.activities.length - 1} title="下移"
                        onClick={() => moveActivity(idx, idx + 1)}>
                        <svg className="w-4 h-4 text-[#FFD700]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
                      </button>
                      <button className="w-8 h-8 rounded-full bg-gradient-to-r from-red-100 to-red-50 hover:from-red-200 hover:to-red-100 transition-all flex items-center justify-center"
                        title="移除"
                        onClick={() => removeActivity(idx)}>
                        <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="text-sm text-gray-600 flex items-center gap-3 mb-2">
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-[#87CEEB]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <span className="font-bold text-gray-800">{act.arrivalTime}</span>
                </span>
                <svg className="w-5 h-5 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-[#FFD700]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <span className="font-bold text-gray-800">{act.departureTime}</span>
                </span>
                <span className="text-gray-500">· {act.poi.duration}h</span>
              </div>
              
              {!act.isMealBreak && (
                <input
                  type="text"
                  className="text-sm border-2 border-gray-200 rounded-2xl px-4 py-2.5 w-full text-gray-600 focus:border-[#87CEEB] focus:outline-none focus:ring-4 focus:ring-[#87CEEB]/10 bg-white"
                  placeholder="添加备注（如：预约电话、注意事项）"
                  value={notes[`${day.day}-${idx}`] || act.note || ''}
                  onChange={e => setNotes(prev => ({ ...prev, [`${day.day}-${idx}`]: e.target.value }))}
                />
              )}
              
              {!act.isMealBreak && act.reminder && (
                <div className="mt-3 text-sm px-4 py-3 rounded-2xl bg-gradient-to-r from-[#FFB6C1]/30 to-[#FF9AAE]/20 border-2 border-[#FFB6C1] text-gray-800 font-medium">
                  ⚠️ {act.reminder}
                </div>
              )}
              
              {expanded && !act.isMealBreak && (
                <div className="mt-3 text-sm text-gray-700 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-2xl p-4 border border-gray-200">
                  <p className="leading-relaxed">{act.poi.description}</p>
                  <p className="mt-2 text-gray-500 flex items-center gap-1">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    {act.poi.address}
                  </p>
                  {act.poi.tags.length > 0 && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {act.poi.tags.map(t => (
                        <span key={t} className="bg-white border-2 border-gray-200 px-3 py-1 rounded-full text-gray-600 text-sm">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {expanded && act.isMealBreak && act.mealBreak && act.mealBreak.suggestions.length > 0 && (
                <div className="mt-3 text-sm bg-gradient-to-br from-[#FFB6C1]/20 to-[#FF9AAE]/10 rounded-2xl p-4 border-2 border-[#FFB6C1]/50">
                  <span className="font-bold text-amber-800 flex items-center gap-2 mb-2">
                    <span className="text-lg">🍴</span> 推荐餐厅
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {act.mealBreak.suggestions.map((s, si) => (
                      <span key={si} className="bg-white border-2 border-[#FFB6C1]/50 px-3 py-1.5 rounded-full text-amber-800 font-medium">{s.name}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )})}
      </div>

      <button className="mt-4 text-sm text-[#87CEEB] hover:text-[#5BA4D4] font-bold px-6 py-3 rounded-2xl hover:bg-[#87CEEB]/10 transition-all duration-300 flex items-center gap-2" onClick={() => setExpanded(!expanded)}>
        {expanded ? (
          <>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 15l-6-6-6 6"/></svg>
            收起详情
          </>
        ) : (
          <>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
            展开详情
          </>
        )}
      </button>
    </div>
  )
}
