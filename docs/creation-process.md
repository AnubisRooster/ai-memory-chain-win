# AI Memory Chain — Windows Port: Creation Process

This document details the analysis, design decisions, and implementation process for porting AI Memory Chain from macOS-only to a cross-platform project that runs on Windows, macOS, and Linux.

## 1. Analysis of the Original Project

### Platform-Specific Code Identified

The original AI Memory Chain project was built and tested exclusively on macOS. A thorough audit identified the following platform-specific dependencies:

| Area | Issue | Impact |
|------|-------|--------|
| **startup.sh** | Hardcoded `/Users/mikefink/Documents/ai-memory-chain` path | Breaks on all other machines |
| **startup.sh** | Uses `/opt/homebrew/bin/npx`, `/opt/homebrew/bin/node` | Homebrew paths don't exist on Windows or most Linux systems |
| **startup.sh** | Uses `lsof -ti:PORT` to find processes by port | `lsof` doesn't exist on Windows |
| **startup.sh** | Uses `stat -f%z` for file size checking | macOS-specific `stat` flag; different on Linux, absent on Windows |
| **startup.sh** | Uses `find ... -newer` for build freshness | POSIX `find` doesn't exist natively on Windows |
| **startup.sh** | Uses `curl` for health checks | Not installed by default on older Windows |
| **startup.sh** | Uses `kill -0`, `kill -9` signals | Windows has `taskkill` instead |
| **startup.sh** | Uses `trap SIGTERM SIGINT SIGHUP` | SIGHUP doesn't exist on Windows |
| **shutdown.sh** | Same hardcoded paths + `lsof` + `kill` signals | Same issues as startup.sh |
| **install-service.sh** | Uses macOS `launchctl`, LaunchAgent plist files | Entirely macOS-specific; Windows uses Task Scheduler, Linux uses systemd |
| **install-service.sh** | Uses `xattr` to strip Apple provenance | macOS-only extended attribute system |
| **package.json** | `"start": "bash scripts/startup.sh"` | Requires bash; Windows cmd.exe/PowerShell can't run this directly |
| **package.json** | `"stop": "bash scripts/shutdown.sh"` | Same issue |
| **docker-compose.yml** | Uses `./data/...` volume paths | Works on Windows Docker Desktop but paths behave differently |
| **edge-entrypoint.sh** | Uses `/bin/sh`, `python3` for JSON parsing | Runs inside Docker Linux container — **not an issue** |
| **better-sqlite3** | Native Node.js addon | Requires Visual Studio Build Tools on Windows for compilation |

### Code That Was Already Cross-Platform

The majority of the project's TypeScript code was already cross-platform:

- **Backend services** (`blockchain.ts`, `ipfs.ts`, `hash.ts`, `security.ts`, `audit-log.ts`) — all use Node.js APIs and `path` module correctly
- **Backend routes** — pure Express handlers, platform-independent
- **Frontend** — Next.js app, runs identically on all platforms
- **Agent SDK** — uses Node.js `http`/`https` modules, no platform-specific code
- **Smart contract** — Solidity, compiled by Hardhat, platform-agnostic
- **Docker Compose** — Docker Desktop for Windows handles Linux containers transparently
- **edge-entrypoint.sh** — runs inside a Linux Docker container, not on the host

## 2. Design Decisions

### Decision 1: TypeScript Scripts Instead of Bash

**Chosen approach:** Replace all bash scripts with cross-platform TypeScript scripts using Node.js APIs.

**Rationale:**
- The project already requires Node.js — no new runtime dependency
- Node.js `child_process`, `fs`, `path`, and `os` modules provide everything needed
- TypeScript gives type safety and better maintainability
- Same language as the rest of the project

**Alternative considered:** PowerShell Core (pwsh) — cross-platform but adds a dependency. We provide PowerShell scripts as **alternatives** for Windows users who prefer them, but they're not required.

### Decision 2: Cross-Platform Script Library

Created a shared library in `scripts/lib/` with five modules:

| Module | Purpose |
|--------|---------|
| `platform.ts` | OS detection, executable path resolution, file utilities |
| `process-manager.ts` | Cross-platform process lifecycle (spawn, kill, PID files) |
| `config.ts` | Dynamic path resolution, deployment.json loading, build freshness |
| `docker.ts` | Docker daemon detection, compose operations, HTTP health checks |
| `logger.ts` | Timestamped logging with log rotation |

Each module abstracts away platform differences so the startup/shutdown scripts read like platform-agnostic orchestration logic.

### Decision 3: Service Installation per Platform

The original used macOS LaunchAgent exclusively. The new `install-service.ts` supports three platforms:

| Platform | Service Manager | Method |
|----------|----------------|--------|
| Windows | Task Scheduler | `schtasks /create` with ONLOGON trigger |
| macOS | launchd | LaunchAgent plist (same concept as original) |
| Linux | systemd | User service unit with `WantedBy=default.target` |

### Decision 4: Process Management Strategy

| Operation | macOS/Linux | Windows |
|-----------|-------------|---------|
| Find process by port | `lsof -ti:PORT` | `netstat -ano \| findstr :PORT` |
| Kill process (graceful) | `kill -15 PID` | `taskkill /PID PID` |
| Kill process (force) | `kill -9 PID` | `taskkill /F /PID PID` |
| Check if alive | `kill -0 PID` (signal 0) | `tasklist /FI "PID eq PID"` |
| Find executable | `which` | `where` |
| File size | `fs.statSync` (Node.js) | Same (replaces `stat -f%z`) |
| Source freshness | `fs.statSync` mtime comparison | Same (replaces `find -newer`) |

### Decision 5: Line Ending Management

