const cloud = require('wx-server-sdk')
const crypto = require('crypto')
const https = require('https')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const CACHE_COLLECTION = 'wechatShareCache'
const ACCESS_TOKEN_KEY = 'mp_access_token'
const JSAPI_TICKET_KEY = 'mp_jsapi_ticket'
const CACHE_MARGIN_MS = 5 * 60 * 1000

function jsonResponse(body, statusCode = 200) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'content-type',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
    },
    body: JSON.stringify(body)
  }
}

function getParam(event, key) {
  if (event && event[key]) return event[key]
  if (event && event.queryStringParameters && event.queryStringParameters[key]) {
    return event.queryStringParameters[key]
  }
  if (event && event.body) {
    try {
      const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body
      return body && body[key]
    } catch (err) {
      return ''
    }
  }
  return ''
}

function requestJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let raw = ''
        res.on('data', (chunk) => {
          raw += chunk
        })
        res.on('end', () => {
          try {
            resolve(JSON.parse(raw))
          } catch (err) {
            reject(err)
          }
        })
      })
      .on('error', reject)
  })
}

async function getCached(key) {
  const res = await db.collection(CACHE_COLLECTION).doc(key).get().catch(() => ({ data: null }))
  const data = res.data
  if (!data || !data.value || !data.expiresAt) return ''
  if (Number(data.expiresAt) <= Date.now() + CACHE_MARGIN_MS) return ''
  return data.value
}

async function setCached(key, value, expiresInSeconds) {
  const expiresAt = Date.now() + Number(expiresInSeconds || 7200) * 1000
  const data = { value, expiresAt, updatedAt: new Date() }
  await db.collection(CACHE_COLLECTION).doc(key).set({ data }).catch(async () => {
    await db.collection(CACHE_COLLECTION).add({ data: { _id: key, ...data } })
  })
}

async function getAccessToken(appId, appSecret) {
  const cached = await getCached(ACCESS_TOKEN_KEY)
  if (cached) return cached

  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(appSecret)}`
  const res = await requestJson(url)
  if (!res.access_token) {
    throw new Error(res.errmsg || 'failed to get access_token')
  }
  await setCached(ACCESS_TOKEN_KEY, res.access_token, res.expires_in)
  return res.access_token
}

async function getJsapiTicket(accessToken) {
  const cached = await getCached(JSAPI_TICKET_KEY)
  if (cached) return cached

  const url = `https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=${encodeURIComponent(accessToken)}&type=jsapi`
  const res = await requestJson(url)
  if (!res.ticket) {
    throw new Error(res.errmsg || 'failed to get jsapi_ticket')
  }
  await setCached(JSAPI_TICKET_KEY, res.ticket, res.expires_in)
  return res.ticket
}

function createNonceStr() {
  return crypto.randomBytes(12).toString('hex')
}

exports.main = async (event) => {
  if (event && event.httpMethod === 'OPTIONS') {
    return jsonResponse({ success: true })
  }

  const appId = process.env.WECHAT_MP_APPID
  const appSecret = process.env.WECHAT_MP_SECRET
  const pageUrl = decodeURIComponent(getParam(event, 'url') || '')

  if (!appId || !appSecret) {
    return jsonResponse({ success: false, message: '公众号 AppID/AppSecret 尚未配置到云函数环境变量' }, 500)
  }
  if (!pageUrl || !/^https:\/\/4nianji\.com\/?/i.test(pageUrl)) {
    return jsonResponse({ success: false, message: '非法或缺失的分享页面 URL' }, 400)
  }

  try {
    const accessToken = await getAccessToken(appId, appSecret)
    const jsapiTicket = await getJsapiTicket(accessToken)
    const nonceStr = createNonceStr()
    const timestamp = Math.floor(Date.now() / 1000)
    const raw = `jsapi_ticket=${jsapiTicket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${pageUrl}`
    const signature = crypto.createHash('sha1').update(raw).digest('hex')

    return jsonResponse({
      success: true,
      appId,
      timestamp,
      nonceStr,
      signature
    })
  } catch (err) {
    return jsonResponse({ success: false, message: err.message || '生成微信分享签名失败' }, 500)
  }
}
