#!/usr/bin/env bash
# Bootstrap Python, then let the shared checker prepare the requested tools.
set -eu
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
INSTALL=0
for argument in "$@"; do
  if [ "$argument" = '--install' ]; then INSTALL=1; fi
done
find_python() {
  local candidate
  for candidate in "${CAMERA_PREVIS_PYTHON:-}" \
    "$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3" \
    "$(command -v python3 || true)" "$(command -v python || true)" \
    /opt/homebrew/bin/python3 /usr/local/bin/python3 /usr/bin/python3; do
    if [ -n "$candidate" ] && [ -x "$candidate" ] && \
      "$candidate" -c 'import sys; sys.exit(0 if sys.version_info >= (3,8) else 1)' >/dev/null 2>&1; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done
  return 1
}
if ! PREVIS_PYTHON=$(find_python); then
  if [ "$INSTALL" -ne 1 ]; then
    echo 'Python 3.8+ is missing. Codex: rerun this script with --install.' >&2
    exit 2
  fi
  case "$(uname -s)" in
    Darwin)
      PREVIS_BREW=$(command -v brew || true)
      for candidate in /opt/homebrew/bin/brew /usr/local/bin/brew; do
        if [ -z "$PREVIS_BREW" ] && [ -x "$candidate" ]; then PREVIS_BREW=$candidate; fi
      done
      if [ -z "$PREVIS_BREW" ]; then
        echo 'No Python or Homebrew found. Codex: install an official Python runtime or Homebrew with the required OS permission, then retry.' >&2
        exit 2
      fi
      HOMEBREW_NO_AUTO_UPDATE=1 HOMEBREW_NO_INSTALL_CLEANUP=1 "$PREVIS_BREW" install python >&2
      ;;
    Linux)
      if ! command -v apt-get >/dev/null 2>&1; then
        echo 'No Python or supported package manager found. Codex: install Python using this distribution’s official package manager, then retry.' >&2
        exit 2
      fi
      if [ "$(id -u)" = 0 ]; then
        apt-get update >&2
        DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends python3 >&2
      else
        sudo -n apt-get update >&2
        sudo -n env DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends python3 >&2
      fi
      ;;
    *) echo 'Use setup.ps1 on Windows. This bootstrap supports macOS and Debian/Ubuntu Linux.' >&2; exit 2 ;;
  esac
  if ! PREVIS_PYTHON=$(find_python); then
    echo 'Python installation did not produce a usable runtime. Codex: inspect installer output before continuing.' >&2
    exit 2
  fi
fi
export CAMERA_PREVIS_PYTHON="$PREVIS_PYTHON"
exec "$PREVIS_PYTHON" "$SCRIPT_DIR/setup_env.py" "$@"
