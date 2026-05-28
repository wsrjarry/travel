'use client'

import { useState, useEffect } from 'react'

type MascotStatus = 'idle' | 'loading' | 'success' | 'thinking'

interface MascotProps {
  status?: MascotStatus
  message?: string
  position?: 'bottom-right' | 'top-right' | 'top-left' | 'bottom-left'
  showBubble?: boolean
}

export default function Mascot({
  status = 'idle',
  message,
  position = 'bottom-right',
  showBubble = true
}: MascotProps) {
  const [bubbleVisible, setBubbleVisible] = useState(false)
  const [lastMessage, setLastMessage] = useState('')
  const [isSpeaking, setIsSpeaking] = useState(false)

  useEffect(() => {
    if (message && showBubble) {
      setLastMessage(message)
      setBubbleVisible(true)
      setIsSpeaking(true)

      const timer = setTimeout(() => {
        setBubbleVisible(false)
        setIsSpeaking(false)
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [message, showBubble])

  const getAnimationClass = () => {
    switch (status) {
      case 'loading':
        return 'animate-roll'
      case 'success':
        return 'animate-jump'
      case 'thinking':
        return 'animate-think'
      default:
        return 'animate-idle'
    }
  }

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6',
    'bottom-left': 'bottom-6 left-6',
  }

  return (
    <>
      <style jsx global>{`
        @keyframes idle-sway {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-3px) rotate(-3deg); }
          75% { transform: translateY(-3px) rotate(3deg); }
        }

        @keyframes roll {
          0% { transform: translateX(0) rotate(0deg); }
          25% { transform: translateX(6px) rotate(5deg); }
          50% { transform: translateX(0) rotate(0deg); }
          75% { transform: translateX(-6px) rotate(-5deg); }
          100% { transform: translateX(0) rotate(0deg); }
        }

        @keyframes jump {
          0%, 100% { transform: translateY(0) scale(1); }
          25% { transform: translateY(-16px) scale(1.08); }
          50% { transform: translateY(0) scale(1); }
          75% { transform: translateY(-8px) scale(1.04); }
        }

        @keyframes think {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          33% { transform: translateY(-4px) rotate(-5deg); }
          66% { transform: translateY(-4px) rotate(5deg); }
        }

        @keyframes bubble-pop {
          0% { transform: scale(0); opacity: 0; }
          70% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }

        @keyframes zzz {
          0% { transform: translateY(0) scale(0.6); opacity: 0; }
          20% { transform: translateY(-10px) scale(1); opacity: 1; }
          80% { transform: translateY(-26px) scale(0.7); opacity: 0.3; }
          100% { transform: translateY(-32px) scale(0.4); opacity: 0; }
        }

        .animate-idle { animation: idle-sway 3s ease-in-out infinite; }
        .animate-roll { animation: roll 1.2s ease-in-out infinite; }
        .animate-jump { animation: jump 0.8s ease-in-out; }
        .animate-think { animation: think 2s ease-in-out infinite; }
        .animate-bubble-pop { animation: bubble-pop 0.3s ease-out; }
        .animate-zzz { animation: zzz 2s ease-out infinite; }
      `}</style>

      <div className={`fixed ${positionClasses[position]} z-50 flex flex-col items-end`}>
        {/* 气泡 */}
        {bubbleVisible && lastMessage && (
          <div className="mb-3 animate-bubble-pop">
            <div className="relative bg-white rounded-2xl px-4 py-3 shadow-lg shadow-[#87CEEB]/20 border border-[#87CEEB]/30 max-w-xs">
              <div className="text-sm text-[#2C3E50] font-medium">{lastMessage}</div>
              <div className="absolute -bottom-2 right-8 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white"></div>
            </div>
          </div>
        )}

        {/* 猫头鹰本体 */}
        <div className={`relative ${getAnimationClass()}`}>
          {/* Zzz 气泡（空闲时） */}
          {status === 'idle' && !isSpeaking && (
            <>
              <div className="absolute -top-10 -right-2 animate-zzz text-xl opacity-0">💤</div>
              <div className="absolute -top-16 -right-6 animate-zzz text-xl opacity-0" style={{ animationDelay: '0.5s' }}>💤</div>
              <div className="absolute -top-20 -right-3 animate-zzz text-xl opacity-0" style={{ animationDelay: '1s' }}>💤</div>
            </>
          )}

          {/* 成功时的小星星 */}
          {status === 'success' && (
            <>
              <div className="absolute -top-4 -left-3 text-lg animate-bounce" style={{ animationDelay: '0.1s' }}>⭐</div>
              <div className="absolute -top-8 right-2 text-lg animate-bounce" style={{ animationDelay: '0.3s' }}>⭐</div>
              <div className="absolute -top-3 -right-5 text-lg animate-bounce" style={{ animationDelay: '0.5s' }}>⭐</div>
            </>
          )}

          {/* 加载时的小灰尘 */}
          {status === 'loading' && (
            <div className="absolute -bottom-4 -right-1 flex gap-1">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 bg-[#87CEEB]/60 rounded-full"
                  style={{
                    animation: `bounce 0.6s ease-in-out infinite`,
                    animationDelay: `${i * 0.2}s`
                  }}
                ></div>
              ))}
            </div>
          )}

          {/* 旅行元素装饰 */}
          <div className="absolute -top-7 -right-7 text-xl">
            {status === 'loading' && '✈️'}
            {status === 'success' && '🧳'}
            {status === 'thinking' && '🧭'}
            {status === 'idle' && '🗺️'}
          </div>

          {/* 猫头鹰图片 */}
          <div className="w-20 h-20 rounded-full bg-white/80 backdrop-blur p-1.5 shadow-lg shadow-[#87CEEB]/30 border-2 border-[#87CEEB]/20">
            <img
              src="/images/owl-mascot.png"
              alt="猫头鹰豆豆"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      </div>
    </>
  )
}
