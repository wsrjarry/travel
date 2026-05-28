import { NextRequest, NextResponse } from 'next/server'
import { searchNearbyHotels } from '@/lib/amap-api'
import { getCityByName } from '@/data/china-regions'
import { haversineDistKm } from '@/lib/distance'

export async function GET(req: NextRequest) {
  try {
    const city = req.nextUrl.searchParams.get('city') || ''
    const lat = parseFloat(req.nextUrl.searchParams.get('lat') || '0')
    const lng = parseFloat(req.nextUrl.searchParams.get('lng') || '0')

    if (!city) return NextResponse.json({ success: false, error: '缺少城市' }, { status: 400 })

    const cityInfo = getCityByName(city)
    const clat = lat || cityInfo?.lat || 39.9
    const clng = lng || cityInfo?.lng || 116.4

    const hotels = await searchNearbyHotels(clat, clng, city)

    return NextResponse.json({
      success: true,
      hotels: hotels.map(h => ({
        ...h,
        nearby: `靠近 ${city} 热门区域`,
        distance: Math.round(haversineDistKm(clat, clng, h.lat, h.lng) * 100) / 100,
      })),
      count: hotels.length,
    })
  } catch (err) {
    console.error('Hotel search error:', err)
    return NextResponse.json({ success: false, error: '酒店搜索失败' }, { status: 500 })
  }
}


