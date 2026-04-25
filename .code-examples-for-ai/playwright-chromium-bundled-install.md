## Pinned Playwright CLI with bounded browser bundle

Use a pinned Playwright npm version, install only Chromium support to keep image size bounded, and make bundled browser artifacts readable for the non-root runtime user.

```Dockerfile
ARG PLAYWRIGHT_VERSION=1.58.2
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

RUN npm install --global "playwright@${PLAYWRIGHT_VERSION}" \
  && playwright install --with-deps chromium \
  && chmod -R a+rX /ms-playwright \
  && playwright --version >/dev/null \
  && npm cache clean --force \
  && rm -rf /root/.npm /tmp/npm-* /tmp/.npm-*
```
