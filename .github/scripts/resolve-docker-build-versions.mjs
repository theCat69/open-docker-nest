import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { Readable } from 'node:stream';

const outputJsonPath = requireEnv('OUTPUT_JSON_PATH');
const outputBuildArgsPath = requireEnv('OUTPUT_BUILD_ARGS_PATH');
const opencodeVersion = requireEnv('OPENCODE_VERSION');
const githubOutputPath = process.env.GITHUB_OUTPUT ?? '';
const githubToken = process.env.GITHUB_TOKEN ?? '';

const githubHeaders = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'open-docker-nest-ci',
  ...(githubToken ? { Authorization: `Bearer ${githubToken}` } : {}),
};

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

async function sha256ForUrl(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }
  if (!response.body) {
    throw new Error(`No response body available for ${url}`);
  }

  const hash = createHash('sha256');
  const stream = Readable.fromWeb(response.body);

  for await (const chunk of stream) {
    hash.update(chunk);
  }

  return hash.digest('hex');
}

function compareSemverDescending(left, right) {
  const leftParts = left.split('.').map((part) => Number.parseInt(part, 10));
  const rightParts = right.split('.').map((part) => Number.parseInt(part, 10));
  const maxLength = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const leftPart = leftParts[index] ?? 0;
    const rightPart = rightParts[index] ?? 0;

    if (leftPart !== rightPart) {
      return rightPart - leftPart;
    }
  }

  return 0;
}

function extractFirstSemver(value, label) {
  const match = value.match(/\d+\.\d+\.\d+/);
  if (!match) {
    throw new Error(`Could not extract semantic version from ${label}: ${value}`);
  }
  return match[0];
}

function parseSha256Digest(value, label) {
  const match = value.match(/^sha256:([a-f0-9]{64})$/i);
  if (!match) {
    throw new Error(`Expected sha256 digest for ${label}, received: ${value}`);
  }
  return match[1].toLowerCase();
}

function intersectVersions(leftVersions, rightVersions) {
  const rightVersionSet = new Set(rightVersions);
  return leftVersions.filter((version) => rightVersionSet.has(version));
}

function selectReleaseAsset(release, assetName) {
  const asset = release.assets?.find((candidate) => candidate.name === assetName);
  if (!asset) {
    throw new Error(`Missing release asset ${assetName} in ${release.html_url ?? 'GitHub release'}`);
  }
  return asset;
}

async function resolveGithubLatestRelease(owner, repo) {
  const release = await fetchJson(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, {
    headers: githubHeaders,
  });

  if (release.draft || release.prerelease) {
    throw new Error(`Latest release for ${owner}/${repo} is not a stable published release`);
  }

  return release;
}

async function resolveNpmLatestVersion(packageName) {
  const encodedName = encodeURIComponent(packageName);
  const data = await fetchJson(`https://registry.npmjs.org/${encodedName}/latest`);
  const version = data.version;

  if (typeof version !== 'string' || version.length === 0) {
    throw new Error(`Missing latest npm version for ${packageName}`);
  }

  return {
    packageName,
    version,
    tarball: data.dist?.tarball ?? null,
    integrity: data.dist?.integrity ?? null,
  };
}

async function assertNpmPackageVersionExists(packageName, version) {
  const encodedName = encodeURIComponent(packageName);
  const encodedVersion = encodeURIComponent(version);
  await fetchJson(`https://registry.npmjs.org/${encodedName}/${encodedVersion}`);
}

async function resolveJavaRelease(majorVersion) {
  const baseUrl = `https://api.adoptium.net/v3/binary/latest/${majorVersion}/ga/linux`;
  const endBaseUrl = `jdk/hotspot/normal/eclipse?project=jdk`;
  const amd64Url = `${baseUrl}/x64/${endBaseUrl}`;
  const arm64Url = `${baseUrl}/arm/${endBaseUrl}`;

  const [amd64Assets, arm64Assets] = await Promise.all([
    fetchJson(amd64Url),
    fetchJson(arm64Url),
  ]);

  const amd64 = amd64Assets[0];
  const arm64 = arm64Assets[0];

  if (!amd64 || !arm64) {
    throw new Error(`Missing Adoptium GA assets for Java ${majorVersion}`);
  }

  const releaseName = amd64.release_name;
  if (!releaseName || releaseName !== arm64.release_name) {
    throw new Error(`Mismatched Adoptium release names for Java ${majorVersion}`);
  }

  const openJdkVersion = amd64.version?.openjdk_version;
  if (!openJdkVersion || openJdkVersion !== arm64.version?.openjdk_version) {
    throw new Error(`Mismatched Adoptium versions for Java ${majorVersion}`);
  }

  return {
    majorVersion: String(majorVersion),
    resolvedVersion: openJdkVersion,
    dirname: releaseName,
    amd64: {
      url: amd64.binary?.package?.link,
      sha256: amd64.binary?.package?.checksum,
      packageName: amd64.binary?.package?.name,
    },
    arm64: {
      url: arm64.binary?.package?.link,
      sha256: arm64.binary?.package?.checksum,
      packageName: arm64.binary?.package?.name,
    },
  };
}

