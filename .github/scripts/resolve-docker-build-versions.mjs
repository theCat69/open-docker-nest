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
  const assetsUrl = new URL(`https://api.adoptium.net/v3/assets/latest/${majorVersion}/hotspot`);
  assetsUrl.searchParams.set("architecture", "x64");
  assetsUrl.searchParams.set("heap_size", "normal");
  assetsUrl.searchParams.set("image_type", "jdk");
  assetsUrl.searchParams.set("os", "linux");
  assetsUrl.searchParams.set("project", "jdk");
  assetsUrl.searchParams.set("vendor", "eclipse");

  const assets = await fetchJson(assetsUrl.toString());
  const amd64 = assets[0];

  if (!amd64) {
    throw new Error(`Missing Adoptium x64 GA asset for Java ${majorVersion}`);
  }

  const releaseName = amd64.release_name;
  if (typeof releaseName !== "string" || releaseName.length === 0) {
    throw new Error(`Missing Adoptium release name for Java ${majorVersion}`);
  }

  const openJdkVersion = amd64.version?.openjdk_version;
  if (typeof openJdkVersion !== "string" || openJdkVersion.length === 0) {
    throw new Error(`Missing Adoptium OpenJDK version for Java ${majorVersion}`);
  }

  const amd64Package = amd64.binary?.package;
  if (
    typeof amd64Package?.link !== "string"
    || amd64Package.link.length === 0
    || typeof amd64Package.checksum !== "string"
    || amd64Package.checksum.length === 0
  ) {
    throw new Error(`Missing Adoptium package metadata for Java ${majorVersion} x64`);
  }

  return {
    majorVersion: String(majorVersion),
    resolvedVersion: openJdkVersion,
    dirname: releaseName,
    amd64: {
      url: amd64Package.link,
      sha256: amd64Package.checksum,
      packageName: amd64Package.name ?? null,
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
  const releaseManifestUrl = 'https://static.rust-lang.org/rustup/release-stable.toml';
  const releaseManifest = await fetchText(releaseManifestUrl);
  const versionLine = releaseManifest.match(/^version = '([^']+)'$/m);

  if (!versionLine) {
    throw new Error(`Could not find rustup version in ${releaseManifestUrl}`);
  }

  const version = extractFirstSemver(versionLine[1], 'rustup stable release manifest');
  const amd64Url = `https://static.rust-lang.org/rustup/archive/${version}/x86_64-unknown-linux-gnu/rustup-init`;
  const amd64Sha256 = await sha256ForUrl(amd64Url);

  return {
    version,
    source: releaseManifestUrl,
    amd64: {
      url: amd64Url,
      sha256: amd64Sha256,
    },
  };
}

async function resolveDockerCliRelease() {
  const amd64ListingUrl = 'https://download.docker.com/linux/static/stable/x86_64/';
  const amd64Listing = await fetchText(amd64ListingUrl);
  const amd64Versions = [...new Set([...amd64Listing.matchAll(/docker-(\d+\.\d+\.\d+)\.tgz/g)].map((match) => match[1]))];
  const versions = amd64Versions.sort(compareSemverDescending);
  const version = versions[0];

  if (!version) {
    throw new Error(`Could not determine the latest Docker CLI version from ${amd64ListingUrl}`);
  }

  const amd64Url = `https://download.docker.com/linux/static/stable/x86_64/docker-${version}.tgz`;
  const amd64Sha256 = await sha256ForUrl(amd64Url);

  return {
    version,
    source: amd64ListingUrl,
    amd64: {
      url: amd64Url,
      sha256: amd64Sha256,
    },
  };
}

async function resolveDockerBuildxRelease() {
  const release = await resolveGithubLatestRelease('docker', 'buildx');
  const version = release.tag_name;
  const amd64AssetName = `buildx-${version}.linux-amd64`;
  const amd64Asset = selectReleaseAsset(release, amd64AssetName);

  return {
    version,
    releaseUrl: release.html_url,
    amd64: {
      url: amd64Asset.browser_download_url,
      sha256: parseSha256Digest(amd64Asset.digest, amd64AssetName),
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

const [cacheCtrl, bun, playwright, java21, java25, rustToolchain, rustup, dockerCli, dockerBuildx] = await Promise.all([
  resolveNpmLatestVersion('@thecat69/cache-ctrl'),
  resolveNpmLatestVersion('bun'),
  resolveNpmLatestVersion('playwright'),
  resolveJavaRelease(21),
  resolveJavaRelease(25),
  resolveRustToolchainVersion(),
  resolveRustupRelease(),
  resolveDockerCliRelease(),
  resolveDockerBuildxRelease(),
]);

const buildArgsEntries = [
  ['CACHE_CTRL_VERSION', cacheCtrl.version],
  ['BUN_VERSION', bun.version],
  ['PLAYWRIGHT_VERSION', playwright.version],
  ['JAVA21_DIRNAME', java21.dirname],
  ['JAVA21_AMD64_URL', java21.amd64.url],
  ['JAVA21_AMD64_SHA256', java21.amd64.sha256],
  ['JAVA25_DIRNAME', java25.dirname],
  ['JAVA25_AMD64_URL', java25.amd64.url],
  ['JAVA25_AMD64_SHA256', java25.amd64.sha256],
  ['RUSTUP_VERSION', rustup.version],
  ['RUSTUP_INIT_AMD64_SHA256', rustup.amd64.sha256],
  ['RUST_TOOLCHAIN', rustToolchain.version],
  ['DOCKER_CLI_VERSION', dockerCli.version],
  ['DOCKER_CLI_AMD64_URL', dockerCli.amd64.url],
  ['DOCKER_CLI_AMD64_SHA256', dockerCli.amd64.sha256],
  ['DOCKER_BUILDX_VERSION', dockerBuildx.version],
  ['DOCKER_BUILDX_AMD64_URL', dockerBuildx.amd64.url],
  ['DOCKER_BUILDX_AMD64_SHA256', dockerBuildx.amd64.sha256],
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
  playwright,
  java: {
    java21,
    java25,
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
  ['playwright_version', playwright.version],
  ['java21_version', java21.resolvedVersion],
  ['java25_version', java25.resolvedVersion],
  ['rust_toolchain_version', rustToolchain.version],
  ['rustup_version', rustup.version],
  ['docker_cli_version', dockerCli.version],
  ['docker_buildx_version', dockerBuildx.version],
]);
