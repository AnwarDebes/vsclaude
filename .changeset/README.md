# Changesets

This folder is managed by [changesets](https://github.com/changesets/changesets).
It records intent-to-release notes that drive versioning and changelogs.

To add a changeset for your work:

```bash
pnpm changeset
```

Pick the affected packages, choose a semver bump (patch, minor, major), and write
a short human-readable summary. The release workflow consumes these files to bump
versions and publish.
