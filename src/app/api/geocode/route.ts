import { NextRequest, NextResponse } from 'next/server'

const AMAP_API_KEY = process.env.AMAP_API_KEY || ''

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  const useAmap = req.nextUrl.searchParams.get('useAmap') === 'true'

  if (!q) {
    return NextResponse.json({ success: false, error: '缺少 q 参数' }, { status: 400 })
  }

  // 优先使用高德地理编码 API（地址 → 坐标，比 POI 搜索覆盖更广）
  if (useAmap && AMAP_API_KEY) {
    try {
      // 先尝试地理编码（geocode/geo）：适用于任意中文地址
      const geoUrl = `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(q)}&key=${AMAP_API_KEY}&output=JSON`
      const geoRes = await fetch(geoUrl, { signal: AbortSignal.timeout(8000) })
      if (geoRes.ok) {
        const geoData = await geoRes.json()
        if (geoData.status === '1' && geoData.geocodes && geoData.geocodes.length > 0) {
          const results = geoData.geocodes.map((r: any) => {
            const loc = r.location?.split(',') || ['0', '0']
            return {
              lat: parseFloat(loc[1] || '0'),
              lng: parseFloat(loc[0] || '0'),
              displayName: r.formatted_address || r.address || r.name || q,
            }
          })
          if (results.length > 0) {
            return NextResponse.json({ success: true, results })
          }
        }
      }

      // 地理编码无结果时，用 POI 搜索补充
      const poiUrl = `https://restapi.amap.com/v3/place/text?keywords=${encodeURIComponent(q)}&key=${AMAP_API_KEY}&output=JSON&offset=5`
      const poiRes = await fetch(poiUrl, { signal: AbortSignal.timeout(8000) })
      if (poiRes.ok) {
        const poiData = await poiRes.json()
        if (poiData.status === '1' && poiData.pois && poiData.pois.length > 0) {
          const results = poiData.pois.map((r: any) => ({
            lat: parseFloat(r.location?.split(',')[1] || '0'),
            lng: parseFloat(r.location?.split(',')[0] || '0'),
            displayName: r.name ? `${r.name} · ${r.address || ''}` : (r.address || r.display_name || ''),
          }))
          if (results.length > 0) {
            return NextResponse.json({ success: true, results })
          }
        }
      }
      // 高德无结果时降级到 Nominatim
    } catch (err: any) {
      console.warn('Amap geocode failed, falling back to Nominatim:', err?.message)
    }
  }

  // Nominatim 兜底
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&accept-language=zh`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'TravelPlannerAgent/1.0' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`Geocode failed: ${res.status}`)
    const data = await res.json()
    return NextResponse.json({ success: true, results: data.map((r: any) => ({
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      displayName: r.display_name,
    }))})
  } catch (err: any) {
    console.error('Geocode error:', err?.message)
    return NextResponse.json({ success: false, error: '地址解析失败' }, { status: 500 })
  }
}