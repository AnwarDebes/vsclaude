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

/// Stage the given paths (relative to the repo root).
#[tauri::command]
pub fn git_stage(cwd: String, paths: Vec<String>) -> Result<(), String> {
    if paths.is_empty() {
        return Ok(());
    }
    let mut args: Vec<&str> = vec!["add", "--"];
    for path in &paths {
        args.push(path);
    }
    run_git(&cwd, &args).map(|_| ())
}

/// Unstage the given paths, leaving the working-tree changes in place.
#[tauri::command]
pub fn git_unstage(cwd: String, paths: Vec<String>) -> Result<(), String> {
    if paths.is_empty() {
        return Ok(());
    }
    let mut args: Vec<&str> = vec!["reset", "-q", "HEAD", "--"];
    for path in &paths {
        args.push(path);
    }
    run_git(&cwd, &args).map(|_| ())
}

/// Commit only what is already staged.
#[tauri::command]
pub fn git_commit_staged(cwd: String, message: String) -> Result<CommitResult, String> {
    let output = run_git(&cwd, &["commit", "-m", &message])?;
    Ok(CommitResult { output })
}

/// Local branches plus the current one. `current` is None on a detached HEAD or
/// before the first commit.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BranchList {
    pub current: Option<String>,
    pub branches: Vec<String>,
    pub detached: bool,
}

#[tauri::command]
pub fn git_branches(cwd: String) -> Result<BranchList, String> {
    let listing = run_git(&cwd, &["branch", "--format=%(refname:short)"])?;
    let branches: Vec<String> = listing
        .lines()
        .map(|line| line.trim().to_string())
        .filter(|line| !line.is_empty())
        .collect();
    let current = run_git(&cwd, &["symbolic-ref", "--short", "-q", "HEAD"])
        .ok()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());
    let has_head = run_git(&cwd, &["rev-parse", "--verify", "-q", "HEAD"]).is_ok();
    let detached = current.is_none() && has_head;
    Ok(BranchList {
        current,
        branches,
        detached,
    })
}

/// Switch to an existing branch.
#[tauri::command]
pub fn git_checkout(cwd: String, branch: String) -> Result<(), String> {
    run_git(&cwd, &["checkout", &branch]).map(|_| ())
}

/// Create a new branch from the current HEAD and switch to it.
#[tauri::command]
pub fn git_create_branch(cwd: String, name: String) -> Result<(), String> {
    run_git(&cwd, &["checkout", "-b", &name]).map(|_| ())
}

/// Stash the working-tree changes, including untracked files.
#[tauri::command]
pub fn git_stash(cwd: String) -> Result<(), String> {
    run_git(&cwd, &["stash", "push", "-u"]).map(|_| ())
}

/// Restore the most recent stash back into the working tree.
#[tauri::command]
pub fn git_stash_pop(cwd: String) -> Result<(), String> {
    run_git(&cwd, &["stash", "pop"]).map(|_| ())
}

/// The raw `git stash list` output; the renderer counts the entries.
#[tauri::command]
pub fn git_stash_list(cwd: String) -> Result<String, String> {
    run_git(&cwd, &["stash", "list"])
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::PathBuf;

    fn init_repo(tag: &str) -> PathBuf {
        let mut dir = std::env::temp_dir();
        dir.push(format!("vsclaude-git-test-{tag}"));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        let cwd = dir.to_str().unwrap();
        run_git(cwd, &["init", "-q"]).unwrap();
        run_git(cwd, &["config", "user.email", "test@example.com"]).unwrap();
        run_git(cwd, &["config", "user.name", "Test"]).unwrap();
        dir
    }

    #[test]
    fn stage_commit_and_branch() {
        let dir = init_repo("scm");
        let cwd = dir.to_str().unwrap().to_string();
        fs::write(dir.join("a.txt"), "hello").unwrap();

        git_stage(cwd.clone(), vec!["a.txt".to_string()]).unwrap();
        let staged = git_status(cwd.clone()).unwrap();
        assert!(staged.contains("a.txt"));

        git_commit_staged(cwd.clone(), "initial".to_string()).unwrap();
        let after_commit = git_status(cwd.clone()).unwrap();
        // Nothing left staged after the commit (the porcelain body is empty).
        assert!(!after_commit.lines().any(|l| l.contains("a.txt")));

        let branches = git_branches(cwd.clone()).unwrap();
        assert!(branches.current.is_some());

        git_create_branch(cwd.clone(), "feature".to_string()).unwrap();
        let switched = git_branches(cwd.clone()).unwrap();
        assert_eq!(switched.current.as_deref(), Some("feature"));
        assert!(switched.branches.iter().any(|b| b == "feature"));

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn stash_hides_changes_and_pop_restores_them() {
        let dir = init_repo("stash");
        let cwd = dir.to_str().unwrap().to_string();
        fs::write(dir.join("a.txt"), "one").unwrap();
        git_stage(cwd.clone(), vec!["a.txt".to_string()]).unwrap();
        git_commit_staged(cwd.clone(), "first".to_string()).unwrap();

        fs::write(dir.join("a.txt"), "two").unwrap();
        assert!(git_status(cwd.clone()).unwrap().contains("a.txt"));

        git_stash(cwd.clone()).unwrap();
        // The working tree is clean and the change is on the stash.
        assert!(!git_status(cwd.clone()).unwrap().contains("a.txt"));
        assert!(git_stash_list(cwd.clone()).unwrap().contains("stash@{0}"));

        git_stash_pop(cwd.clone()).unwrap();
        assert!(git_status(cwd.clone()).unwrap().contains("a.txt"));
        assert_eq!(git_stash_list(cwd.clone()).unwrap().trim(), "");

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn unstage_moves_a_file_out_of_the_index() {
        let dir = init_repo("unstage");
        let cwd = dir.to_str().unwrap().to_string();
        fs::write(dir.join("a.txt"), "one").unwrap();
        git_stage(cwd.clone(), vec!["a.txt".to_string()]).unwrap();
        git_commit_staged(cwd.clone(), "first".to_string()).unwrap();

        fs::write(dir.join("a.txt"), "two").unwrap();
        git_stage(cwd.clone(), vec!["a.txt".to_string()]).unwrap();
        // Staged: index column shows M.
        assert!(git_status(cwd.clone()).unwrap().contains("M  a.txt"));
        git_unstage(cwd.clone(), vec!["a.txt".to_string()]).unwrap();
        // Unstaged: the change moved to the working-tree column.
        assert!(git_status(cwd.clone()).unwrap().contains(" M a.txt"));

        let _ = fs::remove_dir_all(&dir);
    }
}
