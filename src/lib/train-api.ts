import { TrainResult } from './types'
import { getCityByName } from '@/data/china-regions'

let stationCache: Map<string, { name: string; code: string }> | null = null

const CITY_DISTANCES: Record<string, Record<string, number>> = {
  '北京': { '上海': 1318, '广州': 2123, '成都': 1874, '杭州': 1279, '西安': 1116, '南京': 1018, '武汉': 1205, '长沙': 1469, '重庆': 1870, '天津': 137, '济南': 495, '郑州': 689, '昆明': 2670, '深圳': 2155 },
  '上海': { '北京': 1318, '广州': 1657, '成都': 1986, '杭州': 176, '西安': 1509, '南京': 301, '武汉': 826, '长沙': 1080, '重庆': 1944, '天津': 1194, '济南': 912, '郑州': 993, '深圳': 1470 },
  '广州': { '北京': 2123, '上海': 1657, '成都': 1581, '西安': 1982, '南京': 1460, '武汉': 1023, '长沙': 707, '重庆': 1192, '深圳': 147, '贵阳': 1214, '桂林': 494, '杭州': 1610 },
  '成都': { '北京': 1874, '上海': 1986, '广州': 1581, '西安': 718, '重庆': 317, '武汉': 1193, '长沙': 1179, '贵阳': 642, '昆明': 1100, '杭州': 1853, '南京': 1636, '深圳': 1710 },
  '西安': { '北京': 1116, '上海': 1509, '广州': 1982, '成都': 718, '重庆': 1050, '武汉': 1057, '长沙': 1220, '南京': 1200, '杭州': 1522, '郑州': 511, '兰州': 565 },
  '杭州': { '北京': 1279, '上海': 176, '广州': 1610, '南京': 265, '武汉': 758, '长沙': 962, '成都': 1853, '西安': 1522, '深圳': 1266 },
  '南京': { '北京': 1018, '上海': 301, '杭州': 265, '广州': 1460, '西安': 1200, '武汉': 519, '成都': 1636, '深圳': 1345 },
  '武汉': { '北京': 1205, '上海': 826, '广州': 1023, '成都': 1193, '西安': 1057, '南京': 519, '长沙': 362, '杭州': 758, '深圳': 1108 },
  '长沙': { '北京': 1469, '上海': 1080, '广州': 707, '成都': 1179, '西安': 1220, '武汉': 362, '深圳': 815, '杭州': 962 },
  '重庆': { '北京': 1870, '上海': 1944, '广州': 1192, '成都': 317, '西安': 1050 },
  '天津': { '北京': 137, '上海': 1194, '广州': 2310, '成都': 1965 },
  '深圳': { '北京': 2155, '上海': 1470, '广州': 147, '成都': 1710, '武汉': 1108, '长沙': 815, '西安': 1965, '杭州': 1266, '南京': 1345 },
}

const priceTable: Record<string, { 二等座: number; 一等座: number; 商务座: number }> = {
  '北京-上海': { 二等座: 553, 一等座: 933, 商务座: 1748 },
  '北京-广州': { 二等座: 862, 一等座: 1380, 商务座: 2720 },
  '北京-成都': { 二等座: 663, 一等座: 1058, 商务座: 2091 },
  '北京-西安': { 二等座: 515, 一等座: 824, 商务座: 1630 },
  '北京-杭州': { 二等座: 562, 一等座: 947, 商务座: 1787 },
  '北京-南京': { 二等座: 443, 一等座: 748, 商务座: 1400 },
  '北京-武汉': { 二等座: 520, 一等座: 820, 商务座: 1640 },
  '北京-长沙': { 二等座: 649, 一等座: 1039, 商务座: 2058 },
  '北京-深圳': { 二等座: 944, 一等座: 1520, 商务座: 2980 },
  '上海-广州': { 二等座: 793, 一等座: 1271, 商务座: 2504 },
  '上海-杭州': { 二等座: 73, 一等座: 123, 商务座: 0 },
  '上海-南京': { 二等座: 135, 一等座: 229, 商务座: 0 },
  '上海-武汉': { 二等座: 302, 一等座: 505, 商务座: 947 },
  '上海-西安': { 二等座: 669, 一等座: 1122, 商务座: 2107 },
  '上海-成都': { 二等座: 816, 一等座: 1330, 商务座: 2630 },
  '广州-深圳': { 二等座: 75, 一等座: 99, 商务座: 0 },
  '广州-长沙': { 二等座: 314, 一等座: 502, 商务座: 0 },
  '广州-武汉': { 二等座: 464, 一等座: 740, 商务座: 1388 },
  '广州-成都': { 二等座: 583, 一等座: 933, 商务座: 1836 },
  '广州-西安': { 二等座: 814, 一等座: 1303, 商务座: 0 },
  '成都-西安': { 二等座: 263, 一等座: 421, 商务座: 0 },
  '成都-重庆': { 二等座: 146, 一等座: 234, 商务座: 0 },
  '成都-武汉': { 二等座: 470, 一等座: 750, 商务座: 0 },
  '成都-长沙': { 二等座: 509, 一等座: 818, 商务座: 0 },
  '杭州-南京': { 二等座: 124, 一等座: 207, 商务座: 0 },
  '杭州-武汉': { 二等座: 244, 一等座: 403, 商务座: 0 },
  '杭州-长沙': { 二等座: 394, 一等座: 634, 商务座: 0 },
  '南京-武汉': { 二等座: 200, 一等座: 340, 商务座: 0 },
  '南京-杭州': { 二等座: 124, 一等座: 207, 商务座: 0 },
}

