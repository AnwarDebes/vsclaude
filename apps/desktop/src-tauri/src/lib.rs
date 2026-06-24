//! The vsclaude desktop core.
//!
//! The Rust side owns the privileged work: filesystem access, secure secret
//! storage in the OS keychain, and (tracked in the roadmap) PTY management and
//! provider process lifecycle. Every command here mirrors a logical name in the
//! IPC contract defined in `@vsclaude/contracts`. The renderer translates the
//! dotted contract names (for example `fs.readDir`) into the snake_case command
//! names below.

mod fs_ops;
mod git;
mod provider;
mod pty;
mod search;
mod secrets;

use serde::Serialize;

/// Result of `core.version`. Lets the renderer confirm protocol compatibility.
#[derive(Serialize)]
pub struct CoreVersion {
    pub protocol: u32,
    pub app: String,
}

/// The IPC protocol version this core speaks. Keep in lockstep with
/// `IPC_PROTOCOL_VERSION` in the contracts package. v2 added the filesystem
/// mutation surface, mtime conflict detection, and the live watcher. v3 replaced
/// the cleartext `secret.get` with `secret.status` (no key ever leaves the core).
/// v4 added `fs.walk`, the recursive file index behind quick-open. v5 added
/// `search.find`, project-wide search built on the ignore and grep crates.
const IPC_PROTOCOL_VERSION: u32 = 5;

#[tauri::command]
fn core_version() -> CoreVersion {
    CoreVersion {
        protocol: IPC_PROTOCOL_VERSION,
        app: env!("CARGO_PKG_VERSION").to_string(),
    }
}

/// Build and run the Tauri application.
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(fs_ops::WatcherState::default())
        .invoke_handler(tauri::generate_handler![
            core_version,
            fs_ops::fs_read_dir,
            fs_ops::fs_read_file,
            fs_ops::fs_write_file,
            fs_ops::fs_stat,
            fs_ops::fs_create_file,
            fs_ops::fs_create_dir,
            fs_ops::fs_rename,
            fs_ops::fs_delete,
            fs_ops::fs_copy,
            fs_ops::fs_watch,
            fs_ops::fs_unwatch,
            fs_ops::fs_walk,
            search::search_find,
            secrets::secret_set,
            secrets::secret_status,
            secrets::secret_delete,
            pty::pty_create,
            pty::pty_write,
            pty::pty_resize,
            pty::pty_kill,
            provider::provider_available,
            provider::provider_start,
            git::git_status,
            git::git_diff,
            git::git_head_file,
            git::git_commit,
            git::git_stage,
            git::git_unstage,
            git::git_commit_staged,
            git::git_branches,
            git::git_checkout,
            git::git_create_branch,
            git::git_stash,
            git::git_stash_pop,
            git::git_stash_list,
            git::git_log,
            git::git_delete_branch,
            git::git_rename_branch,
            git::git_tags,
            git::git_create_tag,
            git::git_delete_tag,
            git::git_ignore_add,
            git::git_fetch,
            git::git_pull,
            git::git_push,
            git::git_commit_amend,
        ])
        .run(tauri::generate_context!())
        .expect("error while running the vsclaude application");
}
