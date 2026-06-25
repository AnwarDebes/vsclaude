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
/// Append a pattern to .gitignore (creating the file), skipping duplicates.
#[tauri::command]
pub fn git_ignore_add(cwd: String, pattern: String) -> Result<(), String> {
    let entry = pattern.trim().to_string();
    if entry.is_empty() {
        return Err("empty pattern".to_string());
    }
    let path = std::path::Path::new(&cwd).join(".gitignore");
    let existing = std::fs::read_to_string(&path).unwrap_or_default();
    if existing.lines().any(|l| l.trim() == entry) {
        return Ok(());
    }
    let mut content = existing;
    if !content.is_empty() && !content.ends_with('\n') {
        content.push('\n');
    }
    content.push_str(&entry);
    content.push('\n');
    std::fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(())
}

/// Revert a commit by creating a new commit that undoes it.
#[tauri::command]
pub fn git_revert(cwd: String, hash: String) -> Result<String, String> {
    run_git(&cwd, &["revert", "--no-edit", &hash])
}

/// Amend the last commit with the staged changes and a new message.
#[tauri::command]
pub fn git_commit_amend(cwd: String, message: String) -> Result<CommitResult, String> {
    let output = run_git(&cwd, &["commit", "--amend", "-m", &message])?;
    Ok(CommitResult { output })
}

/// Fetch from the default remote.
#[tauri::command]
pub fn git_fetch(cwd: String) -> Result<String, String> {
    run_git(&cwd, &["fetch"])
}

/// Pull (fast-forward only) from the upstream branch.
#[tauri::command]
pub fn git_pull(cwd: String) -> Result<String, String> {
    run_git(&cwd, &["pull", "--ff-only"])
}

/// Push the current branch to its upstream.
#[tauri::command]
pub fn git_push(cwd: String) -> Result<String, String> {
    run_git(&cwd, &["push"])
}

/// List tags, newest first.
#[tauri::command]
pub fn git_tags(cwd: String) -> Result<Vec<String>, String> {
    let out = run_git(&cwd, &["tag", "--list", "--sort=-creatordate"])?;
    Ok(out
        .lines()
        .filter(|l| !l.is_empty())
        .map(|l| l.to_string())
        .collect())
}

/// Create a tag. Annotated when a message is given, lightweight otherwise.
#[tauri::command]
pub fn git_create_tag(cwd: String, name: String, message: Option<String>) -> Result<(), String> {
    match message {
        Some(m) if !m.is_empty() => run_git(&cwd, &["tag", "-a", &name, "-m", &m])?,
        _ => run_git(&cwd, &["tag", &name])?,
    };
    Ok(())
}

/// Delete a tag.
#[tauri::command]
pub fn git_delete_tag(cwd: String, name: String) -> Result<(), String> {
    run_git(&cwd, &["tag", "-d", &name])?;
    Ok(())
}

/// Delete a branch. Safe delete: git refuses if it has unmerged commits.
#[tauri::command]
pub fn git_delete_branch(cwd: String, name: String) -> Result<(), String> {
    run_git(&cwd, &["branch", "-d", &name])?;
    Ok(())
}

/// Rename a branch.
#[tauri::command]
pub fn git_rename_branch(cwd: String, from: String, to: String) -> Result<(), String> {
    run_git(&cwd, &["branch", "-m", &from, &to])?;
    Ok(())
}

#[tauri::command]
pub fn git_stash(cwd: String) -> Result<(), String> {
    run_git(&cwd, &["stash", "push", "-u"]).map(|_| ())
}

/// Restore the most recent stash back into the working tree.
#[tauri::command]
pub fn git_stash_pop(cwd: String) -> Result<(), String> {
    run_git(&cwd, &["stash", "pop"]).map(|_| ())
}

/// The raw `git stash list` output; the renderer counts and parses the entries.
#[tauri::command]
pub fn git_stash_list(cwd: String) -> Result<String, String> {
    run_git(&cwd, &["stash", "list"])
}

/// Apply a stash by index without removing it from the stash list.
#[tauri::command]
pub fn git_stash_apply(cwd: String, index: u32) -> Result<(), String> {
    run_git(&cwd, &["stash", "apply", &format!("stash@{{{index}}}")]).map(|_| ())
}

