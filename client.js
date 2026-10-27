window.__ModuleLoader__.load({
  id: '@local/dsh-qwen-plan-usage',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const NS = 'qwenPlanUsage'
    const BILLING_URL = 'https://home.qwencloud.com/billing/subscription/token-plan-individual'

    const zh = {
      title: 'Qwen Token Plan 用量',
      description: '顯示套餐用量。你個計劃回傳每月用量；如果有 5 小時或每週數據，都會一併顯示。',
      signedIn: '已連接',
      notSignedIn: '未連接',
      pending: '等待登入',
      signIn: '登入 Qwen Cloud',
      cancel: '取消登入',
      signOut: '退出並刪除 Cookie',
      refresh: '刷新',
      checking: '檢查緊…',
      loading: '讀取緊用量…',
      usageSignIn: '未有可用嘅登入 Cookie。',
      usageFailed: '暫時讀唔到用量。請再登入一次。',
      noUsage: 'Qwen 冇返回用量百分比。',
      cookieInvalid: '呢段唔似瀏覽器 Cookie。請複製 Request Headers 入面成條 Cookie，唔好貼 API Key。',
      browserMissing: '搵唔到 Edge 或 Chrome，所以開唔到登入視窗。',
      browserFailed: '登入視窗啟動失敗。請關閉殘留嘅登入視窗後再試。',
      loginTimeout: '5 分鐘內未完成登入，視窗已關閉。',
      cancelled: '已取消登入。',
      hostUnreachable: '連唔到插件後台，請刷新頁面。',
      waiting: '登入視窗已打開。請在嗰個視窗登入 Qwen Cloud，成功後呢度會自動更新。',
      privacy: '登入用獨立瀏覽器設定檔，唔會打開你日常瀏覽器。插件只讀 qwencloud.com 嘅 Cookie，存入本機憑證庫，然後關閉登入視窗。',
      pasteToggle: '改為手動貼上 Cookie',
      cookieLabel: 'Cookie',
      cookiePlaceholder: '貼上 home.qwencloud.com 請求入面成條 Cookie 值',
      saveCookie: '保存 Cookie',
      fiveHour: '5 小時用量',
      weekly: '每週用量',
      monthly: '每月用量',
      reset: '重設於 {time}',
      updated: '更新於 {time}',
      remainingDays: '剩餘 {days} 日',
      usedOf: '{used} / {total}',
    }

    const en = {
      title: 'Qwen Token Plan usage',
      description: 'Shows plan usage. This plan reports a monthly quota; 5-hour or weekly figures appear when Qwen returns them.',
      signedIn: 'Connected',
      notSignedIn: 'Not connected',
      pending: 'Waiting for sign-in',
      signIn: 'Sign in to Qwen Cloud',
      cancel: 'Cancel sign-in',
      signOut: 'Sign out and delete cookie',
      refresh: 'Refresh',
      checking: 'Checking…',
      loading: 'Reading usage…',
      usageSignIn: 'No usable login cookie.',
      usageFailed: 'Usage is unavailable. Sign in again.',
      noUsage: 'Qwen returned no usage percentages.',
      cookieInvalid: 'That does not look like a browser cookie. Copy the whole Cookie request header, not the API key.',
      browserMissing: 'Edge or Chrome was not found, so the sign-in window cannot open.',
      browserFailed: 'The sign-in window failed to start. Close any leftover sign-in window and try again.',
      loginTimeout: 'Sign-in was not completed within 5 minutes, so the window was closed.',
      cancelled: 'Sign-in cancelled.',
      hostUnreachable: 'The plugin host is unreachable. Refresh the page.',
      waiting: 'The sign-in window is open. Sign in to Qwen Cloud there; this card updates automatically.',
      privacy: 'Sign-in uses a dedicated browser profile, not your everyday browser. The plugin reads only qwencloud.com cookies, stores them locally, then closes the window.',
      pasteToggle: 'Paste a cookie instead',
      cookieLabel: 'Cookie',
      cookiePlaceholder: 'Paste the Cookie value from a home.qwencloud.com request',
      saveCookie: 'Save cookie',
      fiveHour: '5-hour usage',
      weekly: 'Weekly usage',
      monthly: 'Monthly usage',
      reset: 'Resets {time}',
      updated: 'Updated {time}',
      remainingDays: '{days} days left',
      usedOf: '{used} / {total}',
    }

    const api = async (path, options) => {
      const response = await fetch(path, {
        method: options?.method ?? 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: options?.body ? { 'content-type': 'application/json' } : undefined,
        body: options?.body,
      })
      let body
      try {
        body = await response.json()
      } catch {
        body = undefined
      }
      if (!response.ok || body === undefined || body.ok === false) {
        const message = body && typeof body.error === 'string' ? body.error : 'HTTP ' + response.status
        throw new Error(message)
      }
      return body
    }

    const fill = (text, values) =>
      Object.entries(values).reduce((result, [key, value]) => result.split('{' + key + '}').join(String(value)), text)

    const formatTime = (iso) => {
      if (typeof iso !== 'string' || iso.length === 0) return ''
      const date = new Date(iso)
      if (Number.isNaN(date.getTime())) return ''
      try {
        return new Intl.DateTimeFormat(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }).format(date)
      } catch {
        return date.toLocaleString()
      }
    }

    const formatCount = (value) => {
      const numeric = Number(value)
      if (!Number.isFinite(numeric)) return ''
      if (numeric >= 1_000_000) return (numeric / 1_000_000).toFixed(numeric % 1_000_000 === 0 ? 0 : 1) + 'M'
      if (numeric >= 1_000) return Math.round(numeric / 1_000) + 'K'
      return String(Math.round(numeric))
    }

    const errorText = (t, code) => {
      if (code === 'SIGN_IN_REQUIRED') return t('usageSignIn')
      if (code === 'COOKIE_INVALID') return t('cookieInvalid')
      if (code === 'NO_USAGE') return t('noUsage')
      if (code === 'BROWSER_MISSING') return t('browserMissing')
      if (code === 'BROWSER_FAILED') return t('browserFailed')
      if (code === 'LOGIN_TIMEOUT') return t('loginTimeout')
      if (code === 'CANCELLED') return t('cancelled')
      if (code === 'UPSTREAM_FAILED' || code === 'TOKEN_REFRESH_FAILED') return t('usageFailed')
      if (/failed to fetch|networkerror|load failed/i.test(String(code))) return t('hostUnreachable')
      return t('usageFailed')
    }

    function Meter(props) {
      const percent = Number.isFinite(Number(props.percent)) ? Math.max(0, Math.min(100, Number(props.percent))) : undefined
      const tone = percent === undefined ? 'idle' : percent >= 90 ? 'error' : percent >= 70 ? 'warn' : 'ok'
      const count = props.used !== undefined && props.total !== undefined
        ? fill(props.t('usedOf'), { used: formatCount(props.used), total: formatCount(props.total) })
        : ''
      const reset = props.resetAt ? fill(props.t('reset'), { time: formatTime(props.resetAt) }) : ''
      const meta = [count, reset].filter((part) => part.length > 0).join(' · ')
      return h(
        'div',
        { className: 'qwenPlan_meter' },
        h(
          'div',
          { className: 'qwenPlan_usageTop' },
          h('span', { className: 'qwenPlan_usageLabel' }, props.label),
          h('span', { className: 'qwenPlan_usageValue' }, percent === undefined ? '—' : percent + '%'),
        ),
        h(
          'div',
          { className: 'qwenPlan_bar', role: 'progressbar', 'aria-valuenow': percent ?? 0, 'aria-valuemin': 0, 'aria-valuemax': 100 },
          h('span', { className: 'qwenPlan_barFill qwenPlan_barFill_' + tone, style: { width: (percent ?? 0) + '%' } }),
        ),
        meta ? h('p', { className: 'qwenPlan_meta' }, meta) : null,
      )
    }

    function QwenCard(props) {
      const t = props.t
      const [snapshot, setSnapshot] = React.useState(null)
      const [usage, setUsage] = React.useState(null)
      const [cookie, setCookie] = React.useState('')
      const [showPaste, setShowPaste] = React.useState(false)
      const [busy, setBusy] = React.useState(false)
      const [localError, setLocalError] = React.useState(null)
      const mounted = React.useRef(true)

      const load = React.useCallback(async (force) => {
        try {
          const next = await api('/qwen-plan/usage' + (force ? '?refresh=1' : ''))
          if (!mounted.current) return
          setSnapshot({ configured: next.configured === true, status: next.status ?? 'idle', error: next.error ?? null })
          setUsage(next.usage ?? null)
          setLocalError(null)
        } catch (error) {
          if (!mounted.current) return
          setLocalError(errorText(t, error instanceof Error ? error.message : error))
        }
      }, [t])

      React.useEffect(() => {
        mounted.current = true
        load(false)
        return () => {
          mounted.current = false
        }
      }, [load])

      React.useEffect(() => {
        if (snapshot?.status !== 'pending') return undefined
        const timer = setInterval(() => load(false), 1500)
        return () => clearInterval(timer)
      }, [snapshot?.status, load])

      React.useEffect(() => {
        if (snapshot?.configured !== true) return undefined
        const timer = setInterval(() => load(false), 60_000)
        return () => clearInterval(timer)
      }, [snapshot?.configured, load])

      const startLogin = async () => {
        if (busy) return
        setBusy(true)
        setLocalError(null)
        try {
          const next = await api('/qwen-plan/login', { method: 'POST', body: '{}' })
          if (!mounted.current) return
          setSnapshot({ configured: next.configured === true, status: next.status ?? 'pending', error: next.error ?? null })
        } catch (error) {
          if (mounted.current) setLocalError(errorText(t, error instanceof Error ? error.message : error))
        } finally {
          if (mounted.current) setBusy(false)
        }
      }

      const cancelLogin = async () => {
        setLocalError(null)
        try {
          const next = await api('/qwen-plan/cancel', { method: 'POST', body: '{}' })
          if (!mounted.current) return
          setSnapshot({ configured: next.configured === true, status: next.status ?? 'cancelled', error: null })
        } catch (error) {
          if (mounted.current) setLocalError(errorText(t, error instanceof Error ? error.message : error))
        }
      }

      const save = async () => {
        if (busy) return
        setBusy(true)
        setLocalError(null)
        try {
          const next = await api('/qwen-plan/sign-in', {
            method: 'POST',
            body: JSON.stringify({ cookie }),
          })
          if (!mounted.current) return
          setCookie('')
          setSnapshot({ configured: next.configured === true, status: 'authorized', error: null })
          setUsage(next.usage ?? null)
        } catch (error) {
          if (mounted.current) setLocalError(errorText(t, error instanceof Error ? error.message : error))
        } finally {
          if (mounted.current) setBusy(false)
        }
      }

      const signOut = async () => {
        if (busy) return
        setBusy(true)
        setLocalError(null)
        try {
          await api('/qwen-plan/sign-out', { method: 'POST', body: '{}' })
          if (!mounted.current) return
          setUsage(null)
          setSnapshot({ configured: false, status: 'idle', error: null })
        } catch (error) {
          if (mounted.current) setLocalError(errorText(t, error instanceof Error ? error.message : error))
        } finally {
          if (mounted.current) setBusy(false)
        }
      }

      const configured = snapshot?.configured === true
      const pending = snapshot?.status === 'pending'
      const badge = snapshot === null ? t('checking') : pending ? t('pending') : configured ? t('signedIn') : t('notSignedIn')
      const tone = pending ? 'warn' : configured ? 'ok' : 'idle'
      const loginError = snapshot?.error ? errorText(t, snapshot.error) : null
      const usageError = usage?.error ? errorText(t, usage.error) : null
      const planBits = [
        usage?.plan,
        usage?.status,
        usage?.remainingDays !== undefined ? fill(t('remainingDays'), { days: usage.remainingDays }) : '',
      ].filter((part) => part && String(part).length > 0)

      return h(
        'section',
        { className: 'qwenPlan_card', 'data-plugin': 'qwen-plan-usage', 'aria-live': 'polite' },
        h(
          'div',
          { className: 'qwenPlan_header' },
          h('span', { className: 'qwenPlan_icon', 'aria-hidden': true }, 'Q'),
          h(
            'div',
            { className: 'qwenPlan_heading' },
            h(
              'div',
              { className: 'qwenPlan_titleRow' },
              h('h3', { className: 'qwenPlan_title' }, t('title')),
              h('span', { className: 'qwenPlan_badge qwenPlan_badge_' + tone }, badge),
            ),
            h('p', { className: 'qwenPlan_description' }, t('description')),
          ),
        ),
        configured
          ? h(
              'div',
              { className: 'qwenPlan_panel' },
              h('p', { className: 'qwenPlan_plan' }, planBits.length > 0 ? planBits.join(' · ') : t('loading')),
              [
                ['fiveHour', 'fiveHour'],
                ['weekly', 'week'],
                ['monthly', 'month'],
              ].filter(([, key]) => usage?.[key + 'Percent'] !== undefined).map(([label, key]) => h(Meter, {
                key,
                t,
                label: t(label),
                percent: usage[key + 'Percent'],
                resetAt: usage[key + 'ResetAt'],
                used: usage[key + 'Used'],
                total: usage[key + 'Total'],
              })),
              usageError && usage?.monthPercent === undefined && usage?.fiveHourPercent === undefined && usage?.weekPercent === undefined
                ? h('p', { className: 'qwenPlan_error' }, usageError)
                : null,
              usage?.fetchedAt
                ? h('p', { className: 'qwenPlan_meta' }, fill(t('updated'), { time: formatTime(new Date(usage.fetchedAt).toISOString()) }))
                : null,
            )
          : h(
              'div',
              { className: 'qwenPlan_panel' },
              h('p', { className: 'qwenPlan_meta' }, pending ? t('waiting') : t('privacy')),
              loginError ? h('p', { className: 'qwenPlan_error' }, loginError) : null,
              showPaste
                ? h(
                    React.Fragment,
                    null,
                    h('label', { className: 'qwenPlan_label', htmlFor: 'qwen-plan-cookie' }, t('cookieLabel')),
                    h('textarea', {
                      id: 'qwen-plan-cookie',
                      className: 'qwenPlan_input',
                      value: cookie,
                      placeholder: t('cookiePlaceholder'),
                      autoComplete: 'off',
                      spellCheck: false,
                      rows: 4,
                      onChange: (event) => setCookie(event.target.value),
                    }),
                  )
                : h('button', {
                    type: 'button',
                    className: 'qwenPlan_linkButton',
                    onClick: () => setShowPaste(true),
                  }, t('pasteToggle')),
            ),
        localError ? h('p', { className: 'qwenPlan_error' }, localError) : null,
        h(
          'div',
          { className: 'qwenPlan_actions' },
          pending
            ? h('button', { type: 'button', className: 'qwenPlan_button qwenPlan_secondary', onClick: cancelLogin }, t('cancel'))
            : configured
              ? h('button', { type: 'button', className: 'qwenPlan_button qwenPlan_secondary', disabled: busy, onClick: () => load(true) }, t('refresh'))
              : h('button', { type: 'button', className: 'qwenPlan_button qwenPlan_primary', disabled: busy, onClick: showPaste ? save : startLogin }, showPaste ? t('saveCookie') : t('signIn')),
          configured
            ? h('button', { type: 'button', className: 'qwenPlan_button qwenPlan_secondary', disabled: busy, onClick: signOut }, t('signOut'))
            : null,
        ),
      )
    }

    const css = `
      .qwenPlan_card{display:flex;flex-direction:column;gap:12px;margin-top:12px;padding:16px;border:1px solid var(--dsw-alias-border-l1,#e3e3e8);border-radius:12px;background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#18181b);font-size:13px;line-height:20px}
      .qwenPlan_header{display:flex;align-items:flex-start;gap:12px}
      .qwenPlan_icon{display:flex;flex:none;width:32px;height:32px;border-radius:9px;background:#4b2e83;color:#fff;align-items:center;justify-content:center;font-weight:700}
      .qwenPlan_heading{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1}
      .qwenPlan_titleRow{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
      .qwenPlan_title{margin:0;font-size:14px;line-height:20px;font-weight:600}
      .qwenPlan_badge{font-size:11px;line-height:18px;padding:0 8px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1,#e3e3e8);color:var(--dsw-alias-label-secondary,#666)}
      .qwenPlan_badge_ok{color:var(--dsw-alias-state-success-primary,#2e7d32);border-color:currentColor}
      .qwenPlan_badge_warn{color:var(--dsw-alias-state-warn-primary,#9a6700);border-color:currentColor}
      .qwenPlan_description,.qwenPlan_meta,.qwenPlan_stepsTitle{margin:0;color:var(--dsw-alias-label-secondary,#666);font-size:12px;line-height:18px}
      .qwenPlan_panel{display:flex;flex-direction:column;gap:8px;padding:12px;border:1px solid var(--dsw-alias-border-l1,#e3e3e8);border-radius:10px;background:var(--dsw-alias-bg-layer-2,#f5f5f7)}
      .qwenPlan_plan{margin:0;font-size:12px;font-weight:600}
      .qwenPlan_meter{display:flex;flex-direction:column;gap:4px}
      .qwenPlan_usageTop{display:flex;justify-content:space-between;align-items:baseline;gap:8px}
      .qwenPlan_usageLabel{font-size:12px;color:var(--dsw-alias-label-secondary,#666)}
      .qwenPlan_usageValue{font-size:18px;line-height:22px;font-weight:600;font-variant-numeric:tabular-nums}
      .qwenPlan_bar{height:6px;border-radius:999px;background:var(--dsw-alias-border-l1,#e3e3e8);overflow:hidden}
      .qwenPlan_barFill{display:block;height:100%;border-radius:inherit;background:#4b2e83}
      .qwenPlan_barFill_ok{background:var(--dsw-alias-state-success-primary,#2e7d32)}
      .qwenPlan_barFill_warn{background:var(--dsw-alias-state-warn-primary,#9a6700)}
      .qwenPlan_barFill_error{background:var(--dsw-alias-state-error-primary,#c62828)}
      .qwenPlan_steps{margin:0;padding-left:18px;font-size:12px;line-height:18px}
      .qwenPlan_label{font-size:12px;font-weight:600}
      .qwenPlan_input{width:100%;box-sizing:border-box;min-height:72px;resize:vertical;border:1px solid var(--dsw-alias-border-l2,#cfcfd6);border-radius:8px;padding:8px;font:inherit;font-size:12px;background:var(--dsw-alias-bg-base,#fff);color:inherit}
      .qwenPlan_actions{display:flex;gap:8px;flex-wrap:wrap}
      .qwenPlan_button{appearance:none;border:1px solid transparent;border-radius:8px;padding:6px 12px;font:inherit;font-size:12px;line-height:18px;cursor:pointer}
      .qwenPlan_button:disabled{opacity:.55;cursor:default}
      .qwenPlan_primary{background:#4b2e83;color:#fff}
      .qwenPlan_secondary{border-color:var(--dsw-alias-border-l2,#cfcfd6);background:transparent;color:inherit}
      .qwenPlan_link,.qwenPlan_linkButton{color:#4b2e83;font-size:12px;width:fit-content;background:transparent;border:0;padding:0;cursor:pointer;text-align:left}
      .qwenPlan_error{margin:0;color:var(--dsw-alias-state-error-primary,#c62828);font-size:12px;line-height:18px;overflow-wrap:anywhere}
    `

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'qwen-plan-usage: dictionaries')
        ctx.effect(() => {
          const tag = document.createElement('style')
          tag.dataset.plugin = 'qwen-plan-usage'
          tag.textContent = css
          document.head.appendChild(tag)
          return () => tag.remove()
        }, 'qwen-plan-usage: styles')
        ctx.slots.inject('settings.models.footer', () =>
          ctx.slots.register(
            {
              name: 'settings.models.footer',
              id: 'qwen-plan-usage',
              order: 25,
              locale: NS,
            },
            QwenCard,
          ),
        )
      },
    }
  },
})
