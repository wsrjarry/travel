'use client'

import { useEffect, useRef, useState } from 'react'
import type L from 'leaflet'
import type { CandidatePoi } from '@/lib/types'

interface Props {
  candidates: CandidatePoi[]
  selectedIds: string[]
  centerLatLng: { lat: number; lng: number }
  onToggle?: (id: string) => void
}

export default function PoiMapPreview({ candidates, selectedIds, centerLatLng, onToggle }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const LRef = useRef<typeof import('leaflet') | null>(null)
  const markerGroup = useRef<L.LayerGroup | null>(null)
  const [ready, setReady] = useState(false)

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
      }).setView(
        [centerLatLng.lat || 35, centerLatLng.lng || 110],
        centerLatLng.lat ? 13 : 5,
      )

      L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
        subdomains: ['1', '2', '3', '4'],
        maxZoom: 19,
        attribution: '&copy; 高德地图',
      }).addTo(map)

      markerGroup.current = L.layerGroup().addTo(map)
      mapInstance.current = map
      setTimeout(() => map.invalidateSize(), 100)
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
    if (mapInstance.current && LRef.current) renderMarkers()
  }, [candidates, selectedIds])

  function renderMarkers() {
    const L = LRef.current
    const map = mapInstance.current
    if (!L || !map || !markerGroup.current) return

    markerGroup.current.clearLayers()

    if (candidates.length === 0) return

    const latlngs: L.LatLng[] = []
    const selectedSet = new Set(selectedIds)

    candidates.forEach(cp => {
      const p = cp.poi
      const isSelected = selectedSet.has(p.id)
      const ll = L.latLng(p.lat, p.lng)
      latlngs.push(ll)

      const bg = isSelected ? '#87CEEB' : '#9ca3af'
      const size = 26

      const icon = L.divIcon({
        className: '',
        html: `<div style="
          background:${bg};
          width:${size}px;height:${size}px;
          border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          border:3px solid white;
          box-shadow:0 1px 6px rgba(0,0,0,0.3);
          transition:transform 0.15s;
        ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      })

      const marker = L.marker([p.lat, p.lng], { icon })
      marker.bindTooltip(`<b>${p.name}</b><br/>★ ${p.rating}`, {
        permanent: false,
        direction: 'top',
        offset: [0, -16],
      })

      marker.on('click', () => {
        onToggle?.(p.id)
      })

      markerGroup.current!.addLayer(marker)
    })

    if (latlngs.length > 0) {
      const bounds = L.latLngBounds(latlngs)
      setTimeout(() => map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 }), 100)
    }
  }

  return (
    <div
      ref={mapRef}
      style={{
        height: '280px',
        width: '100%',
        borderRadius: '16px',
        zIndex: 0,
        background: '#FFF5E6',
      }}
    />
  )
}