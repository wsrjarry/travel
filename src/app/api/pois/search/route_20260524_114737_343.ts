import { NextRequest, NextResponse } from 'next/server'
import { searchPopularPois } from '@/lib/amap-api'
import { getPoisByCity } from '@/data/mock-data'
import { getCityByName } from '@/data/china-regions'

export async function GET(req: NextRequest) {
  try {
    const city = req.nextUrl.searchParams.get('city') || ''
    const interests = (req.nextUrl.searchParams.get('interests') || '').split(',').filter(Boolean)

    if (!city) return NextResponse.json({ success: false, error: '缺少城市' }, { status: 400 })

    const mockPois = getPoisByCity(city)

    const amapPois = await searchPopularPois(city, interests)
    const amapMapped = amapPois.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      rating: p.rating,
      price: p.price,
      duration: p.duration,
      address: p.address,
      lat: p.lat,
      lng: p.lng,
      openTime: p.openTime,
      tags: p.tags,
      description: p.description,
      city,
      district: p.district,
    }))

    return NextResponse.json({
      success: true,
      pois: [...mockPois, ...amapMapped],
      count: mockPois.length + amapMapped.length,
      source: { mock: mockPois.length, amap: amapMapped.length },
    })
  } catch (err) {
    console.error('POI search error:', err)
    return NextResponse.json({ success: false, error: '景点搜索失败' }, { status: 500 })
  }
}