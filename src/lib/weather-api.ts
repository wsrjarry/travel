/**
 * Weather API - Open-Meteo free API (no API key required)
 * Provides 7-day weather forecast with Chinese cities coordinate mapping.
 */

export interface WeatherDay {
  date: string
  tempMax: number        // ℃
  tempMin: number
  weatherCode: number    // WMO weather code
  weatherDesc: string    // Chinese description
  weatherIcon: string    // emoji
  precipitation: number  // mm
  windSpeed: number      // km/h
  humidity: number       // %
}

export interface WeatherResponse {
  city: string
  lat: number
  lng: number
  forecast: WeatherDay[]
  source: string
}

// WMO Weather interpretation codes mapping
// https://open-meteo.com/en/docs#weathervariables
function wmoCodeToInfo(code: number): { desc: string; icon: string } {
  const map: Record<number, { desc: string; icon: string }> = {
    0:  { desc: '晴天', icon: '☀️' },
    1:  { desc: '大部晴朗', icon: '🌤️' },
    2:  { desc: '多云', icon: '⛅' },
    3:  { desc: '阴天', icon: '☁️' },
    45: { desc: '雾', icon: '🌫️' },
    48: { desc: '霜雾', icon: '🌫️' },
    51: { desc: '小毛毛雨', icon: '🌦️' },
    53: { desc: '毛毛雨', icon: '🌦️' },
    55: { desc: '大毛毛雨', icon: '🌧️' },
    56: { desc: '冻毛毛雨', icon: '🌨️' },
    57: { desc: '冻毛毛雨', icon: '🌨️' },
    61: { desc: '小雨', icon: '🌦️' },
    63: { desc: '中雨', icon: '🌧️' },
    65: { desc: '大雨', icon: '🌧️' },
    66: { desc: '冻雨', icon: '🌨️' },
    67: { desc: '冻雨', icon: '🌨️' },
    71: { desc: '小雪', icon: '🌨️' },
    73: { desc: '中雪', icon: '❄️' },
    75: { desc: '大雪', icon: '❄️' },
    77: { desc: '雪粒', icon: '🌨️' },
    80: { desc: '阵雨', icon: '🌦️' },
    81: { desc: '中阵雨', icon: '🌧️' },
    82: { desc: '大阵雨', icon: '🌧️' },
    85: { desc: '小阵雪', icon: '🌨️' },
    86: { desc: '大阵雪', icon: '❄️' },
    95: { desc: '雷阵雨', icon: '⛈️' },
    96: { desc: '冰雹雷暴', icon: '⛈️' },
    99: { desc: '强冰雹雷暴', icon: '⛈️' },
  }
  return map[code] || { desc: '未知', icon: '🌡️' }
}

// Chinese city coordinates (supplement to china-regions.ts)
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  '北京': { lat: 39.9042, lng: 116.4074 },
  '上海': { lat: 31.2304, lng: 121.4737 },
  '广州': { lat: 23.1291, lng: 113.2644 },
  '深圳': { lat: 22.5431, lng: 114.0579 },
  '成都': { lat: 30.5728, lng: 104.0668 },
  '西安': { lat: 34.3416, lng: 108.9398 },
  '杭州': { lat: 30.2741, lng: 120.1551 },
  '南京': { lat: 32.0603, lng: 118.7969 },
  '武汉': { lat: 30.5928, lng: 114.3055 },
  '重庆': { lat: 29.4316, lng: 106.9123 },
  '长沙': { lat: 28.2282, lng: 112.9388 },
  '厦门': { lat: 24.4798, lng: 118.0894 },
  '青岛': { lat: 36.0671, lng: 120.3826 },
  '大连': { lat: 38.9140, lng: 121.6147 },
  '昆明': { lat: 25.0389, lng: 102.7183 },
  '苏州': { lat: 31.2990, lng: 120.5853 },
  '天津': { lat: 39.3434, lng: 117.3616 },
  '三亚': { lat: 18.2528, lng: 109.5120 },
  '哈尔滨': { lat: 45.8038, lng: 126.5350 },
  '桂林': { lat: 25.2736, lng: 110.2900 },
  '丽江': { lat: 26.8721, lng: 100.2299 },
  '拉萨': { lat: 29.6500, lng: 91.1000 },
  '贵阳': { lat: 26.6470, lng: 106.6302 },
  '郑州': { lat: 34.7466, lng: 113.6254 },
  '济南': { lat: 36.6512, lng: 116.9972 },
  '合肥': { lat: 31.8206, lng: 117.2272 },
  '南昌': { lat: 28.6820, lng: 115.8582 },
  '福州': { lat: 26.0745, lng: 119.2965 },
  '南宁': { lat: 22.8170, lng: 108.3665 },
  '海口': { lat: 20.0440, lng: 110.1999 },
  '沈阳': { lat: 41.8057, lng: 123.4315 },
  '长春': { lat: 43.8171, lng: 125.3235 },
  '石家庄': { lat: 38.0428, lng: 114.5149 },
  '太原': { lat: 37.8706, lng: 112.5489 },
  '呼和浩特': { lat: 40.8424, lng: 111.7490 },
  '兰州': { lat: 36.0611, lng: 103.8343 },
  '西宁': { lat: 36.6171, lng: 101.7785 },
  '银川': { lat: 38.4872, lng: 106.2309 },
  '乌鲁木齐': { lat: 43.8256, lng: 87.6168 },
}

