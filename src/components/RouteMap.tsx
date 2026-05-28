'use client'

import { useEffect, useRef, useState } from 'react'
import type L from 'leaflet'

interface RouteMapPoint {
  lat: number
  lng: number
  name: string
  order: number
  type?: 'hotel' | 'poi'
  rating?: number
  category?: string
  duration?: string
  address?: string
  tags?: string[]
  description?: string
  dayIndex?: number
  activityIndex?: number
}

interface Props {
  points: RouteMapPoint[]
  height?: number
  multiDay?: { label: string; points: RouteMapPoint[]; color: string }[]
  activeDay?: number
  onMarkerClick?: (point: RouteMapPoint) => void
}

const DAY_COLORS = ['#87CEEB', '#FFD700', '#FFB6C1', '#A8D8EA', '#DAA520', '#FF9AAE', '#5BA4D4', '#7EC8E3']

export default function RouteMap({ points, height = 380, multiDay, activeDay, onMarkerClick }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const LRef = useRef<typeof import('leaflet') | null>(null)
  const markerGroup = useRef<L.LayerGroup | null>(null)
  const lineGroup = useRef<L.LayerGroup | null>(null)
  const [ready, setReady] = useState(false)
  const [showAllDays, setShowAllDays] = useState(false)
  const [selectedMarkerIndex, setSelectedMarkerIndex] = useState<number | null>(null)
  const [selectedPoint, setSelectedPoint] = useState<RouteMapPoint | null>(null)

  useEffect(() => {
    if (mapInstance.current) return
    let cancelled = false

    const init = async () => {
      await import('leaflet/dist/leaflet.css')
      const L = (await import('leaflet')).default
      if (cancelled || !mapRef.current) return

      LRef.current = L

      delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })

      const map = L.map(mapRef.current, {
        zoomControl: true,
        attributionControl: false,
      }).setView([35, 110], 5)

      L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
        subdomains: ['1', '2', '3', '4'],
        maxZoom: 19,
        attribution: '&copy; 高德地图',
      }).addTo(map)

      markerGroup.current = L.layerGroup().addTo(map)
      lineGroup.current = L.layerGroup().addTo(map)
      mapInstance.current = map

      map.on('click', () => {
        setSelectedMarkerIndex(null)
        setSelectedPoint(null)
      })

      setTimeout(() => map.invalidateSize(), 100)
      renderLayers()
      setReady(true)
    }

    init()

    return () => {
      cancelled = true
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current || !mapInstance.current) return
    const ro = new ResizeObserver(() => mapInstance.current?.invalidateSize())
    ro.observe(mapRef.current)
    return () => ro.disconnect()
  }, [ready])

  useEffect(() => {
    if (mapInstance.current && LRef.current) renderLayers()
  }, [points, multiDay, activeDay, showAllDays])

  function renderLayers() {
    const L = LRef.current
    const map = mapInstance.current
    if (!L || !map) return
    markerGroup.current?.clearLayers()
    lineGroup.current?.clearLayers()

    const allLatLngs: L.LatLng[] = []

    if (multiDay && showAllDays) {
      multiDay.forEach((day, di) => {
        const routePoints = renderRoute(day.points, DAY_COLORS[di % DAY_COLORS.length], L, di)
        allLatLngs.push(...routePoints)
      })
    } else if (multiDay && activeDay !== undefined && multiDay[activeDay]) {
      const day = multiDay[activeDay]
      const routePoints = renderRoute(day.points, DAY_COLORS[activeDay % DAY_COLORS.length], L, activeDay)
      allLatLngs.push(...routePoints)
    } else {
      const routePoints = renderRoute(points, '#87CEEB', L, 0)
      allLatLngs.push(...routePoints)
    }

    if (allLatLngs.length > 0) {
      const bounds = L.latLngBounds(allLatLngs)
      setTimeout(() => map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 }), 150)
    }
  }

  function renderRoute(routePts: RouteMapPoint[], color: string, L: typeof import('leaflet'), _dayIdx: number): L.LatLng[] {
    if (routePts.length === 0) return []
    const map = mapInstance.current
    const latlngs: L.LatLng[] = []

    routePts.forEach((pt, i) => {
      const ll = L.latLng(pt.lat, pt.lng)
      latlngs.push(ll)

      const isHotel = pt.type === 'hotel' || pt.name.startsWith('🏨')
      const bg = isHotel ? '#FFD700' : color
      const size = isHotel ? 34 : 30
      const label = isHotel ? 'S' : String(pt.order)

      const icon = L.divIcon({
        className: '',
        html: `<div style="background:${bg};color:white;width:${size}px;height:${size}px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${isHotel ? 16 : 14}px;font-weight:bold;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)">${label}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      })
      const marker = L.marker([pt.lat, pt.lng], { icon })
      marker.bindTooltip(`<b>${label}. ${pt.name}</b>`, { permanent: false, direction: 'top', offset: [0, -18] })

      marker.on('click', (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e)
        setSelectedMarkerIndex(i)
        setSelectedPoint(pt)
        onMarkerClick?.(pt)
      })

      markerGroup.current?.addLayer(marker)
    })

    if (routePts.length > 1) {
      L.polyline(latlngs, {
        color,
        weight: 4,
        opacity: 0.8,
        dashArray: undefined,
      }).addTo(lineGroup.current!)

      for (let i = 0; i < routePts.length - 1; i++) {
        const from = latlngs[i], to = latlngs[i + 1]
        const midLat = (from.lat + to.lat) / 2
        const midLng = (from.lng + to.lng) / 2
        const angle = Math.atan2(to.lat - from.lat, to.lng - from.lng) * 180 / Math.PI

        const arrowIcon = L.divIcon({
          className: '',
          html: `<svg width="22" height="22" viewBox="0 0 22 22" style="transform:rotate(${angle}deg);filter:drop-shadow(0 1px 2px rgba(0,0,0,0.4))"><polygon points="2,0 22,11 2,22 6,11" fill="${color}" opacity="0.9"/></svg>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        })
        L.marker([midLat, midLng], { icon: arrowIcon }).addTo(lineGroup.current!)
      }
    } else if (map) {
      map.setView([routePts[0].lat, routePts[0].lng], 14)
    }

    return latlngs
  }

  const hasMulti = multiDay && multiDay.length > 1

  return (
    <div style={{ position: 'relative' }}>
      {hasMulti && (
        <div style={{
          position: 'absolute', top: 12, right: 12, zIndex: 1000,
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <button
            onClick={() => setShowAllDays(v => !v)}
            style={{
              padding: '6px 14px', fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb',
              cursor: 'pointer', fontWeight: 600, letterSpacing: '0.01em',
              background: showAllDays ? '#87CEEB' : 'rgba(255,255,255,0.92)',
              color: showAllDays ? '#fff' : '#374151',
              boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.2s',
            }}
          >
            {showAllDays ? '单日视图' : '全览'}
          </button>
        </div>
      )}

      {selectedPoint && (
        <div style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          background: 'white',
          borderRadius: 12,
          padding: '16px 20px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          minWidth: 260,
          maxWidth: '90%',
          fontSize: 14,
          lineHeight: 1.5,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{selectedPoint.name}</div>
            <button
              onClick={() => { setSelectedMarkerIndex(null); setSelectedPoint(null) }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 18, color: '#9ca3af', padding: 0, lineHeight: 1,
              }}
              aria-label="关闭"
            >
              ×
            </button>
          </div>

          {selectedPoint.rating !== undefined && (
            <div style={{ color: '#DAA520', marginBottom: 4, fontWeight: 600 }}>
              {'★'.repeat(Math.round(selectedPoint.rating))} {selectedPoint.rating}
            </div>
          )}

          {selectedPoint.category && (
            <span style={{
              display: 'inline-block',
              background: '#E8F4FD',
              color: '#87CEEB',
              padding: '2px 10px',
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 500,
              marginBottom: 6,
            }}>
              {selectedPoint.category}
            </span>
          )}

          {selectedPoint.duration && (
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
              建议时长: {selectedPoint.duration}
            </div>
          )}

          {selectedPoint.address && (
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
              {selectedPoint.address}
            </div>
          )}

          {selectedPoint.tags && selectedPoint.tags.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {selectedPoint.tags.map((tag, idx) => (
                <span key={idx} style={{
                  background: '#f3f4f6',
                  color: '#374151',
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontSize: 11,
                }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div ref={mapRef} style={{ height: `${height}px`, width: '100%', borderRadius: '16px', zIndex: 0, background: '#FFF5E6' }} />
    </div>
  )
}