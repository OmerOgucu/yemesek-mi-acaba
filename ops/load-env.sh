#!/bin/sh
# Read KEY=VALUE lines into the environment. Values are not evaluated as shell.
load_env_file() {
  file="$1"
  if [ ! -f "$file" ]; then
    echo "env dosyası yok: $file" >&2
    return 1
  fi
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      ''|\#*) continue ;;
    esac
    key="${line%%=*}"
    val="${line#*=}"
    key=$(printf '%s' "$key" | tr -d '[:space:]')
    case "$key" in
      ''|*[!A-Za-z0-9_]*)
        echo "geçersiz env anahtarı" >&2
        return 1
        ;;
    esac
    case "$val" in
      \"*\")
        val="${val#\"}"
        val="${val%\"}"
        ;;
      \'*\')
        val="${val#\'}"
        val="${val%\'}"
        ;;
    esac
    if [ -z "$val" ]; then
      continue
    fi
    export "$key=$val"
  done < "$file"
}