Added `.gitattributes` to enforce:
- LF for all source files (`.ts`, `.js`, `.json`, `.sh`, `.yml`, `.md`, `.css`, `.sol`)
- CRLF for PowerShell scripts (`.ps1`) — native Windows convention
- Binary mode for image files

This prevents bash scripts from breaking when checked out on Windows (CRLF in .sh files causes `/bin/bash^M: bad interpreter` errors).

### Decision 6: No Hardcoded Paths

All paths are now dynamically resolved:
- `getProjectDir()` uses `__dirname` relative resolution
- `getDockerPath()`, `getNodePath()`, `getNpxPath()` use `which`/`where` with platform-specific fallbacks
- Config values come from environment variables with sensible defaults
- `deployment.json` and `validator.key` are loaded by path relative to the project root

## 3. Implementation

### Files Created (New)

| File | Purpose |
|------|---------|
| `.gitattributes` | Line ending enforcement |
| `scripts/lib/platform.ts` | Platform detection and utilities |
| `scripts/lib/process-manager.ts` | Cross-platform process lifecycle |
| `scripts/lib/config.ts` | Dynamic configuration loading |
| `scripts/lib/docker.ts` | Docker interaction utilities |
| `scripts/lib/logger.ts` | Cross-platform logging |
| `scripts/lib/index.ts` | Barrel export |
| `scripts/startup.ts` | Cross-platform startup orchestration |
| `scripts/shutdown.ts` | Cross-platform shutdown |
| `scripts/install-service.ts` | Multi-platform service installer |
| `scripts/startup.ps1` | PowerShell startup alternative |
| `scripts/shutdown.ps1` | PowerShell shutdown alternative |
| `scripts/vitest.config.ts` | Test configuration for scripts |
| `scripts/__tests__/unit/*.test.ts` | 5 unit test files |
| `scripts/__tests__/integration/*.test.ts` | 3 integration test files |
| `scripts/__tests__/e2e/*.test.ts` | 1 e2e test file |

### Files Modified

| File | Change |
|------|--------|
| `package.json` | `start`/`stop` scripts use `ts-node` instead of `bash`; added `test:scripts`, `test:all`, `start:service` |
| `pnpm-workspace.yaml` | Cleaned up corrupted `allowBuilds` section |

### Files Unchanged

All backend, frontend, agent-sdk, and contract source files remain identical to the original project. They were already cross-platform.

## 4. Testing Strategy

### Test Architecture

```
scripts/__tests__/
├── unit/                      # 5 files — isolated module testing
│   ├── platform.test.ts       # 20 tests: OS detection, sleep, paths, executables
│   ├── process-manager.test.ts # 18 tests: PID files, process lifecycle
│   ├── config.test.ts         # 19 tests: config loading, build detection
│   ├── logger.test.ts         # 16 tests: logging, rotation
│   └── docker.test.ts         # 7 tests: URL waiting, Docker detection
├── integration/               # 3 files — module interactions
│   ├── startup-flow.test.ts   # 12 tests: startup sequence with config + logger + health
│   ├── shutdown-flow.test.ts  # 8 tests: PID-based shutdown, multi-service, logging
│   └── service-installer.test.ts # 6 tests: platform detection, config generation
└── e2e/                       # 1 file — full lifecycle testing
    └── lifecycle.test.ts      # 12 tests: start → health → stop, negative scenarios
```

### Positive Test Coverage

- Platform detection returns correct values for win32, darwin, linux
- File operations create/read/delete PID files correctly
- Config loads from deployment.json and environment variables
- Logger writes timestamped messages and rotates large files
- Health checks succeed when servers are responsive
- Process spawn creates background processes with PID tracking
- Shutdown terminates processes gracefully then forcefully
- Full lifecycle: startup → health check → shutdown completes

### Negative Test Coverage

- Platform detection handles unknown/empty OS names gracefully
- findProcessOnPort returns null for unused/invalid ports
- killProcess returns false for non-existent PIDs
- Config returns null for missing/malformed/empty deployment files
- Logger handles empty messages, special characters, unicode
- Health checks timeout for unreachable or erroring services
- Shutdown handles missing PID files, corrupt PID data, dead processes
- PID file read handles non-numeric content, empty files, whitespace
- Service installer falls back to linux for unknown platforms

### Test Preservation

All 99 original backend/agent-sdk/contract tests remain in place and run alongside the new cross-platform script tests. Run them all with `pnpm test:all`.

## 5. Windows-Specific Prerequisites

For Windows users, the following additional setup is needed:

1. **Node.js** >= 18 — [Download from nodejs.org](https://nodejs.org/)
2. **pnpm** — `npm install -g pnpm`
3. **Docker Desktop for Windows** — with WSL 2 backend enabled
4. **Visual Studio Build Tools** — required for `better-sqlite3` native addon compilation:
   ```powershell
   npm install --global windows-build-tools
   # or install Visual Studio Build Tools from https://visualstudio.microsoft.com/visual-cpp-build-tools/
   ```
5. **Git** — configured with `core.autocrlf=false` (the `.gitattributes` file handles line endings)

## 6. Known Limitations

1. **SIGHUP signal**: Not available on Windows. The startup script only registers SIGTERM and SIGINT handlers on Windows.
2. **Process group killing**: On Unix, `detached: true` + `process.kill(-pid)` can kill entire process trees. Windows doesn't have process groups in the same way; individual process termination is used instead.
3. **better-sqlite3 prebuilds**: The package ships prebuilt binaries for common platforms but may require compilation on less common architectures.
4. **Docker volume performance**: On Windows with WSL 2, bind mounts to the Windows filesystem (`/mnt/c/...`) are slower than mounts within the WSL filesystem. For best performance, clone the project inside WSL.
