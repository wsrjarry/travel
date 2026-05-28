import { Itinerary } from './types'

const STORAGE_KEY = 'travel-planner-itineraries'

export interface SavedItinerary {
  id: string
  name: string
  city: string
  startDate: string
  endDate: string
  dayCount: number
  savedAt: string
  itinerary: Itinerary
}

function getAllSaved(): SavedItinerary[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveAll(items: SavedItinerary[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch (e) {
    console.warn('保存行程失败，存储空间可能不足', e)
  }
}

export function saveItinerary(itinerary: Itinerary): SavedItinerary {
  const items = getAllSaved()
  const now = new Date().toISOString()

  // 如果已存在同 ID 的行程，覆盖
  const existingIdx = items.findIndex(i => i.id === itinerary.id)
  const saved: SavedItinerary = {
    id: itinerary.id,
    name: `${itinerary.formData.destinationCity} ${itinerary.days.length}日游`,
    city: itinerary.formData.destinationCity,
    startDate: itinerary.formData.startDate,
    endDate: itinerary.formData.endDate,
    dayCount: itinerary.days.length,
    savedAt: now,
    itinerary,
  }

  if (existingIdx >= 0) {
    items[existingIdx] = saved
  } else {
    items.unshift(saved)
  }

  // 最多保存 20 条
  if (items.length > 20) items.length = 20

  saveAll(items)
  return saved
}

export function loadItineraries(): SavedItinerary[] {
  return getAllSaved()
}

export function loadItineraryById(id: string): SavedItinerary | null {
  return getAllSaved().find(i => i.id === id) || null
}

export function deleteSavedItinerary(id: string): void {
  const items = getAllSaved().filter(i => i.id !== id)
  saveAll(items)
}

export function hasSavedItinerary(id: string): boolean {
  return getAllSaved().some(i => i.id === id)
}