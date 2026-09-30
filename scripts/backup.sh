#!/bin/sh
set -eu

if [ -z "${BACKUP_DATABASE_URL:-}" ]; then
  echo "BACKUP_DATABASE_URL zorunludur." >&2
  exit 1
fi

output_dir="${BACKUP_OUTPUT_DIR:-./backups}"
mkdir -p "$output_dir"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
output="$output_dir/rahmet_crm_$stamp.dump"
pg_dump "$BACKUP_DATABASE_URL" --format=custom --schema=rahmet_crm --no-owner --no-acl --file="$output"
echo "$output"
