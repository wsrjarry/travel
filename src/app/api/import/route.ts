import { NextRequest, NextResponse } from 'next/server'

function cleanHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .substring(0, 15000)
}

async function tryFetch(url: string, ua: string): Promise<{ ok: boolean; html: string; status: number }> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': ua,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Cache-Control': 'no-cache',
    },
    signal: AbortSignal.timeout(12000),
    redirect: 'follow',
  })
  const html = await res.text()
  return { ok: res.ok, html, status: res.status }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) {
    return NextResponse.json({ success: false, error: '缺少 url 参数' }, { status: 400 })
  }

  // 校验 URL 格式
  try {
    new URL(url)
  } catch {
    return NextResponse.json({ success: false, error: '无效的链接格式，请输入完整的 http/https 链接' }, { status: 400 })
  }

  // 尝试多种 UA（部分网站对不同客户端返回不同内容）
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  ]

  let lastError: string = ''

  for (const ua of userAgents) {
    try {
      const { html, status } = await tryFetch(url, ua)
      if (status === 403 || status === 503) {
        lastError = '该网站拒绝了访问请求（可能设有反爬保护），请尝试粘贴攻略文本'
        continue
      }
      if (status !== 200) {
        lastError = `服务器返回 ${status} 状态码`
        continue
      }
      const content = cleanHtml(html)
      if (!content || content.length < 50) {
        lastError = '未能从页面中提取到有效文本内容'
        continue
      }
      return NextResponse.json({ success: true, content })
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.name === 'TimeoutError') {
        lastError = '请求超时，该网站响应过慢'
      } else {
        lastError = err?.message || '网络请求失败'
      }
    }
  }

  return NextResponse.json(
    { success: false, error: `无法解析链接：${lastError || '未知错误'}` },
    { status: 500 },
  )
}