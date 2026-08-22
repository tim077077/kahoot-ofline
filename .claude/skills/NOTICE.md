# Vendored design skills

Third-party, MIT-licensed design-taste skills, vendored so they load automatically
in Claude Code sessions that work in this repo (skills in `.claude/skills/` are
discovered per-project).

## Included — from `taste-skill`
Source: https://github.com/leonxlnx/taste-skill (MIT — see `LICENSE-taste-skill`)

| Folder | Skill name | What it's for |
|---|---|---|
| `taste-skill/` | `design-taste-frontend` | Main anti-slop skill: "design read", the VARIANCE/MOTION/DENSITY dials, anti-default discipline (bans AI-purple gradients, Inter+slate-900, centered-hero-on-dark-mesh, etc.). |
| `minimalist-skill/` | `minimalist-ui` | Calm, restrained, Linear/editorial direction. |
| `brutalist-skill/` | `industrial-brutalist-ui` | Raw, high-contrast, industrial direction. |
| `soft-skill/` | `high-end-visual-design` | Premium, soft, high-end consumer direction. |
| `redesign-skill/` | `redesign-existing-projects` | Audit-first redesign of an existing site. |

These are pure guidance (Markdown). They contain **no hooks and no auto-running code** —
the only shell references inside are documentation examples (e.g. `npx shadcn add …`).

## NOT vendored — `impeccable`
Source: https://github.com/pbakaus/impeccable (Apache-2.0)

`impeccable` is a full plugin: 23 slash-commands (`/impeccable polish`, `/impeccable audit`,
`/impeccable critique`, …), a JS anti-pattern **detector CLI**, and **Claude Code hooks that
run automatically on edits**. It is a dispatcher that needs its CLI + hooks, so copying loose
files would only give broken commands. Install it as a real plugin instead:

```
claude plugin marketplace add pbakaus/impeccable
claude plugin install impeccable@impeccable
```

Note: installing it wires third-party hooks into your edit pipeline — powerful, but enable it
knowingly. Restart Claude Code after installing.
