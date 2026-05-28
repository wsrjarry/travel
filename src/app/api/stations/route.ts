import { NextRequest, NextResponse } from 'next/server'
import { airports, getCityByName } from '@/data/china-regions'

let stationCache: { name: string; code: string; pinyin: string }[] | null = null

export async function GET(req: NextRequest) {
  try {
    const city = req.nextUrl.searchParams.get('city') || ''

    if (!stationCache) {
      const res = await fetch(
        'https://kyfw.12306.cn/otn/resources/js/framework/station_name.js?station_version=1.9300',
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          signal: AbortSignal.timeout(10000),
        }
      )

      if (!res.ok) {
        return NextResponse.json(
          { success: false, error: '无法获取车站列表', mock: getMockStations(city) },
          { status: 502 }
        )
      }

      const text = await res.text()
      const match = text.match(/@+/)
      if (!match) throw new Error('Unexpected station data format')

      const raw = text.substring(text.indexOf(match[0]))
      const parts = raw.split('@')
      const stations: { name: string; code: string; pinyin: string }[] = []

      for (const part of parts) {
        if (!part.trim()) continue
        const fields = part.split('|')
        if (fields.length >= 3) {
          stations.push({
            pinyin: fields[0],
            name: fields[1],
            code: fields[2],
          })
        }
      }

      stationCache = stations
    }

    let matched = city
      ? stationCache.filter(s =>
          s.name.startsWith(city) || s.pinyin.toLowerCase().startsWith(city.toLowerCase()) ||
          s.name.includes(city) || s.pinyin.includes(city)
        ).slice(0, 12)
      : stationCache.slice(0, 50)

    const cityAirports = airports[city] || []
    const airportStations = cityAirports.map(a => ({
      name: a.name, code: a.code, pinyin: '',
      type: 'airport' as const,
    }))

    const stationList = city
      ? matched
          .filter(s => stationCache!.find(s2 =>
            s2.name === s.name && s2.code === s.code &&
            (s2.name.startsWith(city) || s2.name.includes(city) || s2.name === `${city}站`)
          ))
          .sort((a, b) => {
            const aIsMain = a.name === `${city}站`
            const bIsMain = b.name === `${city}站`
            if (aIsMain && !bIsMain) return -1
            if (!aIsMain && bIsMain) return 1
            const aStarts = a.name.startsWith(city)
            const bStarts = b.name.startsWith(city)
            if (aStarts && !bStarts) return -1
            if (!aStarts && bStarts) return 1
            return 0
          })
      : matched

    return NextResponse.json({
      success: true,
      stations: stationList,
      airports: airportStations,
      count: stationList.length,
      city,
    })
  } catch (err) {
    console.error('Station fetch error:', err)
    return NextResponse.json(
      { success: false, error: '车站列表获取失败', mock: getMockStations(new URL(req.url).searchParams.get('city') || '') },
      { status: 500 }
    )
  }
}

function getMockStations(city: string) {
  if (!city) return []
  const c = getCityByName(city)
  return [
    { name: `${city}站`, code: `${city.slice(0, 2).toUpperCase()}`, pinyin: '' },
    { name: `${city}东站`, code: `${city.slice(0, 2).toUpperCase()}D`, pinyin: '' },
    { name: `${city}西站`, code: `${city.slice(0, 2).toUpperCase()}X`, pinyin: '' },
    { name: `${city}南站`, code: `${city.slice(0, 2).toUpperCase()}N`, pinyin: '' },
  ].filter((_, i) => {
    const a = airports[city]
    return !!a || i < 3
  })
}
