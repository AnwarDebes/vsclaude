//! Filesystem commands. These back the IPC commands `fs.readDir`,
//! `fs.readFile`, and `fs.writeFile`. Real implementations using std so the
//! file explorer and editor have a working backend from day one.

use serde::Serialize;
use std::fs;

/// One entry in a directory listing. Mirrors `FsEntry` in the contracts package.
#[derive(Serialize)]
pub struct FsEntry {
    pub name: String,
    pub path: String,
    pub kind: String,
    pub size: Option<u64>,
}

/// The shape returned by `fs.readFile`.
#[derive(Serialize)]
pub struct FileContent {
    pub content: String,
    pub encoding: String,
}

#[tauri::command]
pub fn fs_read_dir(path: String) -> Result<Vec<FsEntry>, String> {
    let read = fs::read_dir(&path).map_err(|e| e.to_string())?;
    let mut entries = Vec::new();
    for item in read {
        let item = item.map_err(|e| e.to_string())?;
        let file_type = item.file_type().map_err(|e| e.to_string())?;
        let kind = if file_type.is_dir() {
            "directory"
        } else if file_type.is_symlink() {
            "symlink"
        } else {
            "file"
        };
        let size = if file_type.is_file() {
            item.metadata().ok().map(|m| m.len())
        } else {
            None
        };
        entries.push(FsEntry {
            name: item.file_name().to_string_lossy().into_owned(),
            path: item.path().to_string_lossy().into_owned(),
            kind: kind.to_string(),
            size,
        });
    }
    Ok(entries)
}

#[tauri::command]
pub fn fs_read_file(path: String) -> Result<FileContent, String> {
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    Ok(FileContent {
        content,
        encoding: "utf-8".to_string(),
    })
}

#[tauri::command]
pub fn fs_write_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| e.to_string())
}
