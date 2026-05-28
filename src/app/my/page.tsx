'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { loadItineraries, deleteSavedItinerary, SavedItinerary } from '@/lib/storage'
import ItineraryView from '@/components/ItineraryView'

export default function MyPage() {
  const [saved, setSaved] = useState<SavedItinerary[]>([])
  const [selected, setSelected] = useState<SavedItinerary | null>(null)
  const router = useRouter()

  useEffect(() => {
    setSaved(loadItineraries())
  }, [])

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('确定要删除这个行程吗？')) {
      deleteSavedItinerary(id)
      setSaved(prev => prev.filter(i => i.id !== id))
      if (selected?.id === id) setSelected(null)
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getMonth() + 1}月${d.getDate()}日`
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-[#87CEEB]/30 to-transparent blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-to-tl from-[#FFB6C1]/30 to-transparent blur-3xl" />
        <div className="absolute top-[40%] left-[50%] w-[40%] h-[40%] rounded-full bg-gradient-to-tr from-[#FFD700]/20 to-transparent blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 relative">
        <header className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 bg-white/60 backdrop-blur-sm rounded-full border border-white/80 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs font-semibold text-gray-500 tracking-wider">MY PLANS</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-3">
            我的行程
          </h1>
          <p className="text-gray-500 max-w-md mx-auto leading-relaxed">
            保存的行程、历史规划、快速访问
          </p>
        </header>

        <div className="flex gap-6">
          {/* 左侧边栏 */}
          <div className="w-80 flex-shrink-0">
            <div className="card p-5 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">已保存行程</h2>
                <span className="text-xs px-2.5 py-1 bg-gray-100 rounded-full text-gray-500">
                  {saved.length} 个
                </span>
              </div>

              {saved.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l4 4v12a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="9 3 9 9 15 9" />
                  </svg>
                  <p className="text-sm">暂无保存的行程</p>
                  <button
                    className="mt-4 btn btn-primary rounded-full px-4 py-2 text-sm"
                    onClick={() => router.push('/')}
                  >
                    去规划一个新行程 →
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
                  {saved.map(item => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                        selected?.id === item.id
                          ? 'border-[#87CEEB] bg-[#E8F4FD]'
                          : 'border-gray-200 hover:border-[#87CEEB] hover:bg-[#E8F4FD]'
                      }`}
                      onClick={() => setSelected(item)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{item.name}</h3>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            <span className="inline-flex items-center gap-1">
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                              </svg>
                              {item.dayCount}天
                            </span>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1">
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                              </svg>
                              {formatDate(item.startDate)} - {formatDate(item.endDate)}
                            </span>
                          </div>
                        </div>
                        <button
                          className="text-xs px-2 py-1 text-[#FFB6C1] hover:text-[#FF9AAE] hover:bg-[#FFB6C1]/10 rounded-md"
                          onClick={(e) => handleDelete(item.id, e)}
                        >
                          删除
                        </button>
                      </div>
                      <div className="mt-2 text-xs text-gray-400">
                        保存于 {new Date(item.savedAt).toLocaleDateString('zh-CN')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-3">使用提示</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#87CEEB] mt-1.5 flex-shrink-0" />
                  <span>点击行程卡片查看详情</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] mt-1.5 flex-shrink-0" />
                  <span>行程会自动保存，最多保留 20 条</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FFD700] mt-1.5 flex-shrink-0" />
                  <span>在行程页面点击"保存到我的"按钮</span>
                </li>
              </ul>
            </div>
          </div>

          {/* 右侧详情 */}
          <div className="flex-1">
            {selected ? (
              <div className="card p-5">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selected.name}</h2>
                    <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 rounded-full">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                          <circle cx="12" cy="10" r="3"/>
                        </svg>
                        {selected.city}
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 rounded-full">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        {selected.dayCount}天
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn btn-secondary btn-sm rounded-full px-4"
                      onClick={() => router.push('/')}
                    >
                      规划新行程
                    </button>
                    <button
                      className="btn btn-primary btn-sm rounded-full px-4"
                      onClick={() => setSelected(null)}
                    >
                      返回列表
                    </button>
                  </div>
                </div>

                <ItineraryView
                  itinerary={selected.itinerary}
                  onReset={() => router.push('/')}
                  onBack={() => setSelected(null)}
                  weather={selected.itinerary.weather}
                  planB={selected.itinerary.planB}
                />
              </div>
            ) : (
              <div className="card p-8 text-center">
                <div className="max-w-md mx-auto">
                  <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l4 4v12a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="9 3 9 9 15 9" />
                  </svg>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">选择行程查看详情</h3>
                  <p className="text-gray-500 mb-6">
                    从左侧选择已保存的行程，或规划一个新行程
                  </p>
                  <button
                    className="btn btn-primary rounded-full px-6 py-3"
                    onClick={() => router.push('/')}
                  >
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    开始规划新行程
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <footer className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/50 backdrop-blur-sm rounded-full text-xs text-gray-400">
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            我的行程 · 本地存储
            <span className="w-1 h-1 rounded-full bg-gray-300" />
          </div>
        </footer>
      </div>
    </div>
  )
}