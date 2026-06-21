//! Git integration for the diff-review and commit flow.
//!
//! Thin, correct wrappers over the `git` CLI. `git_status` returns porcelain v1
//! output (parsed in the renderer by `parsePorcelainStatus`), `git_diff` and
//! `git_head_file` feed the diff viewer, and `git_commit` stages and commits for
//! real. Errors carry git's stderr so the UI can surface them.

use std::process::Command;

use serde::Serialize;

fn run_git(cwd: &str, args: &[&str]) -> Result<String, String> {
    let output = Command::new("git")
        .args(args)
        .current_dir(cwd)
        .output()
        .map_err(|e| format!("git is not available: {}", e))?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
pub fn git_status(cwd: String) -> Result<String, String> {
    run_git(&cwd, &["status", "--porcelain=v1", "--branch"])
}

#[tauri::command]
pub fn git_diff(cwd: String, path: Option<String>) -> Result<String, String> {
    match path {
        Some(p) => run_git(&cwd, &["diff", "--", &p]),
        None => run_git(&cwd, &["diff"]),
    }
}

#[tauri::command]
pub fn git_head_file(cwd: String, path: String) -> Result<String, String> {
    let spec = format!("HEAD:{}", path);
    run_git(&cwd, &["show", &spec])
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitResult {
    output: String,
}

/// Stage everything and commit. Accepting the agent's work and recording it.
#[tauri::command]
pub fn git_commit(cwd: String, message: String) -> Result<CommitResult, String> {
    run_git(&cwd, &["add", "-A"])?;
    let output = run_git(&cwd, &["commit", "-m", &message])?;
    Ok(CommitResult { output })
}
