## Deterministic toolchain installs in Dockerfile

Use architecture-aware pinned URLs/checksums and SHA-256 verification before extracting/installing language toolchains.

```Dockerfile
ARG JAVA24_AMD64_URL=https://github.com/adoptium/temurin24-binaries/releases/download/jdk-24.0.2%2B12/OpenJDK24U-jdk_x64_linux_hotspot_24.0.2_12.tar.gz
ARG JAVA24_AMD64_SHA256=aea1cc55e51cf651c85f2f00ad021603fe269c4bb6493fa97a321ad770c9b096
ARG JAVA24_ARM64_URL=https://github.com/adoptium/temurin24-binaries/releases/download/jdk-24.0.2%2B12/OpenJDK24U-jdk_aarch64_linux_hotspot_24.0.2_12.tar.gz
ARG JAVA24_ARM64_SHA256=6f8725d186d05c627176db9c46c732a6ef3ba41d9e9b3775c4727fc8ac642bb2

RUN debian_arch="$(dpkg --print-architecture)" \
  && case "${debian_arch}" in \
    amd64) java24_url="${JAVA24_AMD64_URL}"; java24_sha256="${JAVA24_AMD64_SHA256}" ;; \
    arm64) java24_url="${JAVA24_ARM64_URL}"; java24_sha256="${JAVA24_ARM64_SHA256}" ;; \
    *) echo "Error: unsupported architecture for Java 24 install: ${debian_arch}" >&2; exit 1 ;; \
  esac \
  && curl -fsSL "${java24_url}" -o /tmp/java24.tar.gz \
  && echo "${java24_sha256}  /tmp/java24.tar.gz" | sha256sum -c - \
  && mkdir -p /opt/java \
  && tar -xzf /tmp/java24.tar.gz -C /opt/java \
  && mv /opt/java/jdk-24.0.2+12 /opt/java/jdk-24
```

```Dockerfile
ARG RUSTUP_VERSION=1.28.2
ARG RUSTUP_INIT_AMD64_SHA256=20a06e644b0d9bd2fbdbfd52d42540bdde820ea7df86e92e533c073da0cdd43c
ARG RUSTUP_INIT_ARM64_SHA256=e3853c5a252fca15252d07cb23a1bdd9377a8c6f3efa01531109281ae47f841c
ARG RUST_TOOLCHAIN=1.84.0

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
  && ln -sf "/usr/local/rustup/toolchains/${RUST_TOOLCHAIN}-${rustup_arch}/bin/cargo" /usr/local/bin/cargo
```
