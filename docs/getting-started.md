# Getting Started

Welcome to vsclaude, the IDE where you watch your AI coding agent work through living pixel-art animation instead of scrolling walls of text. This guide takes you from a fresh download to your first animated run, narrated by Pixie, your pixel-art companion. It is written for everyone: seasoned engineers, weekend tinkerers, and curious people who have never opened a terminal. If a step looks technical, there is always a plain-language explanation right beside it.

By the end of this guide you will have installed vsclaude, connected an AI provider with your own key, opened a project, met Pixie, and watched the agent read, think, type, and finish a task while Pixie acts it all out in real time.

## Table of contents

- [What you need first](#what-you-need-first)
- [Step 1: Install vsclaude](#step-1-install-vsclaude)
- [Step 2: The first-run wizard](#step-2-the-first-run-wizard)
- [Step 3: Pick a provider and paste a key](#step-3-pick-a-provider-and-paste-a-key)
- [Step 4: Open a project](#step-4-open-a-project)
- [Step 5: Meet Pixie](#step-5-meet-pixie)
- [Step 6: Watch your first animated run](#step-6-watch-your-first-animated-run)
- [Reading the screen: captions, drill-down, and the timeline](#reading-the-screen-captions-drill-down-and-the-timeline)
- [The three motion rules, in practice](#the-three-motion-rules-in-practice)
- [Common questions](#common-questions)
- [Troubleshooting](#troubleshooting)
- [Where to go next](#where-to-go-next)

## What you need first

You need three things, and only one of them costs anything.

| Requirement | Who needs it | Notes |
| --- | --- | --- |
| A supported operating system | Everyone | macOS 12+, Windows 10/11, or a recent Linux desktop. |
| An API key from one provider | Most people | Claude Code, Codex, or Gemini need a key. Ollama runs locally with no key. |
| A project folder | Everyone | Any folder of code, notes, or files you want the agent to work on. An empty folder is fine too. |

You do not need to install Node, Rust, Python, or anything else to use the released app. vsclaude ships as a single signed desktop application. The development prerequisites (the Rust toolchain and friends) only matter if you plan to build vsclaude from source, which is covered in [Build and Release](./BUILD.md), not here.

"Bring your own key" is the rule. vsclaude never sells you tokens and never proxies your traffic through our servers. Your key talks directly to your chosen provider, and your key is stored in your operating system's secure keychain, not in a plain text file.

## Step 1: Install vsclaude

Download the installer for your platform from the releases page, then follow the matching instructions below.

| Platform | File you download | How to install |
| --- | --- | --- |
| macOS | `vsclaude_x.y.z_universal.dmg` | Open the disk image, drag vsclaude into Applications, then launch it. |
| Windows | `vsclaude_x.y.z_x64-setup.exe` | Run the installer and follow the prompts. A desktop shortcut is created. |
| Linux (Debian/Ubuntu) | `vsclaude_x.y.z_amd64.deb` | Install with your package manager, for example `sudo dpkg -i vsclaude_x.y.z_amd64.deb`. |
| Linux (universal) | `vsclaude_x.y.z_amd64.AppImage` | Make it executable and run it: `chmod +x vsclaude*.AppImage && ./vsclaude*.AppImage`. |

vsclaude is built on Tauri, so the app is small and starts fast. The first launch may take a moment longer than later launches while your operating system verifies the signature.

### A note on first launch security prompts

The first time you open a newly downloaded app, your operating system may ask you to confirm that you trust it. This is normal and expected for every desktop application.

- On macOS, if you see a message that the app cannot be opened, right click the app icon and choose Open, then confirm. You only do this once.
- On Windows, if SmartScreen appears, choose More info, then Run anyway.
- On Linux, make sure the file has execute permission as shown in the table above.

## Step 2: The first-run wizard

The very first time vsclaude opens, it runs a short setup wizard. It has four screens and takes about a minute. Nothing here is permanent: you can change every choice later in Settings.

```
  ┌─────────────────────────────────────────────────────────┐
  │  vsclaude setup                                  1 of 4  │
  │                                                          │
  │   Welcome. Let's get you watching your agent work.       │
  │                                                          │
  │   Pixie waves at you from the corner.  ( •ᴗ•)/           │
  │                                                          │
  │                                    [ Skip ]   [ Next ]   │
  └─────────────────────────────────────────────────────────┘
```

The four screens are:

1. **Welcome.** A short hello, and Pixie's first wave (this is the `greeting` state, your first taste of real motion).
2. **Appearance.** Pick light or dark theme. Dark is the default because this is a tool you may stare at for hours. You can also set the caption text size here, which matters for accessibility.
3. **Provider.** Choose which AI provider to connect first. This is the important one, so it has its own section below.
4. **Ready.** A confirmation screen with a single button: Open a project.

If you press Skip on any screen, vsclaude uses sensible defaults (dark theme, no provider yet) and drops you straight into the app. You can finish setup later from Settings.

## Step 3: Pick a provider and paste a key

vsclaude speaks to four kinds of AI agent through one unified experience. You only need one to start. Here is the honest comparison.

| Provider | Needs a key? | Best for | Where the key comes from |
| --- | --- | --- | --- |
| Claude Code | Yes | The richest experience. Sub-agents, tools, and todos all animate. | Your Anthropic account. |
| Codex | Yes | OpenAI-style coding workflows. | Your OpenAI account. |
| Gemini | Yes | Google's models. | Your Google AI Studio account. |
| Ollama (local) | No | Privacy and offline use. Models run on your own machine. | Nothing to paste. Just point vsclaude at your local Ollama. |

### Pasting a key

When you select a provider that needs a key, vsclaude shows a single secure field.

```
  ┌─────────────────────────────────────────────────────────┐
  │  Connect Claude Code                                     │
  │                                                          │
  │   Paste your API key                                     │
  │   ┌───────────────────────────────────────────────┐     │
  │   │ ••••••••••••••••••••••••••••••••••••••••••••    │     │
  │   └───────────────────────────────────────────────┘     │
  │                                                          │
  │   ✓ Stored in your OS keychain, never in a file.         │
  │                                                          │
  │             [ Test connection ]   [ Save & continue ]    │
  └─────────────────────────────────────────────────────────┘
```

What happens to your key, step by step:

1. You paste it into the field. The characters are masked as dots.
2. You press Test connection. vsclaude makes one tiny, read-only call to the provider to confirm the key works. If it fails, you get a plain-language reason, not a stack trace.
3. You press Save and continue. The key is written to your operating system's secure keychain through the Rust core. It is never written to disk in plain text, never logged, and never sent anywhere except directly to your provider.

If you chose Ollama, there is no key field at all. Instead, vsclaude checks that Ollama is running locally and lists the models you have already pulled.

### Why one key unlocks everything visual

Under the hood, every provider is normalized into a single stream of events that the entire app consumes. You never see the difference in plumbing; you only see Pixie react. This is the unifying idea of vsclaude: one event schema to rule them all. For the curious, the contract looks like this.

```ts
// packages/contracts/src/agent-event.ts  (frozen, versioned)
export interface AgentEvent {
  id: string;
  sessionId: string;
  agentId: string;
  ts: number;
  type: AgentEventType; // 'file_edit' | 'command_run' | 'thinking' | ...
  provider: 'claude-code' | 'codex' | 'gemini' | 'ollama' | string;
  caption?: string;     // the plain-language line you read on screen
  raw?: unknown;        // the exact underlying detail, one click away
}
```

You do not need to understand this to use vsclaude. It is here so you can trust that what you see is real. Every wiggle Pixie makes comes from one of these events.

## Step 4: Open a project

A project is just a folder. It can be a real codebase, a folder of writing, or a brand new empty directory you want the agent to fill.

There are three ways to open one:

1. Click **Open a project** on the wizard's final screen.
2. Use the menu: **File, Open Folder**.
3. Use the keyboard shortcut: `Cmd/Ctrl + O`.

Pick a folder and vsclaude opens the workspace. You will see three main areas:

```
  ┌──────────────┬───────────────────────────────┬───────────────┐
  │  Files       │   Editor (Monaco)             │   Pixie stage │
  │              │                               │               │
  │  src/        │   open file shows here        │   ( -ᴗ- )     │
  │  README.md   │                               │   idle, calm  │
  │  ...         │                               │               │
  ├──────────────┴───────────────────────────────┤   caption:    │
  │  Terminal (xterm.js) and the agent prompt     │   "Ready."    │
  └───────────────────────────────────────────────┴───────────────┘
```

- **Files** on the left: a tree of your project. Read-only until the agent acts.
- **Editor** in the middle: the same Monaco editor that powers many modern code tools. When the agent opens or edits a file, it appears here.
- **Pixie stage** on the right: your companion's home. This is where the motion lives.
- **Terminal** along the bottom: a real terminal connected to a real shell, plus the box where you type instructions for the agent.

When you open a folder for the first time, vsclaude asks nothing about it and changes nothing in it. The agent only touches files when you ask it to do something, and even then you stay in control through permission prompts (more on that below).

## Step 5: Meet Pixie

Pixie is a pixel-art character who acts out exactly what your agent is doing. Pixie is not decoration. Every pose, every animation, and every facial expression is bound to a real event in the stream above. If Pixie is typing, a file is being written, and you can see which one.

Pixie has a set of states. Each state has a calm idle loop, an entrance, and an exit, so transitions feel smooth rather than jumpy. On top of the state sits a mood (calm, focused, excited, or struggling) and an intensity that rises when a lot is happening at once.

| Pixie state | What the agent is doing | Triggered by event |
| --- | --- | --- |
| greeting | Saying hello at the start of a session | `session_start` |
| idle | Nothing is happening right now | no recent activity |
| sleeping | A long quiet stretch | extended idle |
| thinking | Reasoning before acting | `thinking` |
| planning | Writing or updating a to-do list | `todo_update` |
| reading | Reading a file | `file_read` |
| typing | Writing or editing a file | `file_edit`, `file_create` |
| searching | Searching the codebase | `search` |
| web | Fetching something from the internet | `web_fetch` |
| running | Running a command | `command_run` |
| debugging | Hitting an error while running | `error` during a run |
| building | A long build is in progress | long-running build |
| git | Performing a git action | `git_action` |
| spawning | Launching a helper sub-agent | `subagent_spawned` |
| waiting | Asking you for permission | `permission_request` |
| success | Finishing the task | `complete` |
| confused | Stuck on an error it cannot resolve | unresolved error |

You will get to know these quickly, because you watch them play out in order during a run. Pixie's job is to make an invisible process visible.

## Step 6: Watch your first animated run

Now the fun part. Let's give the agent a small, safe task and watch the whole thing animate.

1. Click into the **agent prompt** box at the bottom.
2. Type a simple request. A good first one is:

   ```text
   Read the README in this project and write a one-paragraph summary
   of what it does into a new file called SUMMARY.md.
   ```

3. Press Enter.

Here is what you will see, moment by moment. This sequence is real: each line corresponds to an event Pixie is reacting to.

| Moment | On the Pixie stage | Caption you read |
| --- | --- | --- |
| Agent starts | Pixie waves (greeting) | "Starting up." |
| Agent reasons | Pixie taps a tiny chin, mood focused (thinking) | "Thinking about how to do this." |
| Agent opens README | Pixie reads a little book (reading) | "Reading README.md." |
| Agent writes the file | Pixie types at a tiny keyboard (typing) | "Writing SUMMARY.md." |
| Agent finishes | Pixie cheers, mood excited (success) | "Done. Created SUMMARY.md." |

When the run finishes, look at the Files panel on the left: `SUMMARY.md` is now there, and you can open it in the editor to read what the agent wrote. The animation was not a cartoon played for show; it was a live narration of work that actually happened on your disk.

### If the agent wants permission

For anything that changes your files or runs a command, the agent may pause and ask. When it does, Pixie enters the `waiting` state and the caption reads something like "May I create SUMMARY.md?" You will see clear buttons:

```
  ┌─────────────────────────────────────────────┐
  │  Pixie is waiting for you.  ( •_•)?           │
  │                                              │
  │  The agent wants to create SUMMARY.md        │
  │                                              │
  │   [ View details ]   [ Deny ]   [ Allow ]    │
  └─────────────────────────────────────────────┘
```

Nothing happens to your project until you choose. View details shows you exactly what the agent intends to do before you decide.

## Reading the screen: captions, drill-down, and the timeline

vsclaude is designed so you can follow along at three depths, and switch between them at any time.

1. **Glance depth.** Just watch Pixie and read the one-line caption. This is enough for a non-technical person to know what stage the work is at.
2. **Skim depth.** Glance at the timeline, a horizontal strip of every event in order. Each event is a small icon you can hover for its caption.
3. **Detail depth.** Click any event in the timeline, or click Pixie's current action, to drill straight into the exact underlying detail: the tool name, the inputs, the file diff, the command that ran, and the raw output.

This is a promise, not a feature you have to hunt for. One click always reaches the truth. If Pixie shows a `typing` state, clicking it shows you the precise diff that was written. Nothing is hidden behind the animation.

```text
  Timeline (newest on the right):

  [greet] [think] [read] [type] [done]
                          ▲
                          click here ──► shows the full diff of SUMMARY.md
```

## The three motion rules, in practice

Everything above follows three sacred rules. Knowing them helps you trust what you see.

1. **Every animation is bound to a real event.** Nothing is decorative theater. If Pixie types, the agent is writing a file, and you can see which one.
2. **Meaning is always preserved and always recoverable.** One click always drills into the exact underlying detail: tool name, inputs, diff, command, raw output.
3. **A non-technical person must be able to follow along via plain-language captions.** Every state has a caption written in ordinary words.

If you ever feel that an animation is not telling you the truth, that is a bug, and we want to hear about it.

## Common questions

**Is my API key safe?**
Yes. It is stored in your operating system's secure keychain by the Rust core, never in a plain text file and never in logs. It travels only between your machine and the provider you chose.

**Can I use more than one provider?**
Yes. You can connect several and switch between them per session. Each provider has a thin adapter that normalizes its output into the same event stream, so Pixie behaves the same way no matter which model you run.

**Do I need to be a programmer?**
No. The captions are written so anyone can follow the work. The drill-down detail is there when you want it and quietly out of the way when you do not.

**Does Ollama really need no key?**
Correct. Ollama runs models locally on your own computer. vsclaude just connects to it. This is the most private option, and it works offline.

**Can I turn off sound?**
Sound is off by default. There is nothing to turn off unless you opt in later in Settings.

## Troubleshooting

| Symptom | Likely cause | What to do |
| --- | --- | --- |
| Test connection fails | The key is mistyped or expired | Re-copy the key from your provider account, watch for stray spaces, and test again. |
| Pixie stays idle after you send a prompt | No provider is connected, or the key was not saved | Open Settings, confirm a provider shows Connected, reconnect if needed. |
| Ollama shows no models | Ollama is not running, or no model is pulled | Start Ollama and pull a model, then reopen the provider screen. |
| The app will not open on first launch | Operating system security prompt | Follow the [first launch](#a-note-on-first-launch-security-prompts) steps for your platform. |
| Captions are too small to read | Default text size | Increase caption size in Settings, Appearance. |
| An animation seems wrong or out of order | Possible bug | Click the event to see the raw detail, then file an issue with what you saw. |

If a problem persists, open the event timeline and click the last event before things went quiet. The raw output there usually explains what happened, and it is exactly what you would paste into a bug report.

## Where to go next

You are up and running. From here you can go deeper.

- [Architecture](./ARCHITECTURE.md): how the one event schema ties every provider and every animation together.
- [Providers](./PROVIDERS.md): connecting Claude Code, Codex, Gemini, and Ollama in detail, including sub-agents and the swarm view.
- [Pixie States](./PIXIE-STATES.md): the full catalog of states, moods, and how they map to events.
- [Build and Release](./BUILD.md): building vsclaude from source, including the Rust toolchain setup.

Welcome aboard. Give Pixie something to do, then sit back and watch your agent come to life.
