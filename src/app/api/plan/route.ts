import { NextRequest, NextResponse } from 'next/server'
import { generateItinerary } from '@/lib/planner'
import { searchNearbyHotels } from '@/lib/amap-api'
import { getCityByName } from '@/data/china-regions'
import { haversineDistKm } from '@/lib/distance'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // 参数校验
    if (!body.destinationCity || !body.startDate || !body.endDate) {
      return NextResponse.json({ success: false, error: '缺少必填字段：目的地、开始日期、结束日期' }, { status: 400 })
    }

    // 城市非空
    if (typeof body.destinationCity !== 'string' || body.destinationCity.trim() === '') {
      return NextResponse.json({ success: false, error: '目的地城市不能为空' }, { status: 400 })
    }

    // 日期格式校验
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(body.startDate) || !dateRegex.test(body.endDate)) {
      return NextResponse.json({ success: false, error: '日期格式无效，请使用 YYYY-MM-DD 格式' }, { status: 400 })
    }

    const start = new Date(body.startDate)
    const end = new Date(body.endDate)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ success: false, error: '日期格式无效，请使用 YYYY-MM-DD 格式' }, { status: 400 })
    }
    if (end < start) {
      return NextResponse.json({ success: false, error: '结束日期不能早于开始日期' }, { status: 400 })
    }

    // 人数默认 1
    const peopleCount = body.peopleCount ?? 1

    // 预算默认 1000
    const budget = body.budget ?? 1000

    const arrivalTime = body.arrivalTime || '09:00'
    const departureTime = body.departureTime || '17:00'
    if (!/^\d{2}:\d{2}$/.test(arrivalTime) || !/^\d{2}:\d{2}$/.test(departureTime)) {
      return NextResponse.json({ success: false, error: '时间格式无效，请使用 HH:MM 格式' }, { status: 400 })
    }

    const validPaces = ['relaxed', 'moderate', 'intense']
    const pace = validPaces.includes(body.pace) ? body.pace : 'moderate'

    const formData = {
      destinationCity: body.destinationCity,
      destinationStation: body.destinationStation || body.destinationCity,
      startDate: body.startDate,
      endDate: body.endDate,
      arrivalTime,
      departureTime,
      budget: Math.max(100, budget),
      peopleCount: Math.max(1, peopleCount),
      pace,
      interests: body.interests || [],
      accommodationType: body.accommodationType || 'hotel',
      needDropLuggage: body.needDropLuggage === true,
    }

    const itinerary = await generateItinerary(formData, body.selectedPoiIds, body.customPois, body.dayAssignments, body.dayTimeConstraints)

    const firstDay = itinerary.days[0]
    const cityInfo = getCityByName(formData.destinationCity)

    let hotelRecommendations: any[] = []
    if (firstDay && firstDay.activities.length > 0) {
      const anchorPoi = formData.needDropLuggage
        ? firstDay.activities[0].poi
        : firstDay.activities[firstDay.activities.length - 1].poi

      const hotels = await searchNearbyHotels(anchorPoi.lat, anchorPoi.lng, formData.destinationCity)

      const deduped = hotels.filter((h, idx, self) =>
        idx === self.findIndex(s => s.name === h.name)
      )

      hotelRecommendations = deduped.map(h => ({
        ...h,
        nearby: `          距 ${anchorPoi.name} ${
          formData.needDropLuggage ? '（首站）' : '（末站）'
        }约 ${Math.round(haversineDistKm(anchorPoi.lat, anchorPoi.lng, h.lat, h.lng) * 100) / 100}km`,
        distance: Math.round(haversineDistKm(anchorPoi.lat, anchorPoi.lng, h.lat, h.lng) * 100) / 100,
      })).sort((a, b) => a.distance - b.distance)
    } else if (cityInfo) {
      const hotels = await searchNearbyHotels(cityInfo.lat, cityInfo.lng, formData.destinationCity)
      hotelRecommendations = hotels.map(h => ({
        ...h,
        nearby: `${formData.destinationCity}市中心`,
        distance: Math.round(haversineDistKm(cityInfo.lat, cityInfo.lng, h.lat, h.lng) * 100) / 100,
      }))
    }

    const finalHotelRecs = hotelRecommendations.length > 0 ? hotelRecommendations : itinerary.hotelRecommendations
    const weatherData = itinerary.weather || null
    return NextResponse.json({
      success: true,
      itinerary: { ...itinerary, hotelRecommendations: finalHotelRecs },
      weather: weatherData,
      weatherWarning: weatherData ? undefined : '天气数据暂不可用，行程建议未考虑天气因素',
      planB: itinerary.planB || null,
    })
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Plan generation error:', msg, err)
    return NextResponse.json({ success: false, error: `行程生成失败: ${msg}` }, { status: 500 })
  }
}


