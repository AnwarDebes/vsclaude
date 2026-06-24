//! Filesystem commands.
//!
//! These back the `fs.*` IPC commands the editor and explorer use: directory
//! listing, read and write (with a modification time for conflict detection),
//! create, rename or move, delete (to the OS recycle bin), copy, stat, and a
//! debounced recursive watcher that emits `fs:changed`. Real implementations
//! using std plus the `notify` and `trash` crates so the IDE has a working
//! backend from day one.
//!
//! Every path returned to the renderer is normalized to forward slashes so keys
//! are stable across the tree, the watcher, and open buffers on every platform.
//! Windows `std::fs` accepts forward slashes, so the same string round-trips back
//! into the core unchanged.

use notify::{EventKind, RecursiveMode};
use notify_debouncer_full::{new_debouncer, Debouncer, RecommendedCache};
use serde::Serialize;
use std::collections::HashMap;
use std::fs;
use std::io::Write;
use std::path::Path;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::{Duration, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, State};

/// Replaces backslashes with forward slashes for a stable, platform neutral key.
fn normalize(path: &str) -> String {
    path.replace('\\', "/")
}

/// The final path segment, used as a display name.
fn base_name(path: &str) -> String {
    let normalized = normalize(path);
    normalized
        .trim_end_matches('/')
        .rsplit('/')
        .next()
        .unwrap_or(&normalized)
        .to_string()
}

/// Modification time in epoch milliseconds, when the platform reports it.
fn mtime_ms(meta: &fs::Metadata) -> Option<f64> {
    meta.modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as f64)
}

/// Classifies a directory entry by file type.
fn kind_of(file_type: &fs::FileType) -> &'static str {
    if file_type.is_dir() {
        "directory"
    } else if file_type.is_symlink() {
        "symlink"
    } else {
        "file"
    }
}

/// One entry in a directory listing. Mirrors `FsEntry` in the contracts package.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FsEntry {
    pub name: String,
    pub path: String,
    pub kind: String,
    pub size: Option<u64>,
    pub mtime_ms: Option<f64>,
}

/// Metadata about a single path. Mirrors `FileStat` in the contracts package.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileStat {
    pub path: String,
    pub name: String,
    pub kind: String,
    pub exists: bool,
    pub size: Option<u64>,
    pub mtime_ms: Option<f64>,
}

/// The shape returned by `fs.readFile`.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileContent {
    pub content: String,
    pub encoding: String,
    pub mtime_ms: f64,
}

/// The shape returned by `fs.writeFile`.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WriteResult {
    pub mtime_ms: f64,
}

/// Payload for the `fs:changed` event pushed to the renderer.
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct FsChanged {
    watch_id: String,
    path: String,
    kind: String,
}

/// Live watchers, keyed by the id handed back to the renderer. Dropping a
/// debouncer stops its watch, so `fs.unwatch` simply removes it from the map.
#[derive(Default)]
pub struct WatcherState {
    watchers: Mutex<HashMap<String, Debouncer<notify::RecommendedWatcher, RecommendedCache>>>,
    counter: AtomicU64,
}

#[tauri::command]
pub fn fs_read_dir(path: String) -> Result<Vec<FsEntry>, String> {
    let read = fs::read_dir(&path).map_err(|e| e.to_string())?;
    let mut entries = Vec::new();
    for item in read {
        let item = item.map_err(|e| e.to_string())?;
        let file_type = item.file_type().map_err(|e| e.to_string())?;
        let meta = item.metadata().ok();
        let size = if file_type.is_file() {
            meta.as_ref().map(|m| m.len())
        } else {
            None
        };
        entries.push(FsEntry {
            name: item.file_name().to_string_lossy().into_owned(),
            path: normalize(&item.path().to_string_lossy()),
            kind: kind_of(&file_type).to_string(),
            size,
            mtime_ms: meta.as_ref().and_then(mtime_ms),
        });
    }
    Ok(entries)
}

