import { useState, useCallback, useRef } from 'react'
import { Itinerary, TravelFormData, POI, CandidatePoi } from '@/lib/types'

type Step = 'form' | 'pois' | 'itinerary'

type ErrorState = {
  message: string
  type: 'network' | 'business'
  retryable: boolean
} | null

type LastAction =
  | { type: 'searchCandidates'; form: TravelFormData }
  | { type: 'handlePoiConfirm'; selectedIds: string[]; customPois: POI[] }
  | { type: 'handleSkipPoi' }
  | { type: 'handleReplan'; poiIds: string[]; customPois: POI[]; dayAssignments?: string[][]; dayTimeConstraints?: { startTime?: string; endTime?: string; lunchTime?: string; dinnerTime?: string }[] }
  | null

export function useItineraryState() {
  const [step, setStep] = useState<Step>('form')
  const [formData, setFormData] = useState<TravelFormData | null>(null)
  const [candidates, setCandidates] = useState<CandidatePoi[]>([])
  const [itinerary, setItinerary] = useState<Itinerary | null>(null)
  const [weather, setWeather] = useState<any>(null)
  const [planB, setPlanB] = useState<Itinerary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ErrorState>(null)

  const requestIdRef = useRef(0)
  const lastActionRef = useRef<LastAction>(null)

  const searchCandidates = useCallback(async (form: TravelFormData) => {
    lastActionRef.current = { type: 'searchCandidates', form }
    setFormData(form)
    setError(null)
    setLoading(true)
    const requestId = ++requestIdRef.current
    try {
      const cres = await fetch('/api/plan/candidates', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destinationCity: form.destinationCity, interests: form.interests }),
      })
      if (requestId !== requestIdRef.current) return
      const cdata = await cres.json()
      if (requestId !== requestIdRef.current) return
      if (!cres.ok) {
        setError({ message: cdata.error || '获取景点列表失败', type: 'business', retryable: false })
        return
      }
      setCandidates(cdata.candidates || [])
      setStep('pois')
    } catch {
      if (requestId !== requestIdRef.current) return
      setError({ message: '网络连接失败，请检查后重试', type: 'network', retryable: true })
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [])

  const handlePoiConfirm = useCallback(async (selectedIds: string[], customPois: POI[]) => {
    if (!formData) return
    lastActionRef.current = { type: 'handlePoiConfirm', selectedIds, customPois }
    setLoading(true)
    setError(null)
    const requestId = ++requestIdRef.current
    try {
      const res = await fetch('/api/plan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, selectedPoiIds: selectedIds, customPois }),
      })
      if (requestId !== requestIdRef.current) return
      const data = await res.json()
      if (requestId !== requestIdRef.current) return
      if (!res.ok) {
        setError({ message: data.error || '生成失败', type: 'business', retryable: false })
        return
      }
      setItinerary(data.itinerary)
      setWeather(data.weather || null)
      setPlanB(data.planB || null)
      setStep('itinerary')
    } catch {
      if (requestId !== requestIdRef.current) return
      setError({ message: '网络连接失败，请检查后重试', type: 'network', retryable: true })
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [formData])

  const handleSkipPoi = useCallback(async (selectedIds: string[] = [], customPois: POI[] = []) => {
    if (!formData) return
    lastActionRef.current = { type: 'handleSkipPoi' }
    setLoading(true)
    setError(null)
    const requestId = ++requestIdRef.current
    try {
      const res = await fetch('/api/plan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, selectedPoiIds: selectedIds, customPois }),
      })
      if (requestId !== requestIdRef.current) return
      const data = await res.json()
      if (requestId !== requestIdRef.current) return
      if (!res.ok) {
        setError({ message: data.error || '生成失败', type: 'business', retryable: false })
        return
      }
      setItinerary(data.itinerary)
      setWeather(data.weather || null)
      setPlanB(data.planB || null)
      setStep('itinerary')
    } catch {
      if (requestId !== requestIdRef.current) return
      setError({ message: '网络连接失败，请检查后重试', type: 'network', retryable: true })
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [formData])

  const handleReset = useCallback(() => {
    setItinerary(null); setError(null); setCandidates([])
    setStep('form')
  }, [])

  const handleReplan = useCallback(async (poiIds: string[], customPois: POI[], dayAssignments?: string[][], dayTimeConstraints?: { startTime?: string; endTime?: string; lunchTime?: string; dinnerTime?: string }[]) => {
    if (!formData) return
    lastActionRef.current = { type: 'handleReplan', poiIds, customPois, dayAssignments, dayTimeConstraints }
    setLoading(true)
    setError(null)
    const requestId = ++requestIdRef.current
    try {
      const res = await fetch('/api/plan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, selectedPoiIds: poiIds, customPois, dayAssignments, dayTimeConstraints }),
      })
      if (requestId !== requestIdRef.current) return
      const data = await res.json()
      if (requestId !== requestIdRef.current) return
      if (!res.ok) {
        setError({ message: data.error || '生成失败', type: 'business', retryable: false })
        return
      }
      setItinerary(data.itinerary)
      setWeather(data.weather || null)
      setPlanB(data.planB || null)
    } catch {
      if (requestId !== requestIdRef.current) return
      setError({ message: '网络连接失败，请检查后重试', type: 'network', retryable: true })
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [formData])

  const handleBackToPois = useCallback(() => {
    setError(null)
    setStep('pois')
  }, [])

  const retryLastAction = useCallback(() => {
    const last = lastActionRef.current
    if (!last) return
    switch (last.type) {
      case 'searchCandidates':
        searchCandidates(last.form)
        break
      case 'handlePoiConfirm':
        handlePoiConfirm(last.selectedIds, last.customPois)
        break
      case 'handleSkipPoi':
        handleSkipPoi()
        break
      case 'handleReplan':
        handleReplan(last.poiIds, last.customPois, last.dayAssignments)
        break
    }
  }, [searchCandidates, handlePoiConfirm, handleSkipPoi, handleReplan])

  return {
    step,
    formData,
    candidates,
    itinerary,
    weather,
    planB,
    loading,
    error,
    searchCandidates,
    handlePoiConfirm,
    handleSkipPoi,
    handleReset,
    handleReplan,
    handleBackToPois,
    retryLastAction,
  }
}