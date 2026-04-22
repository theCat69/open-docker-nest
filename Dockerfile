FROM node:24-bookworm-slim

# These defaults keep local builds deterministic. The publish workflow may
# override them with freshly resolved pinned versions during CI rebuilds.
ARG CACHE_CTRL_VERSION=1.5.1
ARG BUN_VERSION=1.3.11
ARG JAVA21_DIRNAME=jdk-21.0.10+7
ARG JAVA21_AMD64_URL=https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.10%2B7/OpenJDK21U-jdk_x64_linux_hotspot_21.0.10_7.tar.gz
ARG JAVA21_AMD64_SHA256=ea3b9bd464d6dd253e9a7accf59f7ccd2a36e4aa69640b7251e3370caef896a4
ARG JAVA25_DIRNAME=jdk-25.0.3+9
ARG JAVA25_AMD64_URL=https://github.com/adoptium/temurin25-binaries/releases/download/jdk-25.0.3%2B9/OpenJDK25U-jdk_x64_linux_hotspot_25.0.3_9.tar.gz
ARG JAVA25_AMD64_SHA256=69264a7a211bf5029830d07bc3370f879769d62ebc5b5488e90c9343a2da0e1f
ARG RUSTUP_VERSION=1.28.2
ARG RUSTUP_INIT_AMD64_SHA256=20a06e644b0d9bd2fbdbfd52d42540bdde820ea7df86e92e533c073da0cdd43c
ARG RUSTUP_INIT_ARM64_SHA256=e3853c5a252fca15252d07cb23a1bdd9377a8c6f3efa01531109281ae47f841c
ARG RUST_TOOLCHAIN=1.84.0
ARG DOCKER_CLI_VERSION=29.4.1
ARG DOCKER_CLI_AMD64_URL=https://download.docker.com/linux/static/stable/x86_64/docker-29.4.1.tgz
ARG DOCKER_CLI_AMD64_SHA256=0fb3d2b72414ab862d68517f0b17b78c93c149d1c5c461acb969aacde1a2189d
ARG DOCKER_CLI_ARM64_URL=https://download.docker.com/linux/static/stable/aarch64/docker-29.4.1.tgz
ARG DOCKER_CLI_ARM64_SHA256=53cfa1de79155f27643014a84f1de94e2185239726b179b5c30523d62e565bb0
ARG DOCKER_BUILDX_VERSION=v0.33.0
ARG DOCKER_BUILDX_AMD64_URL=https://github.com/docker/buildx/releases/download/v0.33.0/buildx-v0.33.0.linux-amd64
ARG DOCKER_BUILDX_AMD64_SHA256=9426a15411f35f635afef3f5d3bae53155c3e30d26dee430cc968e13d34be49f
ARG DOCKER_BUILDX_ARM64_URL=https://github.com/docker/buildx/releases/download/v0.33.0/buildx-v0.33.0.linux-arm64
ARG DOCKER_BUILDX_ARM64_SHA256=204dc28447d3bb48f42ed1ce5747e0885cd57e306506a39029311becdb1ef786
ARG OPENCODE_VERSION=1.14.20

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    bash \
    ca-certificates \
    curl \
    git \
    openssh-client \
    tini \
    util-linux \
    ripgrep \
    jq \
  && rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/* /var/cache/apt/*.bin

RUN debian_arch="$(dpkg --print-architecture)" \
  && case "${debian_arch}" in \
    amd64) docker_cli_url="${DOCKER_CLI_AMD64_URL}"; docker_cli_sha256="${DOCKER_CLI_AMD64_SHA256}" ;; \
    arm64) docker_cli_url="${DOCKER_CLI_ARM64_URL}"; docker_cli_sha256="${DOCKER_CLI_ARM64_SHA256}" ;; \
    *) echo "Error: unsupported architecture for Docker CLI install: ${debian_arch}" >&2; exit 1 ;; \
  esac \
  && curl -fsSL "${docker_cli_url}" -o /tmp/docker.tgz \
  && echo "${docker_cli_sha256}  /tmp/docker.tgz" | sha256sum -c - \
  && tar -xzf /tmp/docker.tgz -C /tmp \
  && install -m 0755 /tmp/docker/docker /usr/local/bin/docker \
  && rm -rf /tmp/docker /tmp/docker.tgz \
  && docker --version >/dev/null

RUN buildx_plugin_dir=/usr/local/libexec/docker/cli-plugins \
  && debian_arch="$(dpkg --print-architecture)" \
  && case "${debian_arch}" in \
    amd64) docker_buildx_url="${DOCKER_BUILDX_AMD64_URL}"; docker_buildx_sha256="${DOCKER_BUILDX_AMD64_SHA256}" ;; \
    arm64) docker_buildx_url="${DOCKER_BUILDX_ARM64_URL}"; docker_buildx_sha256="${DOCKER_BUILDX_ARM64_SHA256}" ;; \
    *) echo "Error: unsupported architecture for Docker Buildx install: ${debian_arch}" >&2; exit 1 ;; \
  esac \
  && install -m 0755 -d "${buildx_plugin_dir}" \
  && curl -fsSL "${docker_buildx_url}" -o "${buildx_plugin_dir}/docker-buildx" \
  && echo "${docker_buildx_sha256}  ${buildx_plugin_dir}/docker-buildx" | sha256sum -c - \
  && chmod +x "${buildx_plugin_dir}/docker-buildx" \
  && docker buildx version >/dev/null

RUN npm install --global \
  "bun@${BUN_VERSION}" \
  "opencode-ai@${OPENCODE_VERSION}" \
  "@thecat69/cache-ctrl@${CACHE_CTRL_VERSION}" \
  && ln -sf /usr/local/lib/node_modules/bun/bin/bun.exe /usr/local/bin/bun \
  && bun --version >/dev/null \
  && cache-ctrl version >/dev/null \
  && npm cache clean --force \
  && rm -rf /root/.npm /tmp/npm-* /tmp/.npm-*

RUN debian_arch="$(dpkg --print-architecture)" \
  && if [ "${debian_arch}" != "amd64" ]; then echo "Error: Java toolchains are supported only for amd64 image builds. Received architecture: ${debian_arch}." >&2; exit 1; fi \
  && java21_url="${JAVA21_AMD64_URL}" \
  && java21_sha256="${JAVA21_AMD64_SHA256}" \
  && java25_url="${JAVA25_AMD64_URL}" \
  && java25_sha256="${JAVA25_AMD64_SHA256}" \
  && curl -fsSL "${java21_url}" -o /tmp/java21.tar.gz \
  && echo "${java21_sha256}  /tmp/java21.tar.gz" | sha256sum -c - \
  && curl -fsSL "${java25_url}" -o /tmp/java25.tar.gz \
  && echo "${java25_sha256}  /tmp/java25.tar.gz" | sha256sum -c - \
  && mkdir -p /opt/java \
  && tar -xzf /tmp/java21.tar.gz -C /opt/java \
  && tar -xzf /tmp/java25.tar.gz -C /opt/java \
  && mv "/opt/java/${JAVA21_DIRNAME}" /opt/java/jdk-21 \
  && mv "/opt/java/${JAVA25_DIRNAME}" /opt/java/jdk-25 \
  && ln -sfn /opt/java/jdk-21 /opt/java/default \
  && ln -sf /opt/java/default/bin/java /usr/local/bin/java \
  && ln -sf /opt/java/default/bin/javac /usr/local/bin/javac \
  && rm /tmp/java21.tar.gz /tmp/java25.tar.gz \
  && java -version >/dev/null \
  && javac -version >/dev/null

RUN debian_arch="$(dpkg --print-architecture)" \
  && case "${debian_arch}" in \
    amd64) rustup_arch="x86_64-unknown-linux-gnu"; rustup_init_sha256="${RUSTUP_INIT_AMD64_SHA256}" ;; \
    arm64) rustup_arch="aarch64-unknown-linux-gnu"; rustup_init_sha256="${RUSTUP_INIT_ARM64_SHA256}" ;; \
    *) echo "Error: unsupported architecture for Rust install: ${debian_arch}" >&2; exit 1 ;; \
  esac \
  && curl -fsSL "https://static.rust-lang.org/rustup/archive/${RUSTUP_VERSION}/${rustup_arch}/rustup-init" -o /tmp/rustup-init \
  && echo "${rustup_init_sha256}  /tmp/rustup-init" | sha256sum -c - \
  && chmod +x /tmp/rustup-init \
  && RUSTUP_HOME=/usr/local/rustup CARGO_HOME=/usr/local/cargo /tmp/rustup-init -y --profile minimal --default-toolchain "${RUST_TOOLCHAIN}" --no-modify-path \
  && ln -sf "/usr/local/rustup/toolchains/${RUST_TOOLCHAIN}-${rustup_arch}/bin/rustc" /usr/local/bin/rustc \
  && ln -sf "/usr/local/rustup/toolchains/${RUST_TOOLCHAIN}-${rustup_arch}/bin/cargo" /usr/local/bin/cargo \
  && rm /tmp/rustup-init \
  && rustc --version >/dev/null \
  && cargo --version >/dev/null

ENV JAVA_HOME=/opt/java/default
# Opencode enable LSP and EXA
ENV OPENCODE_EXPERIMENTAL_LSP_TOOL=true
ENV OPENCODE_ENABLE_EXA=1 

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
