import { describe, expect, it } from 'vitest';
import {
  detectLanguageFromContent,
  languageLabel,
  SELECTABLE_LANGUAGES,
} from '../lib/languages';

describe('languageLabel', () => {
  it('maps known ids to friendly labels', () => {
    expect(languageLabel('typescript')).toBe('TypeScript');
    expect(languageLabel('json')).toBe('JSON');
    expect(languageLabel('plaintext')).toBe('Plain Text');
  });

  it('capitalizes an unknown id as a fallback', () => {
    expect(languageLabel('elixir')).toBe('Elixir');
  });
});

describe('SELECTABLE_LANGUAGES', () => {
  it('offers labeled, unique language ids including the common ones', () => {
    expect(SELECTABLE_LANGUAGES.length).toBeGreaterThan(5);
    const ids = SELECTABLE_LANGUAGES.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('typescript');
    expect(ids).toContain('json');
    expect(ids).toContain('plaintext');
    expect(SELECTABLE_LANGUAGES.every((l) => l.label.length > 0)).toBe(true);
  });
});

describe('detectLanguageFromContent', () => {
  it('reads a shebang interpreter', () => {
    expect(detectLanguageFromContent('#!/usr/bin/env python3\nprint(1)')).toBe('python');
    expect(detectLanguageFromContent('#!/bin/bash\necho hi')).toBe('shell');
    expect(detectLanguageFromContent('#!/usr/bin/node')).toBe('javascript');
  });

  it('reads unambiguous opening markers', () => {
    expect(detectLanguageFromContent('<?php echo 1; ?>')).toBe('php');
    expect(detectLanguageFromContent('<?xml version="1.0"?>')).toBe('xml');
    expect(detectLanguageFromContent('  <!DOCTYPE html>\n<html></html>')).toBe('html');
  });

  it('returns null when nothing matches', () => {
    expect(detectLanguageFromContent('just some prose')).toBeNull();
    expect(detectLanguageFromContent('')).toBeNull();
  });
});