async function resolveRustToolchainVersion() {
  const manifest = await fetchText('https://static.rust-lang.org/dist/channel-rust-stable.toml');
  const rustSection = manifest.match(/\[pkg\.rust\]([\s\S]*?)(?:\n\[|$)/);
  if (!rustSection) {
    throw new Error('Could not find [pkg.rust] in Rust stable manifest');
  }

  const versionLine = rustSection[1].match(/version = "([^"]+)"/);
  if (!versionLine) {
    throw new Error('Could not find Rust toolchain version in stable manifest');
  }

  return {
    version: extractFirstSemver(versionLine[1], 'Rust stable manifest'),
    source: 'https://static.rust-lang.org/dist/channel-rust-stable.toml',
  };
}

async function resolveRustupRelease() {
  const release = await resolveGithubLatestRelease('rust-lang', 'rustup');
  const version = release.tag_name.replace(/^v/, '');
  const amd64Url = `https://static.rust-lang.org/rustup/archive/${version}/x86_64-unknown-linux-gnu/rustup-init`;
  const arm64Url = `https://static.rust-lang.org/rustup/archive/${version}/aarch64-unknown-linux-gnu/rustup-init`;

  const [amd64Sha256, arm64Sha256] = await Promise.all([
    sha256ForUrl(amd64Url),
    sha256ForUrl(arm64Url),
  ]);

  return {
    version,
    releaseUrl: release.html_url,
    amd64: {
      url: amd64Url,
      sha256: amd64Sha256,
    },
    arm64: {
      url: arm64Url,
      sha256: arm64Sha256,
    },
  };
}

async function resolveDockerCliRelease() {
  const amd64ListingUrl = 'https://download.docker.com/linux/static/stable/x86_64/';
  const arm64ListingUrl = 'https://download.docker.com/linux/static/stable/aarch64/';
  const [amd64Listing, arm64Listing] = await Promise.all([
    fetchText(amd64ListingUrl),
    fetchText(arm64ListingUrl),
  ]);
  const amd64Versions = [...new Set([...amd64Listing.matchAll(/docker-(\d+\.\d+\.\d+)\.tgz/g)].map((match) => match[1]))];
  const arm64Versions = [...new Set([...arm64Listing.matchAll(/docker-(\d+\.\d+\.\d+)\.tgz/g)].map((match) => match[1]))];
  const versions = intersectVersions(amd64Versions, arm64Versions).sort(compareSemverDescending);
  const version = versions[0];

  if (!version) {
    throw new Error(`Could not determine a shared latest Docker CLI version from ${amd64ListingUrl} and ${arm64ListingUrl}`);
  }

  const amd64Url = `https://download.docker.com/linux/static/stable/x86_64/docker-${version}.tgz`;
  const arm64Url = `https://download.docker.com/linux/static/stable/aarch64/docker-${version}.tgz`;

  const [amd64Sha256, arm64Sha256] = await Promise.all([
    sha256ForUrl(amd64Url),
    sha256ForUrl(arm64Url),
  ]);

  return {
    version,
    source: `${amd64ListingUrl} + ${arm64ListingUrl}`,
    amd64: {
      url: amd64Url,
      sha256: amd64Sha256,
    },
    arm64: {
      url: arm64Url,
      sha256: arm64Sha256,
    },
  };
}

async function resolveDockerBuildxRelease() {
  const release = await resolveGithubLatestRelease('docker', 'buildx');
  const version = release.tag_name;
  const amd64AssetName = `buildx-${version}.linux-amd64`;
  const arm64AssetName = `buildx-${version}.linux-arm64`;
  const amd64Asset = selectReleaseAsset(release, amd64AssetName);
  const arm64Asset = selectReleaseAsset(release, arm64AssetName);

  return {
    version,
    releaseUrl: release.html_url,
    amd64: {
      url: amd64Asset.browser_download_url,
      sha256: parseSha256Digest(amd64Asset.digest, amd64AssetName),
    },
    arm64: {
      url: arm64Asset.browser_download_url,
      sha256: parseSha256Digest(arm64Asset.digest, arm64AssetName),
    },
  };
}

