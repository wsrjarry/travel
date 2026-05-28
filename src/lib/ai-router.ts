import { POI } from './types'
import { routeOptimize, timeAwareSort } from './route-utils'

export interface DayConstraints {
  dayStartTime: number
  maxEndTime: number
  lunchWindow: { start: number; end: number }
  dinnerWindow: { start: number; end: number }
  pace: 'relaxed' | 'moderate' | 'intense'
}

export interface AIOptimizeResult {
  orderedPois: POI[]
  reasoning: string
  warnings: string[]
}

export interface AIResponse {
  orderedIds: string[]
  reasoning: string
  warnings: string[]
}

// ─── 环境变量读取 ───────────────────────────────────────

const AI_API_BASE = process.env.AI_API_BASE || 'https://api.openai.com/v1'
const AI_API_KEY = process.env.AI_API_KEY
const AI_MODEL = process.env.AI_MODEL || 'gpt-4o-mini'

// ─── AI 路线规划核心函数 ─────────────────────────────────

// 简单缓存，避免重复调用
const routeCache = new Map<string, AIOptimizeResult>()

export async function aiRouteOptimize(
  pois: POI[],
  startFrom: POI | null,
  constraints: DayConstraints,
  dateStr: string
): Promise<AIOptimizeResult> {
  // 如果景点数量 <= 2，直接返回简单排序，无需调用 AI
  if (pois.length <= 2) {
    console.log('[aiRouteOptimize] 景点数量 <= 2，使用简单排序')
    const simpleOrdered = pois.length === 2 ? simpleTwoPoiSort(pois, startFrom) : [...pois]
    return {
      orderedPois: simpleOrdered,
      reasoning: '景点数量较少，使用简单距离排序',
      warnings: []
    }
  }

  // 如果未配置 API Key，优雅降级到纯算法
  if (!AI_API_KEY) {
    console.log('[aiRouteOptimize] AI_API_KEY not configured, falling back to algorithm')
    const groupPois = routeOptimize(pois, startFrom)
    const sortedPois = timeAwareSort(groupPois)
    return {
      orderedPois: sortedPois,
      reasoning: '未配置 AI API Key，使用纯距离 TSP 算法 + 时段感知排序',
      warnings: ['AI 路线规划未启用，请配置 AI_API_KEY 环境变量以启用智能规划']
    }
  }

  // 构建缓存键
  const cacheKey = JSON.stringify({
    poiIds: pois.map(p => p.id).sort(),
    startFromId: startFrom?.id,
    constraints,
    dateStr
  })
  
  // 检查缓存
  const cached = routeCache.get(cacheKey)
  if (cached) {
    console.log('[aiRouteOptimize] 使用缓存结果')
    return cached
  }

  // 构建距离矩阵
  const distanceMatrix = buildDistanceMatrix(pois, startFrom)

  // 构建 AI Prompt
  const systemPrompt = `你是一位专业的旅游路线规划专家，擅长综合考虑距离、开放时间、景点类型搭配、节奏控制和用餐安排。请根据提供的 POI 数据、起点位置、距离矩阵和日期约束，规划出一条最优的游览路线。

**核心原则**：
1. **距离优先但不唯一**：在合理距离内优化路线，但也要考虑开放时间、类型搭配和节奏
2. **开放时间约束**：确保景点在游览时间内开放，注意闭馆日
3. **类型搭配**：避免连续参观同类型景点，适当穿插不同体验
4. **节奏控制**：根据 pace 参数调整景点密度和休息时间
5. **用餐安排**：在午餐和晚餐窗口安排合适的用餐时间
6. **起点终点**：从起点出发，最后回到酒店或合理结束点

请返回 JSON 格式：{ "orderedIds": ["id1", "id2", ...], "reasoning": "你的推理说明", "warnings": ["警告1", "警告2"] }`

  const userPrompt = buildUserPrompt(pois, startFrom, distanceMatrix, constraints, dateStr)

  try {
    const response = await fetchWithTimeout(`${AI_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_API_KEY}`
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      })
    }, 8000) // 8秒超时（原15秒）

    if (!response.ok) {
      throw new Error(`AI API 请求失败: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content
    if (!content) {
      throw new Error('AI 返回内容为空')
    }

    const parsed: AIResponse = JSON.parse(content)
    
    // 验证返回的 ID
    if (!Array.isArray(parsed.orderedIds)) {
      throw new Error('AI 返回的 orderedIds 不是数组')
    }

    // 映射回 POI 对象
    const poiMap = new Map(pois.map(p => [p.id, p]))
    const orderedPois: POI[] = []
    const missingIds: string[] = []

    for (const id of parsed.orderedIds) {
      const poi = poiMap.get(id)
      if (poi) {
        orderedPois.push(poi)
      } else {
        missingIds.push(id)
      }
    }

    // 确保所有输入 POI 都在输出中（AI 可能遗漏某些 POI）
    const omittedPois = pois.filter(p => !orderedPois.some(op => op.id === p.id))
    if (omittedPois.length > 0) {
      const warnings = [...(parsed.warnings || []), `AI 遗漏了 ${omittedPois.length} 个POI: ${omittedPois.map(p => p.name).join(', ')}，已补入路线末尾`]
      const lastPoi = orderedPois[orderedPois.length - 1] || startFrom
      const fallbackOrdered = routeOptimize(omittedPois, lastPoi)
      orderedPois.push(...fallbackOrdered)
      
      const result = {
        orderedPois,
        reasoning: parsed.reasoning || '',
        warnings
      }
      routeCache.set(cacheKey, result)
      return result
    }

    // 如果 AI 返回的 ID 有缺失（找不到对应 POI），用算法补充
    if (missingIds.length > 0) {
      const warnings = [...(parsed.warnings || []), `AI 返回的 ID 有 ${missingIds.length} 个未找到: ${missingIds.join(', ')}`]
      const remainingPois = pois.filter(p => !orderedPois.includes(p))
      const fallbackOrdered = routeOptimize(remainingPois, orderedPois[orderedPois.length - 1] || startFrom)
      orderedPois.push(...fallbackOrdered)
      
      return {
        orderedPois,
        reasoning: parsed.reasoning || '',
        warnings
      }
    }

    const result = {
      orderedPois,
      reasoning: parsed.reasoning || '',
      warnings: parsed.warnings || []
    }
    
    // 缓存结果
    routeCache.set(cacheKey, result)
    return result

  } catch (error) {
    console.error('[aiRouteOptimize] AI 调用失败:', error)
    // 优雅降级到纯算法
    const groupPois = routeOptimize(pois, startFrom)
    const sortedPois = timeAwareSort(groupPois)
    const fallbackResult = {
      orderedPois: sortedPois,
      reasoning: `AI 调用失败: ${error instanceof Error ? error.message : String(error)}，已降级到纯算法`,
      warnings: ['AI 路线规划失败，已使用纯距离 TSP 算法作为备选']
    }
    
    // 缓存降级结果，避免重复失败
    routeCache.set(cacheKey, fallbackResult)
    return fallbackResult
  }
}

// ─── 辅助函数 ───────────────────────────────────────────

function simpleTwoPoiSort(pois: POI[], startFrom: POI | null): POI[] {
  if (pois.length !== 2) return [...pois]
  
  const [a, b] = pois
  if (!startFrom) return [a, b]
  
  // 计算从起点到两个景点的距离
  const distToA = haversineDist(startFrom, a)
  const distToB = haversineDist(startFrom, b)
  
  // 选择距离起点更近的景点作为第一个
  return distToA <= distToB ? [a, b] : [b, a]
}

function buildDistanceMatrix(pois: POI[], _startFrom: POI | null): number[][] {
  const n = pois.length
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0))
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue
      matrix[i][j] = haversineDist(pois[i], pois[j])
    }
  }

  return matrix
}

function haversineDist(a: POI, b: POI): number {
  const R = 6371
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const x = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)) * 10) / 10 // 保留一位小数
}

function buildUserPrompt(
  pois: POI[],
  startFrom: POI | null,
  distanceMatrix: number[][],
  constraints: DayConstraints,
  dateStr: string
): string {
  const dayOfWeek = getDayOfWeek(dateStr)
  const paceMap = { relaxed: '轻松', moderate: '适中', intense: '紧凑' }
  
  let prompt = `# 路线规划

## 约束
- 日期: ${dateStr} (${dayOfWeek})
- 开始: ${formatMinutes(constraints.dayStartTime)}  最晚结束: ${formatMinutes(constraints.maxEndTime)}
- 午餐: ${formatMinutes(constraints.lunchWindow.start)}-${formatMinutes(constraints.lunchWindow.end)}  晚餐: ${formatMinutes(constraints.dinnerWindow.start)}-${formatMinutes(constraints.dinnerWindow.end)}
- 节奏: ${paceMap[constraints.pace]}
- 起点: ${startFrom ? startFrom.name : '酒店'}

## POI (${pois.length}个)
`

  pois.forEach((poi, index) => {
    prompt += `${index + 1}. [${poi.id}] ${poi.name} | ${getCategoryChinese(poi.category)} | ⭐${poi.rating} | ${poi.duration}h | ${poi.openTime}${poi.closeDay ? ` | 闭馆:${poi.closeDay}` : ''} | ${poi.district}\n`
  })

  prompt += `
## 距离矩阵(km)
${formatDistanceMatrixCompact(pois, distanceMatrix)}

返回 JSON: { "orderedIds": ["id1","id2",...], "reasoning": "简短说明", "warnings": ["警告"] }
`

  return prompt
}

function formatDistanceMatrixCompact(pois: POI[], matrix: number[][]): string {
  const names = pois.map(p => p.name.substring(0, 6))
  const header = '    ' + names.map(n => n.padStart(6)).join('')
  const rows = pois.map((p, i) => {
    return names[i].padEnd(4) + matrix[i].map(d => d.toFixed(1).padStart(6)).join('')
  })
  return [header, ...rows].join('\n')
}

function getDayOfWeek(dateStr: string): string {
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return days[new Date(dateStr).getDay()]
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

function getCategoryChinese(category: string): string {
  const map: Record<string, string> = {
    scenic: '景点',
    museum: '博物馆',
    food: '美食',
    shopping: '购物',
    entertainment: '娱乐',
    hotel: '酒店',
    restaurant: '餐厅'
  }
  return map[category] || category
}

async function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}