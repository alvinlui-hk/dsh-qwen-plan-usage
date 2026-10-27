import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import { assembleUsage, cookieHeaderFromList, findBrowser, loginProfileDir, normalizeCookie } from '../index.js'

const monthly = assembleUsage({
  usage: { data: { DataV2: { data: { data: { per1MonthPercentage: 0.01278278, per1MonthResetTime: 1795190400000 } } } } },
  subscription: { data: { DataV2: { data: { data: { specCode: 'pro', status: 'VALID', remainingDays: 54 } } } } },
  quota: { data: { DataV2: { data: { data: { pro: { five_hour: 12000, monthly: 180000 } } } } } },
})
assert.equal(monthly.plan, 'Token Plan pro')
assert.equal(monthly.monthPercent, 1.3)
assert.equal(monthly.monthUsed, 2301)
assert.equal(monthly.monthTotal, 180000)
assert.equal(monthly.fiveHourPercent, undefined)
assert.equal(monthly.remainingDays, 54)

const windows = assembleUsage({
  usage: { data: { DataV2: { data: { data: { per5HourPercentage: 0.2, per1WeekPercentage: 0.5 } } } } },
  subscription: { data: { DataV2: { data: { data: { specCode: 'Lite' } } } } },
  quota: { data: { DataV2: { data: { data: { lite: { five_hour: 1000, weekly: 4000 } } } } } },
})
assert.equal(windows.fiveHourPercent, 20)
assert.equal(windows.weekPercent, 50)
assert.equal(windows.fiveHourUsed, 200)
assert.equal(windows.weekUsed, 2000)
assert.equal(windows.monthPercent, undefined)

const empty = assembleUsage({ usage: {}, subscription: {}, quota: {} })
assert.equal(empty.fiveHourPercent, undefined)
assert.equal(empty.weekPercent, undefined)
assert.equal(empty.monthPercent, undefined)

const header = cookieHeaderFromList([
  { name: 'login_qwencloud_ticket', value: 'ticket', domain: '.qwencloud.com' },
  { name: 'SID', value: 'nope', domain: '.google.com' },
  { name: 'bad name', value: 'x', domain: '.qwencloud.com' },
  { name: 'login_qwencloud_ticket', value: 'second', domain: '.qwencloud.com' },
])
assert.equal(header, 'login_qwencloud_ticket=ticket')

assert.equal(normalizeCookie('Cookie: a=b; c=d'), 'a=b; c=d')
assert.throws(() => normalizeCookie('sk-sp-example'), /API key/)
assert.equal(loginProfileDir(), path.join(os.homedir(), '.dsh', 'qwen-plan-usage', 'edge-profile'))
assert.equal(typeof findBrowser(), 'string')

console.log('PASS parse, cookie filter, profile path, browser lookup')
