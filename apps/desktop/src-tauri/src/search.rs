//! Project-wide search.
//!
//! Backs the `search.find` IPC command. The engine is built on the same crates
//! ripgrep is: `ignore` for gitignore-aware walking with include and exclude glob
//! overrides, and `grep` for a fast regex matcher. There is no runtime dependency
//! on an external binary. Results are capped so a huge repository cannot hang the
//! UI, and any non-text or unreadable file is skipped rather than failing the
//! whole search.

use grep_matcher::Matcher;
use grep_regex::RegexMatcherBuilder;
use grep_searcher::sinks::UTF8;
use grep_searcher::SearcherBuilder;
use ignore::overrides::OverrideBuilder;
use ignore::WalkBuilder;
use serde::{Deserialize, Serialize};

/// Replaces backslashes with forward slashes for a stable, platform neutral key.
fn normalize(path: &str) -> String {
    path.replace('\\', "/")
}

const DEFAULT_SEARCH_LIMIT: usize = 5_000;
const MAX_SEARCH_LIMIT: usize = 50_000;

/// Options for a search. Mirrors `SearchOptions` in the contracts package.
#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SearchOptions {
    pub regex: Option<bool>,
    pub case_sensitive: Option<bool>,
    pub whole_word: Option<bool>,
    pub include_globs: Option<Vec<String>>,
    pub exclude_globs: Option<Vec<String>>,
    pub max_results: Option<usize>,
}

/// A matched range within a line, as code-point offsets.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchRange {
    pub start: usize,
    pub end: usize,
}

/// One matching line in a file.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchLineMatch {
    pub line: u32,
    pub text: String,
    pub ranges: Vec<SearchRange>,
}

/// All matches within one file.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchFileResult {
    pub path: String,
    pub lines: Vec<SearchLineMatch>,
}

/// The result of a project-wide search.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    pub files: Vec<SearchFileResult>,
    pub match_count: usize,
    pub truncated: bool,
}

/// Escapes the regex metacharacters in a literal query so it matches verbatim.
fn regex_escape(input: &str) -> String {
    const SPECIAL: &str = "\\.+*?()|[]{}^$#&-~";
    let mut out = String::with_capacity(input.len());
    for ch in input.chars() {
        if SPECIAL.contains(ch) {
            out.push('\\');
        }
        out.push(ch);
    }
    out
}

/// Converts a byte offset within `text` to a code-point offset, so the renderer
/// can highlight the range with `[...text]` correctly past ASCII.
fn char_offset(text: &str, byte: usize) -> usize {
    text.get(..byte).map(|s| s.chars().count()).unwrap_or_else(|| text.chars().count())
}

#[tauri::command]
pub fn search_find(
    root: String,
    query: String,
    options: Option<SearchOptions>,
) -> Result<SearchResult, String> {
    run_search(&root, &query, &options.unwrap_or_default())
}

