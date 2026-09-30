#!/bin/sh
set -eu

if [ "${CONFIRM_RESTORE:-}" != "YES" ]; then
  echo "CONFIRM_RESTORE=YES zorunludur; hedef şema üzerine geri yükleme yapılacaktır." >&2
  exit 1
fi
if [ -z "${RESTORE_DATABASE_URL:-}" ] || [ -z "${BACKUP_FILE:-}" ] || [ ! -f "$BACKUP_FILE" ]; then
  echo "RESTORE_DATABASE_URL ve mevcut BACKUP_FILE zorunludur." >&2
  exit 1
fi

pg_restore --dbname="$RESTORE_DATABASE_URL" --clean --if-exists --no-owner --no-acl --exit-on-error "$BACKUP_FILE"
echo "Geri yükleme tamamlandı; uygulamayı açmadan önce smoke kontrolü yapın."
