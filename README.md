# Qwen Token Plan usage for DeepSeek Harness

Show your [Qwen Cloud](https://home.qwencloud.com) Token Plan usage in DeepSeek Harness. The card appears at the bottom of **Settings → Models**.

The inference API key cannot read plan quota. Sign-in opens a dedicated Edge or Chrome window, not your everyday browser. After you sign in, the plugin reads only `qwencloud.com` cookies and shows the quota Qwen actually returns: monthly, 5-hour, and weekly figures appear only when that field is present.

This is an unofficial plugin. It is not affiliated with Alibaba, Qwen, or DeepSeek. The usage endpoints are undocumented console APIs and can change.

## Install

From a DSH session, ask the agent to install this Git repository, or run:

```text
dsh plugin --profile desktop add github:alvinlui-hk/dsh-qwen-plan-usage
```

Use `--profile web` instead of `--profile desktop` if that is the profile with the Web UI.

Then restart DeepSeek Harness. Open **Settings → Models**, scroll to **Qwen Token Plan usage**, and choose **Sign in to Qwen Cloud**.

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
