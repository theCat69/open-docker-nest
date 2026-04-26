## Pinned Playwright CLI with bounded browser bundle

Use a pinned Playwright npm version, install only Chromium support to keep image size bounded, add a Chrome-channel compatibility launcher that delegates to bundled Chromium, and make bundled browser artifacts readable for the non-root runtime user.

```Dockerfile
ARG PLAYWRIGHT_VERSION=1.58.2
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

RUN npm install --global "playwright@${PLAYWRIGHT_VERSION}" \
  && playwright install --with-deps chromium \
  && install -d -m 0755 /opt/google/chrome \
  && cat <<'EOF' > /opt/google/chrome/chrome
#!/usr/bin/env bash
set -euo pipefail

for chromium_binary in /ms-playwright/chromium-*/chrome-linux/chrome; do
  if [ -x "${chromium_binary}" ]; then
    exec "${chromium_binary}" "$@"
  fi
done

echo "Error: bundled Playwright Chromium executable was not found under /ms-playwright." >&2
exit 1
EOF
  && chmod 0755 /opt/google/chrome/chrome \
  && chmod -R a+rX /ms-playwright \
  && playwright --version >/dev/null \
  && npm cache clean --force \
  && rm -rf /root/.npm /tmp/npm-* /tmp/.npm-*
```
