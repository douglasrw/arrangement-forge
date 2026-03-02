# Arrangement Forge

## Repo Locations

This repo exists in two places, synced via git:

- **Local (macOS):** `/Users/dwalseth/data/projects/arrangement-forge`
- **Server (myserver):** `/data/projects/arrangement-forge` — VPS at 217.77.3.253, SSH host alias `myserver`

When running locally: if the user asks for "files on my server" or similar, they mean files at `/data/projects/arrangement-forge/` on myserver.

## File Transfer Conventions (`put it` / `get it`)

Both local and server repos have an `uploads/` folder (git-ignored) used as a staging area for file transfers between machines.

| Location | Path |
|----------|------|
| Local | `/Users/dwalseth/data/projects/arrangement-forge/uploads/` |
| Server | `/data/projects/arrangement-forge/uploads/` |

### "put it" — Upload a file to the server

1. Copy the file into the local `uploads/` folder (if it isn't already there).
2. `scp` it to the server's `uploads/` folder.

### "get it" — Download a file from the server

- **No path specified:** Look in the server's `uploads/` folder.
- **Path specified:** Treat the path as relative to `/` on the server (i.e. an absolute path).

Download the file into the local `uploads/` folder.

### General rules

- "it" refers to whatever file was just discussed or produced in the conversation.
- If ambiguous, ask which file.
- Use `scp` with the `myserver` SSH alias for all transfers.
