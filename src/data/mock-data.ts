import { POI } from '@/lib/types'

const cityPois: Record<string, POI[]> = {
  '北京': [
    { id: 'bj-1', name: '故宫博物院', category: 'museum', rating: 4.8, price: 60, duration: 3.5, address: '北京市东城区景山前街4号', lat: 39.9163, lng: 116.3972, openTime: '08:30-17:00', tags: ['历史文化', '古建筑', '必去'], description: '中国最大的古代文化艺术博物馆', city: '北京', district: '东城区', closeDay: '' },
    { id: 'bj-2', name: '天安门广场', category: 'scenic', rating: 4.7, price: 0, duration: 1, address: '北京市东城区长安街', lat: 39.9054, lng: 116.3976, openTime: '全天', tags: ['免费', '地标', '红色旅游'], description: '世界上最大的城市广场', city: '北京', district: '东城区', closeDay: '' },
    { id: 'bj-3', name: '颐和园', category: 'scenic', rating: 4.7, price: 30, duration: 3, address: '北京市海淀区新建宫门路19号', lat: 39.9998, lng: 116.2755, openTime: '06:30-18:00', tags: ['园林', '皇家', '湖景'], description: '中国现存最大的皇家园林', city: '北京', district: '海淀区', closeDay: '' },
    { id: 'bj-4', name: '八达岭长城', category: 'scenic', rating: 4.6, price: 40, duration: 4, address: '北京市延庆区G6京藏高速', lat: 40.3583, lng: 116.0137, openTime: '06:30-19:00', tags: ['长城', '登山', '世界遗产'], description: '明长城最精华段', city: '北京', district: '延庆区', closeDay: '' },
    { id: 'bj-5', name: '天坛公园', category: 'scenic', rating: 4.6, price: 15, duration: 2, address: '北京市东城区天坛内东里7号', lat: 39.8822, lng: 116.4066, openTime: '06:00-21:00', tags: ['古建筑', '祭祀', '公园'], description: '明清两代皇帝祭天场所', city: '北京', district: '东城区', closeDay: '' },
    { id: 'bj-6', name: '南锣鼓巷', category: 'shopping', rating: 4.2, price: 0, duration: 1.5, address: '北京市东城区南锣鼓巷', lat: 39.9382, lng: 116.4037, openTime: '全天', tags: ['胡同', '文艺', '小吃'], description: '北京最古老的街区之一', city: '北京', district: '东城区', closeDay: '' },
    { id: 'bj-7', name: '国家博物馆', category: 'museum', rating: 4.6, price: 0, duration: 3, address: '北京市东城区东长安街16号', lat: 39.9055, lng: 116.3978, openTime: '09:00-17:00', tags: ['免费', '历史', '文物'], description: '中华文物收藏量最丰富的博物馆', city: '北京', district: '东城区', closeDay: '' },
    { id: 'bj-8', name: '798艺术区', category: 'entertainment', rating: 4.3, price: 0, duration: 2, address: '北京市朝阳区酒仙桥路4号', lat: 39.9842, lng: 116.4951, openTime: '全天', tags: ['艺术', '文艺', '拍照'], description: '北京最著名的艺术文化街区', city: '北京', district: '朝阳区', closeDay: '' },
    { id: 'bj-9', name: '什刹海', category: 'entertainment', rating: 4.4, price: 0, duration: 2, address: '北京市西城区什刹海', lat: 39.9372, lng: 116.3855, openTime: '全天', tags: ['酒吧', '湖景', '胡同'], description: '北京历史文化风景区', city: '北京', district: '西城区', closeDay: '' },
    { id: 'bj-10', name: '鸟巢', category: 'scenic', rating: 4.3, price: 50, duration: 1.5, address: '北京市朝阳区国家体育场南路1号', lat: 39.9929, lng: 116.3912, openTime: '09:00-21:00', tags: ['奥运', '地标', '现代建筑'], description: '2008年奥运会主体育场', city: '北京', district: '朝阳区', closeDay: '' },
  ],
  '上海': [
    { id: 'sh-1', name: '外滩', category: 'scenic', rating: 4.7, price: 0, duration: 1.5, address: '上海市黄浦区中山东一路', lat: 31.2400, lng: 121.4900, openTime: '全天', tags: ['免费', '夜景', '地标'], description: '上海最具标志性的景观', city: '上海', district: '黄浦区', closeDay: '' },
    { id: 'sh-2', name: '东方明珠塔', category: 'scenic', rating: 4.4, price: 199, duration: 2, address: '上海市浦东新区世纪大道1号', lat: 31.2397, lng: 121.4998, openTime: '08:00-22:00', tags: ['地标', '观景', '夜景'], description: '上海标志性建筑', city: '上海', district: '浦东新区', closeDay: '' },
    { id: 'sh-3', name: '迪士尼乐园', category: 'entertainment', rating: 4.7, price: 475, duration: 8, address: '上海市浦东新区川沙镇黄赵路310号', lat: 31.1440, lng: 121.6548, openTime: '08:30-20:30', tags: ['游乐', '亲子', '必去'], description: '中国大陆首座迪士尼主题乐园', city: '上海', district: '浦东新区', closeDay: '' },
    { id: 'sh-4', name: '豫园', category: 'scenic', rating: 4.4, price: 40, duration: 1.5, address: '上海市黄浦区豫园老街279号', lat: 31.2268, lng: 121.4886, openTime: '09:00-16:30', tags: ['园林', '古建筑', '小吃'], description: '明代江南古典园林', city: '上海', district: '黄浦区', closeDay: '' },
    { id: 'sh-5', name: '南京路步行街', category: 'shopping', rating: 4.4, price: 0, duration: 2, address: '上海市黄浦区南京东路', lat: 31.2380, lng: 121.4760, openTime: '全天', tags: ['购物', '美食', '繁华'], description: '中国最著名的商业街', city: '上海', district: '黄浦区', closeDay: '' },
    { id: 'sh-6', name: '上海博物馆', category: 'museum', rating: 4.6, price: 0, duration: 2.5, address: '上海市黄浦区人民大道201号', lat: 31.2303, lng: 121.4737, openTime: '09:00-17:00', tags: ['免费', '文物', '艺术'], description: '中国古代艺术博物馆', city: '上海', district: '黄浦区', closeDay: '' },
    { id: 'sh-7', name: '武康路', category: 'shopping', rating: 4.3, price: 0, duration: 1.5, address: '上海市徐汇区武康路', lat: 31.2080, lng: 121.4360, openTime: '全天', tags: ['文艺', '拍照', '咖啡'], description: '上海最具文艺气息的马路', city: '上海', district: '徐汇区', closeDay: '' },
    { id: 'sh-8', name: '上海迪士尼小镇', category: 'shopping', rating: 4.2, price: 0, duration: 1.5, address: '上海市浦东新区申迪西路255弄', lat: 31.1400, lng: 121.6500, openTime: '10:00-22:00', tags: ['购物', '美食', '亲子'], description: '迪士尼主题购物餐饮街区', city: '上海', district: '浦东新区', closeDay: '' },
  ],
  '成都': [
    { id: 'cd-1', name: '大熊猫繁育研究基地', category: 'scenic', rating: 4.7, price: 55, duration: 3, address: '成都市成华区熊猫大道1375号', lat: 30.7340, lng: 104.1420, openTime: '07:30-17:00', tags: ['熊猫', '亲子', '必去'], description: '全球最大的大熊猫繁育基地', city: '成都', district: '成华区', closeDay: '' },
    { id: 'cd-2', name: '宽窄巷子', category: 'shopping', rating: 4.4, price: 0, duration: 2, address: '成都市青羊区长顺上街', lat: 30.6710, lng: 104.0580, openTime: '全天', tags: ['古街', '美食', '文艺'], description: '成都遗留下来的清朝古街道', city: '成都', district: '青羊区', closeDay: '' },
    { id: 'cd-3', name: '锦里古街', category: 'shopping', rating: 4.3, price: 0, duration: 1.5, address: '成都市武侯区武侯祠大街231号', lat: 30.6450, lng: 104.0490, openTime: '全天', tags: ['古街', '小吃', '民俗'], description: '西蜀最古老的商业街', city: '成都', district: '武侯区', closeDay: '' },
    { id: 'cd-4', name: '武侯祠', category: 'museum', rating: 4.5, price: 50, duration: 2, address: '成都市武侯区武侯祠大街231号', lat: 30.6450, lng: 104.0470, openTime: '08:00-18:30', tags: ['三国', '历史', '古建筑'], description: '中国唯一的君臣合祀祠庙', city: '成都', district: '武侯区', closeDay: '' },
    { id: 'cd-5', name: '都江堰', category: 'scenic', rating: 4.7, price: 80, duration: 4, address: '成都市都江堰市公园路', lat: 31.0080, lng: 103.6190, openTime: '08:00-18:00', tags: ['水利工程', '世界遗产', '自然'], description: '世界最古老的水利工程', city: '成都', district: '都江堰市', closeDay: '' },
    { id: 'cd-6', name: '春熙路', category: 'shopping', rating: 4.4, price: 0, duration: 1.5, address: '成都市锦江区春熙路', lat: 30.6590, lng: 104.0820, openTime: '全天', tags: ['购物', '美食', '繁华'], description: '成都最繁华的商业街', city: '成都', district: '锦江区', closeDay: '' },
    { id: 'cd-7', name: '杜甫草堂', category: 'museum', rating: 4.4, price: 50, duration: 1.5, address: '成都市青羊区青华路37号', lat: 30.6670, lng: 104.0280, openTime: '08:00-18:30', tags: ['文化', '诗词', '园林'], description: '唐代诗人杜甫的故居', city: '成都', district: '青羊区', closeDay: '' },
    { id: 'cd-8', name: '人民公园', category: 'entertainment', rating: 4.3, price: 0, duration: 1.5, address: '成都市青羊区少城路12号', lat: 30.6600, lng: 104.0600, openTime: '全天', tags: ['休闲', '茶馆', '本地'], description: '感受成都慢生活的最佳地点', city: '成都', district: '青羊区', closeDay: '' },
  ],
  '西安': [
    { id: 'xa-1', name: '兵马俑', category: 'museum', rating: 4.8, price: 120, duration: 3, address: '西安市临潼区秦陵北路', lat: 34.3850, lng: 109.2750, openTime: '08:30-18:30', tags: ['世界遗产', '历史', '必去'], description: '世界第八大奇迹', city: '西安', district: '临潼区', closeDay: '' },
    { id: 'xa-2', name: '大雁塔', category: 'scenic', rating: 4.5, price: 40, duration: 1.5, address: '西安市雁塔区慈恩路', lat: 34.2190, lng: 108.9590, openTime: '08:00-18:00', tags: ['佛教', '古建筑', '历史'], description: '唐代玄奘藏经处', city: '西安', district: '雁塔区', closeDay: '' },
    { id: 'xa-3', name: '西安城墙', category: 'scenic', rating: 4.6, price: 54, duration: 2.5, address: '西安市碑林区南大街', lat: 34.2610, lng: 108.9420, openTime: '08:00-22:00', tags: ['古城', '骑行', '夜景'], description: '中国现存规模最大的古城墙', city: '西安', district: '碑林区', closeDay: '' },
    { id: 'xa-4', name: '回民街', category: 'food', rating: 4.2, price: 0, duration: 1.5, address: '西安市莲湖区北院门', lat: 34.2650, lng: 108.9400, openTime: '全天', tags: ['美食', '小吃', '夜市'], description: '西安最著名的小吃街', city: '西安', district: '莲湖区', closeDay: '' },
    { id: 'xa-5', name: '华清宫', category: 'scenic', rating: 4.4, price: 120, duration: 2, address: '西安市临潼区华清路', lat: 34.3640, lng: 109.2060, openTime: '07:00-19:00', tags: ['唐代', '温泉', '历史'], description: '唐代帝王温泉行宫', city: '西安', district: '临潼区', closeDay: '' },
    { id: 'xa-6', name: '陕西历史博物馆', category: 'museum', rating: 4.7, price: 0, duration: 2.5, address: '西安市雁塔区小寨东路91号', lat: 34.2090, lng: 108.9540, openTime: '09:00-17:30', tags: ['免费', '历史', '文物'], description: '华夏文明宝库', city: '西安', district: '雁塔区', closeDay: '' },
    { id: 'xa-7', name: '钟楼', category: 'scenic', rating: 4.4, price: 30, duration: 1, address: '西安市碑林区东大街', lat: 34.2610, lng: 108.9420, openTime: '08:30-21:00', tags: ['古建筑', '地标', '夜景'], description: '西安城市中心标志建筑', city: '西安', district: '碑林区', closeDay: '' },
    { id: 'xa-8', name: '大唐不夜城', category: 'entertainment', rating: 4.5, price: 0, duration: 2, address: '西安市雁塔区雁塔路', lat: 34.2180, lng: 108.9600, openTime: '全天', tags: ['夜景', '唐风', '表演'], description: '以盛唐文化为主题的步行街', city: '西安', district: '雁塔区', closeDay: '' },
  ],
  '广州': [
    { id: 'gz-1', name: '广州塔', category: 'scenic', rating: 4.5, price: 150, duration: 1.5, address: '广州市海珠区阅江西路222号', lat: 23.1066, lng: 113.3245, openTime: '09:30-22:30', tags: ['地标', '夜景', '观景'], description: '广州地标建筑', city: '广州', district: '海珠区', closeDay: '' },
    { id: 'gz-2', name: '长隆野生动物世界', category: 'entertainment', rating: 4.7, price: 250, duration: 6, address: '广州市番禺区香江大道', lat: 23.0050, lng: 113.3300, openTime: '09:30-18:00', tags: ['亲子', '动物', '游乐'], description: '亚洲最大的野生动物园', city: '广州', district: '番禺区', closeDay: '' },
    { id: 'gz-3', name: '沙面岛', category: 'scenic', rating: 4.4, price: 0, duration: 1.5, address: '广州市荔湾区沙面南街', lat: 23.1100, lng: 113.2400, openTime: '全天', tags: ['免费', '欧式建筑', '拍照'], description: '广州最具异国风情的欧洲建筑群', city: '广州', district: '荔湾区', closeDay: '' },
    { id: 'gz-4', name: '北京路步行街', category: 'shopping', rating: 4.3, price: 0, duration: 2, address: '广州市越秀区北京路', lat: 23.1280, lng: 113.2670, openTime: '全天', tags: ['购物', '美食', '历史'], description: '广州最繁华的商业街', city: '广州', district: '越秀区', closeDay: '' },
    { id: 'gz-5', name: '陈家祠', category: 'museum', rating: 4.5, price: 10, duration: 1.5, address: '广州市荔湾区中山七路', lat: 23.1240, lng: 113.2500, openTime: '09:00-17:30', tags: ['古建筑', '岭南', '文化'], description: '岭南民间建筑装饰艺术殿堂', city: '广州', district: '荔湾区', closeDay: '' },
    { id: 'gz-6', name: '白云山', category: 'scenic', rating: 4.5, price: 5, duration: 3, address: '广州市白云区同泰路', lat: 23.1800, lng: 113.3000, openTime: '06:00-21:00', tags: ['自然', '登山', '城市全景'], description: '广州最高峰', city: '广州', district: '白云区', closeDay: '' },
  ],
  '杭州': [
    { id: 'hz-1', name: '西湖', category: 'scenic', rating: 4.8, price: 0, duration: 4, address: '杭州市西湖区龙井路1号', lat: 30.2590, lng: 120.1540, openTime: '全天', tags: ['免费', '世界遗产', '湖景'], description: '中国最著名的湖泊风景区', city: '杭州', district: '西湖区', closeDay: '' },
    { id: 'hz-2', name: '灵隐寺', category: 'scenic', rating: 4.6, price: 75, duration: 2, address: '杭州市西湖区法云弄1号', lat: 30.2450, lng: 120.1000, openTime: '07:00-18:00', tags: ['佛教', '古寺', '祈福'], description: '中国最早的佛教寺院之一', city: '杭州', district: '西湖区', closeDay: '' },
    { id: 'hz-3', name: '雷峰塔', category: 'scenic', rating: 4.3, price: 40, duration: 1, address: '杭州市西湖区南山路15号', lat: 30.2380, lng: 120.1480, openTime: '08:00-20:00', tags: ['古塔', '传说', '观景'], description: '白蛇传传说中的重要场景', city: '杭州', district: '西湖区', closeDay: '' },
    { id: 'hz-4', name: '断桥残雪', category: 'scenic', rating: 4.4, price: 0, duration: 0.5, address: '杭州市西湖区北山街', lat: 30.2640, lng: 120.1510, openTime: '全天', tags: ['免费', '西湖十景', '拍照'], description: '西湖十景之一', city: '杭州', district: '西湖区', closeDay: '' },
    { id: 'hz-5', name: '宋城', category: 'entertainment', rating: 4.3, price: 320, duration: 4, address: '杭州市西湖区之江路148号', lat: 30.1700, lng: 120.1300, openTime: '09:00-21:00', tags: ['表演', '宋文化', '亲子'], description: '大型宋代文化主题公园', city: '杭州', district: '西湖区', closeDay: '' },
    { id: 'hz-6', name: '河坊街', category: 'food', rating: 4.2, price: 0, duration: 1.5, address: '杭州市上城区河坊街', lat: 30.2480, lng: 120.1700, openTime: '全天', tags: ['美食', '古街', '伴手礼'], description: '杭州历史古街', city: '杭州', district: '上城区', closeDay: '' },
  ],
  '深圳': [
    { id: 'sz-1', name: '世界之窗', category: 'entertainment', rating: 4.3, price: 220, duration: 4, address: '深圳市南山区深南大道9037号', lat: 22.5370, lng: 113.9770, openTime: '09:00-22:00', tags: ['主题公园', '拍照', '亲子'], description: '世界著名景观微缩主题公园', city: '深圳', district: '南山区', closeDay: '' },
    { id: 'sz-2', name: '欢乐谷', category: 'entertainment', rating: 4.4, price: 230, duration: 5, address: '深圳市南山区侨城西街1号', lat: 22.5400, lng: 113.9830, openTime: '09:30-21:00', tags: ['游乐', '亲子', '刺激'], description: '深圳最受欢迎的主题乐园', city: '深圳', district: '南山区', closeDay: '' },
    { id: 'sz-3', name: '大梅沙海滨公园', category: 'scenic', rating: 4.2, price: 0, duration: 3, address: '深圳市盐田区盐梅路', lat: 22.6000, lng: 114.3100, openTime: '全天', tags: ['海滩', '免费', '休闲'], description: '深圳最大的海滨公园', city: '深圳', district: '盐田区', closeDay: '' },
    { id: 'sz-4', name: '莲花山公园', category: 'scenic', rating: 4.4, price: 0, duration: 1.5, address: '深圳市福田区红荔路6030号', lat: 22.5480, lng: 114.0550, openTime: '06:00-22:00', tags: ['免费', '登山', '城市全景'], description: '深圳市中心最大的公园', city: '深圳', district: '福田区', closeDay: '' },
  ],
  '南京': [
    { id: 'nj-1', name: '夫子庙', category: 'scenic', rating: 4.4, price: 0, duration: 2, address: '南京市秦淮区贡院街', lat: 32.0200, lng: 118.7900, openTime: '全天', tags: ['古街', '美食', '文化'], description: '中国四大文庙之一', city: '南京', district: '秦淮区', closeDay: '' },
    { id: 'nj-2', name: '中山陵', category: 'scenic', rating: 4.7, price: 0, duration: 2, address: '南京市玄武区紫金山南麓', lat: 32.0640, lng: 118.8500, openTime: '08:00-17:00', tags: ['免费', '历史', '登山'], description: '孙中山先生陵寝', city: '南京', district: '玄武区', closeDay: '' },
    { id: 'nj-3', name: '南京博物院', category: 'museum', rating: 4.6, price: 0, duration: 3, address: '南京市玄武区中山东路321号', lat: 32.0430, lng: 118.8200, openTime: '09:00-17:00', tags: ['免费', '文物', '历史'], description: '中国三大博物院之一', city: '南京', district: '玄武区', closeDay: '' },
    { id: 'nj-4', name: '总统府', category: 'museum', rating: 4.5, price: 40, duration: 2, address: '南京市玄武区长江路292号', lat: 32.0470, lng: 118.7950, openTime: '08:30-17:00', tags: ['近代史', '民国', '必去'], description: '中国近代史的重要遗址', city: '南京', district: '玄武区', closeDay: '' },
  ],
  '武汉': [
    { id: 'wh-1', name: '黄鹤楼', category: 'scenic', rating: 4.5, price: 80, duration: 1.5, address: '武汉市武昌区蛇山西山坡特1号', lat: 30.5460, lng: 114.2970, openTime: '08:00-18:00', tags: ['古建筑', '地标', '必去'], description: '天下江山第一楼', city: '武汉', district: '武昌区', closeDay: '' },
    { id: 'wh-2', name: '武汉大学', category: 'scenic', rating: 4.6, price: 0, duration: 2, address: '武汉市武昌区珞珈山路16号', lat: 30.5400, lng: 114.3600, openTime: '全天', tags: ['樱花', '校园', '建筑'], description: '中国最美的大学之一', city: '武汉', district: '武昌区', closeDay: '' },
    { id: 'wh-3', name: '东湖风景区', category: 'scenic', rating: 4.6, price: 0, duration: 3, address: '武汉市武昌区东湖路', lat: 30.5600, lng: 114.3900, openTime: '全天', tags: ['免费', '湖景', '休闲'], description: '中国最大的城中湖', city: '武汉', district: '武昌区', closeDay: '' },
    { id: 'wh-4', name: '户部巷', category: 'food', rating: 4.2, price: 0, duration: 1, address: '武汉市武昌区自由路', lat: 30.5450, lng: 114.3050, openTime: '全天', tags: ['美食', '小吃', '夜市'], description: '武汉最有名的美食街', city: '武汉', district: '武昌区', closeDay: '' },
  ],
  '长沙': [
    { id: 'cs-1', name: '岳麓山', category: 'scenic', rating: 4.6, price: 0, duration: 3, address: '长沙市岳麓区登高路58号', lat: 28.1850, lng: 112.9400, openTime: '全天', tags: ['免费', '登山', '风景'], description: '长沙城市绿肺', city: '长沙', district: '岳麓区', closeDay: '' },
    { id: 'cs-2', name: '橘子洲', category: 'scenic', rating: 4.5, price: 0, duration: 2, address: '长沙市岳麓区橘子洲头2号', lat: 28.1960, lng: 112.9600, openTime: '全天', tags: ['免费', '地标', '夜景'], description: '毛主席青年时期活动地', city: '长沙', district: '岳麓区', closeDay: '' },
    { id: 'cs-3', name: '太平老街', category: 'shopping', rating: 4.3, price: 0, duration: 1.5, address: '长沙市天心区太平街', lat: 28.1940, lng: 112.9750, openTime: '全天', tags: ['美食', '古街', '文艺'], description: '长沙千年老街', city: '长沙', district: '天心区', closeDay: '' },
    { id: 'cs-4', name: '湖南省博物馆', category: 'museum', rating: 4.7, price: 0, duration: 2.5, address: '长沙市开福区东风路50号', lat: 28.2150, lng: 112.9900, openTime: '09:00-17:00', tags: ['免费', '文物', '马王堆'], description: '马王堆汉墓文物收藏地', city: '长沙', district: '开福区', closeDay: '' },
  ],
  '重庆': [
    { id: 'cq-1', name: '洪崖洞', category: 'scenic', rating: 4.4, price: 0, duration: 1.5, address: '重庆市渝中区嘉陵江滨江路', lat: 29.5620, lng: 106.5780, openTime: '全天', tags: ['夜景', '吊脚楼', '免费'], description: '重庆最具特色的吊脚楼建筑群', city: '重庆', district: '渝中区', closeDay: '' },
    { id: 'cq-2', name: '解放碑', category: 'shopping', rating: 4.3, price: 0, duration: 1, address: '重庆市渝中区民族路', lat: 29.5580, lng: 106.5750, openTime: '全天', tags: ['地标', '购物', '繁华'], description: '重庆最繁华的商业中心', city: '重庆', district: '渝中区', closeDay: '' },
    { id: 'cq-3', name: '磁器口古镇', category: 'shopping', rating: 4.2, price: 0, duration: 2, address: '重庆市沙坪坝区磁器口', lat: 29.5800, lng: 106.4500, openTime: '全天', tags: ['古镇', '美食', '文艺'], description: '重庆最具代表性的古镇', city: '重庆', district: '沙坪坝区', closeDay: '' },
    { id: 'cq-4', name: '长江索道', category: 'entertainment', rating: 4.3, price: 30, duration: 0.5, address: '重庆市渝中区新华路151号', lat: 29.5600, lng: 106.5850, openTime: '07:30-22:00', tags: ['体验', '江景', '特色'], description: '跨越长江的空中巴士', city: '重庆', district: '渝中区', closeDay: '' },
  ],
}

export function getPoisByCity(city: string): POI[] {
  return cityPois[city] || []
}

export function getPoisByCategory(city: string, category: string): POI[] {
  const pois = getPoisByCity(city)
  if (category === 'all') return pois
  return pois.filter(p => p.category === category)
}

export const cities = Object.keys(cityPois)
