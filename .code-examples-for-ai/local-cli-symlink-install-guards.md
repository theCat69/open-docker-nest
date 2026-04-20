<!-- Focused excerpt from production local-dev install/uninstall scripts (install.sh and uninstall.sh). Surrounding setup may be defined elsewhere. -->
```bash
# install.sh: idempotent, safe symlink install
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
fi

# uninstall.sh: remove only managed symlink
[ -L "$install_path" ] || fail "Refusing to remove non-symlink path: $install_path"

current_target_raw=$(readlink "$install_path" 2>/dev/null || true)
[ -n "$current_target_raw" ] || fail "Unable to read existing symlink target: $install_path"

current_target=$(resolve_symlink_target_path "$install_path" "$current_target_raw" 2>/dev/null || true)
[ -n "$current_target" ] || fail "Existing symlink target is invalid or inaccessible: $install_path -> $current_target_raw"

[ "$current_target" = "$expected_target" ] || fail "Refusing to remove unrelated symlink: $install_path -> $current_target_raw"
rm "$install_path"
```
