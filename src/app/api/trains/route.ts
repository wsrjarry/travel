import { NextRequest, NextResponse } from 'next/server'
import { searchTrains, getDefaultStation } from '@/lib/train-api'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const date = searchParams.get('date')

    if (!from || !to || !date) {
      return NextResponse.json(
        { success: false, error: '缺少必填参数：from, to, date' },
        { status: 400 }
      )
    }

    const depStation = await getDefaultStation(from)
    const arrStation = await getDefaultStation(to)

    const trains = await searchTrains(depStation, arrStation, date)

    const isMock = trains.length > 0 && trains[0].source === 'mock'
    return NextResponse.json({
      success: true,
      trains,
      fromStation: depStation,
      toStation: arrStation,
      source: isMock ? 'mock' : '12306',
      ...(isMock ? { warning: '车次数据为模拟数据，仅供参考' } : {}),
    })
  } catch (err: any) {
    console.error('Train search error:', err?.message || err)
    return NextResponse.json(
      { success: false, error: `12306 查询失败: ${err?.message || '未知错误'}` },
      { status: 500 }
    )
  }
}