/// The search engine, factored out of the Tauri command so it can be unit tested.
pub fn run_search(root: &str, query: &str, opts: &SearchOptions) -> Result<SearchResult, String> {
    if query.is_empty() {
        return Ok(SearchResult { files: Vec::new(), match_count: 0, truncated: false });
    }

    let cap = opts.max_results.unwrap_or(DEFAULT_SEARCH_LIMIT).min(MAX_SEARCH_LIMIT);
    let case_sensitive = opts.case_sensitive.unwrap_or(false);
    let is_regex = opts.regex.unwrap_or(false);
    let whole_word = opts.whole_word.unwrap_or(false);

    let pattern = if is_regex { query.to_string() } else { regex_escape(query) };
    let matcher = RegexMatcherBuilder::new()
        .case_insensitive(!case_sensitive)
        .word(whole_word)
        .build(&pattern)
        .map_err(|e| e.to_string())?;

    let mut override_builder = OverrideBuilder::new(root);
    for glob in opts.include_globs.iter().flatten() {
        override_builder.add(glob).map_err(|e| e.to_string())?;
    }
    for glob in opts.exclude_globs.iter().flatten() {
        override_builder
            .add(&format!("!{glob}"))
            .map_err(|e| e.to_string())?;
    }
    let overrides = override_builder.build().map_err(|e| e.to_string())?;

    let walker = WalkBuilder::new(root).overrides(overrides).build();
    let mut searcher = SearcherBuilder::new().line_number(true).build();

    let mut files: Vec<SearchFileResult> = Vec::new();
    let mut match_count = 0usize;
    let mut truncated = false;

    for entry in walker {
        if match_count >= cap {
            truncated = true;
            break;
        }
        let entry = match entry {
            Ok(entry) => entry,
            Err(_) => continue,
        };
        if !entry.file_type().map(|t| t.is_file()).unwrap_or(false) {
            continue;
        }

        let remaining = cap - match_count;
        let mut lines: Vec<SearchLineMatch> = Vec::new();
        let mut file_hits = 0usize;
        let matcher_ref = &matcher;

        let result = searcher.search_path(
            matcher_ref,
            entry.path(),
            UTF8(|lnum, line| {
                let trimmed = line.trim_end_matches(['\n', '\r']);
                let mut ranges: Vec<SearchRange> = Vec::new();
                let _ = matcher_ref.find_iter(trimmed.as_bytes(), |m| {
                    ranges.push(SearchRange {
                        start: char_offset(trimmed, m.start()),
                        end: char_offset(trimmed, m.end()),
                    });
                    true
                });
                if !ranges.is_empty() {
                    file_hits += ranges.len();
                    lines.push(SearchLineMatch {
                        line: lnum as u32,
                        text: trimmed.to_string(),
                        ranges,
                    });
                    if file_hits >= remaining {
                        return Ok(false);
                    }
                }
                Ok(true)
            }),
        );

        // A binary or non-UTF-8 file errors here; skip it rather than failing.
        if result.is_err() {
            continue;
        }
        if !lines.is_empty() {
            match_count += file_hits;
            files.push(SearchFileResult {
                path: normalize(&entry.path().to_string_lossy()),
                lines,
            });
            if match_count >= cap {
                truncated = true;
                break;
            }
        }
    }

    Ok(SearchResult { files, match_count, truncated })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn write(dir: &std::path::Path, name: &str, contents: &str) {
        let path = dir.join(name);
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).unwrap();
        }
        fs::write(path, contents).unwrap();
    }

    fn temp_root(tag: &str) -> std::path::PathBuf {
        let mut dir = std::env::temp_dir();
        dir.push(format!("vsclaude-search-test-{tag}"));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn finds_a_literal_match_and_reports_position() {
        let dir = temp_root("literal");
        write(&dir, "a.txt", "hello world\nsecond line\nhello again\n");
        let result = run_search(dir.to_str().unwrap(), "hello", &SearchOptions::default()).unwrap();
        assert_eq!(result.match_count, 2);
        assert_eq!(result.files.len(), 1);
        let file = &result.files[0];
        assert_eq!(file.lines.len(), 2);
        assert_eq!(file.lines[0].line, 1);
        assert_eq!(file.lines[0].ranges[0].start, 0);
        assert_eq!(file.lines[0].ranges[0].end, 5);
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn respects_gitignore_and_exclude_globs() {
        let dir = temp_root("ignore");
        write(&dir, ".gitignore", "ignored.txt\n");
        write(&dir, "ignored.txt", "needle\n");
        write(&dir, "kept.txt", "needle\n");
        write(&dir, "skip.log", "needle\n");
        let opts = SearchOptions {
            exclude_globs: Some(vec!["*.log".to_string()]),
            ..Default::default()
        };
        let result = run_search(dir.to_str().unwrap(), "needle", &opts).unwrap();
        // The gitignored file and the excluded .log are both skipped.
        assert_eq!(result.match_count, 1);
        assert!(result.files[0].path.ends_with("kept.txt"));
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn supports_regex_and_case_sensitivity() {
        let dir = temp_root("regex");
        write(&dir, "code.rs", "let Foo = 1;\nlet foo = 2;\n");
        let case = SearchOptions { case_sensitive: Some(true), ..Default::default() };
        let lower = run_search(dir.to_str().unwrap(), "foo", &case).unwrap();
        assert_eq!(lower.match_count, 1);

        let rgx = SearchOptions { regex: Some(true), ..Default::default() };
        let result = run_search(dir.to_str().unwrap(), "f.o", &rgx).unwrap();
        assert_eq!(result.match_count, 2);
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn caps_the_result() {
        let dir = temp_root("cap");
        write(&dir, "many.txt", "x\nx\nx\nx\nx\n");
        let opts = SearchOptions { max_results: Some(3), ..Default::default() };
        let result = run_search(dir.to_str().unwrap(), "x", &opts).unwrap();
        assert!(result.truncated);
        assert_eq!(result.match_count, 3);
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn empty_query_returns_nothing() {
        let dir = temp_root("empty");
        write(&dir, "a.txt", "anything\n");
        let result = run_search(dir.to_str().unwrap(), "", &SearchOptions::default()).unwrap();
        assert_eq!(result.match_count, 0);
        assert!(result.files.is_empty());
        let _ = fs::remove_dir_all(&dir);
    }
}