/// Drop a stash by index.
#[tauri::command]
pub fn git_stash_drop(cwd: String, index: u32) -> Result<(), String> {
    run_git(&cwd, &["stash", "drop", &format!("stash@{{{index}}}")]).map(|_| ())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitCommit {
    hash: String,
    short_hash: String,
    author: String,
    email: String,
    /// Author date in unix seconds.
    date: i64,
    subject: String,
}

/// Recent commit history, newest first, capped at `limit` (default 100). Fields
/// are unit-separator delimited so a subject can hold any character but a newline.
#[tauri::command]
pub fn git_log(cwd: String, limit: Option<u32>) -> Result<Vec<GitCommit>, String> {
    let max = limit.unwrap_or(100).to_string();
    let format = "--pretty=format:%H%x1f%h%x1f%an%x1f%ae%x1f%at%x1f%s";
    let out = run_git(&cwd, &["log", "-n", &max, format])?;
    let mut commits = Vec::new();
    for line in out.lines() {
        if line.is_empty() {
            continue;
        }
        let parts: Vec<&str> = line.split('\u{1f}').collect();
        if parts.len() < 6 {
            continue;
        }
        commits.push(GitCommit {
            hash: parts[0].to_string(),
            short_hash: parts[1].to_string(),
            author: parts[2].to_string(),
            email: parts[3].to_string(),
            date: parts[4].parse().unwrap_or(0),
            subject: parts[5].to_string(),
        });
    }
    Ok(commits)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitRemote {
    name: String,
    url: String,
}

/// The configured remotes with their fetch URLs, one entry per remote name.
#[tauri::command]
pub fn git_remotes(cwd: String) -> Result<Vec<GitRemote>, String> {
    let out = run_git(&cwd, &["remote", "-v"])?;
    let mut remotes = Vec::new();
    let mut seen = std::collections::HashSet::new();
    for line in out.lines() {
        // Lines look like: "origin\thttps://...\t(fetch)".
        let mut parts = line.split_whitespace();
        let (Some(name), Some(url)) = (parts.next(), parts.next()) else {
            continue;
        };
        if seen.insert(name.to_string()) {
            remotes.push(GitRemote {
                name: name.to_string(),
                url: url.to_string(),
            });
        }
    }
    Ok(remotes)
}

/// Add a remote pointing at a URL.
#[tauri::command]
pub fn git_remote_add(cwd: String, name: String, url: String) -> Result<(), String> {
    run_git(&cwd, &["remote", "add", &name, &url])?;
    Ok(())
}

/// Remove a remote.
#[tauri::command]
pub fn git_remote_remove(cwd: String, name: String) -> Result<(), String> {
    run_git(&cwd, &["remote", "remove", &name])?;
    Ok(())
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
    fn revert_undoes_a_commit() {
        let dir = init_repo("revert");
        let cwd = dir.to_str().unwrap().to_string();
        fs::write(dir.join("a.txt"), "one").unwrap();
        git_stage(cwd.clone(), vec!["a.txt".to_string()]).unwrap();
        git_commit_staged(cwd.clone(), "add a".to_string()).unwrap();
        fs::write(dir.join("b.txt"), "two").unwrap();
        git_stage(cwd.clone(), vec!["b.txt".to_string()]).unwrap();
        git_commit_staged(cwd.clone(), "add b".to_string()).unwrap();

        let head = git_log(cwd.clone(), Some(1)).unwrap()[0].hash.clone();
        git_revert(cwd.clone(), head).unwrap();

        // The revert removed b.txt and added a third commit.
        assert!(!dir.join("b.txt").exists());
        assert_eq!(git_log(cwd.clone(), Some(10)).unwrap().len(), 3);

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn amend_rewrites_the_last_commit() {
        let dir = init_repo("amend");
        let cwd = dir.to_str().unwrap().to_string();
        fs::write(dir.join("a.txt"), "one").unwrap();
        git_stage(cwd.clone(), vec!["a.txt".to_string()]).unwrap();
        git_commit_staged(cwd.clone(), "typo".to_string()).unwrap();

        fs::write(dir.join("b.txt"), "two").unwrap();
        git_stage(cwd.clone(), vec!["b.txt".to_string()]).unwrap();
        git_commit_amend(cwd.clone(), "fixed message".to_string()).unwrap();

        let log = git_log(cwd.clone(), Some(10)).unwrap();
        assert_eq!(log.len(), 1);
        assert_eq!(log[0].subject, "fixed message");
        // The amended commit absorbed b.txt, so the working tree is clean.
        assert!(!git_status(cwd.clone()).unwrap().contains("b.txt"));

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn push_fetch_and_pull_through_a_bare_remote() {
        let tmp = std::env::temp_dir();
        let remote = tmp.join("vsclaude-git-remote.git");
        let dir_a = tmp.join("vsclaude-git-push-a");
        let dir_b = tmp.join("vsclaude-git-push-b");
        for path in [&remote, &dir_a, &dir_b] {
            let _ = fs::remove_dir_all(path);
        }
        fs::create_dir_all(&dir_a).unwrap();
        let tmp_cwd = tmp.to_str().unwrap();

        run_git(tmp_cwd, &["init", "--bare", "-q", remote.to_str().unwrap()]).unwrap();

        // Repo A: commit and push, setting the upstream.
        let a = dir_a.to_str().unwrap().to_string();
        run_git(&a, &["init", "-q"]).unwrap();
        run_git(&a, &["config", "user.email", "t@example.com"]).unwrap();
        run_git(&a, &["config", "user.name", "T"]).unwrap();
        run_git(&a, &["remote", "add", "origin", remote.to_str().unwrap()]).unwrap();
        fs::write(dir_a.join("a.txt"), "one").unwrap();
        git_stage(a.clone(), vec!["a.txt".to_string()]).unwrap();
        git_commit_staged(a.clone(), "first".to_string()).unwrap();
        run_git(&a, &["push", "-u", "origin", "HEAD"]).unwrap();

        // Repo B: clone the remote.
        run_git(
            tmp_cwd,
            &[
                "clone",
                "-q",
                remote.to_str().unwrap(),
                dir_b.to_str().unwrap(),
            ],
        )
        .unwrap();
        let b = dir_b.to_str().unwrap().to_string();

        // A commits again and pushes through git_push.
        fs::write(dir_a.join("b.txt"), "two").unwrap();
        git_stage(a.clone(), vec!["b.txt".to_string()]).unwrap();
        git_commit_staged(a.clone(), "second".to_string()).unwrap();
        git_push(a.clone()).unwrap();

        // B fetches and fast-forward pulls, so it now has the second commit.
        git_fetch(b.clone()).unwrap();
        git_pull(b.clone()).unwrap();
        assert!(dir_b.join("b.txt").exists());

        for path in [&remote, &dir_a, &dir_b] {
            let _ = fs::remove_dir_all(path);
        }
    }

    #[test]
    fn ignore_add_appends_without_duplicates() {
        let dir = init_repo("ignore");
        let cwd = dir.to_str().unwrap().to_string();
        git_ignore_add(cwd.clone(), "node_modules".to_string()).unwrap();
        git_ignore_add(cwd.clone(), "node_modules".to_string()).unwrap();
        git_ignore_add(cwd.clone(), "dist".to_string()).unwrap();
        let content = std::fs::read_to_string(dir.join(".gitignore")).unwrap();
        let lines: Vec<&str> = content.lines().filter(|l| !l.is_empty()).collect();
        assert_eq!(lines, vec!["node_modules", "dist"]);
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn create_list_and_delete_tags() {
        let dir = init_repo("tags");
        let cwd = dir.to_str().unwrap().to_string();
        fs::write(dir.join("a.txt"), "one").unwrap();
        git_stage(cwd.clone(), vec!["a.txt".to_string()]).unwrap();
        git_commit_staged(cwd.clone(), "init".to_string()).unwrap();

        git_create_tag(cwd.clone(), "v1.0".to_string(), None).unwrap();
        git_create_tag(cwd.clone(), "v1.1".to_string(), Some("release".to_string())).unwrap();
        let tags = git_tags(cwd.clone()).unwrap();
        assert!(tags.iter().any(|t| t == "v1.0"));
        assert!(tags.iter().any(|t| t == "v1.1"));

        git_delete_tag(cwd.clone(), "v1.0".to_string()).unwrap();
        let after = git_tags(cwd.clone()).unwrap();
        assert!(!after.iter().any(|t| t == "v1.0"));
        assert!(after.iter().any(|t| t == "v1.1"));

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn rename_and_delete_branches() {
        let dir = init_repo("branchops");
        let cwd = dir.to_str().unwrap().to_string();
        fs::write(dir.join("a.txt"), "one").unwrap();
        git_stage(cwd.clone(), vec!["a.txt".to_string()]).unwrap();
        git_commit_staged(cwd.clone(), "init".to_string()).unwrap();

        let base = git_branches(cwd.clone()).unwrap().current.unwrap();

        git_create_branch(cwd.clone(), "feature".to_string()).unwrap();
        git_rename_branch(cwd.clone(), "feature".to_string(), "feature2".to_string()).unwrap();
        let renamed = git_branches(cwd.clone()).unwrap();
        assert!(renamed.branches.iter().any(|b| b == "feature2"));
        assert!(!renamed.branches.iter().any(|b| b == "feature"));

        git_checkout(cwd.clone(), base).unwrap();
        git_delete_branch(cwd.clone(), "feature2".to_string()).unwrap();
        let after = git_branches(cwd.clone()).unwrap();
        assert!(!after.branches.iter().any(|b| b == "feature2"));

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn log_lists_commits_newest_first() {
        let dir = init_repo("log");
        let cwd = dir.to_str().unwrap().to_string();

        fs::write(dir.join("a.txt"), "one").unwrap();
        git_stage(cwd.clone(), vec!["a.txt".to_string()]).unwrap();
        git_commit_staged(cwd.clone(), "first commit".to_string()).unwrap();

        fs::write(dir.join("b.txt"), "two").unwrap();
        git_stage(cwd.clone(), vec!["b.txt".to_string()]).unwrap();
        git_commit_staged(cwd.clone(), "second commit".to_string()).unwrap();

        let commits = git_log(cwd.clone(), Some(10)).unwrap();
        assert_eq!(commits.len(), 2);
        assert_eq!(commits[0].subject, "second commit");
        assert_eq!(commits[1].subject, "first commit");
        assert_eq!(commits[0].author, "Test");
        assert!(!commits[0].short_hash.is_empty());
        assert!(commits[0].date > 0);

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn stash_apply_keeps_the_entry_and_drop_removes_it() {
        let dir = init_repo("stashapply");
        let cwd = dir.to_str().unwrap().to_string();
        fs::write(dir.join("a.txt"), "one").unwrap();
        git_stage(cwd.clone(), vec!["a.txt".to_string()]).unwrap();
        git_commit_staged(cwd.clone(), "first".to_string()).unwrap();

        fs::write(dir.join("a.txt"), "two").unwrap();
        git_stash(cwd.clone()).unwrap();
        assert!(!git_status(cwd.clone()).unwrap().contains("a.txt"));

        // Apply restores the change but leaves the stash entry in place.
        git_stash_apply(cwd.clone(), 0).unwrap();
        assert!(git_status(cwd.clone()).unwrap().contains("a.txt"));
        assert!(git_stash_list(cwd.clone()).unwrap().contains("stash@{0}"));

        // Drop removes the entry.
        git_stash_drop(cwd.clone(), 0).unwrap();
        assert_eq!(git_stash_list(cwd.clone()).unwrap().trim(), "");

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn add_list_and_remove_remotes() {
        let dir = init_repo("remotes");
        let cwd = dir.to_str().unwrap().to_string();
        assert!(git_remotes(cwd.clone()).unwrap().is_empty());

        git_remote_add(
            cwd.clone(),
            "origin".to_string(),
            "https://example.com/r.git".to_string(),
        )
        .unwrap();
        let remotes = git_remotes(cwd.clone()).unwrap();
        assert_eq!(remotes.len(), 1);
        assert_eq!(remotes[0].name, "origin");
        assert_eq!(remotes[0].url, "https://example.com/r.git");

        git_remote_remove(cwd.clone(), "origin".to_string()).unwrap();
        assert!(git_remotes(cwd.clone()).unwrap().is_empty());

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
