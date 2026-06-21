# Building and packaging vsclaude

This document covers building the native desktop app and producing signed
installers for macOS, Windows, and Linux.

## Prerequisites

- Node 22+ and pnpm 10+ (`corepack enable`).
- Rust stable on the MSVC host (Windows) or the platform default elsewhere.
  - Windows: install with `rustup` and the Visual Studio C++ Build Tools
    (workload `Microsoft.VisualStudio.Workload.VCTools`) plus a Windows SDK. The
    MSVC linker is detected automatically; no developer prompt is needed.
  - macOS: Xcode command line tools.
  - Linux: `libwebkit2gtk-4.1-dev`, `libgtk-3-dev`, `libappindicator3-dev`,
    `librsvg2-dev`, `patchelf`.

## Local development

```bash
pnpm install
pnpm run build:packages          # build the workspace packages first
pnpm --filter @vsclaude/desktop tauri:dev
```

This launches the native window with hot reload. The renderer also runs in a
plain browser for quick iteration with `pnpm --filter @vsclaude/desktop dev`
(demo mode, no native PTY or provider).

## Production build

```bash
pnpm run build:packages
pnpm --filter @vsclaude/desktop tauri:build
```

Artifacts land under `apps/desktop/src-tauri/target/release/`:

- the executable: `vsclaude.exe` (Windows), `vsclaude` (Linux), `vsclaude.app` (macOS),
- installers under `bundle/`:
  - Windows: `bundle/msi/*.msi` (WiX) and `bundle/nsis/*-setup.exe` (NSIS),
  - macOS: `bundle/dmg/*.dmg` and `bundle/macos/*.app`,
  - Linux: `bundle/appimage/*.AppImage` and `bundle/deb/*.deb`.

The first build downloads WiX and NSIS (Windows) automatically.

## Code signing

Unsigned installers are correct and installable, but the OS will warn users.
Signed release builds require these secrets (set them as GitHub Actions secrets
for the `Desktop Release` workflow, or as environment variables locally).

### Windows (Authenticode)

| Secret | What it is |
| --- | --- |
| `WINDOWS_CERTIFICATE` | base64 of your code signing `.pfx` |
| `WINDOWS_CERTIFICATE_PASSWORD` | the `.pfx` password |

Configure the signer in `apps/desktop/src-tauri/tauri.conf.json` under
`bundle.windows` with your certificate thumbprint, or a `signCommand` that calls
`signtool` with the decoded certificate.

### macOS (Developer ID and notarization)

| Secret | What it is |
| --- | --- |
| `APPLE_CERTIFICATE` | base64 of the Developer ID Application `.p12` |
| `APPLE_CERTIFICATE_PASSWORD` | the `.p12` password |
| `APPLE_SIGNING_IDENTITY` | for example `Developer ID Application: Name (TEAMID)` |
| `APPLE_ID` | your Apple ID email |
| `APPLE_PASSWORD` | an app-specific password for notarization |
| `APPLE_TEAM_ID` | your Apple Developer team id |

### Updater signing (required for auto-update)

Generate a keypair once:

```bash
pnpm --filter @vsclaude/desktop exec tauri signer generate -w ~/.tauri/vsclaude.key
```

Then set:

| Secret | What it is |
| --- | --- |
| `TAURI_SIGNING_PRIVATE_KEY` | the generated private key |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | its password |

Put the matching public key in `tauri.conf.json` under `plugins.updater.pubkey`
and point `plugins.updater.endpoints` at where you host `latest.json`. Enabling
the updater also needs the `tauri-plugin-updater` dependency added to the core;
that is the one remaining wiring step and is gated on you choosing an update
host.

## CI pipeline

`.github/workflows/desktop-release.yml` builds the app on macOS (arm64 and
x86_64), Windows, and Linux, and attaches the installers to a draft GitHub
release. Push a `v*` tag (for example `git tag v0.1.0 && git push --tags`) or run
it from the Actions tab. It signs automatically when the secrets above are
present, and produces unsigned installers when they are not.
