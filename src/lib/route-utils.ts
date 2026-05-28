import { POI } from './types'
import { haversineDistKm } from './distance'

// ─── 日期/时间工具 ──────────────────────────────────────

export function dayOfWeek(dateStr: string): string {
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return days[new Date(dateStr).getDay()]
}

// ─── 营业时间解析 ───────────────────────────────────────

export interface TimeRange { open: number; close: number; lastEntry?: number }

export function parseOpenTime(openTime: string, dateStr?: string): TimeRange | null {
  if (!openTime || typeof openTime !== 'string' || openTime === '全天' || openTime === '24h' || openTime === '24小时') {
    return { open: 0, close: 24 * 60 }
  }

  if (dateStr) {
    const dow = dayOfWeek(dateStr)
    const closeDayPatterns: Record<string, RegExp> = {
      '周一': /周一闭馆/,
      '周二': /周二闭馆/,
      '周三': /周三闭馆/,
      '周四': /周四闭馆/,
      '周五': /周五闭馆/,
      '周六': /周六闭馆/,
      '周日': /周日闭馆/,
    }
    if (closeDayPatterns[dow]?.test(openTime)) {
      return null
    }
  }

  let lastEntry: number | undefined
  const lastEntryMatch = openTime.match(/最后入场\s*(\d{1,2}):(\d{2})/)
  if (lastEntryMatch) {
    lastEntry = parseInt(lastEntryMatch[1]) * 60 + parseInt(lastEntryMatch[2])
  }

  const m = openTime.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/)
  if (!m) return { open: 8 * 60, close: 18 * 60, lastEntry }
  const open = parseInt(m[1]) * 60 + parseInt(m[2])
  let close = parseInt(m[3]) * 60 + parseInt(m[4])
  if (close <= open) close += 24 * 60
  return { open, close, lastEntry }
}

// ─── TSP 路线优化 ───────────────────────────────────────

export function routeOptimize(pois: POI[], startFrom: POI | null): POI[] {
  if (pois.length <= 2) return pois

  const n = pois.length

  const dist = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) =>
      haversineDistKm(pois[i].lat, pois[i].lng, pois[j].lat, pois[j].lng)
    )
  )

  const hasStart = startFrom !== null
  const totalN = hasStart ? n + 1 : n

  const edist = Array.from({ length: totalN }, (_, i) =>
    Array.from({ length: totalN }, (_, j) => {
      if (i === j) return 0
      if (i === 0 && hasStart) {
        return haversineDistKm(startFrom!.lat, startFrom!.lng, pois[j - 1].lat, pois[j - 1].lng)
      }
      if (hasStart && j === 0) {
        return haversineDistKm(pois[i - 1].lat, pois[i - 1].lng, startFrom!.lat, startFrom!.lng)
      }
      const ii = hasStart ? i - 1 : i
      const jj = hasStart ? j - 1 : j
      return dist[ii][jj]
    })
  )

  const maxExact = 12
  if (totalN <= maxExact) {
    const fullMask = (1 << totalN) - 1
    const dp: number[][] = Array.from({ length: 1 << totalN }, () =>
      Array(totalN).fill(Infinity)
    )

    const startIdx = 0
    dp[1 << startIdx][startIdx] = 0

    for (let mask = 1; mask < (1 << totalN); mask++) {
      for (let last = 0; last < totalN; last++) {
        if (!(mask & (1 << last))) continue
        if (dp[mask][last] === Infinity) continue
        for (let next = 0; next < totalN; next++) {
          if (mask & (1 << next)) continue
          const newMask = mask | (1 << next)
          const newDist = dp[mask][last] + edist[last][next]
          if (newDist < dp[newMask][next]) {
            dp[newMask][next] = newDist
          }
        }
      }
    }

    let bestEnd = startIdx
    let bestDist = Infinity
    for (let last = 0; last < totalN; last++) {
      const d = dp[fullMask][last] + edist[last][startIdx]
      if (d < bestDist) { bestDist = d; bestEnd = last }
    }

    const order: number[] = []
    let mask = fullMask
    let last = bestEnd
    while (mask !== 0) {
      order.unshift(last)
      let found = false
      for (let prev = 0; prev < totalN; prev++) {
        if (prev === last || !(mask & (1 << prev))) continue
        const prevMask = mask ^ (1 << last)
        if (dp[prevMask][prev] < Infinity &&
          Math.abs(dp[prevMask][prev] + edist[prev][last] - dp[mask][last]) < 0.01) {
          mask = prevMask
          last = prev
          found = true
          break
        }
      }
      if (!found) break
    }

    if (hasStart) {
      return order.filter(idx => idx !== 0).map(idx => pois[idx - 1])
    }
    return order.map(idx => pois[idx])
  }

  const greedy = greedyNearest(pois, startFrom)
  return twoOptImprove(greedy, dist)
}

function greedyNearest(pois: POI[], startFrom: POI | null): POI[] {
  const unvisited = [...pois]
  const ordered: POI[] = []
  let current = startFrom
  while (unvisited.length > 0) {
    let nearestIdx = 0
    let minDist = Infinity
    for (let i = 0; i < unvisited.length; i++) {
      const d = current
        ? haversineDistKm(current.lat, current.lng, unvisited[i].lat, unvisited[i].lng)
        : 0
      if (d < minDist) { minDist = d; nearestIdx = i }
    }
    const next = unvisited.splice(nearestIdx, 1)[0]
    ordered.push(next)
    current = next
  }
  return ordered
}

function twoOptImprove(pois: POI[], dist: number[][]): POI[] {
  const n = pois.length
  if (n <= 3) return pois

  const route = pois.map((_, i) => i)
  let improved = true
  let iterations = 0
  const maxIter = n * n

  while (improved && iterations < maxIter) {
    improved = false
    iterations++
    for (let i = 0; i < n - 2; i++) {
      for (let j = i + 2; j < n; j++) {
        const a = route[i]
        const b = route[i + 1]
        const c = route[j]
        const d = route[(j + 1) % n]
        const oldDist = dist[a][b] + dist[c][d]
        const newDist = dist[a][c] + dist[b][d]
        if (newDist < oldDist - 0.001) {
          let left = i + 1
          let right = j
          while (left < right) {
            [route[left], route[right]] = [route[right], route[left]]
            left++
            right--
          }
          improved = true
        }
      }
    }
  }

  return route.map(i => pois[i])
}

// ─── 时段感知排序 ───────────────────────────────────────

export function timeAwareSort(pois: POI[]): POI[] {
  const morning: POI[] = []
  const daytime: POI[] = []
  const afternoon: POI[] = []
  const evening: POI[] = []
  const flexible: POI[] = []

  for (const poi of pois) {
    const tr = parseOpenTime(poi.openTime)
    if (!tr || (tr.open <= 6 * 60 && tr.close >= 22 * 60)) {
      flexible.push(poi)
    } else if (tr.open >= 17 * 60) {
      evening.push(poi)
    } else if (tr.close <= 12 * 60) {
      morning.push(poi)
    } else if (tr.open >= 12 * 60 && tr.open < 17 * 60) {
      afternoon.push(poi)
    } else {
      daytime.push(poi)
    }
  }
  return [...morning, ...daytime, ...flexible, ...afternoon, ...evening]
}