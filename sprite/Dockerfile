# Sprite: the ephemeral execution environment for a submission.
#
# The image carries the prebuilt runner, the six SDKs, and the six toolchains
# needed to build a submission. Nothing about a submission is known at build
# time — the runner talks to it over a pipe — so unlike the previous image this
# one never has to be rebuilt to accept new user code.
#
# There is no network at runtime and the only writable path is /tmp. That is
# the isolation boundary between a submission and the host.
#
# It is a large image, because six toolchains are six toolchains. Splitting it
# per language is the obvious optimisation, and the entrypoint is already
# structured for it: each language is one self-contained branch.

# --- build the runner --------------------------------------------------------
FROM golang:1.26-bookworm AS runner-build

WORKDIR /src
COPY go.mod go.sum* ./
RUN go mod download || true

COPY ftl ./ftl
COPY proto ./proto
COPY remote ./remote
COPY sdk ./sdk
COPY solution ./solution
COPY compaction ./compaction
COPY tasks ./tasks
COPY cmd ./cmd

# The runner is fully independent of any submission now, so it is a normal
# static build rather than something recompiled per run.
RUN CGO_ENABLED=0 go build -trimpath -o /out/runner ./cmd/runner

# Verify the registry is wired up. A task that fails to register would
# otherwise only surface as a mis-graded submission.
RUN /out/runner --list-tasks | grep -qx compaction \
 && /out/runner --list-tasks | grep -qx victim-selection \
 && /out/runner --list-tasks | grep -qx wear-leveling

# --- runtime -----------------------------------------------------------------
FROM golang:1.26-bookworm

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential \
      python3 \
      python3-minimal \
      openjdk-17-jdk-headless \
      ca-certificates \
      curl \
 && rm -rf /var/lib/apt/lists/*

# Debian's rustc predates let-else, which the Rust SDK uses, so Rust comes from
# rustup pinned to a known version rather than from apt.
ENV RUSTUP_HOME=/usr/local/rustup \
    CARGO_HOME=/usr/local/cargo \
    PATH=/usr/local/cargo/bin:$PATH
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \
      | sh -s -- -y --no-modify-path --profile minimal --default-toolchain 1.83.0 \
 && chmod -R a+w "$CARGO_HOME" "$RUSTUP_HOME"

COPY --from=runner-build /out/runner /usr/local/bin/runner

# --- the SDKs ----------------------------------------------------------------
# Go solutions import the module by path, so the module has to be on disk with
# a go.mod the submission's replace directive can point at.
COPY go.mod go.sum* /opt/bytearena/go/
COPY proto /opt/bytearena/go/proto
COPY sdk /opt/bytearena/go/sdk

COPY sdks/python/bytearena.py /opt/bytearena/python/
COPY sdks/c/bytearena.h sdks/c/bytearena.c /opt/bytearena/c/
COPY sdks/cpp/bytearena.hpp /opt/bytearena/cpp/
COPY sdks/rust/bytearena.rs /opt/bytearena/rust/
COPY sdks/java/ByteArena.java /opt/bytearena/java/

# Precompiling the Java SDK keeps it out of every submission's build.
RUN javac -d /opt/bytearena/java/classes /opt/bytearena/java/ByteArena.java

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Submissions run as a normal user with no ambient privileges.
RUN useradd --create-home --shell /usr/sbin/nologin sprite

# Warm the Go build cache as the user who will read it. Warming it as root
# produces a cache that user cannot write to, and Go treats an unwritable cache
# as a hard error rather than falling back to a cold build — so the Go rung
# fails while every other language works.
ENV GOCACHE=/home/sprite/.cache/go-build
USER sprite
RUN cd /opt/bytearena/go && go build ./...

WORKDIR /tmp

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
