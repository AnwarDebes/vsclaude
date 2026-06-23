//! Secure secret storage. API keys live only in the OS keychain, never in
//! plaintext on disk and never returned to the renderer. Backs the IPC commands
//! `secret.set`, `secret.status`, and `secret.delete`. Uses the `keyring` crate,
//! which maps to the Windows Credential Manager, the macOS Keychain, and the
//! Secret Service on Linux.
//!
//! There is deliberately no command that returns a raw key (see SECURITY.md). The
//! renderer gets only a `configured` flag and a masked hint (the last four
//! characters). A future provider-spawn path reads the raw value inside the Rust
//! core and injects it into the agent child process environment directly.

use keyring::{Entry, Error as KeyringError};
use serde::Serialize;

/// All vsclaude secrets are stored under one service name, keyed by the caller.
const SERVICE: &str = "vsclaude";

/// The shape returned by `secret.status`: whether a secret is stored and a masked
/// hint for display. The raw value never crosses this boundary.
#[derive(Serialize)]
pub struct SecretStatus {
    pub configured: bool,
    pub hint: String,
}

fn entry(key: &str) -> Result<Entry, String> {
    Entry::new(SERVICE, key).map_err(|e| e.to_string())
}

/// The last four characters of a secret, for a display hint. Returns empty for a
/// secret too short to reveal any tail without leaking most of it.
fn masked_hint(value: &str) -> String {
    let chars: Vec<char> = value.chars().collect();
    if chars.len() < 4 {
        String::new()
    } else {
        chars[chars.len() - 4..].iter().collect()
    }
}

#[tauri::command]
pub fn secret_set(key: String, value: String) -> Result<(), String> {
    entry(&key)?.set_password(&value).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn secret_status(key: String) -> Result<SecretStatus, String> {
    match entry(&key)?.get_password() {
        Ok(value) => Ok(SecretStatus {
            configured: true,
            hint: masked_hint(&value),
        }),
        Err(KeyringError::NoEntry) => Ok(SecretStatus {
            configured: false,
            hint: String::new(),
        }),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn secret_delete(key: String) -> Result<(), String> {
    match entry(&key)?.delete_credential() {
        Ok(()) => Ok(()),
        Err(KeyringError::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}
