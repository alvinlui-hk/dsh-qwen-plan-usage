# Security

This plugin reads a Qwen Cloud console session so it can show Token Plan usage. That session is broader than an inference API key.

- The sign-in browser uses a dedicated profile under the user's `~/.dsh/qwen-plan-usage/` directory. It does not open the everyday browser profile.
- The debugger listens only on `127.0.0.1`, and only while the sign-in window is open.
- Cookies are filtered to `qwencloud.com` and `qianwenai.com`, stored in the DSH credential record `qwen-plan-usage/session`, and are not returned to the settings page.
- Requests go only to `home.qwencloud.com` and `cs-data.qwencloud.com`.
- Sign-out deletes that credential record. It does not delete the Qwen account or the inference API key.

Do not paste access tokens, refresh tokens, or `~/.dsh/.credentials.yaml` into issues. Report security problems privately to the repository owner.
