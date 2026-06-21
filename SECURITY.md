# Security Policy

This is the community security policy for **vsclaude**, an open-source desktop IDE that runs your AI coding agent (Claude Code, Codex, Gemini, and local Ollama models) behind one unified, animated experience. This document tells you how to report a vulnerability privately, which versions we support, what response timeline to expect, and where to find the deep engineering security model. If you are an engineer implementing or reviewing security-sensitive code, read this first for the process, then read the full engineering spec at [specs/SECURITY.md](./specs/SECURITY.md) for the technical contract.

> One thing to know up front: **vsclaude stores provider API keys only in your operating system keychain.** Keys are never written to plaintext on disk, never shipped to the renderer, and never uploaded anywhere. See [Where your secrets live](#where-your-secrets-live).

## Table of contents

- [Reporting a vulnerability](#reporting-a-vulnerability)
- [What to include in a report](#what-to-include-in-a-report)
- [Our response commitment](#our-response-commitment)
- [Severity and triage](#severity-and-triage)
- [Coordinated disclosure](#coordinated-disclosure)
- [Supported versions](#supported-versions)
- [Where your secrets live](#where-your-secrets-live)
- [Scope: what counts as a vulnerability](#scope-what-counts-as-a-vulnerability)
- [Out of scope](#out-of-scope)
- [Safe harbor](#safe-harbor)
- [Recognition](#recognition)
- [For engineers: the technical security model](#for-engineers-the-technical-security-model)

## Reporting a vulnerability

**Please do not open a public GitHub issue for security problems.** A public report tells attackers about the flaw before users can update. Report privately through one of these channels, in order of preference:

| Channel | How | Use when |
| --- | --- | --- |
| GitHub private advisory | Repo **Security** tab, **Report a vulnerability** ([GitHub Security Advisories](https://docs.github.com/code-security/security-advisories)) | Preferred for everything. Gives us a private thread, a CVE workflow, and a private fix branch. |
| Email | `security@vsclaude.dev` | If you cannot use GitHub, or you want to send an encrypted message. |
| Encrypted email | Same address, encrypted to the PGP key published at [`/.well-known/security.txt`](https://vsclaude.dev/.well-known/security.txt) | For reports that include sensitive proof-of-concept material. |

If you are unsure whether something is a real vulnerability, report it anyway. We would rather triage a false alarm than miss a real one. When in doubt, choose the private channel.

A machine-readable [`security.txt`](https://www.rfc-editor.org/rfc/rfc9116) is published so scanners and researchers can find the right contact:

```text
# https://vsclaude.dev/.well-known/security.txt
Contact: mailto:security@vsclaude.dev
Contact: https://github.com/<org>/vsclaude/security/advisories/new
Encryption: https://vsclaude.dev/.well-known/pgp-key.asc
Preferred-Languages: en
Policy: https://github.com/<org>/vsclaude/blob/main/SECURITY.md
Expires: 2027-01-01T00:00:00.000Z
```

## What to include in a report

A good report is one we can reproduce. The more of the following you provide, the faster we can confirm and fix the issue.

- **A clear title and summary.** One sentence on what an attacker can do.
- **Affected component.** For example: the Rust core, an IPC command, the keychain module, a provider adapter, the permission engine, the CSP, the Tauri capability set, or the auto-updater. The component map in [specs/SECURITY.md](./specs/SECURITY.md#trust-boundaries) names the trust boundaries.
- **Version and platform.** The vsclaude version (Help, About, or the app version in settings), your OS and version, and the install method (signed installer, package manager, or local build).
- **Reproduction steps.** Numbered, minimal, deterministic. Include a sample workspace or config if it matters.
- **Proof of concept.** A script, a crafted file, a malicious MCP server config, or a screen recording. Keep it minimal and non-destructive.
- **Impact.** What an attacker gains: secret disclosure, arbitrary command execution, sandbox escape, path traversal outside the workspace, update tampering, denial of service.
- **Suggested fix.** Optional, but welcome.

Please send proof-of-concept material that **does not exfiltrate real keys or user data**. Use a throwaway key and a scratch workspace. If your finding inherently involves a real secret, redact it and tell us so in the report.

A useful report skeleton:

```text
Title:        Path traversal in write_workspace_file IPC command
Component:    apps/desktop/src-tauri (IPC) + core path containment
Version:      0.4.2, Windows 11 26200, signed installer
Impact:       Agent can write outside the workspace via a planted symlink
Repro:
  1. Open workspace W.
  2. Create symlink W/link -> C:\Users\<me>\evil.
  3. Ask the agent to write W/link/x.txt.
  4. Observe write lands outside W.
Expected:     fs_write gate rejects the resolved out-of-workspace path.
PoC:          attached repro.zip (throwaway content only)
```

## Our response commitment

We are an open-source project, not a 24/7 security operations center, but we take reports seriously and we respond on a predictable schedule. All times are best-effort targets measured in business days from when the report reaches a maintainer.

| Stage | Target | What happens |
| --- | --- | --- |
| Acknowledgment | Within **2 business days** | A human confirms we received the report and opens a private tracking thread. |
| Initial triage | Within **5 business days** | We reproduce, assign a severity, and tell you whether we consider it in scope. |
| Status updates | At least **every 7 days** while open | You get progress, even if the progress is "still investigating." |
| Fix target (Critical / High) | **30 days** to a patched release, faster when actively exploited | Coordinated release plus an advisory. |
| Fix target (Medium / Low) | **90 days** or the next scheduled release | Rolled into a regular release. |

If we miss a target, we tell you why and give a new date. If a report is being actively exploited in the wild, all timelines compress and we may ship an out-of-band release.

## Severity and triage

We score with [CVSS v3.1](https://www.first.org/cvss/v3.1/specification-document) and map to four bands. The band sets the response speed above. Because the core security promise is key confidentiality and least-privilege execution, anything that breaks those is treated as serious by default.

| Severity | Examples in vsclaude terms |
| --- | --- |
| **Critical** | Provider key disclosure to disk, log, renderer, or network. Remote code execution from opening a workspace or rendering tool output. Auto-update accepts an unsigned or downgraded artifact. |
| **High** | Sandbox escape: the agent writes outside the workspace despite the `fs_write` gate. Bypass of the permission engine so a side-effecting action runs without consent. Path traversal via symlink or `..`. |
| **Medium** | Redaction misses a secret in captured output. A new IPC command accepts unvalidated input but is bounded in impact. CSP weakening that does not yet yield script execution. |
| **Low** | Denial of service that requires local access, verbose error messages leaking non-secret internals, missing rate limit on a low-impact command. |

If our severity assessment differs from yours, we will explain the reasoning in the private thread and you are welcome to push back with new evidence.

## Coordinated disclosure

We practice coordinated disclosure. The goal is that a fix is available to users before the details are public.

1. You report privately.
2. We confirm, fix on a private branch, and prepare a patched release.
3. We agree with you on a disclosure date, normally when the patched release ships, and at most **90 days** after triage for issues that are not actively exploited.
4. We publish a [GitHub Security Advisory](https://docs.github.com/code-security/security-advisories) and, where applicable, request a CVE.
5. We credit you in the advisory unless you ask to remain anonymous.

If you believe an issue is being actively exploited, tell us in the first message. We will move immediately and may shorten the embargo.

Please do not disclose publicly, post a write-up, or demo the issue at a talk before the agreed date. If we go silent past our committed update cadence and stop responding entirely, you are within your rights to disclose after a reasonable notice, but we ask that you give us a heads-up first.

## Supported versions

Security fixes land on the latest minor release line. We follow [semantic versioning](https://semver.org/). Because vsclaude ships a signed auto-updater (see [Auto-update integrity](./specs/SECURITY.md#auto-update-integrity)), the most reliable way to stay protected is to keep auto-update enabled and install prompted updates.

| Version | Supported | Notes |
| --- | --- | --- |
| `1.x` (latest minor) | Yes, full support | All security fixes land here first. |
| `1.x` (previous minor) | Critical and High only | Backported when feasible until the next minor is out plus 30 days. |
| `0.x` (pre-1.0 betas) | Best effort | Pre-1.0 lines move fast; please update to the latest. We will help you upgrade. |
| End-of-life lines | No | Listed as EOL in release notes; upgrade required. |

To check your version: open **Help, About** in the app, or read the `version` field in `apps/desktop/src-tauri/tauri.conf.json` for a local build. Local builds from `main` are not "releases" and carry no support guarantee, but we still want reports against them.

## Where your secrets live

This is the single most important fact for a security-conscious user, and it is enforced by construction, not by convention.

- **OS keychain only.** Provider API keys are stored exclusively in the platform secret store through one audited Rust module. There is **no plaintext fallback**: if the keychain is unavailable, key storage fails loudly rather than writing a file.
- **Never in the renderer.** The UI never receives a key. It receives only a `configured: boolean` flag and a masked hint (last four characters) for display.
- **Never on disk, in logs, or in stores.** A key is never written to a config file, a log line, a temp file, `localStorage`, `sessionStorage`, IndexedDB, or a Zustand store. A CI gate greps the tree to keep it that way.
- **Injected, not cached.** When the agent starts, the key is injected into the child process environment at spawn time and the in-memory copy is zeroized immediately. Keys are never passed as command-line arguments, because argv is visible to other processes.
- **Local-first by default.** Session transcripts and event logs stay on your disk. Telemetry is off by default and, if enabled, never carries content or keys.

| Platform | Keychain backend |
| --- | --- |
| macOS | Keychain Services, item bound to the signed app's code signature |
| Windows | Credential Manager, DPAPI-backed, per-user |
| Linux | Secret Service (libsecret) via D-Bus, clear error if unavailable |

The full technical detail, including the `keyring` and `zeroize` usage and the spawn-time injection code, is in [Secret storage: the OS keychain](./specs/SECURITY.md#secret-storage-the-os-keychain) and [Secrets in memory](./specs/SECURITY.md#secrets-in-memory).

The one threat we openly accept: while the agent process runs, its environment block holds the key, so another process running as the same user could read it. That is inherent to a bring-your-own-key tool, and a host-level compromise is outside our boundary. We minimize blast radius (one provider key per child, short-lived) rather than pretend to eliminate it.

## Scope: what counts as a vulnerability

In scope, and very much wanted:

- Disclosure of a provider key to disk, a log, the renderer, the network, or any persistent store.
- Code execution triggered by opening a workspace, rendering tool output, or processing a provider response (rendering injection, control-sequence injection, markup escape).
- Bypass of the permission engine: a side-effecting `AgentEvent` (file write, command run, network fetch, git push) that runs without the expected consent gate.
- Sandbox escape or path traversal: writes, reads, or process execution outside the workspace despite containment checks, including via symlinks and `..`.
- IPC surface flaws: a Tauri command that returns a secret, spawns an arbitrary process, or accepts unvalidated input.
- Subagent privilege widening: a spawned agent gaining authority its parent did not have.
- Auto-update integrity failures: accepting an unsigned, tampered, or downgraded update artifact.
- CSP or Tauri capability weaknesses that enable script execution or unintended host access.
- Supply-chain issues in our lockfiles or build pipeline (a malicious postinstall script that slips through, a compromised pinned dependency).

These map directly to the [threat model in the engineering spec](./specs/SECURITY.md#threat-model-untrusted-commands-and-mcp-servers).

## Out of scope

The following are documented non-goals or known accepted risks. Reporting them is fine, but they will likely be closed as out of scope unless you show a concrete bypass that crosses a real boundary.

- **A fully compromised host OS or malicious local administrator.** If the attacker already owns the machine, the keychain and the running process are theirs. We do not defend against this.
- **The model provider's own servers.** We trust the endpoint you configured. We do not trust the content that flows back, and we do gate everything the agent does with that content.
- **A user blindly approving a dangerous action.** vsclaude makes review fast and legible and shows the exact command, input, or diff before you approve. It cannot make blind approval safe.
- **Findings that require disabling our defenses first** (for example turning off the sandbox, granting `allow always` to everything, or loosening the CSP in a local build).
- **Self-XSS, missing security headers on the marketing site, clickjacking on pages with no sensitive action, or theoretical issues with no demonstrated impact.**
- **Vulnerabilities in third-party dependencies that do not affect vsclaude as shipped.** Report those upstream; tell us if vsclaude is exploitable through them.
- **Reports generated solely by an automated scanner with no validated, reproducible impact.**

## Safe harbor

We support good-faith security research and will not pursue or support legal action against you if you:

- Make a genuine effort to avoid privacy violations, data destruction, and service interruption.
- Only interact with accounts, workspaces, and keys you own or have explicit permission to test.
- Do not exfiltrate any real user data or secrets, and use throwaway keys and scratch workspaces for proofs of concept.
- Give us a reasonable time to fix the issue before any public disclosure, per [Coordinated disclosure](#coordinated-disclosure).
- Do not perform denial-of-service testing against shared infrastructure or other users.

If you are unsure whether an action is permitted, ask us first at `security@vsclaude.dev`. Acting in good faith under this policy, we consider your research authorized, and we will say so publicly if a third party questions it.

## Recognition

We do not currently run a paid bug bounty. We do recognize researchers who help keep vsclaude safe:

- A credit line in the [security advisory](https://docs.github.com/code-security/security-advisories), with your preferred name and link, unless you ask to stay anonymous.
- An entry in `SECURITY-HALL-OF-FAME.md` for confirmed, in-scope reports.
- Our sincere thanks. Open-source security depends on people like you.

If a bounty program launches later, it will be announced in the repository and linked from this policy.

## For engineers: the technical security model

This policy is the process and the promise. The implementation contract lives in the engineering spec, which is what you build and review against:

- **[specs/SECURITY.md](./specs/SECURITY.md)** is the authoritative engineering security spec. It defines the trust boundaries, the keychain and in-memory secret handling, the agent permission model and decision resolution order, the per-OS sandbox defaults, the Tauri capability and CSP posture, the IPC hardening rules, the untrusted-command and MCP threat model, supply-chain gates, redaction and telemetry rules, auto-update integrity, and a reviewer checklist.

Quick links into that spec:

| Topic | Where |
| --- | --- |
| Trust boundaries diagram | [Trust boundaries](./specs/SECURITY.md#trust-boundaries) |
| Keychain storage rules and code | [Secret storage: the OS keychain](./specs/SECURITY.md#secret-storage-the-os-keychain) |
| Zeroizing and spawn-time injection | [Secrets in memory](./specs/SECURITY.md#secrets-in-memory) |
| Permission classes and resolution order | [Permission model for the agent](./specs/SECURITY.md#permission-model-for-the-agent) |
| Sandbox defaults per OS | [Sandbox defaults](./specs/SECURITY.md#sandbox-defaults) |
| CSP and Tauri capabilities | [Tauri capabilities, allowlist, and CSP](./specs/SECURITY.md#tauri-capabilities-allowlist-and-csp) |
| IPC command hardening | [IPC surface hardening](./specs/SECURITY.md#ipc-surface-hardening) |
| Untrusted commands and MCP servers | [Threat model](./specs/SECURITY.md#threat-model-untrusted-commands-and-mcp-servers) |
| CI security gates | [Supply-chain hygiene](./specs/SECURITY.md#supply-chain-hygiene) |
| Reviewer checklist | [Security checklist for reviewers](./specs/SECURITY.md#security-checklist-for-reviewers) |

If you are touching secrets, IPC, process spawning, the policy engine, capabilities, or CSP, run the [reviewer checklist](./specs/SECURITY.md#security-checklist-for-reviewers) on your pull request before requesting review. A security review sign-off recorded in the PR is required for any change that loosens the CSP or widens a Tauri capability.

See also: [Architecture](./specs/ARCHITECTURE.md), [Providers and adapters](./specs/PROVIDERS_SPEC.md), [Permissions and safety](./specs/PERMISSIONS_AND_SAFETY.md), [Build and distribution](./specs/BUILD_AND_DISTRIBUTION.md).

---

*Last reviewed: 2026-06-21. This policy is versioned with the repository; the canonical copy lives at the repo root on `main`.*
