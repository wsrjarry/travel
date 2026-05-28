import { TransitOption, POI } from './types'
import { haversineDistKm } from './distance'

const ROAD_FACTOR = 1.4

const SPEEDS = {
  walking: 5,
  taxi: 28,
  transit: 20,
  driving: 30,
}

export async function getTransitOptions(
  from: POI,
  to: POI,
  _city: string,
  strategy: 'fast' | 'cheap' | 'balanced' = 'balanced'
): Promise<TransitOption[]> {
  const straightKm = haversineDistKm(from.lat, from.lng, to.lat, to.lng)
  const roadKm = straightKm * ROAD_FACTOR
  const options: TransitOption[] = []

  if (roadKm <= 3) {
    const min = Math.ceil(roadKm / SPEEDS.walking * 60)
    options.push({
      mode: 'walking',
      duration: Math.max(1, min),
      durationText: `${Math.max(1, min)}分钟`,
      distance: Math.round(roadKm * 1000),
      distanceText: `${roadKm.toFixed(1)}公里`,
      price: 0,
      description: `步行约${Math.max(1, min)}分钟（${roadKm.toFixed(1)}公里）`,
    })
  }

  {
    const min = Math.ceil(roadKm / SPEEDS.taxi * 60)
    const price = Math.round(roadKm * 2.5 + 10)
    options.push({
      mode: 'taxi',
      duration: Math.max(1, min),
      durationText: `${Math.max(1, min)}分钟`,
      distance: Math.round(roadKm * 1000),
      distanceText: `${roadKm.toFixed(1)}公里`,
      price,
      description: `打车约${Math.max(1, min)}分钟，预估¥${price}`,
    })
  }

  if (roadKm > 1) {
    const min = Math.ceil(roadKm / SPEEDS.transit * 60)
    const price = Math.round(2 + roadKm * 0.5)
    options.push({
      mode: 'transit',
      duration: Math.max(1, min),
      durationText: `${Math.max(1, min)}分钟`,
      distance: Math.round(roadKm * 1000),
      distanceText: `${roadKm.toFixed(1)}公里`,
      price,
      description: `公交/地铁约${Math.max(1, min)}分钟，约¥${price}`,
    })
  }

  if (roadKm > 2) {
    const min = Math.ceil(roadKm / SPEEDS.driving * 60)
    const fuel = Math.round(roadKm * 1.2)
    options.push({
      mode: 'driving',
      duration: Math.max(1, min),
      durationText: `${Math.max(1, min)}分钟`,
      distance: Math.round(roadKm * 1000),
      distanceText: `${roadKm.toFixed(1)}公里`,
      price: fuel,
      description: `自驾约${Math.max(1, min)}分钟，油费约¥${fuel}`,
    })
  }

  options.sort((a, b) => {
    if (strategy === 'fast') return a.duration - b.duration
    if (strategy === 'cheap') return a.price - b.price
    return a.duration * 0.6 + a.price * 0.4 - (b.duration * 0.6 + b.price * 0.4)
  })

  return options
}

export async function getRecommendedTransit(from: POI, to: POI, city: string): Promise<TransitOption | undefined> {
  const options = await getTransitOptions(from, to, city, 'balanced')
  return options[0]
}
