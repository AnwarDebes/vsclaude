//! Secure secret storage. API keys live only in the OS keychain, never in
//! plaintext on disk. Backs the IPC commands `secret.set`, `secret.get`, and
//! `secret.delete`. Uses the `keyring` crate, which maps to the Windows
//! Credential Manager, the macOS Keychain, and the Secret Service on Linux.

use keyring::{Entry, Error as KeyringError};
use serde::Serialize;

/// All vsclaude secrets are stored under one service name, keyed by the caller.
const SERVICE: &str = "vsclaude";

/// The shape returned by `secret.get`. `value` is null when no secret is stored.
#[derive(Serialize)]
pub struct SecretValue {
    pub value: Option<String>,
}

fn entry(key: &str) -> Result<Entry, String> {
    Entry::new(SERVICE, key).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn secret_set(key: String, value: String) -> Result<(), String> {
    entry(&key)?.set_password(&value).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn secret_get(key: String) -> Result<SecretValue, String> {
    match entry(&key)?.get_password() {
        Ok(value) => Ok(SecretValue { value: Some(value) }),
        Err(KeyringError::NoEntry) => Ok(SecretValue { value: None }),
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
