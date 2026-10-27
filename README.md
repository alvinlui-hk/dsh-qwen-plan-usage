# Qwen Token Plan usage for DeepSeek Harness

Show your [Qwen Cloud](https://home.qwencloud.com) Token Plan usage in DeepSeek Harness. The card appears at the bottom of **Settings → Models**.

The inference API key cannot read plan quota. Sign-in opens a dedicated Edge or Chrome window, not your everyday browser. After you sign in, the plugin reads only `qwencloud.com` cookies and shows the quota Qwen actually returns: monthly, 5-hour, and weekly figures appear only when that field is present.

This is an unofficial plugin. It is not affiliated with Alibaba, Qwen, or DeepSeek. The usage endpoints are undocumented console APIs and can change.

## Install

From a DSH session, ask the agent to install this repository, or run:

```text
dsh plugin --profile desktop add github:alvinlui-hk/dsh-qwen-plan-usage
```

That command needs `git` on `PATH`. If `git` is not installed, use the tarball instead. It does not need Git:

```text
dsh plugin --profile desktop add https://codeload.github.com/alvinlui-hk/dsh-qwen-plan-usage/tar.gz/refs/heads/main
```

Use `--profile web` instead of `--profile desktop` if that is the profile with the Web UI.

Then restart DeepSeek Harness. Open **Settings → Models**, scroll to **Qwen Token Plan usage**, and choose **Sign in to Qwen Cloud**.

## 中文安裝

喺 DeepSeek Harness 對話貼上：

```text
請把這個 DSH 插件安裝到目前 profile 並啟用，不要登入、不要讀取任何 Cookie 或 API Key：
https://github.com/alvinlui-hk/dsh-qwen-plan-usage.git

如果 github: 安裝因為找不到 git 而失敗，改裝這個不需要 git 的壓縮包：
https://codeload.github.com/alvinlui-hk/dsh-qwen-plan-usage/tar.gz/refs/heads/main

裝完後重啟 DSH，到「設定 → 模型」最底找「Qwen Token Plan 用量」。
```

沒有 Git 的電腦也可以直接執行：

```text
dsh plugin --profile desktop add https://codeload.github.com/alvinlui-hk/dsh-qwen-plan-usage/tar.gz/refs/heads/main
```

## Requirements

- DeepSeek Harness `0.2.1` or later, with a Web UI profile.
- Microsoft Edge or Google Chrome.
- A Qwen Cloud account with a Token Plan. An inference API key alone is not enough.

Verified on DSH Desktop `0.2.1-rc.2` / `0.2.1-rc.3` and Windows Edge.

## Privacy

The sign-in profile lives in `~/.dsh/qwen-plan-usage/edge-profile`. Do not share that folder. The debugger listens only on `127.0.0.1` while the window is open. Cookies are stored in the DSH credential record `qwen-plan-usage/session` and are not shown again. Sign-out deletes that record and does not delete your inference API key.

See [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
