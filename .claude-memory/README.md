# Claude Memory Snapshot

Dieser Ordner ist ein Git-synchronisierter Snapshot des Claude-Code-Memory-Systems für dieses Projekt. Er erlaubt es, den Memory-Stand zwischen mehreren Rechnern (z.B. PC + Laptop) über das Repo zu teilen.

## Speicherort des echten Memory-Systems

Claude Code liest/schreibt Memories unter:

```
C:\Users\<USER>\.claude\projects\C--Git-projects-appArcherries\memory\
```

Dieser Ordner ist **nicht** in Git und wird pro Rechner separat geführt.

## Sync-Konvention

**Export (vor `git push`):** Wenn der User "memory exportieren" sagt, kopiert Claude alle `*.md` aus dem echten Memory-Ordner hierher und überschreibt den bisherigen Snapshot:

```bash
cp "C:/Users/<USER>/.claude/projects/C--Git-projects-appArcherries/memory/"*.md \
   "C:/Git/projects/appArcherries/.claude-memory/"
```

Anschließend committen + pushen.

**Import (nach `git pull` auf einem anderen Rechner):** Wenn der User "memory laden" sagt, kopiert Claude alle `*.md` aus diesem Snapshot in den echten Memory-Ordner. Bestehende Memory-Dateien werden überschrieben.

```bash
cp "C:/Git/projects/appArcherries/.claude-memory/"*.md \
   "C:/Users/<USER>/.claude/projects/C--Git-projects-appArcherries/memory/"
```

Die README selbst (`.claude-memory/README.md`) wird beim Import **nicht** kopiert — sie ist Repo-Doku, kein Memory.

## Wichtig

- Memories können sensible Projekt-Infos enthalten (Stolperfallen, Live-Status). Das Repo ist privat — bei Open-Source-Veröffentlichung diesen Ordner via `.gitignore` ausschließen.
- Wenn auf beiden Rechnern parallel Memories geändert werden, gewinnt der letzte Push. Kein Merge — wer zuletzt exportiert, überschreibt.
