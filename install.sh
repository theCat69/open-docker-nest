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

[ -n "${HOME:-}" ] || fail 'HOME is not set. Cannot determine install path.'

script_root=$(CDPATH= cd -- "$(dirname "$0")" 2>/dev/null && pwd -P) || fail 'Unable to resolve installer directory.'
source_script_path="$script_root/bin/open-docker-nest.js"
install_dir="$HOME/.local/bin"
install_path="$install_dir/open-docker-nest"

[ -f "$source_script_path" ] || fail "CLI source script not found: $source_script_path"
[ -x "$source_script_path" ] || fail "CLI source script is not executable: $source_script_path"

mkdir -p "$install_dir" || fail "Unable to create install directory: $install_dir"

expected_target=$(resolve_existing_path "$source_script_path") || fail "Unable to resolve CLI source path: $source_script_path"

if [ -e "$install_path" ] || [ -L "$install_path" ]; then
  [ -L "$install_path" ] || fail "Refusing to overwrite non-symlink path: $install_path"

  current_target_raw=$(readlink "$install_path" 2>/dev/null || true)
  [ -n "$current_target_raw" ] || fail "Unable to read existing symlink target: $install_path"

  current_target=$(resolve_symlink_target_path "$install_path" "$current_target_raw" 2>/dev/null || true)
  [ -n "$current_target" ] || fail "Existing symlink target is invalid or inaccessible: $install_path -> $current_target_raw"

  if [ "$current_target" = "$expected_target" ]; then
    printf '%s\n' "open-docker-nest is already installed at $install_path"
  else
    fail "Refusing to overwrite unrelated symlink: $install_path -> $current_target_raw"
  fi
else
  ln -s "$expected_target" "$install_path" || fail "Failed to create symlink: $install_path"
  printf '%s\n' "Installed open-docker-nest at $install_path"
fi

case ":${PATH:-}:" in
  *":$install_dir:"*) ;;
  *)
    printf '%s\n' "Warning: $install_dir is not in PATH for this shell. Add it to run 'open-docker-nest' directly." >&2
    ;;
esac
