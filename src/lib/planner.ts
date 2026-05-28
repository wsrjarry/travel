import {
  TravelFormData, POI, DayPlan, DayActivity, Itinerary, ItineraryWarning,
  BudgetBreakdown, TransitOption, CandidatePoi, MealBreak,
} from './types'
import { getPoisByCity } from '@/data/mock-data'
import { getCityByName } from '@/data/china-regions'
import { searchPopularPois } from './amap-api'
import { routeOptimize, timeAwareSort, parseOpenTime, dayOfWeek } from './route-utils'
import { aiRouteOptimize } from './ai-router'
import { haversineDistKm } from './distance'
import { fetchWeatherForecast, isBadWeatherDay, WeatherDay } from './weather-api'

// ─── 工具函数 ───────────────────────────────────────────

function getDayCount(start: string, end: string): number {
  return Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1)
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function parseTime(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return 9 * 60
  return Math.max(0, h * 60 + (m || 0))
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

// ─── 营业时间校验 ───────────────────────────────────────

function isPoiOpen(poi: POI, arrivalMin: number, departureMin: number, dateStr: string): boolean {
  const tr = parseOpenTime(poi.openTime, dateStr)
  if (!tr) return false
  const dow = dayOfWeek(dateStr)
  if (poi.closeDay && poi.closeDay.includes(dow)) return false
  const a = arrivalMin % (24 * 60)
  const d = departureMin % (24 * 60)
  const o = tr.open
  const c = tr.close

  // 检查最后入场时间
  if (tr.lastEntry !== undefined && a >= tr.lastEntry) return false

  if (c <= 24 * 60) return a >= o && d <= c
  return (a >= o || a < c - 24 * 60) && (d <= c || d < c - 24 * 60)
}

// ─── 用餐时段生成 ───────────────────────────────────────

function getMealWindows(pace?: string): { lunch: { start: number; end: number }; dinner: { start: number; end: number } } {
  if (pace === 'intense') {
    return { lunch: { start: 12 * 60, end: 13 * 60 }, dinner: { start: 18 * 60, end: 19 * 60 } }
  }
  if (pace === 'relaxed') {
    return { lunch: { start: 11 * 60, end: 14 * 60 }, dinner: { start: 17 * 60, end: 20 * 60 } }
  }
  return { lunch: { start: 11 * 60 + 30, end: 13 * 60 }, dinner: { start: 17 * 60 + 30, end: 19 * 60 + 30 } }
}

function generateMealBreak(type: 'lunch' | 'dinner', pois: POI[], window: { start: number; end: number }): MealBreak {
  const foodPois = pois.filter(p => p.category === 'food' || p.category === 'restaurant').slice(0, 3)
  return {
    type,
    startTime: formatTime(window.start),
    endTime: formatTime(window.end),
    suggestions: foodPois.length > 0 ? foodPois : [],
  }
}

// ─── POI 聚类与评分 ─────────────────────────────────────

function generateThemes(dayCount: number): string[] {
  const pool = ['经典必游', '历史文化', '美食探索', '休闲漫步', '自然风光', '艺术之旅', '购物狂欢', '亲子时光', '深度体验', '城市地标', '文艺打卡', '夜景巡游']
  return Array.from({ length: dayCount }, (_, i) => pool[i % pool.length])
}

export function scorePois(pois: POI[], interests: string[]): CandidatePoi[] {
  return pois.map(p => {
    let score = p.rating * 10

    // 分层标签权重：完全匹配 > 部分匹配 > 不匹配
    let tagBonus = 0
    for (const tag of p.tags) {
      for (const interest of interests) {
        if (tag === interest) {
          tagBonus += 40      // 完全匹配：+40 分
        } else if (tag.includes(interest) || interest.includes(tag)) {
          tagBonus += 20      // 部分匹配（子串）：+20 分
        }
      }
    }
    score += tagBonus

    if (p.price === 0) score += 5
    return { poi: p, score, selected: true }
  }).sort((a, b) => b.score - a.score)
}

function distributePois(candidates: POI[], countPerDay: number, dayCount: number): POI[][] {
  const days: POI[][] = Array.from({ length: dayCount }, () => [])
  let cursor = 0
  for (const poi of candidates) {
    days[cursor % dayCount].push(poi)
    cursor++
    if (days.every(d => d.length >= countPerDay)) break
  }
  // 检查是否有天数景点不足
  const insufficient = days.filter(d => d.length < countPerDay).length
  if (insufficient > 0) {
    console.warn(`[distributePois] 候选景点不足：${insufficient}/${dayCount} 天未达到每 ${countPerDay} 个景点的目标`)
  }
  return days
}





// ─── 单日行程编排（含用餐 + 营业时间校验）───────────────

function planDayActivities(
  pois: POI[],
  startFrom: POI | null,
  dayStartTime: number,
  dateStr: string,
  city: string = '',
  maxEndTime?: number,
  pace?: string,
): { activities: DayActivity[]; warnings: ItineraryWarning[] } {
  const activities: DayActivity[] = []
  const warnings: ItineraryWarning[] = []
  const mealWindows = getMealWindows(pace)
  const dayLimit = maxEndTime || 22 * 60
  let currentTime = dayStartTime
  let prevPoi: POI | null = startFrom
  let lunchInserted = false
  let dinnerInserted = false
  
  // 严格检查时间约束
  if (dayLimit <= currentTime) {
    warnings.push({
      type: 'time_limit',
      message: `结束时间 ${formatTime(dayLimit)} 早于或等于开始时间 ${formatTime(currentTime)}，无法安排任何活动`,
      skippedCount: pois.length,
      suggestedMax: 0
    })
    return { activities, warnings }
  }

  for (let i = 0; i < pois.length; i++) {
    const poi = pois[i]

    // 检查午餐窗口
    if (!lunchInserted && currentTime >= mealWindows.lunch.start && currentTime <= mealWindows.lunch.end + 30) {
      lunchInserted = true
      const meal = generateMealBreak('lunch', pois, mealWindows.lunch)
      activities.push({
        poi: { id: 'lunch', name: '午餐', category: 'food', rating: 0, price: 40, duration: 0.75, address: '', lat: prevPoi?.lat || 0, lng: prevPoi?.lng || 0, openTime: '全天', closeDay: '', tags: ['美食'], description: '午餐时间', city, district: '' },
        arrivalTime: meal.startTime, departureTime: meal.endTime, cost: 40,
        isMealBreak: true, mealBreak: meal,
      })
      currentTime = Math.max(currentTime, parseTime(meal.endTime))
    }

    // 检查晚餐窗口
    if (!dinnerInserted && currentTime >= mealWindows.dinner.start) {
      dinnerInserted = true
      const meal = generateMealBreak('dinner', pois, mealWindows.dinner)
      activities.push({
        poi: { id: 'dinner', name: '晚餐', category: 'food', rating: 0, price: 80, duration: 1, address: '', lat: prevPoi?.lat || 0, lng: prevPoi?.lng || 0, openTime: '全天', closeDay: '', tags: ['美食'], description: '晚餐时间', city, district: '' },
        arrivalTime: meal.startTime, departureTime: meal.endTime, cost: 80,
        isMealBreak: true, mealBreak: meal,
      })
      currentTime = Math.max(currentTime, parseTime(meal.endTime))
    }

    // 交通时间
    let transitDuration = 0
    if (prevPoi && prevPoi.lat !== 0 && poi.lat !== 0) {
      const distKm = haversineDistKm(prevPoi.lat, prevPoi.lng, poi.lat, poi.lng)
      transitDuration = Math.round(distKm * 2.5)
    }
    if (transitDuration < 5 && prevPoi) transitDuration = 5
    currentTime += transitDuration

    // 营业时间校验（含智能延迟：若当前时间未到开门时间，等待至开门）
    const durationMin = Math.round(Math.max(0.5, poi.duration || 1) * 60)
    let arrMin = currentTime
    let depMin = arrMin + durationMin

    if (!isPoiOpen(poi, arrMin, depMin, dateStr)) {
      // 尝试延迟到景点开门时间
      const tr = parseOpenTime(poi.openTime)
      if (tr && tr.open > 0 && tr.open < 24 * 60) {
        const delayedArr = tr.open
        const delayedDep = delayedArr + durationMin
        // 确保延迟后的时间不会回退到当前时间之前
        if (delayedArr > currentTime && isPoiOpen(poi, delayedArr, delayedDep, dateStr) && delayedDep <= dayLimit) {
          arrMin = delayedArr
          depMin = delayedDep
        } else {
          currentTime -= transitDuration
          continue
        }
      } else {
        currentTime -= transitDuration
        continue
      }
    }

    // 时间连续性检查
    if (arrMin >= depMin) {
      warnings.push({
        type: 'time_continuity',
        message: `活动 ${poi.name} 到达时间 ${formatTime(arrMin)} 不早于离开时间 ${formatTime(depMin)}，跳过该活动`,
        skippedCount: 1,
        suggestedMax: 0
      })
      currentTime -= transitDuration
      continue
    }
    if (depMin > dayLimit) {
      warnings.push({
        type: 'time_limit',
        message: `活动 ${poi.name} 离开时间 ${formatTime(depMin)} 超过每日上限 ${formatTime(dayLimit)}，跳过该活动`,
        skippedCount: 1,
        suggestedMax: 0
      })
      currentTime -= transitDuration
      continue
    }

    const arrStr = formatTime(arrMin)
    const depStr = formatTime(depMin)

    const transit: TransitOption | undefined = prevPoi && prevPoi.lat !== 0 && poi.lat !== 0
      ? { mode: 'taxi', duration: transitDuration, durationText: `${transitDuration}分钟`, distance: 0, distanceText: '', price: Math.round(transitDuration * 0.5), description: '' }
      : undefined

    // 生成预约/门票提醒（增强版 — 基于类型和热度而非依赖 Amap 标签）
    let reminder: string | undefined
    const tagStr = (poi.tags || []).join(' ')
    const needReserve = /预约|限流|抢票|预约制/i.test(tagStr)
    const hasPriceInfo = poi.price > 0
    const isPopular = poi.rating >= 4.3

    if (poi.category === 'museum') {
      if (needReserve && hasPriceInfo) reminder = `需提前预约，门票 ¥${poi.price}`
      else if (isPopular && hasPriceInfo) reminder = `热门场馆，建议提前预约，门票 ¥${poi.price}`
      else if (hasPriceInfo) reminder = `可能需要预约，门票 ¥${poi.price}`
      else if (isPopular) reminder = '热门场馆，建议提前预约（免费）'
      else reminder = '可能需要预约，建议提前确认'
    } else if (poi.category === 'scenic' || poi.category === 'entertainment') {
      if (needReserve && hasPriceInfo) reminder = `需提前预约，门票 ¥${poi.price}`
      else if (isPopular && hasPriceInfo) reminder = `热门景点，建议提前购票 ¥${poi.price}`
      else if (hasPriceInfo) reminder = `门票 ¥${poi.price}`
      else if (isPopular) reminder = '热门景点，建议提前确认开放时间'
    } else if (hasPriceInfo) {
      reminder = `门票 ¥${poi.price}`
    }

    activities.push({ poi, arrivalTime: arrStr, departureTime: depStr, transitFromPrev: transit, cost: poi.price, reminder })
    const restMin = Math.max(10, Math.min(45, Math.round(transitDuration * 0.4)))
    currentTime = depMin + restMin
    prevPoi = poi
    if (currentTime > 20.5 * 60) break
  }

  // 补上晚餐：仅在当天有足够时间且晚餐结束时间不超 maxEndTime 时才补
  if (!dinnerInserted && currentTime < 21 * 60) {
    const dinnerStart = Math.max(mealWindows.dinner.start, currentTime)
    const dinnerEnd = dinnerStart + 60
    const fitsInDay = !maxEndTime || dinnerEnd <= maxEndTime
    if (fitsInDay) {
      const meal = generateMealBreak('dinner', pois, mealWindows.dinner)
      activities.push({
        poi: { id: 'dinner', name: '晚餐', category: 'food', rating: 0, price: 80, duration: 1, address: '', lat: prevPoi?.lat || 0, lng: prevPoi?.lng || 0, openTime: '全天', closeDay: '', tags: ['美食'], description: '晚餐时间', city, district: '' },
        arrivalTime: formatTime(dinnerStart),
        departureTime: formatTime(dinnerEnd),
        cost: 80, isMealBreak: true, mealBreak: meal,
      })
    }
  }

  return { activities, warnings }
}

// ─── 酒店 ───────────────────────────────────────────

function makeHotel(dest: string, district: string, lat: number, lng: number, type: 'hotel' | 'bnb' | 'hostel', idx: number): POI {
  const [minP, maxP] = type === 'hotel' ? [300, 600] : type === 'bnb' ? [150, 350] : [50, 150]
  const price = Math.round(minP + Math.random() * (maxP - minP))
  const names: Record<string, string> = { hotel: `${dest}${district || '市区'}附近酒店`, bnb: `${dest}${district || '中心'}民宿`, hostel: `${dest}青年旅舍` }
  return {
    id: `hotel-${idx}`, name: names[type], category: 'hotel',
    rating: 4.0 + Math.random() * 0.8, price, duration: 0,
    address: `${dest}${district || '市区'}`, lat, lng, openTime: '24h', closeDay: '',
    tags: [type, '住宿'], description: `约¥${price}/晚`,
    city: dest, district: district || '',
  }
}

// ─── 构建每日计划 ──────────────────────────────────────

/** 跨天 POI 调换优化：尝试在相邻天之间交换景点以降低总路线距离（含跨天衔接成本） */
function crossDayOptimize(dayPoisGroups: POI[][], startPoiFirstDay: POI | null): POI[][] {
  const groups = dayPoisGroups.map(g => [...g])
  if (groups.length < 2) return groups

  let improved = true
  let iter = 0
  const maxIter = 100

  while (improved && iter < maxIter) {
    improved = false
    iter++
    for (let day = 0; day < groups.length - 1; day++) {
      for (let a = 0; a < groups[day].length; a++) {
        for (let b = 0; b < groups[day + 1].length; b++) {
          // 计算交换前的总距离（含跨天衔接成本）
          const dayStartPoi = day === 0 ? startPoiFirstDay : null
          const crossFrom = groups[day].length > 0 ? groups[day][groups[day].length - 1] : null
          const crossTo = groups[day + 1].length > 0 ? groups[day + 1][0] : null
          const crossDist = (crossFrom && crossTo)
            ? haversineDistKm(crossFrom.lat, crossFrom.lng, crossTo.lat, crossTo.lng)
            : 0
          const before = dayTotalDist(groups[day], dayStartPoi)
            + dayTotalDist(groups[day + 1], null)
            + crossDist

          // 临时交换
          const temp = groups[day][a]
          groups[day][a] = groups[day + 1][b]
          groups[day + 1][b] = temp

          const newCrossFrom = groups[day].length > 0 ? groups[day][groups[day].length - 1] : null
          const newCrossTo = groups[day + 1].length > 0 ? groups[day + 1][0] : null
          const newCrossDist = (newCrossFrom && newCrossTo)
            ? haversineDistKm(newCrossFrom.lat, newCrossFrom.lng, newCrossTo.lat, newCrossTo.lng)
            : 0
          const after = dayTotalDist(groups[day], dayStartPoi)
            + dayTotalDist(groups[day + 1], null)
            + newCrossDist

          if (after < before - 0.01) {
            improved = true
            // 交换后对受影响的两天重新执行 TSP 路径优化
            groups[day] = routeOptimize(groups[day], day === 0 ? startPoiFirstDay : null)
            groups[day + 1] = routeOptimize(groups[day + 1], null)
            break // 立即应用，退出内层循环重新扫描
          } else {
            // 撤销交换
            groups[day + 1][b] = groups[day][a]
            groups[day][a] = temp
          }
        }
        if (improved) break
      }
      if (improved) break
    }
  }
  return groups
}

/** 计算一天的最优路线距离（TSP 或贪心+2-opt） */
function dayTotalDist(pois: POI[], startFrom: POI | null): number {
  if (pois.length === 0) return 0
  const optimized = routeOptimize(pois, startFrom)
  let total = 0
  let prev = startFrom
  for (const poi of optimized) {
    if (prev) {
      total += haversineDistKm(prev.lat, prev.lng, poi.lat, poi.lng)
    }
    prev = poi
  }
  return total
}

async function buildDayPlans(
  formData: TravelFormData,
  dayPoisGroups: POI[][],
  dayCount: number,
  arrivalTimeMin: number,
  departureTimeMin: number,
  enableCrossDayOptimize = true,
  allPois?: POI[],
  weather?: any,
  dayTimeConstraints?: { startTime?: string; endTime?: string; lunchTime?: string; dinnerTime?: string }[],
): Promise<{ days: DayPlan[]; warnings: ItineraryWarning[] }> {
  const themes = generateThemes(dayCount)
  const days: DayPlan[] = []
  const allWarnings: ItineraryWarning[] = []

  // 跨天调换优化（仅在初次规划时启用，重新规划时用户已明确分配天数）
  const cityInfo0 = getCityByName(formData.destinationCity)
  const hotel0 = makeHotel(formData.destinationCity,
    dayPoisGroups[0]?.[0]?.district || '',
    cityInfo0?.lat || 39.9, cityInfo0?.lng || 116.4,
    formData.accommodationType ?? 'hotel', 0)
  const optimizedGroups = enableCrossDayOptimize
    ? crossDayOptimize(dayPoisGroups, hotel0)
    : dayPoisGroups

  // 并行调用 AI 路线规划（所有天数同时发起）
  const aiResults = await Promise.all(
    optimizedGroups.map(async (rawPois, i) => {
      const date = addDays(formData.startDate, i)
      const mealWindows = getMealWindows(formData.pace)
      
      // 优先使用用户编辑的每日时间约束，否则使用默认逻辑
      let startTime = i === 0 ? arrivalTimeMin : 8 * 60
      let endTime = i === dayCount - 1 ? departureTimeMin : 22 * 60
      
      if (dayTimeConstraints && dayTimeConstraints[i]) {
        const constraints = dayTimeConstraints[i]
        if (constraints.startTime) {
          startTime = parseTime(constraints.startTime)
        }
        if (constraints.endTime) {
          endTime = parseTime(constraints.endTime)
        }
        // 如果用户指定了午餐/晚餐时间，覆盖默认窗口
        if (constraints.lunchTime) {
          const lunchMin = parseTime(constraints.lunchTime)
          mealWindows.lunch = { start: lunchMin - 30, end: lunchMin + 60 }
        }
        if (constraints.dinnerTime) {
          const dinnerMin = parseTime(constraints.dinnerTime)
          mealWindows.dinner = { start: dinnerMin - 30, end: dinnerMin + 60 }
        }
      }
      
      // 雨天补充室内景点
      const paceCountMap: Record<string, number> = { relaxed: 4, moderate: 6, intense: 8 }
      const perDay = paceCountMap[formData.pace] || 6
      const isRainDay = weather && weather.forecast.some(
        (f: any) => f.date === date && isBadWeatherDay(f)
      )
      let finalRawPois = rawPois
      if (isRainDay && finalRawPois.length < perDay && allPois) {
        const indoorPois = allPois.filter(p =>
          (p.category === 'museum' || p.category === 'shopping' ||
           p.tags.some(t => t.includes('室内') || t.includes('博物馆') || t.includes('商场')))
          && !finalRawPois.some(r => r.id === p.id)
        )
        const scored = scorePois(indoorPois, formData.interests)
        const needed = perDay - finalRawPois.length
        finalRawPois = [...finalRawPois, ...scored.slice(0, needed).map(c => c.poi)]
        finalRawPois = routeOptimize(timeAwareSort(finalRawPois), null)
      }

      const hotelPoi = formData.needDropLuggage && i === 0 ? rawPois[0] : rawPois[rawPois.length - 1]
      const cityInfo2 = getCityByName(formData.destinationCity)
      const fallbackLat = cityInfo2?.lat || 39.9
      const fallbackLng = cityInfo2?.lng || 116.4
      const hlat = hotelPoi?.lat && hotelPoi.lat !== 0 ? hotelPoi.lat : fallbackLat
      const hlng = hotelPoi?.lng && hotelPoi.lng !== 0 ? hotelPoi.lng : fallbackLng
      const hdist = hotelPoi?.district || ''
      const hotel = makeHotel(formData.destinationCity, hdist, hlat, hlng, formData.accommodationType ?? 'hotel', i)

      const startPoi = i === 0 ? hotel : null

      const result = await aiRouteOptimize(
        finalRawPois, startPoi,
        {
          dayStartTime: startTime,
          maxEndTime: endTime || 22 * 60,
          lunchWindow: mealWindows.lunch,
          dinnerWindow: mealWindows.dinner,
          pace: formData.pace,
        },
        date,
      )

      return {
        i, date,
        orderedPois: result.orderedPois,
        reasoning: result.reasoning,
        aiWarnings: result.warnings,
        startPoi,
        startTime,
        endTime,
        hotel,
        finalRawPois,
      }
    })
  )

  for (const r of aiResults) {
    const i = r.i
    const { activities, warnings: dayWarnings } = planDayActivities(r.orderedPois, r.startPoi, r.startTime, r.date, formData.destinationCity, r.endTime, formData.pace)
    if (dayWarnings.length > 0) allWarnings.push(...dayWarnings)

    const dayTotalCost = activities.reduce((sum, a) => sum + a.cost, 0) + (r.hotel.price || 0)
    const dayTotalDuration = activities.reduce((sum, a) => sum + (a.poi.duration || 0), 0)

    const meals: MealBreak[] = activities
      .filter(a => a.isMealBreak && a.mealBreak)
      .map(a => a.mealBreak!)

    days.push({
      day: i + 1, date: r.date, theme: themes[i] || '自由探索',
      activities, hotel: r.hotel,
      totalCost: dayTotalCost, totalDuration: dayTotalDuration,
      meals,
      reasoning: r.reasoning,
      aiWarnings: r.aiWarnings,
    })
  }

  return { days, warnings: allWarnings }
}

function buildBudget(formData: TravelFormData, days: DayPlan[]): BudgetBreakdown {
  const peopleCount = formData.peopleCount ?? 1
  const totalBudget = formData.budget ?? 2000
  const accommodationBudget = days.reduce((s, d) => s + (d.hotel?.price || 0), 0)
  const ticketsBudget = days.reduce((s, d) =>
    s + d.activities.filter(a => !a.isMealBreak).reduce((sum, act) => sum + act.poi.price, 0), 0)

  // 基于实际行程中的交通数据计算，若无数据则按预算的 15% 估算
  const actualTransitCost = days.reduce((s, d) =>
    s + d.activities.reduce((sum, a) => sum + (a.transitFromPrev?.price || 0), 0), 0)
  const transportBudget = actualTransitCost > 0
    ? Math.round(actualTransitCost * peopleCount)
    : Math.round(totalBudget * 0.15)

  const foodBudget = days.reduce((s, d) =>
    s + d.activities.filter(a => a.isMealBreak).reduce((sum, act) => sum + act.cost, 0), 0)
    + Math.round(days.length * peopleCount * 30)
  const shoppingBudget = Math.max(0, totalBudget - accommodationBudget - ticketsBudget - transportBudget - foodBudget)

  return {
    transport: transportBudget, accommodation: accommodationBudget,
    food: foodBudget, tickets: ticketsBudget, shopping: shoppingBudget,
    total: accommodationBudget + foodBudget + ticketsBudget + shoppingBudget + transportBudget,
  }
}

// ─── 主入口 ─────────────────────────────────────────────

export async function generateItinerary(
  formData: TravelFormData,
  selectedPoiIds?: string[],
  customPois?: POI[],
  dayAssignments?: string[][],
  dayTimeConstraintsArg?: { startTime?: string; endTime?: string; lunchTime?: string; dinnerTime?: string }[],
): Promise<Itinerary> {
  const dayCount = getDayCount(formData.startDate, formData.endDate)
  let allPois = getPoisByCity(formData.destinationCity)

  const amapPois = await searchPopularPois(formData.destinationCity, formData.interests || [])
  const amapMapped: POI[] = amapPois.map(p => ({
    id: p.id, name: p.name,
    category: p.category as POI['category'],
    rating: p.rating, price: p.price, duration: p.duration,
    address: p.address, lat: p.lat, lng: p.lng,
    openTime: p.openTime, closeDay: '', tags: p.tags,
    description: p.description || `${formData.destinationCity}热门景点`,
    city: formData.destinationCity, district: p.district,
  }))
  allPois = [...allPois, ...amapMapped]
  if (customPois && customPois.length > 0) allPois = [...allPois, ...customPois]

  const paceCountMap = { relaxed: 4, moderate: 6, intense: 8 }
  const perDay = paceCountMap[formData.pace]

  let candidates: POI[]
  if (selectedPoiIds && selectedPoiIds.length > 0) {
    candidates = allPois.filter(p => selectedPoiIds.includes(p.id))
    if (candidates.length === 0) {
      const scored = scorePois(allPois, formData.interests)
      candidates = scored.slice(0, Math.max(12, perDay * dayCount)).map(c => c.poi)
    } else {
      const scored = scorePois(candidates, formData.interests)
      candidates = scored.map(c => c.poi)
    }
  } else {
    const scored = scorePois(allPois, formData.interests)
    candidates = scored.slice(0, Math.max(12, perDay * dayCount)).map(c => c.poi)
  }

  // 强制包含所有自定义景点：自定义景点应始终出现在规划中，不受评分和截断影响
  if (customPois && customPois.length > 0) {
    const customIds = new Set(customPois.map(p => p.id))
    const customInCandidates = candidates.filter(c => customIds.has(c.id))
    const missingCustom = customPois.filter(p => !candidates.some(c => c.id === p.id))
    // 将自定义景点排在前面，确保 distributePois 优先分配
    candidates = [...customInCandidates, ...candidates.filter(c => !customIds.has(c.id)), ...missingCustom]
  }

  // 有 dayAssignments（重新规划）时：先确保 candidates 包含所有 dayAssignments 中引用的 POI
  // （用户可能从全量候选池中新增了不在 selectedPoiIds 里的景点）
  if (dayAssignments && dayAssignments.length > 0) {
    const allAssignedIds = new Set(dayAssignments.flat())
    const missingIds = [...allAssignedIds].filter(id => !candidates.some(c => c.id === id))
    if (missingIds.length > 0) {
      const extraPois = allPois.filter(p => missingIds.includes(p.id))
      candidates = [...candidates, ...extraPois]
    }
  }

  // 有 dayAssignments（重新规划）时：严格按照用户的按天分配顺序构建，不重新打分排序
  const dayPoisGroups: POI[][] = dayAssignments && dayAssignments.length > 0
    ? dayAssignments.map(ids => {
        const poiMap = new Map(candidates.map(c => [c.id, c]))
        return ids.map(id => poiMap.get(id)!).filter(Boolean)
      })
    : distributePois(candidates, perDay, dayCount)

  // 重新规划时：保留用户手动分配的景点，不自动填充其他天
  // 仅当用户在某天新增了景点后才触发重规划，其他天应保持不变
  const arrivalTimeMin = parseTime(formData.arrivalTime || '09:00')
  const departureTimeMin = parseTime(formData.departureTime || '17:00')
  const weather = await fetchWeatherForecast(formData.destinationCity)
  const { days, warnings: buildWarnings } = await buildDayPlans(formData, dayPoisGroups, dayCount, arrivalTimeMin, departureTimeMin, !dayAssignments?.length, allPois, weather || undefined, dayTimeConstraintsArg)

  if (days.length === 0) {
    throw new Error(`暂无「${formData.destinationCity}」的景点数据，请换一个目的地`)
  }

  const budget = buildBudget(formData, days)

  const hotelRecs: import('./types').HotelRecommendation[] = days.map((d, i) => ({
    name: d.hotel?.name || `${formData.destinationCity}附近住宿`,
    lat: d.hotel?.lat || 0, lng: d.hotel?.lng || 0,
    price: d.hotel?.price || 0,
    stars: Math.round((d.hotel?.rating || 3) - 2),
    address: d.hotel?.address || '',
    tags: [formData.accommodationType === 'hotel' ? '酒店' : formData.accommodationType === 'bnb' ? '民宿' : '青旅', '推荐'],
    nearby: `靠近第${d.day}天${formData.needDropLuggage ? '首站' : '末站'}景点`,
    distance: 0,
  }))

  // ── 天气与 Plan B ──
  if (weather) {
    days.forEach(d => {
      const wd = weather.forecast.find(f => f.date === d.date)
      if (wd) d.weather = wd
    })
  }

  let planB: Itinerary | undefined
  const hasBadWeather = days.some(d => d.weather && isBadWeatherDay(d.weather))
  if (hasBadWeather) {
    const indoorPois = allPois.filter(p =>
      p.category === 'museum' || p.category === 'shopping' ||
      p.tags.some(t => t.includes('室内') || t.includes('博物馆') || t.includes('商场'))
    )
    if (indoorPois.length >= 3) {
      const scoredB = scorePois(indoorPois, formData.interests)
      const planBPoisGroups = distributePois(scoredB.map(c => c.poi), perDay, dayCount)
      const { days: planBDays } = await buildDayPlans(formData, planBPoisGroups, dayCount, arrivalTimeMin, departureTimeMin, false, allPois, undefined)
      const planBBudget = buildBudget(formData, planBDays)
      planB = {
        id: `${Date.now()}-planb`, formData, overview: '', days: planBDays, budget: planBBudget,
        hotelRecommendations: hotelRecs, createdAt: new Date().toISOString(),
      }
    }
  }

  // ── 超载检测 ──
  let warnings: ItineraryWarning[] | undefined
  const selectedCount = selectedPoiIds?.length || 0
  const usedCount = days.reduce((sum, d) => sum + d.activities.filter(a => !a.isMealBreak).length, 0)
  const skippedCount = selectedCount - usedCount
  if (buildWarnings.length > 0) {
    warnings = [...buildWarnings]
  }
  if (selectedCount > 0 && skippedCount > selectedCount * 0.4) {
    if (!warnings) warnings = []
    warnings.push({
      type: 'overload',
      message: `您选择了 ${selectedCount} 个景点，但行程规划预计只能容纳约 ${usedCount} 个。建议减少到 ${Math.round(dayCount * perDay * 0.7)} 个以内，避免走马观花。若要增加请到编辑行程处增加景点。`,
      skippedCount,
      suggestedMax: Math.round(dayCount * perDay * 0.7),
    })
  }

  // ── 总览生成 ──
  const overviewLines: string[] = []
  overviewLines.push(`**${formData.destinationCity} · ${dayCount}天${dayCount - 1}夜行程**`)
  overviewLines.push(`日期：${formData.startDate} → ${formData.endDate}`)
  if (weather) {
    overviewLines.push(`天气：${weather.forecast.map((f, i) => `D${i + 1} ${f.weatherDesc} ${f.tempMin}~${f.tempMax}℃`).join(' | ')}`)
  }
  overviewLines.push('')
  for (const d of days) {
    const poiList = d.activities
      .filter(a => !a.isMealBreak)
      .map(a => `${a.poi.name}${a.reminder ? ` (${a.reminder})` : ''}`)
      .join(' → ')
    overviewLines.push(`**Day ${d.day}** — ${d.theme}`)
    overviewLines.push(`  ${poiList}`)
    overviewLines.push(`  💰 约 ¥${d.totalCost} | 🕐 ${d.totalDuration.toFixed(1)}h`)
  }
  overviewLines.push('')
  overviewLines.push(`🏨 酒店：${formData.accommodationType === 'hotel' ? '酒店' : formData.accommodationType === 'bnb' ? '民宿' : '青旅'} | 💵 总预算：¥${budget.total}`)
  const overview = overviewLines.join('\n')

  return {
    id: Date.now().toString(),
    formData, overview, days, budget,
    hotelRecommendations: hotelRecs,
    createdAt: new Date().toISOString(),
    planB,
    weather: weather || undefined,
    warnings,
  }
}