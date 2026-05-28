import { NextRequest, NextResponse } from 'next/server'
import { getPoisByCity } from '@/data/mock-data'
import { getCityByName } from '@/data/china-regions'
import { searchPopularPois } from '@/lib/amap-api'

export async function POST(req: NextRequest) {
  try {
    const { destinationCity, interests } = await req.json()

    // 参数校验
    if (!destinationCity) {
      return NextResponse.json({ success: false, error: '缺少目的地' }, { status: 400 })
    }
    if (typeof destinationCity !== 'string' || destinationCity.trim() === '') {
      return NextResponse.json({ success: false, error: '目的地城市不能为空' }, { status: 400 })
    }

    const mockPois = getPoisByCity(destinationCity)

    const amapPois = await searchPopularPois(destinationCity, interests || [])
    const amapMapped = amapPois.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category as any,
      rating: p.rating,
      price: p.price,
      duration: p.duration,
      address: p.address,
      lat: p.lat,
      lng: p.lng,
      openTime: p.openTime,
      tags: p.tags,
      description: p.description || `${destinationCity}热门景点`,
      city: destinationCity,
      district: p.district,
    }))

    const hasApiKey = !!process.env.AMAP_API_KEY

    const combined = [...mockPois, ...amapMapped]
    if (combined.length === 0) {
      const reason = !hasApiKey
        ? '高德 API Key 未配置，请在 .env.local 中填入 AMAP_API_KEY 后重启服务'
        : `高德 API 未返回「${destinationCity}」的景点数据，请确认城市名称是否正确`
      return NextResponse.json({ success: false, error: reason, candidates: [], source: { mock: 0, amap: 0 } })
    }

    const scored = combined.map(p => {
      let score = p.rating * 10
      const matchedTags = p.tags.filter(t => (interests || []).some((i: string) => t.includes(i) || i.includes(t)))
      score += matchedTags.length * 15
      if (p.price === 0) score += 5
      return { poi: p, score, selected: true }
    }).sort((a, b) => b.score - a.score)

    return NextResponse.json({
      success: true,
      candidates: scored.slice(0, 15),
      source: { mock: mockPois.length, amap: amapMapped.length },
    })
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Candidates error:', msg, err)
    return NextResponse.json({ success: false, error: `获取候选景点失败: ${msg}` }, { status: 500 })
  }
}
