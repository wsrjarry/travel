import { NextRequest, NextResponse } from 'next/server'
import { getTransitOptions } from '@/lib/map-api'
import { getPoisByCity } from '@/data/mock-data'
import { getCityByName } from '@/data/china-regions'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const fromId = searchParams.get('fromId')
    const toId = searchParams.get('toId')
    const city = searchParams.get('city')

    if (!fromId || !toId || !city) {
      return NextResponse.json(
        { success: false, error: '缺少必填参数：fromId, toId, city' },
        { status: 400 }
      )
    }

    const mockPois = getPoisByCity(city)
    let fromPoi = mockPois.find(p => p.id === fromId)
    let toPoi = mockPois.find(p => p.id === toId)

    if (!fromPoi || !toPoi) {
      const cityInfo = getCityByName(city)
      if (cityInfo) {
        fromPoi = fromPoi || { id: fromId, name: fromId, category: 'scenic', rating: 0, price: 0, duration: 0, address: '', lat: cityInfo.lat, lng: cityInfo.lng, openTime: '', closeDay: '', tags: [], description: '', city, district: '' }
        toPoi = toPoi || { id: toId, name: toId, category: 'scenic', rating: 0, price: 0, duration: 0, address: '', lat: cityInfo.lat, lng: cityInfo.lng, openTime: '', closeDay: '', tags: [], description: '', city, district: '' }
      }
    }

    if (!fromPoi || !toPoi) {
      return NextResponse.json(
        { success: false, error: '未找到指定景点' },
        { status: 404 }
      )
    }

    const options = await getTransitOptions(fromPoi, toPoi, city)
    return NextResponse.json({ success: true, options })
  } catch (err) {
    console.error('Transit search error:', err)
    return NextResponse.json(
      { success: false, error: '交通查询失败，请稍后重试' },
      { status: 500 }
    )
  }
}
