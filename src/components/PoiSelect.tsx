'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import dynamic from 'next/dynamic'
import { POI, CandidatePoi } from '@/lib/types'
import { haversineDistKm } from '@/lib/distance'

const PoiMapPreview = dynamic(() => import('@/components/PoiMapPreview'), { ssr: false })

interface Props {
  candidates: CandidatePoi[]
  onConfirm: (selectedIds: string[], customPois: POI[]) => void
  onBack: () => void
  onSkip: (allPoiIds: string[], customPois: POI[]) => void
  loading: boolean
  maxCapacity?: number
}

const CATEGORIES = [
  { key: 'all', label: '全部' },
  { key: 'scenic', label: '景点' },
  { key: 'museum', label: '博物馆' },
  { key: 'food', label: '美食' },
  { key: 'shopping', label: '购物' },
  { key: 'entertainment', label: '娱乐' },
]

function AddPoiForm({ onAdd, city }: { onAdd: (poi: POI) => void; city?: string }) {
  const [name, setName] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<{ lat: number; lng: number; displayName: string }[]>([])
  const [selectedResult, setSelectedResult] = useState<number | null>(null)
  const [autoAddress, setAutoAddress] = useState('')

  // 根据景点名字自动搜索地址（带防抖）- 使用高德 API
  const autoSearch = useCallback(async (query: string) => {
    if (!query.trim()) { setResults([]); setAutoAddress(''); return }
    const q = city ? `${city} ${query}` : query
    setSearching(true)
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}&useAmap=true`)
      const data = await res.json()
      const r = data.results || []
      setResults(r)
      setSelectedResult(null)
      if (r.length > 0) {
        setAutoAddress(r[0].displayName)
      }
    } catch {
      setResults([])
    } finally { setSearching(false) }
  }, [city])

  // 防抖搜索
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const handleNameChange = (value: string) => {
    setName(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => autoSearch(value), 500)
  }

  const handleAdd = () => {
    if (!name.trim()) return
    const idx = selectedResult !== null ? selectedResult : (results.length > 0 ? 0 : null)
    const geo = idx !== null ? results[idx] : null
    onAdd({
      id: `custom-${Date.now()}`,
      name: name.trim(),
      category: 'scenic',
      rating: 3.5,
      price: 0,
      duration: 1.5,
      address: autoAddress || '自定义',
      lat: geo?.lat || 0,
      lng: geo?.lng || 0,
      openTime: '全天',
      closeDay: '',
      tags: ['自定义'],
      description: '用户添加的景点',
      city: city || '',
      district: '',
    })
    setName('')
    setResults([])
    setSelectedResult(null)
    setAutoAddress('')
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
      <h4 className="text-sm font-medium text-gray-700">添加自定义景点</h4>
      <div className="relative">
        <input className="input" placeholder="景点名称（输入后自动搜索地址）" value={name}
          onChange={e => handleNameChange(e.target.value)} />
        {searching && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-500">搜索中...</span>}
      </div>
      {results.length > 0 && (
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {results.map((r, i) => (
            <button key={i} type="button"
              className={`w-full text-left text-xs p-2 rounded ${selectedResult === i ? 'bg-blue-100 text-blue-700' : 'bg-white hover:bg-gray-100'}`}
              onClick={() => { setSelectedResult(i); setAutoAddress(r.displayName) }}>
              {r.displayName.slice(0, 60)}
            </button>
          ))}
        </div>
      )}
      {autoAddress && (
        <div className="text-xs text-gray-500 bg-white rounded p-2">
          自动定位：{autoAddress.slice(0, 50)}
        </div>
      )}
      <button className="btn btn-primary w-full text-sm" onClick={handleAdd} disabled={!name.trim()}>
        添加景点
      </button>
    </div>
  )
}

export default function PoiSelect({ candidates, onConfirm, onBack, onSkip, loading, maxCapacity }: Props) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [customPois, setCustomPois] = useState<POI[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [filterCat, setFilterCat] = useState('all')
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [importResult, setImportResult] = useState<{ matched: string[]; unmatched: string[] } | null>(null)
  const [importing, setImporting] = useState(false)

  const cityName = useMemo(() => {
    const first = candidates[0]?.poi.city || candidates[0]?.poi.name.slice(0, 2)
    return first || ''
  }, [candidates])

  const centerLatLng = useMemo(() => {
    if (candidates.length === 0) return { lat: 0, lng: 0 }
    const sum = candidates.reduce((acc, c) => ({ lat: acc.lat + c.poi.lat, lng: acc.lng + c.poi.lng }), { lat: 0, lng: 0 })
    return { lat: sum.lat / candidates.length, lng: sum.lng / candidates.length }
  }, [candidates])

  const toggle = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const addCustomPoi = (poi: POI) => {
    setCustomPois(prev => [...prev, poi])
    setSelected(prev => new Set(prev).add(poi.id))
  }

  const allPois = useMemo(() => {
    let combined = [...candidates, ...customPois.map(p => ({ poi: p, score: 0, selected: true } satisfies CandidatePoi))]
    if (filterCat !== 'all') combined = combined.filter(cp => cp.poi.category === filterCat)
    return combined
  }, [candidates, customPois, filterCat])

  const selectAll = () => setSelected(new Set(allPois.map(cp => cp.poi.id)))
  const deselectAll = () => setSelected(new Set())

  // 攻略导入：从文本或链接中提取景点名称并匹配候选列表
  const handleImport = async () => {
    if (!importText.trim()) return
    const text = importText.trim()
    setImporting(true)

    // 检查是否为 URL
    const urlPattern = /^(https?:\/\/[^\s]+)$/
    let content = text
    if (urlPattern.test(text)) {
      try {
        const res = await fetch(`/api/import?url=${encodeURIComponent(text)}`)
        const data = await res.json()
        if (data.success && data.content) {
          content = data.content
        }
      } catch (err) {
        console.warn('URL 导入失败:', err)
      }
    }

    // 多种模式提取景点名：
    // 1. Markdown 格式：**景点名**、- 景点名、### 景点名、DayX 景点名
    // 2. 纯文本：以常见分隔符（逗号、顿号、换行）分割
    const patterns = [
      /\*\*(.+?)\*\*/g,
      /(?:#{1,6}\s*)(.+?)(?:\n|$)/g,
      /(?:-\s+)(.+?)(?:\n|$)/g,
      /(?:Day\s*\d+\s*[:：]?\s*)(.+?)(?:\n|$)/g,
    ]

    const extractedNames = new Set<string>()
    for (const pattern of patterns) {
      let match
      while ((match = pattern.exec(content)) !== null) {
        const name = match[1].trim()
        if (name && name.length >= 2 && name.length <= 30) {
          extractedNames.add(name)
        }
      }
    }

    // 如果模式匹配不到，按逗号/顿号/换行分割
    if (extractedNames.size === 0) {
      const splitNames = content
        .split(/[,，、\n]+/)
        .map(s => s.trim())
        .filter(s => s.length >= 2 && s.length <= 30)
      splitNames.forEach(n => extractedNames.add(n))
    }

    // 过滤掉明显是非景点名的词
    const filterWords = ['日行程', '第', '天', '全天', '预算', '费用', '酒店', '住宿', '交通', '早餐', '午餐', '晚餐', '食物', '', '行程总览', '基本信息', '路线总览', '天气预报']
    const names = Array.from(extractedNames).filter(n => !filterWords.includes(n) && !/^[\d.,，。、+¥%#\s]+$/.test(n))

    const matched: string[] = []
    const unmatched: string[] = []

    for (const name of names) {
      const found = candidates.find(c =>
        c.poi.name === name ||
        c.poi.name.includes(name) ||
        name.includes(c.poi.name)
      )
      if (found) {
        matched.push(name)
        // 自动勾选匹配到的景点
        setSelected(prev => new Set(prev).add(found.poi.id))
      } else {
        unmatched.push(name)
      }
    }

    setImportResult({ matched, unmatched })
    setImporting(false)
    if (matched.length > 0) setShowImport(false)
  }

return (
    <div className="space-y-8 animate-slide-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FFD700] to-[#DAA520] flex items-center justify-center shadow-md">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-[#FFD700] to-[#DAA520] bg-clip-text text-transparent">选择你想去的景点</h2>
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                <span className="px-3 py-1 bg-gradient-to-r from-[#87CEEB]/10 to-[#A8D8EA]/10 rounded-full text-[#87CEEB] font-medium">
                  已选 <span className="font-bold">{selected.size}</span> / {allPois.length} 个
                </span>
                <span className="text-gray-400">·</span>
                <span className="text-gray-400">豆豆会帮你规划最佳路线！</span>
              </p>
            </div>
          </div>
        </div>
        <button className="btn btn-secondary px-5 py-2.5 rounded-2xl font-medium flex items-center gap-2" onClick={onBack}>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          返回
        </button>
      </div>

      {candidates.length > 0 && (
        <div className="rounded-3xl overflow-hidden border-2 border-white/80 shadow-2xl">
          <PoiMapPreview
            candidates={candidates}
            selectedIds={Array.from(selected)}
            centerLatLng={centerLatLng}
            onToggle={toggle}
          />
        </div>
      )}

      {maxCapacity && selected.size > maxCapacity && (
        <div className="bg-gradient-to-r from-[#FFB6C1]/30 to-[#FF9AAE]/20 rounded-2xl p-5 border-2 border-[#FFB6C1]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FFB6C1] to-[#FF9AAE] flex items-center justify-center shadow-md flex-shrink-0">
              <svg className="w-5 h-5 text-gray-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.346 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>
            </div>
            <div className="text-gray-800">
              <p className="font-bold text-lg mb-1">行程容量提醒</p>
              <p className="text-sm">
                您选择了 <strong className="text-[#87CEEB]">{selected.size} 个景点</strong>，但行程规划预计只能容纳约 <strong className="text-[#FFD700]">{maxCapacity} 个</strong>。建议减少到 {maxCapacity} 个以内，避免走马观花。
                <span className="block mt-1 text-gray-600">若要增加请到编辑行程处增加景点。</span>
              </p>
            </div>
          </div>
        </div>
      )}

      <>
        {candidates.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-gray-200/50">
            <span className="text-sm text-gray-600 font-medium px-4 py-1.5 bg-white/50 rounded-full border border-gray-200">分类筛选：</span>
            {CATEGORIES.map(cat => (
              <button key={cat.key} type="button"
                className={`px-5 py-2.5 rounded-full font-medium transition-all duration-300 flex items-center gap-2 ${
                  filterCat === cat.key
                    ? 'bg-gradient-to-r from-[#87CEEB] to-[#A8D8EA] text-white shadow-lg shadow-[#87CEEB]/30 transform scale-105'
                    : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-[#87CEEB] hover:text-[#87CEEB] hover:shadow-md'
                }`}
                onClick={() => setFilterCat(cat.key)}>
                {cat.label}
              </button>
            ))}
            <div className="flex-1"></div>
            <button className="text-sm text-[#FFD700] hover:text-[#DAA520] font-medium px-3 py-1.5 rounded-full hover:bg-[#FFD700]/10 transition-colors" onClick={selectAll}>
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
                全选
              </span>
            </button>
            <span className="text-gray-300">|</span>
            <button className="text-sm text-gray-500 hover:text-gray-700 font-medium px-3 py-1.5 rounded-full hover:bg-gray-100 transition-colors" onClick={deselectAll}>
              取消全选
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[32rem] overflow-y-auto pr-2">
          {allPois.map((cp) => {
            const p = cp.poi
            const isSelected = selected.has(p.id)
            const dist = centerLatLng.lat ? haversineDistKm(centerLatLng.lat, centerLatLng.lng, p.lat, p.lng) : 0
            
            const categoryColors = {
              food: { bg: 'from-[#87CEEB]/20 to-[#A8D8EA]/10', text: 'text-[#87CEEB]', border: 'border-[#87CEEB]/30' },
              museum: { bg: 'from-[#FFD700]/20 to-[#DAA520]/10', text: 'text-[#FFD700]', border: 'border-[#FFD700]/30' },
              scenic: { bg: 'from-[#22C55E]/20 to-[#16A34A]/10', text: 'text-[#22C55E]', border: 'border-[#22C55E]/30' },
              shopping: { bg: 'from-[#8B5CF6]/20 to-[#7C3AED]/10', text: 'text-[#8B5CF6]', border: 'border-[#8B5CF6]/30' },
              entertainment: { bg: 'from-[#EC4899]/20 to-[#DB2777]/10', text: 'text-[#EC4899]', border: 'border-[#EC4899]/30' },
              restaurant: { bg: 'from-[#F59E0B]/20 to-[#D97706]/10', text: 'text-[#F59E0B]', border: 'border-[#F59E0B]/30' },
            }
            
            const catStyle = categoryColors[p.category as keyof typeof categoryColors] || { 
              bg: 'from-gray-200/20 to-gray-300/10', 
              text: 'text-gray-600', 
              border: 'border-gray-300/30' 
            }
            
            const categoryLabels = {
              food: '美食', museum: '博物馆', scenic: '景点', shopping: '购物', 
              entertainment: '娱乐', restaurant: '餐厅'
            }

            return (
              <div key={p.id}
                className={`p-5 rounded-2xl border-3 cursor-pointer transition-all duration-300 ${
                  isSelected
                    ? `border-[#87CEEB] bg-gradient-to-br ${catStyle.bg} shadow-lg transform scale-[1.02]`
                    : `border-gray-200 bg-white hover:border-[#87CEEB]/50 hover:bg-gradient-to-br hover:from-white hover:to-gray-50/50 hover:shadow-md`
                }`}
                onClick={() => toggle(p.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-gray-900 text-lg truncate">{p.name}</span>
                      <span className={`text-xs px-3 py-1.5 rounded-full font-bold ${catStyle.text} ${catStyle.border} border`}>
                        {categoryLabels[p.category as keyof typeof categoryLabels] || p.category}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mb-3 truncate flex items-center gap-1">
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      {p.address}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-bold text-amber-500 flex items-center gap-1">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        {p.rating}
                      </span>
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        约{p.duration}h
                      </span>
                      {p.price > 0 && (
                        <span className="text-sm font-bold text-[#87CEEB] flex items-center gap-1">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>
                          ¥{p.price}
                        </span>
                      )}
                      {dist > 0 && (
                        <span className="text-sm text-gray-500 flex items-center gap-1">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                          {dist < 1 ? '<1km' : `${Math.round(dist)}km`}
                        </span>
                      )}
                    </div>
                    {p.openTime && p.openTime !== '全天' && (
                      <div className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        {p.openTime}{p.closeDay ? ` · ${p.closeDay}休息` : ''}
                      </div>
                    )}
                  </div>
                  <div className={`w-8 h-8 rounded-full border-3 flex items-center justify-center shrink-0 ml-3 transition-all ${
                    isSelected ? 'border-[#87CEEB] bg-[#87CEEB]' : 'border-gray-300 bg-white'
                  }`}>
                    {isSelected ? (
                      <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M20.285 2l-11.285 11.567-5.286-5.011-3.714 3.716 9 8.728 15-15.285z"/></svg>
                    ) : (
                      <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                    )}
                  </div>
                </div>
                {cp.score > 0 && (
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {p.tags.slice(0, 4).map(t => (
                      <span key={t} className="text-xs px-2.5 py-1 bg-gradient-to-r from-gray-100 to-gray-50 rounded-full text-gray-600 border border-gray-200">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          {allPois.length === 0 && (
            <div className="col-span-2 text-center py-12 text-gray-400">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              </div>
              <p className="text-lg font-medium text-gray-500 mb-1">
                {filterCat !== 'all' ? '当前分类下没有景点' : '暂无可选景点'}
              </p>
              <p className="text-sm text-gray-400">请返回修改目的地或尝试其他分类</p>
            </div>
          )}
        </div>

        {!showAdd && (
          <div className="flex gap-4">
            <button className="btn btn-secondary flex-1 text-base py-4 rounded-2xl font-medium flex items-center justify-center gap-3" onClick={() => setShowAdd(true)}>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#87CEEB]/20 to-[#A8D8EA]/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#87CEEB]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </div>
              <span>添加自定义景点</span>
            </button>
            <button className="btn btn-secondary flex-1 text-base py-4 rounded-2xl font-medium flex items-center justify-center gap-3" onClick={() => setShowImport(true)}>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FFD700]/20 to-[#DAA520]/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#FFD700]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
              </div>
              <span>导入攻略</span>
            </button>
          </div>
        )}
        {showAdd && <AddPoiForm onAdd={addCustomPoi} city={cityName} />}

        {/* 攻略导入弹窗 */}
        {showImport && (
          <div className="bg-gradient-to-br from-[#FFB6C1]/30 to-[#FFD700]/20 rounded-3xl p-6 border-2 border-[#FFB6C1] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FFD700] to-[#DAA520] flex items-center justify-center shadow-md">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-800">导入攻略</h4>
                  <p className="text-sm text-gray-500">粘贴攻略链接或文本，豆豆帮你自动匹配景点</p>
                </div>
              </div>
              <button className="text-sm text-gray-400 hover:text-gray-600 px-3 py-1.5 rounded-full hover:bg-gray-100 transition-colors" onClick={() => { setShowImport(false); setImportText(''); setImportResult(null) }}>
                取消
              </button>
            </div>

            {/* 链接导入区 */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                <input
                  className="input w-full text-base !pl-12 !rounded-2xl !border-2 !py-3"
                  placeholder="粘贴攻略链接，自动解析旅游规划（如马蜂窝、携程攻略页面）"
                  value={importText}
                  onChange={e => setImportText(e.target.value)}
                />
              </div>
              <button
                className="btn btn-primary text-base py-3 px-6 rounded-2xl whitespace-nowrap font-medium"
                onClick={handleImport}
                disabled={!importText.trim() || importing}
              >
                {importing ? '解析中...' : '识别景点'}
              </button>
            </div>

            <details className="text-sm text-gray-500">
              <summary className="cursor-pointer hover:text-gray-700 font-medium px-4 py-2 rounded-xl hover:bg-white/50">或粘贴攻略文本（点击展开）</summary>
              <textarea
                className="input w-full h-32 text-base resize-none mt-3 !rounded-2xl !border-2 !py-3"
                placeholder={`第一天：故宫 → 天安门广场 → 南锣鼓巷\n第二天：八达岭长城 → 颐和园\n\n或直接粘贴：故宫, 天安门, 长城, 颐和园`}
                value={importText}
                onChange={e => setImportText(e.target.value)}
              />
            </details>

            <button
              className="btn btn-secondary text-base py-3 px-6 rounded-2xl w-full font-medium"
              onClick={() => { setShowImport(false); setImportText(''); setImportResult(null) }}
            >
              取消导入
            </button>
          </div>
        )}

        {/* 导入结果提示 */}
        {importResult && (
          <div className={`rounded-2xl p-5 border-2 ${
            importResult.matched.length > 0
              ? 'bg-gradient-to-r from-[#FFD700]/10 to-[#DAA520]/5 border-[#FFD700]'
              : 'bg-gradient-to-r from-[#FFB6C1]/20 to-[#FF9AAE]/10 border-[#FFB6C1]'
          }`}>
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md flex-shrink-0 ${
                importResult.matched.length > 0
                  ? 'bg-gradient-to-br from-[#FFD700] to-[#DAA520]'
                  : 'bg-gradient-to-br from-[#FFB6C1] to-[#FF9AAE]'
              }`}>
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  {importResult.matched.length > 0
                    ? <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>
                    : <><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.346 16.5c-.77.833.192 2.5 1.732 2.5z"/></>
                  }
                </svg>
              </div>
              <div className="text-gray-800">
                {importResult.matched.length > 0 && (
                  <>
                    <p className="font-bold text-lg text-[#DAA520] mb-1">
                      成功匹配 {importResult.matched.length} 个景点！
                    </p>
                    <p className="text-sm mb-2">已自动勾选匹配的景点，豆豆会为你规划最佳路线～</p>
                  </>
                )}
                {importResult.unmatched.length > 0 && (
                  <p className="text-sm text-gray-600">
                    未匹配：<span className="font-medium">{importResult.unmatched.join('、')}</span>
                    <span className="block mt-1 text-gray-500">（可手动添加为自定义景点）</span>
                  </p>
                )}
                {importResult.matched.length === 0 && importResult.unmatched.length === 0 && (
                  <p className="text-sm text-gray-500">未能从文本中识别到景点名称，请尝试其他格式</p>
                )}
                <button
                  className="mt-3 text-sm text-gray-500 hover:text-gray-700 font-medium px-3 py-1.5 rounded-full hover:bg-gray-100 transition-colors inline-flex items-center gap-1"
                  onClick={() => setImportResult(null)}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-4 pt-4">
          <button className="btn btn-primary flex-1 text-base py-4 rounded-2xl shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 font-bold"
            onClick={() => onConfirm(Array.from(selected), customPois)}
            disabled={selected.size === 0}>
            <span className="flex items-center justify-center gap-3">
              <span className="text-xl">✨</span>
              开始规划行程（{selected.size} 个景点）
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </span>
          </button>
          <button className="btn btn-secondary text-base py-4 rounded-2xl font-medium flex items-center justify-center gap-3"
            onClick={() => onSkip(allPois.map(cp => cp.poi.id), customPois)}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FFD700]/20 to-[#DAA520]/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#FFD700]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            全部勾选，直接规划
          </button>
        </div>
      </>
    </div>
  )
}
