/**
 * Packing List Generator
 * Generates travel packing recommendations based on destination, dates, duration and trip type.
 */

import { getSeason, WeatherDay } from './weather-api'

export interface PackingCategory {
  category: string
  icon: string
  items: PackingItem[]
}

export interface PackingItem {
  name: string
  essential: boolean   // essential items are highlighted
  reason?: string      // why this item is needed
  quantity?: string    // e.g. "2件" / "按需"
}

export interface PackingList {
  city: string
  season: string
  days: number
  categories: PackingCategory[]
  weatherNote?: string
}

const SEASON_CLOTHING: Record<string, string[]> = {
  spring: ['薄外套', '长袖衬衫/T恤', '休闲长裤', '薄毛衣/开衫', '舒适运动鞋', '折叠伞'],
  summer: ['短袖T恤(多件)', '短裤/裙子', '防晒衣/薄衬衫', '凉鞋/运动鞋', '遮阳帽', '太阳镜', '防晒霜'],
  autumn: ['薄外套/风衣', '长袖衬衫/T恤', '休闲长裤', '薄毛衣', '舒适运动鞋', '围巾(备用)'],
  winter: ['厚羽绒服', '保暖内衣(2套)', '羊毛衫/毛衣', '加厚长裤', '防滑雪地靴', '手套/围巾/帽子', '暖宝宝'],
}

const ALWAYS_BRING: PackingItem[] = [
  { name: '身份证/护照', essential: true, reason: '出行必备证件' },
  { name: '手机 + 充电器', essential: true, reason: '通讯、导航、支付' },
  { name: '充电宝', essential: true, reason: '户外续航' },
  { name: '现金/银行卡', essential: true, reason: '部分场景需要现金' },
  { name: '常用药品', essential: true, reason: '感冒药、肠胃药、创可贴' },
  { name: '牙刷/牙膏', essential: false, reason: '部分酒店不提供一次性用品' },
  { name: '毛巾(速干)', essential: false, reason: '卫生考虑' },
]

const TOILETRIES: PackingItem[] = [
  { name: '洗面奶/护肤品', essential: false, quantity: '旅行装' },
  { name: '洗发水/沐浴露', essential: false, quantity: '旅行装' },
  { name: '防晒霜', essential: false, reason: '户外活动必备' },
  { name: '驱蚊液', essential: false, reason: '夏季/南方地区' },
  { name: '唇膏', essential: false, reason: '干燥地区' },
]

const TECH_ITEMS: PackingItem[] = [
  { name: '耳机', essential: false, reason: '旅途消遣' },
  { name: '相机', essential: false, reason: '记录旅行' },
  { name: '转换插头', essential: false, reason: '境外旅行' },
  { name: '自拍杆/三脚架', essential: false },
]

const TRIP_SPECIFIC: Record<string, PackingItem[]> = {
  '登山': [
    { name: '登山杖', essential: true },
    { name: '登山鞋', essential: true },
    { name: '速干衣', essential: true },
    { name: '头灯/手电', essential: false },
    { name: '能量棒/压缩饼干', essential: false, quantity: '适量' },
  ],
  '海滩': [
    { name: '泳衣', essential: true },
    { name: '沙滩拖鞋', essential: true },
    { name: '防水手机袋', essential: false },
    { name: '沙滩巾', essential: false },
  ],
  '博物馆': [
    { name: '笔记本+笔', essential: false, reason: '记录参观心得' },
    { name: '讲解器耳机孔转接头', essential: false },
  ],
  '温泉': [
    { name: '泳衣/泳裤', essential: true },
    { name: '浴巾', essential: false },
  ],
}

export function generatePackingList(
  city: string,
  startDate: string,
  days: number,
  interests: string[],
  weather?: WeatherDay | null
): PackingList {
  const season = getSeason(startDate)
  const seasonLabel = { spring: '春季', summer: '夏季', autumn: '秋季', winter: '冬季' }[season]

  const categories: PackingCategory[] = []

  // Clothing (by season)
  const clothingItems: PackingItem[] = SEASON_CLOTHING[season].map(name => ({
    name,
    essential: true,
    quantity: name.includes('T恤') || name.includes('内衣') ? `${Math.min(days, 5)}件` : '1件',
  }))
  categories.push({ category: '衣物穿搭', icon: '👕', items: clothingItems })

  // Always bring
  categories.push({ category: '证件与必需品', icon: '📋', items: [...ALWAYS_BRING] })

  // Toiletries
  categories.push({ category: '洗漱与护肤', icon: '🧴', items: TOILETRIES.filter(item => {
    if (item.name === '驱蚊液') return season === 'summer' || ['三亚', '海口', '桂林', '南宁', '昆明', '西双版纳', '厦门', '深圳', '广州'].some(c => city.includes(c))
    if (item.name === '防晒霜') return season === 'summer' || season === 'spring'
    return true
  })})

  // Tech
  categories.push({ category: '电子设备', icon: '📱', items: [...TECH_ITEMS] })

  // Trip specific
  for (const interest of interests) {
    const items = TRIP_SPECIFIC[interest]
    if (items) {
      categories.push({ category: `${interest}专属`, icon: '🎒', items })
    }
  }

  // Weather note
  let weatherNote: string | undefined
  if (weather) {
    const suggestions: string[] = []
    if (weather.tempMax > 35) suggestions.push('高温天气，备足饮用水和防晒装备')
    if (weather.tempMin < 5) suggestions.push('低温天气，注意保暖，携带暖宝宝')
    if (weather.weatherCode >= 51 && weather.weatherCode <= 99) suggestions.push(`${weather.weatherDesc}天气，务必携带雨具`)
    if (weather.windSpeed > 30) suggestions.push('大风天气，避免海边和高处活动')
    if (suggestions.length > 0) weatherNote = suggestions.join('；')
  }

  return {
    city,
    season: seasonLabel || '未知',
    days,
    categories,
    weatherNote,
  }
}