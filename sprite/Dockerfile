# Sprite: the ephemeral execution environment for user code.
#
# This image contains the Go toolchain, the FTL simulator, and the runner
# binary. User code is injected at runtime by writing it to
# /app/sprite/solution/solution.go, then the entrypoint recompiles the runner
# with the user's code and executes it.
#
# The image is intentionally minimal: no network access is needed at runtime,
# no package downloads (everything is pre-built), and the only writable path
# is /tmp. This is the isolation boundary between user code and the host.

FROM golang:1.26-bookworm AS builder

WORKDIR /app

# Copy only the module manifests first so dependency resolution is cached.
COPY go.mod go.sum* ./
RUN go mod download || true

# Copy the simulator and runner source.
COPY ftl ./ftl
COPY solution ./solution
COPY cmd ./cmd

# Pre-compile the ftl package so the user-code rebuild is fast.
RUN go build ./ftl/...

# The runner is not pre-compiled because it imports the user's solution
# package, which is overwritten at runtime. But we verify it compiles with
# the default (greedy) solution so the image is self-tested.
RUN go build -o /usr/local/bin/runner ./cmd/runner

# --- runtime stage -----------------------------------------------------------
# A slim image with just the Go toolchain (needed to recompile with user code)
# and the pre-built simulator packages.

FROM golang:1.26-bookworm

WORKDIR /app

# Copy the entire module so `go build ./cmd/runner` works after the user's
# solution is written.
COPY --from=builder /app /app

# The entrypoint receives the user's code on stdin, writes it to the solution
# package, recompiles, and runs. Flags are passed through to the runner.
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
