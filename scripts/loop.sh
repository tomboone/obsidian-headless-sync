#!/bin/sh
# Run the fetchers forever on an interval. A failed run is logged and retried next time.
while true; do
  node /app/src/run.mjs || echo "run failed; will retry"
  sleep "${INTERVAL_SECONDS:-3600}"
done