/**
 * Fetch 7-day weather forecast from Open-Meteo API.
 * Returns null on failure (non-blocking).
 */
export async function fetchWeatherForecast(city: string): Promise<WeatherResponse | null> {
  const coords = CITY_COORDS[city]
  if (!coords) {
    console.warn(`[Weather] 未找到城市坐标: ${city}`)
    return null
  }

  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast')
    url.searchParams.set('latitude', String(coords.lat))
    url.searchParams.set('longitude', String(coords.lng))
    url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max')
    url.searchParams.set('timezone', 'Asia/Shanghai')
    url.searchParams.set('forecast_days', '7')
    url.searchParams.set('models', 'gfs_seamless') // Using free tier model

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) return null
    const data = await res.json()

    const forecast: WeatherDay[] = []
    const dates: string[] = data.daily?.time || []
    const maxTemps: number[] = data.daily?.temperature_2m_max || []
    const minTemps: number[] = data.daily?.temperature_2m_min || []
    const codes: number[] = data.daily?.weather_code || []
    const precip: number[] = data.daily?.precipitation_sum || []
    const winds: number[] = data.daily?.wind_speed_10m_max || []

    for (let i = 0; i < dates.length; i++) {
      const info = wmoCodeToInfo(codes[i] ?? 0)
      forecast.push({
        date: dates[i],
        tempMax: Math.round(maxTemps[i] ?? 0),
        tempMin: Math.round(minTemps[i] ?? 0),
        weatherCode: codes[i] ?? 0,
        weatherDesc: info.desc,
        weatherIcon: info.icon,
        precipitation: Number((precip[i] ?? 0).toFixed(1)),
        windSpeed: Math.round(winds[i] ?? 0),
        humidity: Math.round(((data.daily?.relative_humidity_2m_max || [])[i] ?? data.daily?.relative_humidity_2m_mean?.[i]) ?? 50),
      })
    }

    return {
      city,
      lat: coords.lat,
      lng: coords.lng,
      forecast,
      source: 'Open-Meteo',
    }
  } catch (err) {
    console.warn(`[Weather] 获取天气失败 (${city}):`, (err as Error)?.message || err)
    return null
  }
}

/**
 * Check if a given day has bad weather (rain/snow/storm).
 */
export function isBadWeatherDay(day: WeatherDay): boolean {
  const badCodes = new Set([51, 53, 55, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99])
  return badCodes.has(day.weatherCode) || day.precipitation > 2.0
}

/**
 * Get season for a given date (northern hemisphere).
 */
export function getSeason(dateStr: string): 'spring' | 'summer' | 'autumn' | 'winter' {
  const m = parseInt(dateStr.split('-')[1] || '6', 10)
  if (m >= 3 && m <= 5) return 'spring'
  if (m >= 6 && m <= 8) return 'summer'
  if (m >= 9 && m <= 11) return 'autumn'
  return 'winter'
}