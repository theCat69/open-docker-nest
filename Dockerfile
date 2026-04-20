FROM node:22-bookworm-slim

ARG CACHE_CTRL_VERSION=1.5.1
ARG BUN_VERSION=1.3.11

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    bash \
    ca-certificates \
    curl \
    gnupg \
    git \
    openssh-client \
    tini \
    util-linux \
  && install -m 0755 -d /etc/apt/keyrings \
  && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
  && chmod a+r /etc/apt/keyrings/docker.gpg \
  && . /etc/os-release \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian ${VERSION_CODENAME} stable" > /etc/apt/sources.list.d/docker.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends docker-ce-cli \
  && docker --version >/dev/null \
  && rm -rf /var/lib/apt/lists/*

RUN npm install --global "bun@${BUN_VERSION}" \
  && ln -sf /usr/local/lib/node_modules/bun/bin/bun.exe /usr/local/bin/bun \
  && bun --version >/dev/null

RUN npm install --global \
  "opencode-ai@1.14.17" \
  "@thecat69/cache-ctrl@${CACHE_CTRL_VERSION}" \
  && cache-ctrl version >/dev/null

RUN if ! getent group opencode >/dev/null; then groupadd opencode; fi \
  && if ! id -u opencode >/dev/null 2>&1; then useradd --gid opencode --create-home --shell /bin/bash opencode; fi

RUN mkdir -p /workspace \
  /home/opencode/.config/opencode \
  /home/opencode/.local/state/opencode \
  /home/opencode/.local/share/opencode \
  && chown -R opencode:opencode /workspace /home/opencode

COPY docker/user-map.sh /usr/local/bin/opencode-user-map
COPY docker/entrypoint.sh /usr/local/bin/opencode-entrypoint

RUN chmod +x /usr/local/bin/opencode-user-map /usr/local/bin/opencode-entrypoint

WORKDIR /workspace
ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/opencode-entrypoint"]
CMD ["opencode"]