#[tauri::command]
pub fn fs_read_file(path: String) -> Result<FileContent, String> {
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let mtime = fs::metadata(&path)
        .ok()
        .and_then(|m| mtime_ms(&m))
        .unwrap_or(0.0);
    Ok(FileContent {
        content,
        encoding: "utf-8".to_string(),
        mtime_ms: mtime,
    })
}

#[tauri::command]
pub fn fs_write_file(path: String, content: String) -> Result<WriteResult, String> {
    if let Some(parent) = Path::new(&path).parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
    }
    fs::write(&path, content).map_err(|e| e.to_string())?;
    let mtime = fs::metadata(&path)
        .ok()
        .and_then(|m| mtime_ms(&m))
        .unwrap_or(0.0);
    Ok(WriteResult { mtime_ms: mtime })
}

#[tauri::command]
pub fn fs_stat(path: String) -> Result<FileStat, String> {
    let normalized = normalize(&path);
    let name = base_name(&normalized);
    match fs::symlink_metadata(&path) {
        Ok(meta) => {
            let file_type = meta.file_type();
            let size = if file_type.is_file() {
                Some(meta.len())
            } else {
                None
            };
            Ok(FileStat {
                path: normalized,
                name,
                kind: kind_of(&file_type).to_string(),
                exists: true,
                size,
                mtime_ms: mtime_ms(&meta),
            })
        }
        Err(_) => Ok(FileStat {
            path: normalized,
            name,
            kind: "file".to_string(),
            exists: false,
            size: None,
            mtime_ms: None,
        }),
    }
}

