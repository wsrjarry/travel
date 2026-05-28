'use client'

interface WeatherPanelProps {
  weather: any
}

export default function WeatherPanel({ weather }: WeatherPanelProps) {
  if (!weather || !weather.forecast) return null
  return (
    <div className="card bg-gradient-to-br from-[#87CEEB]/20 to-[#A8D8EA]/10 border border-[#87CEEB] p-5 rounded-2xl">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-[#87CEEB]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>
        <h3 className="font-bold text-gray-900">天气预报</h3>
        <span className="text-xs text-gray-400 font-normal">{weather.source}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
        {weather.forecast.slice(0, 7).map((w: any, i: number) => (
          <div key={i} className="text-center p-2.5 rounded-xl bg-white/70 border border-white">
            <div className="text-xs text-gray-500 font-medium">{w.date.slice(5)}</div>
            <div className="text-2xl my-1">{w.weatherIcon}</div>
            <div className="text-xs text-gray-600 font-medium">{w.weatherDesc}</div>
            <div className="text-xs font-semibold text-gray-900">{w.tempMax}° / {w.tempMin}°</div>
            {w.precipitation > 0 && (
              <div className="text-xs text-[#87CEEB] mt-0.5 font-medium">💧{w.precipitation}mm</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
