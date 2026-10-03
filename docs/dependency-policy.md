# Dependency policy

Rough Stack treats dependency maintenance as part of its security posture.

## Requirements

- Runtime and development dependencies must be declared in `package.json` and
  resolved reproducibly by `package-lock.json`.
- Pull requests must use `npm ci`; changes to `package.json` must include the
  corresponding lockfile update.
- CI rejects high- and critical-severity advisories with
  `npm run security:audit`.
- Automated dependency pull requests are enabled through Dependabot and still
  require the normal test and review gates.
- Exact transitive overrides are allowed only to remediate a published
  advisory or compatibility defect. Remove an override when the direct
  dependency resolves it upstream.
- New dependencies should be actively maintained, necessary for the feature,
  and compatible with the Apache-2.0 distribution. Copyleft or non-standard
  licenses require explicit maintainer review before merge.

## Maintainer checks

Run these checks before a dependency release:

```sh
npm ci
npm run security:audit
npm ls --all
npm run typecheck
npm run lint
npm run test
npm run build
```

The `private` package flag intentionally prevents accidental publication to
the npm registry; it does not restrict the source repository's Apache-2.0
license.
