# GrowPath v1 — Docs & Policies Pack

Generated: 2026-02-08

This pack is designed to be dropped into your repo root (or `/docs`) to give VS Code,
frontend, and backend a **contract-locked** reference set.

## Intended placement

- Copy `docs/` into `<repo>/docs/`
- Copy `.vscode/` into `<repo>/.vscode/`
- Copy `POLICIES/` into `<repo>/POLICIES/`
- Copy `env/` into `<repo>/env/` (or merge into your existing env examples)

## What this pack contains

- Product/UX contracts (navigation, facility entry, screen behavior)
- API + error envelope contracts
- AI assistant philosophy and tool calling conventions
- Pheno matrix + run-to-run comparison specs
- Courses + creator experience spec (v1)
- Engineering conventions (repo structure, linting, testing, commit discipline)
- Minimal policies (security, privacy, content, retention)
- VS Code workspace configuration (recommended)

## How to use

1. Keep these docs as the source of truth.
2. When code conflicts with docs, update docs first (or explicitly version a change).
3. For any breaking change, add a `CHANGELOG.md` entry.

---

If you'd like, I can also generate:

- A repo-specific version (once you paste file tree + key configs)
- A contract-test checklist that matches your exact endpoints