function getPriceKey(cityA: string, cityB: string): string | null {
  const d = `${cityA}-${cityB}`
  if (priceTable[d]) return d
  const r = `${cityB}-${cityA}`
  if (priceTable[r]) return r
  return null
}

async function fetchStationMap(): Promise<Map<string, { name: string; code: string }>> {
  if (stationCache) return stationCache

  const res = await fetch(
    'https://kyfw.12306.cn/otn/resources/js/framework/station_name.js?station_version=1.9300',
    { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10000) }
  )
  if (!res.ok) throw new Error(`Station list fetch failed: ${res.status}`)

  const text = await res.text()
  const map = new Map<string, { name: string; code: string }>()
  const match = text.match(/@+/)
  if (!match) throw new Error('Unexpected station data format')

  for (const part of text.substring(text.indexOf(match[0])).split('@')) {
    if (!part.trim()) continue
    const fields = part.split('|')
    if (fields.length >= 3) {
      const name = fields[1]
      const code = fields[2]
      map.set(name, { name, code })
      map.set(code, { name, code })
      const city = name.replace(/站$/, '')
      if (!map.has(city)) map.set(city, { name, code })
    }
  }
  stationCache = map
  return map
}

export async function getDefaultStation(city: string): Promise<string> {
  const map = await fetchStationMap()
  if (map.has(city)) return city
  const suffixes = [`${city}站`, `${city}南`, `${city}北`, `${city}东`, `${city}西`]
  for (const s of suffixes) {
    if (map.has(s)) return s
  }
  for (const [name] of map) {
    if (name.includes(city)) return name
  }
  return city
}

function getTrainType(trainNo: string): 'G' | 'D' | 'C' | 'K' | 'T' | 'Z' | 'other' {
  const m = trainNo.match(/^([A-Z]+)/)
  const p = m?.[1] || ''
  if (['G', 'D', 'C', 'K', 'T', 'Z'].includes(p)) return p as 'G' | 'D' | 'C' | 'K' | 'T' | 'Z'
  return 'other'
}

async function tryQuery12306(fromCode: string, toCode: string, date: string): Promise<string[] | null> {
  try {
    const cookieRes = await fetch('https://kyfw.12306.cn/otn/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(8000),
    })
    const setCookie = cookieRes.headers.get('set-cookie') || ''
    const jSession = setCookie.match(/JSESSIONID=[^;]+/)?.[0] || ''

    const url = `https://kyfw.12306.cn/otn/leftTicket/queryZ?leftTicketDTO.train_date=${date}&leftTicketDTO.from_station=${fromCode}&leftTicketDTO.to_station=${toCode}&purpose_codes=ADULT`

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Referer': `https://kyfw.12306.cn/otn/leftTicket/init?linktypeid=dc`,
        'Cookie': jSession,
        'X-Requested-With': 'XMLHttpRequest',
      },
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) return null
    const text = await res.text()
    if (text.startsWith('<')) return null

    const json = JSON.parse(text)
    if (!json?.data?.result?.length) return null

    return json.data.result
  } catch {
    return null
  }
}

function estimatePrice(cityA: string, cityB: string, type: string, isHighSpeed: boolean): number {
  const key = getPriceKey(cityA, cityB)
  if (key && type === '二等座' && priceTable[key].二等座) return priceTable[key].二等座
  if (key && type === '一等座' && priceTable[key].一等座) return priceTable[key].一等座
  if (key && type === '商务座' && priceTable[key].商务座) return priceTable[key].商务座

  const dist = CITY_DISTANCES[cityA]?.[cityB] || CITY_DISTANCES[cityB]?.[cityA] || 1000
  const rates: Record<string, number> = isHighSpeed
    ? { '商务座': 1.5, '一等座': 0.76, '二等座': 0.46, '特等座': 1.2 }
    : { '软卧': 0.45, '硬卧': 0.28, '硬座': 0.14, '无座': 0.14 }
  return Math.round((rates[type] || 0.46) * dist)
}

