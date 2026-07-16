---
title: SliceMatic Wiki Maintainer Schema
type: schema
status: authoritative
scope: wiki/
last_updated: 2026-07-16
---

# Wiki Maintainer Schema

This file defines how an LLM must maintain and query the SliceMatic FullStack wiki. It instantiates Andrej Karpathy's LLM Wiki pattern for this repository.

## Layer model

1. Source evidence: `FullStack/` code, SQL, tests, configuration, and authored project Markdown. Treat source files as read-only during wiki-only work.
2. Compiled wiki: `wiki/*.md`. The LLM owns maintenance, synthesis, cross-links, provenance, and consistency.
3. Schema: this file plus the repository's root `CLAUDE.md`. These define operating rules.

Unlike a document-research wiki, the executable source tree changes. Therefore “immutable” means the wiki compiler never edits source merely to make documentation agree with it. Code changes happen only when the user asks for implementation.

## Required startup sequence

1. Read [[index]].
2. Read [[handoff]].
3. Read [[current-state]] and [[contradictions]] when correctness or risk matters.
4. Read topic pages selected by the index.
5. Verify time-sensitive or implementation-critical claims against files listed in [[source-map]].

## Ingest operation

When code, schema, tests, or project documents change:

1. Identify affected concepts and existing pages.
2. Read source evidence; do not infer behavior from filenames alone.
3. Merge into existing pages instead of creating duplicates.
4. Add or repair wiki links to related concepts.
5. Update `last_compiled` or `last_verified` metadata where present.
6. Record conflicts in [[contradictions]] rather than silently choosing a convenient version.
7. Update [[index]] only when navigation or page inventory changes.
8. Append a parseable entry to [[log]].
9. Refresh [[handoff]] with the latest state and next actions.

## Query operation

1. Search [[index]] first and then relevant pages.
2. Prefer compiled synthesis for orientation.
3. For security, payments, billing, database migrations, or claims about current test/build status, verify against source or a fresh command.
4. Cite repository paths in answers.
5. If the answer produces durable analysis, write it back into the appropriate wiki page and log it.

## Lint operation

Periodically check for:

- Claims contradicted by executable source
- Stale route, table, environment-variable, or test inventories
- Orphan pages with no inbound links from [[index]] or another topic page
- Duplicate pages describing the same concept
- Missing provenance in [[source-map]]
- Unresolved items in [[contradictions]]
- Missing reciprocal links between closely related pages
- Secrets or credential values accidentally copied into Markdown

## Page conventions

- Use one concept per page; do not mirror a small source file line by line.
- Optimize for cross-file synthesis and change impact.
- New pages use YAML frontmatter with `title`, `type`, `status`, `scope`, and `last_updated` or `last_verified`.
- Use Obsidian-style links for wiki concepts (for example, link to `architecture`) and repository paths for source evidence.
- State uncertainty explicitly: `verified`, `inferred`, `historical`, or `unresolved`.
- Never copy secret values. Environment-variable names are allowed.
- `log.md` is append-only except for correcting malformed entries.

## Definition of done

A FullStack task is not fully documented until affected topic pages, [[handoff]], and [[log]] agree with the resulting source state.
