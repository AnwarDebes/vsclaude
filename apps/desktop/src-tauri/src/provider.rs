//! Live agent provider: spawn the real Claude Code CLI and stream its output.
//!
//! `provider_start` runs `claude -p <prompt> --output-format stream-json
//! --verbose` as a child process, then forwards each line of its NDJSON stdout
//! to the renderer as a `provider:stdout` event. The renderer normalizes each
//! line into an AgentEvent with the existing `parseClaudeStreamLine` adapter, so
//! Pixie and the swarm view are driven by a real session. `provider:exit` fires
//! when the process ends. A piped child (not a PTY) is used on purpose so the
//! NDJSON stream stays byte-clean.

use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};

use serde::Serialize;
use tauri::{AppHandle, Emitter};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionStarted {
    session_id: String,
    pid: u32,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ProviderLineEvent {
    session_id: String,
    line: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ProviderExitEvent {
    session_id: String,
    code: Option<i32>,
}

/// Return true when the given agent CLI (default `claude`) is on PATH.
#[tauri::command]
pub fn provider_available(command: Option<String>) -> bool {
    let program = command.unwrap_or_else(|| "claude".to_string());
    Command::new(program)
        .arg("--version")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .stdin(Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

/// Start a real agent session. Streams `provider:stdout` lines, then `provider:exit`.
#[tauri::command]
pub fn provider_start(
    app: AppHandle,
    prompt: String,
    cwd: Option<String>,
    command: Option<String>,
) -> Result<SessionStarted, String> {
    let program = command.unwrap_or_else(|| "claude".to_string());
    let mut cmd = Command::new(&program);
    cmd.arg("-p")
        .arg(&prompt)
        .arg("--output-format")
        .arg("stream-json")
        .arg("--verbose")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .stdin(Stdio::null());
    if let Some(dir) = cwd {
        cmd.current_dir(dir);
    }

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("could not start '{}': {}", program, e))?;

    let pid = child.id();
    let session_id = format!("session-{}", pid);

    let stdout = child.stdout.take().ok_or("child has no stdout")?;
    let app_for_thread = app.clone();
    let session_for_thread = session_id.clone();
    std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            match line {
                Ok(line) => {
                    let _ = app_for_thread.emit(
                        "provider:stdout",
                        ProviderLineEvent {
                            session_id: session_for_thread.clone(),
                            line,
                        },
                    );
                }
                Err(_) => break,
            }
        }
        let code = child.wait().ok().and_then(|s| s.code());
        let _ = app_for_thread.emit(
            "provider:exit",
            ProviderExitEvent {
                session_id: session_for_thread.clone(),
                code,
            },
        );
    });

    Ok(SessionStarted { session_id, pid })
}
