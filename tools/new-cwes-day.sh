#!/usr/bin/env bash
#
# Scaffold the next CWES daily-log post from _drafts/cwes-day-template.md
#
# Usage: See help information

set -eu

TEMPLATE="_drafts/cwes-day-template.md"
POSTS_DIR="_posts"

help() {
  echo "Scaffold the next CWES daily-log post"
  echo
  echo "Usage:"
  echo
  echo "   bash tools/new-cwes-day.sh <slug> [title]"
  echo
  echo "Arguments:"
  echo "     slug     Filename slug, e.g. 'sql-injection'"
  echo "     title    Human-readable title, e.g. 'SQL Injection'"
  echo "              (defaults to the slug with hyphens turned into spaces)"
  echo
  echo "Options:"
  echo "     -h, --help    Print this help information."
  echo
  echo "Example:"
  echo "   bash tools/new-cwes-day.sh sql-injection 'SQL Injection'"
}

if (($# == 0)); then
  help
  exit 1
fi

case "$1" in
-h | --help)
  help
  exit 0
  ;;
esac

slug="$1"
title="${2:-$(echo "$slug" | tr '-' ' ')}"

if [[ ! -f "$TEMPLATE" ]]; then
  echo "> Template not found: $TEMPLATE" >&2
  exit 1
fi

next_day() {
  local max=0 day
  for f in "$POSTS_DIR"/*-cwes-day*-*.md; do
    [[ -e "$f" ]] || continue
    day="$(basename "$f" | grep -oP 'cwes-day\K[0-9]+' || true)"
    [[ -n "$day" ]] || continue
    day=$((10#$day))
    ((day > max)) && max=$day
  done
  echo $((max + 1))
}

day_num="$(next_day)"
padded="$(printf '%02d' "$day_num")"
date_str="$(date +%Y-%m-%d)"
time_str="20:00:00 +0700"

out_file="${POSTS_DIR}/${date_str}-cwes-day${padded}-${slug}.md"

if [[ -e "$out_file" ]]; then
  echo "> Already exists: $out_file" >&2
  exit 1
fi

sed \
  -e "s/Day NN: Topic/Day ${padded}: ${title}/" \
  -e "s/dayNN/day${padded}/" \
  -e "s/2026-01-01 20:00:00 +0700/${date_str} ${time_str}/" \
  "$TEMPLATE" >"$out_file"

echo "> Created $out_file (day $day_num)"
