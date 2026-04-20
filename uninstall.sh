#!/usr/bin/env sh
set -eu

fail() {
  printf '%s\n' "$1" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

resolve_existing_path() {
  path_to_resolve="$1"
  resolved_dir=$(CDPATH= cd -- "$(dirname "$path_to_resolve")" 2>/dev/null && pwd -P) || return 1
  printf '%s/%s\n' "$resolved_dir" "$(basename "$path_to_resolve")"
}

resolve_symlink_target_path() {
  symlink_path="$1"
  link_target="$2"

  case "$link_target" in
    /*) target_path="$link_target" ;;
    *)
      symlink_dir=$(CDPATH= cd -- "$(dirname "$symlink_path")" 2>/dev/null && pwd -P) || return 1
      target_path="$symlink_dir/$link_target"
      ;;
  esac

  resolve_existing_path "$target_path"
}

require_command readlink

[ -n "${HOME:-}" ] || fail 'HOME is not set. Cannot determine uninstall path.'

script_root=$(CDPATH= cd -- "$(dirname "$0")" 2>/dev/null && pwd -P) || fail 'Unable to resolve script directory.'
expected_source_path="$script_root/bin/open-docker-nest.js"
[ -f "$expected_source_path" ] || fail "CLI source script not found: $expected_source_path"
[ -x "$expected_source_path" ] || fail "CLI source script is not executable: $expected_source_path"
expected_target=$(resolve_existing_path "$expected_source_path" 2>/dev/null || true)
[ -n "$expected_target" ] || fail "Unable to resolve CLI source path: $expected_source_path"
install_path="$HOME/.local/bin/open-docker-nest"

if [ ! -e "$install_path" ] && [ ! -L "$install_path" ]; then
  printf '%s\n' "open-docker-nest is not installed at $install_path"
  exit 0
fi

[ -L "$install_path" ] || fail "Refusing to remove non-symlink path: $install_path"

current_target_raw=$(readlink "$install_path" 2>/dev/null || true)
[ -n "$current_target_raw" ] || fail "Unable to read existing symlink target: $install_path"

current_target=$(resolve_symlink_target_path "$install_path" "$current_target_raw" 2>/dev/null || true)
[ -n "$current_target" ] || fail "Existing symlink target is invalid or inaccessible: $install_path -> $current_target_raw"

if [ "$current_target" != "$expected_target" ]; then
  fail "Refusing to remove unrelated symlink: $install_path -> $current_target_raw"
fi

rm "$install_path" || fail "Failed to remove symlink: $install_path"
printf '%s\n' "Uninstalled open-docker-nest from $install_path"
