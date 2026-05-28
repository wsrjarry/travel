import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'
import Mascot from '@/components/Mascot'

export const metadata: Metadata = {
  title: '旅行规划 · 智能旅游攻略',
  description: 'AI 驱动的智能旅游行程规划工具，猫头鹰豆豆伴你旅行～',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="relative">
        {/* 装饰性背景 */}
        <div className="fixed inset-0 -z-20 bg-dots"></div>
        <div className="fixed inset-0 -z-10 bg-waves opacity-5"></div>
        
        {/* 渐变背景 */}
        <div className="fixed inset-0 -z-30">
          <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-[#87CEEB]/8 via-[#FFB6C1]/5 to-transparent"></div>
          <div className="absolute bottom-0 right-0 w-full h-96 bg-gradient-to-tl from-[#FFD700]/5 via-transparent to-transparent"></div>
        </div>

        <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-[#87CEEB]/95 via-[#A8D8EA]/95 to-[#87CEEB]/95 backdrop-blur-2xl border-b border-white/40 shadow-lg">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              {/* 猫头鹰图片 */}
              <div className="relative w-10 h-10 group-hover:scale-110 transition-transform duration-300">
                <img 
                  src="/images/owl-mascot.png" 
                  alt="猫头鹰吉祥物" 
                  className="w-full h-full object-contain rounded-full shadow-lg shadow-[#FFD700]/30"
                />
              </div>
              
              <div className="flex flex-col">
                <span className="text-lg font-bold bg-gradient-to-r from-white to-[#FFF5E6] bg-clip-text text-white">
                  旅行规划
                </span>
                <span className="text-xs text-white/70 mt-0.5">AI 智能行程助手</span>
              </div>
            </Link>
            
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 bg-white/20 text-white hover:bg-white/30 hover:shadow-md border border-white/30 backdrop-blur-sm"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                  规划行程
                </span>
              </Link>
              <Link
                href="/my"
                className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 bg-white/10 text-white/80 hover:bg-white/25 hover:text-white hover:shadow-md border border-white/20 backdrop-blur-sm"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  我的行程
                </span>
              </Link>
              
              {/* 旅游元素装饰 */}
              <div className="flex items-center gap-1 ml-4 pl-4 border-l border-white/30">
                <svg className="w-4 h-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
                </svg>
                <span className="text-xs text-white/60">旅行伴侣</span>
              </div>
            </div>
          </div>
        </nav>
        
        <div className="pt-16">{children}</div>
        
        {/* 全局猫头鹰小宠物 */}
        <Mascot 
          status="idle" 
          position="bottom-right"
          message="咕咕！我是豆豆，你的猫头鹰旅行向导～"
        />
      </body>
    </html>
  )
}
