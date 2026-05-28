'use client'

import TravelForm from '@/components/TravelForm'
import PoiSelect from '@/components/PoiSelect'
import ItineraryView from '@/components/ItineraryView'
import { useItineraryState } from '@/lib/useItineraryState'

export default function Home() {
  const {
    step,
    formData,
    candidates,
    itinerary,
    weather,
    planB,
    loading,
    error,
    searchCandidates,
    handlePoiConfirm,
    handleSkipPoi,
    handleReset,
    handleReplan,
    handleBackToPois,
    retryLastAction,
  } = useItineraryState()

  const poiExtra = (() => {
    const pacePerDay = formData?.pace === 'relaxed' ? 2 : formData?.pace === 'moderate' ? 3 : 4
    const dayCount = formData
      ? (new Date(formData.endDate).getTime() - new Date(formData.startDate).getTime()) / 86400000 + 1
      : 0
    return { pacePerDay, dayCount, maxCapacity: Math.round(dayCount * pacePerDay * 0.7) }
  })()

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-[#87CEEB]/30 to-transparent blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-to-tl from-[#FFB6C1]/30 to-transparent blur-3xl" />
        <div className="absolute top-[40%] left-[50%] w-[40%] h-[40%] rounded-full bg-gradient-to-tr from-[#FFD700]/20 to-transparent blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 relative">
        <header className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 bg-white/60 backdrop-blur-sm rounded-full border border-white/80 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs font-semibold text-gray-500 tracking-wider">AI-POWERED</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-3">
            智能旅游攻略规划
          </h1>
          <p className="text-gray-500 max-w-md mx-auto leading-relaxed">
            选择目的地 → 勾选景点 → 逐日地图 + 预算规划
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <a href="/my" className="text-xs px-3 py-1.5 bg-[#E8F4FD] text-[#2C3E50] rounded-full border border-[#A8D8EA] hover:bg-[#D0E8F7] transition-colors">
              查看我的行程
            </a>
          </div>
        </header>

        <div className="flex items-center justify-center gap-3 mb-8">
          {(['form', 'pois', 'itinerary'] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                step === s
                  ? 'bg-[#87CEEB] text-white shadow-md shadow-[#87CEEB]/25 scale-105'
                  : 'bg-white/60 text-gray-400'
              }`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                  step === s ? 'bg-white/20' : 'bg-gray-100 text-gray-500'
                }`}>{i + 1}</span>
                {s === 'form' ? '填信息' : s === 'pois' ? '选景点' : '行程'}
              </div>
              {i < 2 && (
                <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className={`mb-6 p-4 border rounded-xl text-sm flex items-start gap-3 animate-in slide-in-from-top-2 ${
            error.type === 'network' ? 'bg-amber-50 border-amber-100 text-amber-700' : 'bg-red-50 border-red-100 text-red-600'
          }`}>
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <div className="flex-1">
              <p>{error.message}</p>
              {error.retryable && (
                <button onClick={retryLastAction} className="mt-2 text-xs font-medium underline underline-offset-2 hover:no-underline">
                  点击重试
                </button>
              )}
            </div>
          </div>
        )}

        {step === 'form' && (
          <div className="card"><TravelForm onSubmit={searchCandidates} loading={loading} initialData={formData || undefined} /></div>
        )}

        {step === 'pois' && (
          <div className="card relative">
            {loading && (
              <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center z-10">
                <div className="text-center">
                  <div className="animate-spin h-8 w-8 border-4 border-[#87CEEB] border-t-transparent rounded-full mx-auto mb-3" />
                  <p className="text-gray-600">{candidates.length > 0 ? '正在智能编排行程...' : '正在获取候选景点...'}</p>
                </div>
              </div>
            )}
            <PoiSelect candidates={candidates} onConfirm={handlePoiConfirm} onBack={handleReset}
              onSkip={handleSkipPoi} loading={false} maxCapacity={poiExtra.maxCapacity} />
          </div>
        )}

        {step === 'itinerary' && itinerary && (
          <ItineraryView itinerary={itinerary} onReset={handleReset} onBack={handleBackToPois}
            weather={weather} planB={planB}
            candidates={candidates} onReplan={handleReplan} loading={loading} />
        )}

        <footer className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/50 backdrop-blur-sm rounded-full text-xs text-gray-400">
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            高德地图 · Haversine 距离计算
            <span className="w-1 h-1 rounded-full bg-gray-300" />
          </div>
        </footer>
      </div>
    </div>
  )
}