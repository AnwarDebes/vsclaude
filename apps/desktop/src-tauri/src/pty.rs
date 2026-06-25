//! PTY management for the integrated terminal.
//!
//! Backs the IPC commands `pty.create`, `pty.write`, `pty.resize`, and
//! `pty.kill`. A reader thread streams output to the renderer as `pty:data`
//! events and emits `pty:exit` when the shell ends. Uses `portable-pty`, which
//! maps to Windows ConPTY and to a real pty on macOS and Linux.

use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Mutex, OnceLock};

use portable_pty::{native_pty_system, Child, CommandBuilder, MasterPty, PtySize};
use serde::Serialize;
use tauri::{AppHandle, Emitter};

/// A live PTY: its master (for resize), a writer, and the child process.
struct PtyHandle {
    master: Box<dyn MasterPty + Send>,
    writer: Box<dyn Write + Send>,
    child: Box<dyn Child + Send + Sync>,
}

fn registry() -> &'static Mutex<HashMap<String, PtyHandle>> {
    static REG: OnceLock<Mutex<HashMap<String, PtyHandle>>> = OnceLock::new();
    REG.get_or_init(|| Mutex::new(HashMap::new()))
}

fn next_id() -> String {
    static COUNTER: AtomicUsize = AtomicUsize::new(0);
    format!("pty-{}", COUNTER.fetch_add(1, Ordering::Relaxed))
}

fn default_shell() -> String {
    if cfg!(windows) {
        std::env::var("COMSPEC").unwrap_or_else(|_| "powershell.exe".to_string())
    } else {
        std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string())
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PtyCreated {
    pty_id: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct PtyDataEvent {
    pty_id: String,
    data: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct PtyExitEvent {
    pty_id: String,
    exit_code: Option<i32>,
}

#[tauri::command]
pub fn pty_create(
    app: AppHandle,
    cols: u16,
    rows: u16,
    shell: Option<String>,
    cwd: Option<String>,
) -> Result<PtyCreated, String> {
    let system = native_pty_system();
    let pair = system
        .openpty(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())?;

    let mut cmd = CommandBuilder::new(shell.unwrap_or_else(default_shell));
    if let Some(dir) = cwd {
        cmd.cwd(dir);
    }
    let child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;
    drop(pair.slave);

    let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
    let writer = pair.master.take_writer().map_err(|e| e.to_string())?;

    let id = next_id();
    let id_for_thread = id.clone();
    let app_for_thread = app.clone();
    std::thread::spawn(move || {
        let mut buffer = [0u8; 4096];
        loop {
            match reader.read(&mut buffer) {
                Ok(0) => break,
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buffer[..n]).to_string();
                    let _ = app_for_thread.emit(
                        "pty:data",
                        PtyDataEvent {
                            pty_id: id_for_thread.clone(),
                            data,
                        },
                    );
                }
                Err(_) => break,
            }
        }
        let _ = app_for_thread.emit(
            "pty:exit",
            PtyExitEvent {
                pty_id: id_for_thread.clone(),
                exit_code: None,
            },
        );
    });

    registry().lock().unwrap().insert(
        id.clone(),
        PtyHandle {
            master: pair.master,
            writer,
            child,
        },
    );
    Ok(PtyCreated { pty_id: id })
}

#[tauri::command]
pub fn pty_write(pty_id: String, data: String) -> Result<(), String> {
    let mut map = registry().lock().unwrap();
    let handle = map.get_mut(&pty_id).ok_or("unknown pty")?;
    handle
        .writer
        .write_all(data.as_bytes())
        .map_err(|e| e.to_string())?;
    handle.writer.flush().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn pty_resize(pty_id: String, cols: u16, rows: u16) -> Result<(), String> {
    let map = registry().lock().unwrap();
    let handle = map.get(&pty_id).ok_or("unknown pty")?;
    handle
        .master
        .resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn pty_kill(pty_id: String) -> Result<(), String> {
    if let Some(mut handle) = registry().lock().unwrap().remove(&pty_id) {
        let _ = handle.child.kill();
    }
    Ok(())
}