#[tauri::command]
pub fn fs_create_file(path: String, content: Option<String>) -> Result<(), String> {
    if let Some(parent) = Path::new(&path).parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
    }
    // `create_new` is atomic and exclusive (O_EXCL / CREATE_NEW): it fails if the
    // path already exists rather than checking then writing, which closes the
    // time-of-check/time-of-use race and refuses to write through a dangling
    // symlink.
    let mut file = fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&path)
        .map_err(|e| e.to_string())?;
    file.write_all(content.unwrap_or_default().as_bytes())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn fs_create_dir(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn fs_rename(from: String, to: String) -> Result<(), String> {
    let from_path = Path::new(&from);
    let to_path = Path::new(&to);
    // Refuse to move a directory into itself or one of its descendants.
    if to_path == from_path || to_path.starts_with(from_path) {
        return Err("cannot move a path into itself".to_string());
    }
    if let Some(parent) = to_path.parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
    }
    fs::rename(from_path, to_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn fs_delete(path: String) -> Result<(), String> {
    // Deleting something that is already gone is a no-op, not an error, and keeps
    // the message off the raw, platform-specific trash error for that case.
    if fs::symlink_metadata(&path).is_err() {
        return Ok(());
    }
    trash::delete(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn fs_copy(from: String, to: String) -> Result<(), String> {
    copy_recursive(Path::new(&from), Path::new(&to)).map_err(|e| e.to_string())
}

/// Copies a file, or a directory and all of its contents, to a new location.
///
/// Symlinks are never descended into: a child is recursed only when it is a real
/// directory (`is_dir() && !is_symlink()`), so a symlink cycle (for example
/// `dir/loop -> dir`) cannot recurse without bound. The file-type checks use the
/// directory entry's own type, which does not follow links.
fn copy_recursive(from: &Path, to: &Path) -> std::io::Result<()> {
    let meta = fs::symlink_metadata(from)?;
    if meta.file_type().is_dir() {
        fs::create_dir_all(to)?;
        for entry in fs::read_dir(from)? {
            let entry = entry?;
            let child = entry.path();
            let dest = to.join(entry.file_name());
            let child_type = entry.file_type()?;
            if child_type.is_dir() && !child_type.is_symlink() {
                copy_recursive(&child, &dest)?;
            } else {
                fs::copy(&child, &dest)?;
            }
        }
    } else {
        if let Some(parent) = to.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::copy(from, to)?;
    }
    Ok(())
}

#[tauri::command]
pub fn fs_watch(
    app: AppHandle,
    state: State<'_, WatcherState>,
    path: String,
) -> Result<WatchHandle, String> {
    let id = state.counter.fetch_add(1, Ordering::Relaxed);
    let watch_id = format!("watch-{id}");

    let app_handle = app.clone();
    let id_for_cb = watch_id.clone();
    let mut debouncer = new_debouncer(
        Duration::from_millis(150),
        None,
        move |result: notify_debouncer_full::DebounceEventResult| {
            let events = match result {
                Ok(events) => events,
                Err(_) => return,
            };
            for event in events {
                let kind = match &event.kind {
                    EventKind::Create(_) => "created",
                    EventKind::Remove(_) => "deleted",
                    EventKind::Modify(_) => "modified",
                    _ => continue,
                };
                for changed in &event.paths {
                    let payload = FsChanged {
                        watch_id: id_for_cb.clone(),
                        path: normalize(&changed.to_string_lossy()),
                        kind: kind.to_string(),
                    };
                    let _ = app_handle.emit("fs:changed", payload);
                }
            }
        },
    )
    .map_err(|e| e.to_string())?;

    debouncer
        .watch(Path::new(&path), RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;

    state
        .watchers
        .lock()
        .map_err(|e| e.to_string())?
        .insert(watch_id.clone(), debouncer);

    Ok(WatchHandle { watch_id })
}

#[tauri::command]
pub fn fs_unwatch(state: State<'_, WatcherState>, watch_id: String) -> Result<(), String> {
    state
        .watchers
        .lock()
        .map_err(|e| e.to_string())?
        .remove(&watch_id);
    Ok(())
}

/// The shape returned by `fs.watch`.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WatchHandle {
    pub watch_id: String,
}

/// The shape returned by `fs.walk`.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WalkResult {
    pub files: Vec<String>,
    pub truncated: bool,
}

/// Default and hard ceilings for the quick-open file walk.
const DEFAULT_WALK_LIMIT: usize = 20_000;
const MAX_WALK_LIMIT: usize = 100_000;

/// Directories the file index never descends into: dependency stores, version
/// control metadata, and common build outputs. Keeping these out keeps the
/// quick-open list small and fast.
fn is_ignored_dir(name: &str) -> bool {
    matches!(
        name,
        "node_modules"
            | ".git"
            | ".hg"
            | ".svn"
            | "target"
            | "dist"
            | "build"
            | "out"
            | ".next"
            | "coverage"
            | ".turbo"
            | ".cache"
            | "vendor"
    )
}

/// Recursively collects file paths under `path` for the quick-open index.
///
/// The walk is iterative (an explicit stack) so a deep tree cannot overflow the
/// call stack. Symlinks are never followed: `DirEntry::file_type` does not
/// resolve links, so a symlink reports neither `is_dir` nor `is_file` here and is
/// skipped, which also makes a symlink cycle impossible. An unreadable
/// subdirectory is skipped rather than failing the whole walk. The result is
/// capped; `truncated` records whether the cap stopped the walk early.
#[tauri::command]
pub fn fs_walk(path: String, limit: Option<usize>) -> Result<WalkResult, String> {
    let cap = limit.unwrap_or(DEFAULT_WALK_LIMIT).min(MAX_WALK_LIMIT);
    let mut files: Vec<String> = Vec::new();
    let mut truncated = false;
    let mut stack: Vec<std::path::PathBuf> = vec![std::path::PathBuf::from(&path)];

    'walk: while let Some(dir) = stack.pop() {
        let read = match fs::read_dir(&dir) {
            Ok(read) => read,
            Err(_) => continue,
        };
        for entry in read {
            let entry = match entry {
                Ok(entry) => entry,
                Err(_) => continue,
            };
            let file_type = match entry.file_type() {
                Ok(file_type) => file_type,
                Err(_) => continue,
            };
            if file_type.is_dir() {
                let name = entry.file_name().to_string_lossy().into_owned();
                if !is_ignored_dir(&name) {
                    stack.push(entry.path());
                }
            } else if file_type.is_file() {
                if files.len() >= cap {
                    truncated = true;
                    break 'walk;
                }
                files.push(normalize(&entry.path().to_string_lossy()));
            }
        }
    }

    Ok(WalkResult { files, truncated })
}
