---
name: feedback-memory-sync-konvention
description: User synct Memory zwischen PC und Laptop über .claude-memory/ im Repo — Trigger-Phrasen und genaue Copy-Befehle
metadata: 
  node_type: memory
  type: feedback
  originSessionId: b26868dc-30ca-4eb0-9102-4248580c814a
---

User arbeitet auf zwei Rechnern (PC + Laptop) und synct den Claude-Memory-Stand bewusst übers Git-Repo. Im Repo liegt dafür der Ordner `.claude-memory/`.

**Trigger-Phrasen → Aktion:**
- "memory exportieren" / "memory pushen" / "memory ins repo":
  Alle `*.md` aus `C:/Users/marku/.claude/projects/C--Git-projects-appArcherries/memory/` nach `C:/Git/projects/appArcherries/.claude-memory/` kopieren (überschreiben). README.md im Ziel **nicht** anrühren. Danach dem User sagen, dass er committen + pushen soll (nicht automatisch committen, außer er bittet darum).
- "memory laden" / "memory importieren" / "memory vom repo":
  Alle `*.md` außer `README.md` aus `C:/Git/projects/appArcherries/.claude-memory/` zurück in den echten Memory-Ordner kopieren. Bestehende Dateien überschreiben.

**Why:** PHP ist auf dem Laptop nicht installiert, alle Änderungen laufen über `deploy.bat` + Git. Damit Claude auf dem Laptop den gleichen Kontext hat wie auf dem PC, muss Memory mit-versioniert werden — Claude Code selbst macht das nicht automatisch.

**How to apply:** Bei Trigger-Phrase direkt die Copy ausführen, nicht erst lange rückfragen. README.md in `.claude-memory/` ist Repo-Doku, kein Memory — beim Import überspringen. Kein Merge bei Konflikten — wer zuletzt exportiert, gewinnt.

Siehe auch `.claude-memory/README.md` im Repo für die Doku, die auch ohne Memory verständlich ist (z.B. wenn auf neuem Rechner Memory leer ist).
