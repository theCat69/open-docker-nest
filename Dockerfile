FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    bash \
    ca-certificates \
    git \
    openssh-client \
    tini \
    util-linux \
  && rm -rf /var/lib/apt/lists/*

RUN npm install --global "opencode-ai@1.14.17"

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