async function ensureParentDirectory(filePath) {
  await mkdir(dirname(filePath), { recursive: true });
}

async function appendGithubOutputs(entries) {
  if (!githubOutputPath) {
    return;
  }

  const serialized = entries
    .map(([name, value]) => {
      if (String(value).includes('\n')) {
        return `${name}<<EOF\n${value}\nEOF`;
      }

      return `${name}=${value}`;
    })
    .join('\n');

  await writeFile(githubOutputPath, `${serialized}\n`, { flag: 'a' });
}

await assertNpmPackageVersionExists('opencode-ai', opencodeVersion);

const [cacheCtrl, bun, java21, java24, rustToolchain, rustup, dockerCli, dockerBuildx] = await Promise.all([
  resolveNpmLatestVersion('@thecat69/cache-ctrl'),
  resolveNpmLatestVersion('bun'),
  resolveJavaRelease(21),
  resolveJavaRelease(24),
  resolveRustToolchainVersion(),
  resolveRustupRelease(),
  resolveDockerCliRelease(),
  resolveDockerBuildxRelease(),
]);

const buildArgsEntries = [
  ['CACHE_CTRL_VERSION', cacheCtrl.version],
  ['BUN_VERSION', bun.version],
  ['JAVA21_DIRNAME', java21.dirname],
  ['JAVA21_AMD64_URL', java21.amd64.url],
  ['JAVA21_AMD64_SHA256', java21.amd64.sha256],
  ['JAVA21_ARM64_URL', java21.arm64.url],
  ['JAVA21_ARM64_SHA256', java21.arm64.sha256],
  ['JAVA24_DIRNAME', java24.dirname],
  ['JAVA24_AMD64_URL', java24.amd64.url],
  ['JAVA24_AMD64_SHA256', java24.amd64.sha256],
  ['JAVA24_ARM64_URL', java24.arm64.url],
  ['JAVA24_ARM64_SHA256', java24.arm64.sha256],
  ['RUSTUP_VERSION', rustup.version],
  ['RUSTUP_INIT_AMD64_SHA256', rustup.amd64.sha256],
  ['RUSTUP_INIT_ARM64_SHA256', rustup.arm64.sha256],
  ['RUST_TOOLCHAIN', rustToolchain.version],
  ['DOCKER_CLI_VERSION', dockerCli.version],
  ['DOCKER_CLI_AMD64_URL', dockerCli.amd64.url],
  ['DOCKER_CLI_AMD64_SHA256', dockerCli.amd64.sha256],
  ['DOCKER_CLI_ARM64_URL', dockerCli.arm64.url],
  ['DOCKER_CLI_ARM64_SHA256', dockerCli.arm64.sha256],
  ['DOCKER_BUILDX_VERSION', dockerBuildx.version],
  ['DOCKER_BUILDX_AMD64_URL', dockerBuildx.amd64.url],
  ['DOCKER_BUILDX_AMD64_SHA256', dockerBuildx.amd64.sha256],
  ['DOCKER_BUILDX_ARM64_URL', dockerBuildx.arm64.url],
  ['DOCKER_BUILDX_ARM64_SHA256', dockerBuildx.arm64.sha256],
  ['OPENCODE_VERSION', opencodeVersion],
];

const buildArgsText = buildArgsEntries.map(([name, value]) => `${name}=${value}`).join('\n');

const resolvedVersions = {
  resolvedAt: new Date().toISOString(),
  opencode: {
    version: opencodeVersion,
  },
  cacheCtrl,
  bun,
  java: {
    java21,
    java24,
  },
  rust: {
    toolchain: rustToolchain,
    rustup,
  },
  docker: {
    cli: dockerCli,
    buildx: dockerBuildx,
  },
  buildArgs: Object.fromEntries(buildArgsEntries),
};

await Promise.all([
  ensureParentDirectory(outputJsonPath),
  ensureParentDirectory(outputBuildArgsPath),
]);

await Promise.all([
  writeFile(outputJsonPath, `${JSON.stringify(resolvedVersions, null, 2)}\n`),
  writeFile(outputBuildArgsPath, `${buildArgsText}\n`),
]);

await appendGithubOutputs([
  ['build_args', buildArgsText],
  ['json_path', outputJsonPath],
  ['build_args_path', outputBuildArgsPath],
  ['cache_ctrl_version', cacheCtrl.version],
  ['bun_version', bun.version],
  ['java21_version', java21.resolvedVersion],
  ['java24_version', java24.resolvedVersion],
  ['rust_toolchain_version', rustToolchain.version],
  ['rustup_version', rustup.version],
  ['docker_cli_version', dockerCli.version],
  ['docker_buildx_version', dockerBuildx.version],
]);
