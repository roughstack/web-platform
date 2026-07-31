#!/usr/bin/env bash
# entrypoint.sh — receives user code on stdin, compiles with the simulator,
# runs the harness, and emits JSON to stdout.
#
# Usage: echo 'package solution ...' | entrypoint.sh -seed 42 -operations 1000 ...
# All arguments after the code are passed to the runner binary.
#
# Exit codes:
#   0  run completed (check JSON "passed" field for pass/fail)
#   1  compilation or internal error
#   2  the policy stalled or corrupted the device (see JSON "error" field)

set -euo pipefail

SOLUTION_FILE="/app/solution/solution.go"

# Read user code from stdin and write it to the solution package.
cat > "$SOLUTION_FILE"

# Compile the runner with the user's code. If compilation fails, emit a JSON
# error so the backend can parse it uniformly.
if ! go build -o /tmp/runner ./cmd/runner 2> /tmp/build-errors; then
  cat <<JSON
{
  "passed": false,
  "error": "compilation failed",
  "build_errors": $(python3 -c "import json,sys; print(json.dumps(sys.stdin.read()))" < /tmp/build-errors 2>/dev/null || echo '""')
}
JSON
  exit 1
fi

# Run the compiled binary with whatever flags were passed through.
exec /tmp/runner "$@"
