# Travel Planner Agent

基于 Next.js 的智能旅行规划工具。

## 快速开始

```bash
npm install
npm run dev
```

## 配置高德地图 API Key

为支持非热门城市（如湛江、厦门、青岛等）的实时 POI 数据获取，需要在 `.env.local` 中配置高德地图 Web 服务 API Key：

1. 访问 [高德开放平台](https://console.amap.com/dev/index) 注册/登录
2. 进入「应用管理」→「我的应用」→「创建新应用」
3. 添加 Key，服务平台选择 **Web服务**
4. 将获取的 Key 填入 `.env.local`：

```
AMAP_API_KEY=你的 Key
```

**注意**：不配置 API Key 也不影响 11 个热门城市（北京、上海、广州、深圳、成都、杭州、武汉、西安、南京、长沙、重庆）的使用，这些城市使用内置精选数据。非热门城市需要 API Key 才能获取实时 POI 数据。

## 项目结构

```
src/
├── app/          # Next.js App Router 页面
├── lib/          # 工具库
│   └── amap-api.ts   # 高德地图 POI & 酒店数据接口
└── data/         # 静态数据
```