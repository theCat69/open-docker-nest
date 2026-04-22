## Deterministic toolchain installs in Dockerfile

Use a repo-wide amd64-only image gate plus pinned amd64 URLs/checksums with SHA-256 verification before extracting/installing toolchains.

```Dockerfile
RUN debian_arch="$(dpkg --print-architecture)" \
  && if [ "${debian_arch}" != "amd64" ]; then echo "Error: open-docker-nest images support only amd64. Received architecture: ${debian_arch}." >&2; exit 1; fi
```

```Dockerfile
ARG JAVA21_DIRNAME=jdk-21.0.10+7
ARG JAVA21_AMD64_URL=https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.10%2B7/OpenJDK21U-jdk_x64_linux_hotspot_21.0.10_7.tar.gz
ARG JAVA21_AMD64_SHA256=ea3b9bd464d6dd253e9a7accf59f7ccd2a36e4aa69640b7251e3370caef896a4
ARG JAVA25_DIRNAME=jdk-25.0.3+9
ARG JAVA25_AMD64_URL=https://github.com/adoptium/temurin25-binaries/releases/download/jdk-25.0.3%2B9/OpenJDK25U-jdk_x64_linux_hotspot_25.0.3_9.tar.gz
ARG JAVA25_AMD64_SHA256=69264a7a211bf5029830d07bc3370f879769d62ebc5b5488e90c9343a2da0e1f

RUN curl -fsSL "${JAVA21_AMD64_URL}" -o /tmp/java21.tar.gz \
  && echo "${JAVA21_AMD64_SHA256}  /tmp/java21.tar.gz" | sha256sum -c - \
  && curl -fsSL "${JAVA25_AMD64_URL}" -o /tmp/java25.tar.gz \
  && echo "${JAVA25_AMD64_SHA256}  /tmp/java25.tar.gz" | sha256sum -c - \
  && mkdir -p /opt/java \
  && tar -xzf /tmp/java21.tar.gz -C /opt/java \
  && tar -xzf /tmp/java25.tar.gz -C /opt/java \
  && mv "/opt/java/${JAVA21_DIRNAME}" /opt/java/jdk-21 \
  && mv "/opt/java/${JAVA25_DIRNAME}" /opt/java/jdk-25 \
  && ln -sfn /opt/java/jdk-21 /opt/java/default
```

```Dockerfile
ARG RUSTUP_VERSION=1.28.2
ARG RUSTUP_INIT_AMD64_SHA256=20a06e644b0d9bd2fbdbfd52d42540bdde820ea7df86e92e533c073da0cdd43c
ARG RUST_TOOLCHAIN=1.84.0

RUN rustup_arch="x86_64-unknown-linux-gnu" \
  && curl -fsSL "https://static.rust-lang.org/rustup/archive/${RUSTUP_VERSION}/${rustup_arch}/rustup-init" -o /tmp/rustup-init \
  && echo "${RUSTUP_INIT_AMD64_SHA256}  /tmp/rustup-init" | sha256sum -c - \
  && chmod +x /tmp/rustup-init \
  && RUSTUP_HOME=/usr/local/rustup CARGO_HOME=/usr/local/cargo /tmp/rustup-init -y --profile minimal --default-toolchain "${RUST_TOOLCHAIN}" --no-modify-path \
  && ln -sf "/usr/local/rustup/toolchains/${RUST_TOOLCHAIN}-${rustup_arch}/bin/rustc" /usr/local/bin/rustc \
  && ln -sf "/usr/local/rustup/toolchains/${RUST_TOOLCHAIN}-${rustup_arch}/bin/cargo" /usr/local/bin/cargo
```
