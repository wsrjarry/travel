export interface TravelFormData {
  destinationCity: string
  destinationStation: string
  startDate: string
  endDate: string
  arrivalTime: string
  departureTime: string
  budget?: number
  pace: 'relaxed' | 'moderate' | 'intense'
  interests: string[]
  accommodationType?: 'hotel' | 'bnb' | 'hostel'
  needDropLuggage?: boolean
}

export interface POI {
  id: string
  name: string
  category: 'scenic' | 'museum' | 'food' | 'shopping' | 'entertainment' | 'hotel' | 'restaurant'
  rating: number
  price: number
  duration: number
  address: string
  lat: number
  lng: number
  openTime: string     // e.g. "08:00-17:00" or "全天"
  closeDay: string     // 闭馆日 e.g. "周一" or ""
  tags: string[]
  description: string
  city: string
  district: string
}

export interface CandidatePoi {
  poi: POI
  score: number
  selected: boolean
}

export interface TransitOption {
  mode: 'walking' | 'transit' | 'driving' | 'taxi'
  duration: number
  durationText: string
  distance: number
  distanceText: string
  price: number
  description: string
}

export interface MealBreak {
  type: 'lunch' | 'dinner'
  startTime: string
  endTime: string
  suggestions: POI[]
}

export interface DayActivity {
  poi: POI
  arrivalTime: string
  departureTime: string
  transitFromPrev?: TransitOption
  cost: number
  isMealBreak?: boolean
  mealBreak?: MealBreak
  note?: string
  reminder?: string
}

export interface DayPlan {
  day: number
  date: string
  theme: string
  activities: DayActivity[]
  hotel?: POI
  totalCost: number
  totalDuration: number
  meals: MealBreak[]
  weather?: import('./weather-api').WeatherDay
  startTime?: string
  endTime?: string
  startPointName?: string
  endPointName?: string
  lunchTime?: string
  dinnerTime?: string
  reasoning?: string
  aiWarnings?: string[]
}

export interface BudgetBreakdown {
  transport: number
  accommodation: number
  food: number
  tickets: number
  shopping: number
  total: number
}

export interface HotelRecommendation {
  name: string
  lat: number
  lng: number
  price: number
  stars: number
  address: string
  tags: string[]
  nearby: string
  distance: number
}

export interface ItineraryWarning {
  type: string
  message: string
  skippedCount: number
  suggestedMax: number
}

export interface Itinerary {
  id: string
  formData: TravelFormData
  overview: string
  days: DayPlan[]
  budget: BudgetBreakdown
  hotelRecommendations: HotelRecommendation[]
  createdAt: string
  planB?: Itinerary
  weather?: import('./weather-api').WeatherResponse
  warnings?: ItineraryWarning[]
}

export interface PlanRequest {
  destinationCity: string
  destinationStation: string
  startDate: string
  endDate: string
  arrivalTime: string
  departureTime: string
  budget?: number
  pace: 'relaxed' | 'moderate' | 'intense'
  interests: string[]
  accommodationType?: 'hotel' | 'bnb' | 'hostel'
  needDropLuggage?: boolean
  selectedPoiIds?: string[]
  customPois?: POI[]
  dayAssignments?: string[][]
  dayTimeConstraints?: { startTime?: string; endTime?: string; lunchTime?: string; dinnerTime?: string }[]
}

export interface TrainResult {
  trainNo: string
  fromStation: string
  toStation: string
  departureTime: string
  arrivalTime: string
  duration: string
  seatTypes: { type: string; price: number; 剩余: number }[]
  date: string
  source: '12306' | 'mock'
}
