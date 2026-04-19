<!-- Focused excerpt from production Dockerfile; shows runtime wiring pattern, not the full build file. -->
```dockerfile
FROM node:22-bookworm-slim

RUN npm install --global "opencode-ai@1.14.17"  # Pin CLI version

RUN if ! getent group opencode >/dev/null; then groupadd opencode; fi \
  && if ! id -u opencode >/dev/null 2>&1; then useradd --gid opencode --create-home --shell /bin/bash opencode; fi

COPY docker/user-map.sh /usr/local/bin/opencode-user-map
COPY docker/entrypoint.sh /usr/local/bin/opencode-entrypoint

ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/opencode-entrypoint"]
CMD ["opencode"]
```
