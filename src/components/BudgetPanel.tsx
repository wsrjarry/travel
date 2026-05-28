'use client'

import { BudgetBreakdown } from '@/lib/types'

interface BudgetPanelProps {
  budget: BudgetBreakdown
}

const budgetItems: { key: keyof Omit<BudgetBreakdown, 'total'>; label: string; icon: string }[] = [
  { key: 'transport', label: '交通', icon: '🚗' },
  { key: 'accommodation', label: '住宿', icon: '🏨' },
  { key: 'food', label: '餐饮', icon: '🍜' },
  { key: 'tickets', label: '门票', icon: '🎫' },
  { key: 'shopping', label: '购物', icon: '🛍' },
]

export default function BudgetPanel({ budget }: BudgetPanelProps) {
  if (!budget) return null

  return (
    <div className="card bg-gradient-to-br from-[#FFD700]/20 to-[#DAA520]/10 border border-[#FFD700] p-5 rounded-2xl">
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-4 h-4 text-[#DAA520]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="1" x2="12" y2="23"/>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
        <h3 className="font-bold text-gray-900">预算明细</h3>
      </div>
      <div className="space-y-2">
        {budgetItems.map(item => (
          <div key={item.key} className="flex items-center justify-between p-2.5 rounded-lg bg-white/70 border border-white">
            <span className="text-sm text-gray-700">{item.icon} {item.label}</span>
            <span className="text-sm font-semibold text-gray-900">¥{budget[item.key]}</span>
          </div>
        ))}
        <div className="flex items-center justify-between p-3 rounded-lg bg-[#FFD700]/30 border border-[#DAA520] mt-2">
          <span className="text-sm font-bold text-gray-900">总计</span>
          <span className="text-lg font-bold text-[#DAA520]">¥{budget.total}</span>
        </div>
      </div>
    </div>
  )
}
