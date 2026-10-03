# Security policy

Rough Stack executes participant-controlled code. Reports involving sandbox
escape, path traversal, secret exposure, authentication bypass, result forgery,
queue corruption, denial of service, or private-evaluation leakage must be
handled privately.

## Reporting a vulnerability

Use GitHub's **Report a vulnerability** function for this repository. Do not
open a public issue, discussion, or pull request containing exploit details.
Include the affected revision, impact, reproduction steps, and any suggested
mitigation. Remove credentials, private submissions, and unrelated personal
data from the report.

Maintainers aim to acknowledge a report within three business days, provide an
initial assessment within seven business days, and coordinate disclosure after
a fix or mitigation is available. These are response goals, not a warranty.

## Supported versions

Security fixes target the current `main` branch until versioned releases are
published. Older commits and local forks are not supported.

## Current deployment status

The public repository is still under active hardening. Public official judging
must remain disabled until the documented sandbox and operational security
review is complete. Local development execution is not a security boundary for
running untrusted code on a shared host.