export async function searchTrains(from: string, to: string, date: string): Promise<TrainResult[]> {
  const map = await fetchStationMap()
  const fromEntry = map.get(from)
  const toEntry = map.get(to)
  if (!fromEntry || !toEntry) return []

  const fromRaw = fromEntry.name.replace(/站$/, '')
  const toRaw = toEntry.name.replace(/站$/, '')
  const fromCity = getCityByName(fromRaw) ? fromRaw : fromRaw.replace(/[南北东西]$/, '')
  const toCity = getCityByName(toRaw) ? toRaw : toRaw.replace(/[南北东西]$/, '')

  const rawResults = await tryQuery12306(fromEntry.code, toEntry.code, date)

  if (rawResults) {
    const nameMap: Record<string, string> = {}
    for (const [code, entry] of map) {
      if (code.length <= 5 && /^[A-Z]+$/.test(code)) {
        nameMap[code] ??= entry.name
      }
    }

    return rawResults.map((line: string) => {
      const f = line.split('|')
      const trainNo = f[3]
      const depTime = f[8]
      const arrTime = f[9]
      const duration = f[10]
      if (!depTime || !arrTime) return null

      const fromStation = nameMap[f[6]] || f[6]
      const toStation = nameMap[f[7]] || f[7]
      const trainType = getTrainType(trainNo)
      const isHS = ['G', 'D', 'C'].includes(trainType)

      const seatTypes: { type: string; price: number; 剩余: number }[] = []

      if (isHS) {
        const p2 = estimatePrice(fromCity, toCity, '二等座', true)
        const p1 = estimatePrice(fromCity, toCity, '一等座', true)
        const pb = estimatePrice(fromCity, toCity, '商务座', true)
        if (p2 > 0) seatTypes.push({ type: '二等座', price: p2, 剩余: Math.floor(Math.random() * 100) + 10 })
        if (p1 > 0) seatTypes.push({ type: '一等座', price: p1, 剩余: Math.floor(Math.random() * 50) + 5 })
        if (pb > 100) seatTypes.push({ type: '商务座', price: pb, 剩余: Math.floor(Math.random() * 20) + 3 })
      } else {
        const price = estimatePrice(fromCity, toCity, '硬座', false)
        seatTypes.push({ type: '硬座', price, 剩余: Math.floor(Math.random() * 200) + 20 })
        seatTypes.push({ type: '硬卧', price: Math.round(price * 1.8), 剩余: Math.floor(Math.random() * 100) + 10 })
        seatTypes.push({ type: '软卧', price: Math.round(price * 3.2), 剩余: Math.floor(Math.random() * 50) + 5 })
      }

      return { trainNo, fromStation, toStation, departureTime: depTime, arrivalTime: arrTime, duration, seatTypes, date, source: '12306' }
    }).filter((t): t is TrainResult => t !== null && t.seatTypes.length > 0)
  }

  const trainType = getTrainType('G')
  const isHS = true
  const dist = CITY_DISTANCES[fromCity]?.[toCity] || CITY_DISTANCES[toCity]?.[fromCity] || 1000

  const baseSeats: { type: string; price: number }[] = []
  const p2 = estimatePrice(fromCity, toCity, '二等座', true)
  const p1 = estimatePrice(fromCity, toCity, '一等座', true)
  const pb = estimatePrice(fromCity, toCity, '商务座', true)
  if (p2 > 0) baseSeats.push({ type: '二等座', price: p2 })
  if (p1 > 0) baseSeats.push({ type: '一等座', price: p1 })
  if (pb > 100) baseSeats.push({ type: '商务座', price: pb })

  if (baseSeats.length === 0) baseSeats.push({ type: '二等座', price: Math.round(dist * 0.46) })

  const sampleDepartures = ['06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00']
  const hours = dist / 300

  return sampleDepartures.map((dep, i) => {
    const arrH = parseInt(dep) + Math.floor(hours * 60) / 60
    const arrM = Math.round((arrH % 1) * 60)
    const depH = parseInt(dep)
    const depM = parseInt(dep.split(':')[1])
    let durationMins = (arrH * 60 + arrM) - (depH * 60 + depM)
    if (durationMins < 0) durationMins += 24 * 60
    const durStr = `${Math.floor(durationMins / 60)}h${durationMins % 60}m`

    return {
      trainNo: `G${(1001 + i * 2)}`,
      fromStation: fromEntry.name,
      toStation: toEntry.name,
      departureTime: dep,
      arrivalTime: `${Math.floor(arrH).toString().padStart(2, '0')}:${arrM.toString().padStart(2, '0')}`,
      duration: durStr,
      seatTypes: baseSeats.map(s => ({ ...s, 剩余: Math.floor(Math.random() * 100) + 10 })),
      date,
      source: 'mock',
    }
  })
}
