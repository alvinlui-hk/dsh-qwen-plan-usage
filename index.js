/**
 * Qwen Token Plan usage — Host half.
 *
 * The inference API key cannot read plan quota. Usage comes from a Qwen Cloud
 * console session. Sign-in opens a dedicated Edge profile, reads only
 * qwencloud.com cookies over a localhost debugger, then stores that cookie in
 * the DSH credential record. The cookie and sec_token never leave this process
 * except as request headers to qwencloud.com.
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { createServer } from 'node:net'
import os from 'node:os'
import path from 'node:path'

const CREDENTIAL_KEY = 'qwen-plan-usage/session'
const BILLING_URL = 'https://home.qwencloud.com/billing/subscription/token-plan-individual'
const LOGIN_TIMEOUT_MS = 5 * 60 * 1000
const USER_INFO_URL = 'https://home.qwencloud.com/tool/user/info.json'
const BAILIAN_URL = 'https://cs-data.qwencloud.com/data/api.json'
const COMMODITY_CODE = 'sfm_tokenplansolo_public_intl'
const CACHE_TTL_MS = 60_000
const COOKIE_LIMIT = 32_768

const USAGE_API = 'zeldaHttp.apikeyMgr./tokenplan/personal/api/v2/usage'
const SUBSCRIPTION_API = 'zeldaHttp.apikeyMgr./tokenplan/personal/api/v2/subscription'
const QUOTA_API = 'zeldaHttp.apikeyMgr./tokenplan/personal/api/v2/quota-config'

export const inject = ['webServer', 'credentials']

class QwenPlanError extends Error {
  constructor(code, message) {
    super(message ?? code)
    this.name = 'QwenPlanError'
    this.code = code
  }
}

export function normalizeCookie(raw) {
  let value = String(raw ?? '').replace(/^\uFEFF/, '').trim()
  value = value.replace(/^cookie\s*:\s*/i, '').trim()
  value = value.replace(/^['"]|['"]$/g, '').trim()
  value = value.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim()
  if (value.length === 0) throw new QwenPlanError('COOKIE_INVALID', 'empty cookie')
  if (value.length > COOKIE_LIMIT) throw new QwenPlanError('COOKIE_INVALID', 'cookie too large')
  if (/^sk-/i.test(value)) throw new QwenPlanError('COOKIE_INVALID', 'this is an API key, not a browser cookie')
  if (!value.includes('=')) throw new QwenPlanError('COOKIE_INVALID', 'cookie has no name=value pair')
  return value
}

function asObject(value) {
  if (typeof value === 'string') {
    try {
      return asObject(JSON.parse(value))
    } catch {
      return undefined
    }
  }
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : undefined
}

export function unwrapZelda(payload) {
  const root = asObject(payload)
  const outer = asObject(root?.data) ?? root
  const dataV2 = asObject(outer?.DataV2) ?? asObject(outer?.dataV2)
  let inner = asObject(dataV2?.data) ?? asObject(outer?.data)
  if (inner?.data !== undefined) {
    const nested = asObject(inner.data)
    if (nested) return nested
  }
  return inner
}

function finiteNumber(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : undefined
}

function usageFraction(value) {
  const numeric = finiteNumber(value)
  if (numeric === undefined || numeric < 0) return undefined
  return Math.max(0, Math.min(1, numeric <= 1 ? numeric : numeric / 100))
}

function usedPercent(value) {
  const fraction = usageFraction(value)
  if (fraction === undefined) return undefined
  const percent = fraction * 100
  return percent < 10 ? Math.round(percent * 10) / 10 : Math.round(percent)
}

function resetIso(value) {
  const numeric = finiteNumber(value)
  if (numeric === undefined || numeric <= 0) return undefined
  const millis = numeric < 1_000_000_000_000 ? numeric * 1000 : numeric
  const date = new Date(millis)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

function quotaFor(quota, specCode) {
  if (!quota) return {}
  const keys = [specCode, specCode?.toLowerCase(), specCode?.toUpperCase()].filter(Boolean)
  for (const key of keys) {
    const row = asObject(quota[key])
    if (row) return row
  }
  const fallback = Object.values(quota).find((value) => {
    const row = asObject(value)
    return row?.five_hour !== undefined || row?.weekly !== undefined || row?.monthly !== undefined
  })
  return asObject(fallback) ?? {}
}

export function assembleUsage(parts) {
  const subscription = unwrapZelda(parts.subscription) ?? {}
  const usage = unwrapZelda(parts.usage) ?? {}
  const quotaRoot = unwrapZelda(parts.quota) ?? {}
  const specCode = typeof subscription.specCode === 'string' ? subscription.specCode : undefined
  const quota = quotaFor(quotaRoot, specCode)
  const fiveTotal = finiteNumber(quota.five_hour ?? quota.fiveHour)
  const weekTotal = finiteNumber(quota.weekly ?? quota.week)
  const monthTotal = finiteNumber(quota.monthly ?? quota.month)
  const fiveFraction = usageFraction(usage.per5HourPercentage)
  const weekFraction = usageFraction(usage.per1WeekPercentage)
  const monthFraction = usageFraction(usage.per1MonthPercentage ?? usage.perMonthPercentage)
  const remainingDays = finiteNumber(subscription.remainingDays)
  const plan = specCode ? `Token Plan ${specCode}` : 'Token Plan'
  const usedOf = (fraction, total) => fraction !== undefined && total !== undefined ? Math.round(total * fraction) : undefined
  return {
    plan,
    status: typeof subscription.status === 'string' ? subscription.status : undefined,
    remainingDays: remainingDays !== undefined ? Math.max(0, Math.round(remainingDays)) : undefined,
    fiveHourPercent: usedPercent(usage.per5HourPercentage),
    fiveHourResetAt: resetIso(usage.per5HourResetTime),
    fiveHourTotal: fiveTotal,
    fiveHourUsed: usedOf(fiveFraction, fiveTotal),
    weekPercent: usedPercent(usage.per1WeekPercentage),
    weekResetAt: resetIso(usage.per1WeekResetTime),
    weekTotal,
    weekUsed: usedOf(weekFraction, weekTotal),
    monthPercent: usedPercent(usage.per1MonthPercentage ?? usage.perMonthPercentage),
    monthResetAt: resetIso(usage.per1MonthResetTime ?? usage.perMonthResetTime),
    monthTotal,
    monthUsed: usedOf(monthFraction, monthTotal),
  }
}

function safeMessage(error) {
  return String(error instanceof Error ? error.message : error)
    .replace(/sk-[A-Za-z0-9._-]{6,}/g, 'sk-REDACTED')
    .replace(/sec_token=[^&\s]+/gi, 'sec_token=REDACTED')
    .slice(0, 180)
}

function errorCode(error) {
  if (error instanceof QwenPlanError) return error.code
  const message = safeMessage(error)
  if (/ConsoleNeedLogin|HTTP 401|HTTP 403|HTTP 302/.test(message)) return 'SIGN_IN_REQUIRED'
  return message || 'UPSTREAM_FAILED'
}

async function readJson(response) {
  const text = await response.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    throw new QwenPlanError('UPSTREAM_FAILED', `Qwen returned non-JSON HTTP ${response.status}`)
  }
}

async function consoleGet(url, cookie) {
  const response = await fetch(url, {
    redirect: 'manual',
    signal: AbortSignal.timeout(20_000),
    headers: {
      cookie,
      accept: 'application/json',
    },
  })
  if (response.status >= 300 && response.status < 400) {
    throw new QwenPlanError('SIGN_IN_REQUIRED', `Qwen HTTP ${response.status}`)
  }
  const body = await readJson(response)
  if (!response.ok || body.code === 'ConsoleNeedLogin') {
    throw new QwenPlanError(
      response.status === 401 || response.status === 403 || body.code === 'ConsoleNeedLogin'
        ? 'SIGN_IN_REQUIRED'
        : 'UPSTREAM_FAILED',
      `Qwen HTTP ${response.status}`,
    )
  }
  return body
}

async function secToken(cookie) {
  const body = await consoleGet(USER_INFO_URL, cookie)
  const token = body?.data?.secToken
  if (typeof token !== 'string' || token.length === 0) {
    throw new QwenPlanError('SIGN_IN_REQUIRED', 'Qwen session has no sec_token')
  }
  return token
}

async function callBailian(cookie, token, api) {
  const params = {
    Api: api,
    V: '1.0',
    Data: {
      commodityCode: COMMODITY_CODE,
      cornerstoneParam: {
        domain: 'home.qwencloud.com',
        consoleSite: 'QWENCLOUD',
        console: 'ONE_CONSOLE',
        xsp_lang: 'en',
        protocol: 'V2',
        productCode: 'p_efm',
      },
    },
  }
  const body = new URLSearchParams({
    product: 'sfm_bailian',
    action: 'IntlBroadScopeAspnGateway',
    sec_token: token,
    region: 'ap-southeast-1',
    params: JSON.stringify(params),
  })
  const url = `${BAILIAN_URL}?product=sfm_bailian&action=IntlBroadScopeAspnGateway&api=${encodeURIComponent(api)}`
  const response = await fetch(url, {
    method: 'POST',
    redirect: 'manual',
    signal: AbortSignal.timeout(20_000),
    headers: {
      cookie,
      accept: 'application/json',
      'content-type': 'application/x-www-form-urlencoded',
      origin: 'https://home.qwencloud.com',
      referer: 'https://home.qwencloud.com/billing/subscription/token-plan-individual',
    },
    body,
  })
  if (response.status >= 300 && response.status < 400) {
    throw new QwenPlanError('SIGN_IN_REQUIRED', `Qwen HTTP ${response.status}`)
  }
  const payload = await readJson(response)
  if (!response.ok || payload.code === 'ConsoleNeedLogin') {
    throw new QwenPlanError(
      response.status === 401 || response.status === 403 || payload.code === 'ConsoleNeedLogin'
        ? 'SIGN_IN_REQUIRED'
        : 'UPSTREAM_FAILED',
      `Qwen HTTP ${response.status}`,
    )
  }
  return payload
}

export function loginProfileDir() {
  return path.join(os.homedir(), '.dsh', 'qwen-plan-usage', 'edge-profile')
}

function browserCandidates() {
  const local = process.env.LOCALAPPDATA
  const programFiles = process.env.ProgramFiles
  const programFilesX86 = process.env['ProgramFiles(x86)']
  if (process.platform === 'win32') {
    return [
      programFilesX86 && path.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      programFiles && path.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      local && path.join(local, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      programFiles && path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      local && path.join(local, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    ].filter(Boolean)
  }
  if (process.platform === 'darwin') {
    return [
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    ]
  }
  return []
}

export function findBrowser() {
  const installed = browserCandidates().find((candidate) => existsSync(candidate))
  if (installed) return installed
  if (process.platform === 'linux') {
    return [
      '/usr/bin/microsoft-edge',
      '/usr/bin/microsoft-edge-stable',
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
    ].find((candidate) => existsSync(candidate))
  }
  return undefined
}

export function cookieHeaderFromList(cookies) {
  const pairs = []
  const seen = new Set()
  for (const cookie of cookies ?? []) {
    const domain = String(cookie?.domain ?? '')
    if (!domain.includes('qwencloud.com') && !domain.includes('qianwenai.com')) continue
    const name = String(cookie?.name ?? '')
    const value = cookie?.value
    if (name.length === 0 || /[\s;,]/.test(name) || typeof value !== 'string' || value.includes(';')) continue
    if (seen.has(name)) continue
    seen.add(name)
    pairs.push(`${name}=${value}`)
  }
  return pairs.join('; ')
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      server.close(() => resolve(port))
    })
  })
}

