'use client'

import { useState } from 'react'
import { PackingList } from '@/lib/packing-list'

interface PackingListPanelProps {
  packingList: PackingList
}

export default function PackingListPanel({ packingList }: PackingListPanelProps) {
  const [expanded, setExpanded] = useState(true)

  if (!packingList || !packingList.categories || packingList.categories.length === 0) return null

  const totalItems = packingList.categories.reduce((sum, cat) => sum + cat.items.length, 0)
  const essentialCount = packingList.categories.reduce(
    (sum, cat) => sum + cat.items.filter(item => item.essential).length, 0
  )

  return (
    <div className="card bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 p-5 rounded-2xl">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          </svg>
          <h3 className="font-bold text-gray-900">行李打包清单</h3>
          <span className="text-xs text-gray-400">
            {packingList.city} · {packingList.season} · {packingList.days}天
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
              {totalItems} 项
            </span>
            <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">
              {essentialCount} 必备
            </span>
          </div>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>

      {packingList.weatherNote && (
        <div className="mt-3 p-2.5 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-700 flex items-start gap-2">
          <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>{packingList.weatherNote}</span>
        </div>
      )}

      {expanded && (
        <div className="mt-4 space-y-3">
          {packingList.categories.map((cat, ci) => (
            <div key={ci} className="bg-white/70 rounded-xl p-4 border border-white">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-lg">{cat.icon}</span>
                <span className="font-semibold text-sm text-gray-800">{cat.category}</span>
                <span className="text-xs text-gray-400">({cat.items.length}项)</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {cat.items.map((item, ii) => (
                  <span
                    key={ii}
                    className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                      item.essential
                        ? 'bg-orange-50 border-orange-200 text-orange-700'
                        : 'bg-gray-50 border-gray-200 text-gray-600'
                    }`}
                    title={item.reason || ''}
                  >
                    {item.essential && (
                      <svg className="w-3 h-3 text-orange-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    )}
                    {item.name}
                    {item.quantity && <span className="text-gray-400 ml-0.5">×{item.quantity}</span>}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
