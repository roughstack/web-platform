#!/usr/bin/env bash
# entrypoint.sh — build one submission, then hand it to the runner.
#
# Usage:
#   echo '<source>' | entrypoint.sh --language GO --task compaction --seed 42 [runner flags...]
#
# The first two flags are consumed here; everything else is passed through to
# the runner untouched, so adding a task parameter never means editing this file.
#
# Exit codes:
#   0  the run completed and passed
#   1  the submission did not build
#   2  the run completed and failed
#
# On a build failure this still prints the runner's JSON shape, so the backend
# has exactly one thing to parse whatever went wrong.

set -uo pipefail

SDK_ROOT=/opt/bytearena
WORK=/tmp/submission

LANGUAGE=""
TASK=""
RUNNER_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --language) LANGUAGE="$2"; shift 2 ;;
    --task)     TASK="$2";     RUNNER_ARGS+=(--task "$2"); shift 2 ;;
    *)          RUNNER_ARGS+=("$1"); shift ;;
  esac
done

if [[ -z "$LANGUAGE" ]]; then
  echo '{"passed":false,"metrics":{},"error":"no --language was given"}'
  exit 1
fi

mkdir -p "$WORK"
cd "$WORK"

# json_string quotes an arbitrary blob for embedding in the report below.
json_string() {
  python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'
}

fail_to_build() {
  local log="$1"
  printf '{"passed":false,"metrics":{},"task":"%s","error":"the submission did not build","build_output":%s}\n' \
    "$TASK" "$(json_string < "$log")"
  exit 1
}

case "$LANGUAGE" in
  GO)
    cat > solution.go
    # A tiny module with a local replace, so the build needs no network and no
    # module cache beyond what the image already has.
    cat > go.mod <<'MOD'
module solution

go 1.26

require github.com/roughstack/execution-runtime v0.0.0

replace github.com/roughstack/execution-runtime => /opt/bytearena/go
MOD
    # GOCACHE is set in the image to a directory this user owns and that was
    # warmed at build time, so this build is incremental and needs no network.
    GOFLAGS=-mod=mod GOPROXY=off \
      go build -o "$WORK/solution" . 2> build.log || fail_to_build build.log
    COMMAND=("$WORK/solution")
    ;;

  PYTHON)
    cat > solution.py
    # Nothing to build, but a syntax error should still read as a build failure
    # rather than as a solution that mysteriously never answered.
    python3 -m py_compile solution.py 2> build.log || fail_to_build build.log
    export PYTHONPATH="$SDK_ROOT/python"
    export PYTHONUNBUFFERED=1
    COMMAND=(python3 "$WORK/solution.py")
    ;;

  C)
    cat > solution.c
    cc -std=c11 -O2 -I"$SDK_ROOT/c" -o "$WORK/solution" \
      "$SDK_ROOT/c/bytearena.c" solution.c 2> build.log || fail_to_build build.log
    COMMAND=("$WORK/solution")
    ;;

  CPP)
    cat > solution.cpp
    c++ -std=c++17 -O2 -I"$SDK_ROOT/c" -I"$SDK_ROOT/cpp" -o "$WORK/solution" \
      "$SDK_ROOT/c/bytearena.c" solution.cpp 2> build.log || fail_to_build build.log
    COMMAND=("$WORK/solution")
    ;;

  JAVA)
    cat > Solution.java
    javac -cp "$SDK_ROOT/java/classes" -d "$WORK" Solution.java 2> build.log \
      || fail_to_build build.log
    COMMAND=(java -XX:+UseSerialGC -Xshare:auto -cp "$WORK:$SDK_ROOT/java/classes" Solution)
    ;;

  RUST)
    cat > solution.rs
    # The SDK is a sibling module, so it has to sit next to the crate root.
    cp "$SDK_ROOT/rust/bytearena.rs" bytearena.rs
    rustc --edition 2021 -O -o "$WORK/solution" solution.rs 2> build.log \
      || fail_to_build build.log
    COMMAND=("$WORK/solution")
    ;;

  *)
    printf '{"passed":false,"metrics":{},"error":"unsupported language %s"}\n' "$LANGUAGE"
    exit 1
    ;;
esac

exec /usr/local/bin/runner "${RUNNER_ARGS[@]}" -- "${COMMAND[@]}"