function delay(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new QwenPlanError('CANCELLED', 'cancelled'))
    }, { once: true })
  })
}

function stopBrowser(profileDir) {
  const marker = profileDir.replace(/'/g, "''")
  const command = process.platform === 'win32'
    ? [
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-Command',
          `Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*${marker}*' -and $_.Name -match '^(msedge|chrome)\\.exe$' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`],
      ]
    : ['pkill', ['-f', profileDir]]
  return new Promise((resolve) => {
    const child = spawn(command[0], command[1], { windowsHide: true, stdio: 'ignore' })
    let settled = false
    const done = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve()
    }
    const timer = setTimeout(() => {
      child.kill()
      done()
    }, 15000)
    child.once('exit', done)
    child.once('error', done)
  })
}

async function waitForDebugger(port, signal) {
  const deadline = Date.now() + 20_000
  while (Date.now() < deadline) {
    if (signal.aborted) throw new QwenPlanError('CANCELLED', 'cancelled')
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`, { signal: AbortSignal.timeout(1000) })
      if (response.ok) {
        const body = await response.json()
        if (typeof body.webSocketDebuggerUrl === 'string') return body.webSocketDebuggerUrl
      }
    } catch {
      /* Edge is still starting */
    }
    await delay(300, signal)
  }
  throw new QwenPlanError('BROWSER_FAILED', 'Edge debugger did not start')
}

function readDebuggerCookies(wsUrl, signal) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl)
    const timer = setTimeout(() => {
      ws.close()
      reject(new QwenPlanError('BROWSER_FAILED', 'cookie read timed out'))
    }, 8000)
    const finish = (error, cookies) => {
      clearTimeout(timer)
      ws.close()
      if (error) reject(error)
      else resolve(cookies)
    }
    signal.addEventListener('abort', () => finish(new QwenPlanError('CANCELLED', 'cancelled')), { once: true })
    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({ id: 1, method: 'Storage.getCookies' }))
    })
    ws.addEventListener('message', (event) => {
      let message
      try {
        message = JSON.parse(String(event.data))
      } catch {
        finish(new QwenPlanError('BROWSER_FAILED', 'debugger returned invalid JSON'))
        return
      }
      if (message.id !== 1) return
      if (message.error) {
        finish(new QwenPlanError('BROWSER_FAILED', 'debugger refused cookie read'))
        return
      }
      finish(undefined, Array.isArray(message.result?.cookies) ? message.result.cookies : [])
    })
    ws.addEventListener('error', () => finish(new QwenPlanError('BROWSER_FAILED', 'debugger connection failed')))
  })
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > COOKIE_LIMIT + 1024) {
        reject(new QwenPlanError('COOKIE_INVALID', 'cookie too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

/** @param {any} ctx */
export function apply(ctx) {
  /** @type {undefined | {at: number, data: any}} */
  let cache
  /** @type {{status: string, error: string | null, controller: AbortController | null}} */
  let login = { status: 'idle', error: null, controller: null }

  const readCookie = async () => {
    const record = await ctx.credentials.readRecord(CREDENTIAL_KEY)
    const payload = record?.kind === 'grant' ? record.payload : undefined
    if (!payload || typeof payload !== 'object' || payload.type !== 'cookie') return undefined
    if (typeof payload.cookie !== 'string' || payload.cookie.length === 0) return undefined
    return payload.cookie
  }

  const configured = async () => {
    try {
      const record = await ctx.credentials.describeRecord(CREDENTIAL_KEY)
      return record?.configured === true
    } catch (error) {
      ctx.logger.warn('qwen-plan-usage: failed to describe the session record')
      ctx.logger.warn(safeMessage(error))
      return false
    }
  }

  const saveCookie = async (cookie) => {
    await ctx.credentials.modifyRecord(CREDENTIAL_KEY, async () => ({
      kind: 'grant',
      payload: { type: 'cookie', cookie },
    }))
  }

  const loadUsage = async (cookie) => {
    const token = await secToken(cookie)
    const [usage, subscription, quota] = await Promise.all([
      callBailian(cookie, token, USAGE_API),
      callBailian(cookie, token, SUBSCRIPTION_API),
      callBailian(cookie, token, QUOTA_API),
    ])
    const assembled = assembleUsage({ usage, subscription, quota })
    if (assembled.fiveHourPercent === undefined && assembled.weekPercent === undefined && assembled.monthPercent === undefined) {
      throw new QwenPlanError('NO_USAGE', 'Qwen returned no usage percentages')
    }
    return assembled
  }

  const usageView = async (force = false) => {
    const signedIn = await configured()
    if (!signedIn) {
      return { signedIn: false, error: 'SIGN_IN_REQUIRED', fetchedAt: Date.now() }
    }
    if (!force && cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data
    const cookie = await readCookie()
    if (!cookie) return { signedIn: false, error: 'SIGN_IN_REQUIRED', fetchedAt: Date.now() }
    try {
      const data = {
        signedIn: true,
        ...await loadUsage(cookie),
        error: null,
        fetchedAt: Date.now(),
      }
      cache = { at: Date.now(), data }
      return data
    } catch (error) {
      const data = {
        signedIn: true,
        error: errorCode(error),
        fetchedAt: Date.now(),
      }
      return data
    }
  }

  const snapshot = async () => ({
    configured: await configured(),
    status: login.status,
    error: login.error,
  })

  const openEdgeLogin = async (signal) => {
    const browser = findBrowser()
    const profileDir = loginProfileDir()
    if (!browser) throw new QwenPlanError('BROWSER_MISSING', 'Edge or Chrome was not found')
    await stopBrowser(profileDir)
    if (signal.aborted) throw new QwenPlanError('CANCELLED', 'cancelled')
    await mkdir(profileDir, { recursive: true })
    const port = await freePort()
    const child = spawn(browser, [
      `--user-data-dir=${profileDir}`,
      `--remote-debugging-port=${port}`,
      '--remote-debugging-address=127.0.0.1',
      `--remote-allow-origins=*`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-sync',
      '--new-window',
      BILLING_URL,
    ], { detached: false, windowsHide: false, stdio: 'ignore' })
    child.unref()
    try {
      const wsUrl = await waitForDebugger(port, signal)
      const deadline = Date.now() + LOGIN_TIMEOUT_MS
      while (Date.now() < deadline) {
        if (signal.aborted) throw new QwenPlanError('CANCELLED', 'cancelled')
        let header = ''
        try {
          header = cookieHeaderFromList(await readDebuggerCookies(wsUrl, signal))
        } catch (error) {
          if (error instanceof QwenPlanError && error.code === 'CANCELLED') throw error
          ctx.logger.warn('qwen-plan-usage: cookie read failed; keeping the login window open')
          ctx.logger.warn(safeMessage(error))
        }
        if (header.includes('=')) {
          try {
            const usage = await loadUsage(header)
            await saveCookie(header)
            cache = { at: Date.now(), data: { signedIn: true, ...usage, error: null, fetchedAt: Date.now() } }
            return
          } catch (error) {
            if (error instanceof QwenPlanError && error.code === 'CANCELLED') throw error
            if (!(error instanceof QwenPlanError) || (error.code !== 'SIGN_IN_REQUIRED' && error.code !== 'UPSTREAM_FAILED' && error.code !== 'NO_USAGE')) {
              ctx.logger.warn('qwen-plan-usage: usage check failed; keeping the login window open')
              ctx.logger.warn(safeMessage(error))
            }
          }
        }
        await delay(2000, signal)
      }
      throw new QwenPlanError('LOGIN_TIMEOUT', 'login timed out')
    } finally {
      await stopBrowser(profileDir)
    }
  }

  const startBrowserLogin = () => {
    if (login.status === 'pending') return
    const controller = new AbortController()
    login = { status: 'pending', error: null, controller }
    openEdgeLogin(controller.signal).then(() => {
      if (login.controller !== controller) return
      login = { status: 'authorized', error: null, controller: null }
    }).catch((error) => {
      if (login.controller !== controller) return
      login = {
        status: controller.signal.aborted ? 'cancelled' : 'failed',
        error: errorCode(error),
        controller: null,
      }
    })
  }

  const cancelBrowserLogin = async () => {
    login.controller?.abort()
    login = { status: 'cancelled', error: null, controller: null }
    await stopBrowser(loginProfileDir())
  }

  const originAllowed = (req) => {
    const origin = req.headers.origin
    if (typeof origin !== 'string' || origin.length === 0) return true
    const host = req.headers.host
    if (typeof host !== 'string' || host.length === 0) return false
    try {
      return new URL(origin).host === host
    } catch {
      return false
    }
  }

  const sendJson = (res, status, body) => {
    const payload = JSON.stringify(body)
    res.writeHead(status, {
      'content-type': 'application/json; charset=utf-8',
      'content-length': Buffer.byteLength(payload),
      'cache-control': 'no-store',
    })
    res.end(payload)
  }

  const route = (path, handler) => {
    const wrapped = async (req, res) => {
      try {
        if (!originAllowed(req)) {
          sendJson(res, 403, { ok: false, error: 'forbidden origin' })
          return
        }
        if ((req.method ?? 'GET').toUpperCase() !== handler.method) {
          sendJson(res, 405, { ok: false, error: 'method not allowed' })
          return
        }
        sendJson(res, 200, { ok: true, ...(await handler.run(req)) })
      } catch (error) {
        ctx.logger.warn('qwen-plan-usage: request handler failed')
        ctx.logger.warn(safeMessage(error))
        const code = error instanceof QwenPlanError ? error.code : 'UPSTREAM_FAILED'
        sendJson(res, error instanceof QwenPlanError && error.code === 'COOKIE_INVALID' ? 400 : 500, {
          ok: false,
          error: code,
        })
      }
    }
    return ctx.webServer.register({ kind: 'exact', path, handler: wrapped })
  }

  ctx.effect(() => {
    const disposers = [
      route('/qwen-plan/state', { method: 'GET', run: snapshot }),
      route('/qwen-plan/usage', {
        method: 'GET',
        run: async (req) => {
          const url = new URL(req.url ?? '/', 'http://x')
          return { ...(await snapshot()), usage: await usageView(url.searchParams.get('refresh') === '1') }
        },
      }),
      route('/qwen-plan/login', {
        method: 'POST',
        run: async () => {
          startBrowserLogin()
          return snapshot()
        },
      }),
      route('/qwen-plan/cancel', {
        method: 'POST',
        run: async () => {
          await cancelBrowserLogin()
          return snapshot()
        },
      }),
      route('/qwen-plan/sign-in', {
        method: 'POST',
        run: async (req) => {
          const raw = await readBody(req)
          let parsed
          try {
            parsed = JSON.parse(raw || '{}')
          } catch {
            throw new QwenPlanError('COOKIE_INVALID', 'sign-in body is not JSON')
          }
          const cookie = normalizeCookie(parsed?.cookie)
          await loadUsage(cookie)
          await saveCookie(cookie)
          cache = undefined
          return { ...(await snapshot()), usage: await usageView(true) }
        },
      }),
      route('/qwen-plan/sign-out', {
        method: 'POST',
        run: async () => {
          cache = undefined
          try {
            await ctx.credentials.deleteRecord(CREDENTIAL_KEY)
          } catch (error) {
            ctx.logger.warn('qwen-plan-usage: failed to delete the session record')
            ctx.logger.warn(safeMessage(error))
          }
          return snapshot()
        },
      }),
    ]
    return () => {
      login.controller?.abort()
      void stopBrowser(loginProfileDir())
      for (const dispose of disposers) dispose()
    }
  }, 'qwen-plan-usage: host routes')
}
