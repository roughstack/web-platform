# Releases and compatibility

Rough Stack has not published a stable release yet. Until the first tagged
release, `main` is the integration branch and public v1 arena/result contracts
must remain backward-compatible unless a documented migration is approved.

## Release process

1. Start from a clean, reviewed commit on `main` with all required checks green.
2. Validate database migrations from an empty database and from the previous
   supported schema.
3. Generate deterministic arena registry and bundle artifacts.
4. Run the public tests, worker integration suite, security gates, and clean
   clone smoke test.
5. Record dependency/license audit results and known limitations.
6. Create a signed or attested release artifact and an annotated semantic tag.

Releases follow semantic versioning after `1.0.0`. Arena versions are immutable:
changing contract, workload semantics, scoring inputs, or resource policy
requires a new arena version and digest.
