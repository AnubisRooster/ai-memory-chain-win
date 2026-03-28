# AI Memory Chain (Cross-Platform)

Full-stack system for storing AI memories on a **Polygon Edge** private blockchain with **IPFS**-backed content storage. Memories are written on-chain with SHA-256 integrity hashes, while full payloads (embeddings, arbitrary JSON, files) live on IPFS — giving you tamper-evident provenance *and* cheap, retrievable storage.

**This is the cross-platform edition** — runs on Windows, macOS, and Linux. All shell scripts have been replaced with cross-platform TypeScript scripts, with PowerShell alternatives for Windows users.

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌───────────────────┐
│   Frontend   │────▶│   Backend    │────▶│   Polygon Edge    │
│  (Next.js)   │     │  (Express)   │     │  IBFT consensus   │
│  :3000       │     │  :3001       │     │  JSON-RPC :8545   │
└──────────────┘     └──────┬───────┘     └───────────────────┘
                            │
      ┌─────────────┐      │
      │  Agent SDK  │──────┘
      │  (TS / Py)  │      │
      └─────────────┘      ▼
                     ┌──────────────┐
                     │  IPFS (Kubo) │
                     │  API  :5001  │
                     │  GW   :8080  │
                     └──────────────┘
```

| Component | Role |
|-----------|------|
| **Polygon Edge** | Private PoA blockchain (IBFT/ECDSA). Stores memory metadata: summary, CID, SHA-256 hash, int16 embedding, author, timestamp. |
| **IPFS Kubo** | Content-addressed storage. Holds the full JSON payload (embeddings at float precision, arbitrary data, file attachments). |
| **Backend** | Express/TypeScript API. Orchestrates IPFS upload, SHA-256 hashing, and on-chain write in a single `POST /memory` call. |
| **Agent SDK** | Zero-dependency TypeScript client. Call `agent.recordMemory(...)` from any Node.js process. |
| **Frontend** | Next.js + Tailwind dashboard. Memory timeline, detail view, embedding chart, create memories, network sharing, live status. |

## Prerequisites

### All Platforms
- **Docker** + **Docker Compose** (v2)
- **Node.js** >= 18
- **pnpm** >= 8 (`npm install -g pnpm`)

### Windows Additional Requirements
- **Docker Desktop for Windows** with WSL 2 backend enabled
- **Visual Studio Build Tools** (for `better-sqlite3` native compilation):
  ```powershell
  npm install --global windows-build-tools
  ```
  Or install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) manually, selecting the "Desktop development with C++" workload.
- Git configured with `core.autocrlf=false` (the `.gitattributes` file handles line endings correctly)

### macOS
- Docker Desktop for Mac (Intel or Apple Silicon)

### Linux
- Docker Engine + Docker Compose plugin

## Quick Start

### Windows (PowerShell)

```powershell
# 1. Start the blockchain + IPFS
docker compose up -d

# 2. Install all workspace dependencies
pnpm install

# 3. Compile the Solidity contract
pnpm compile

# 4. Deploy the contract using the premined validator key
$env:DEPLOYER_PRIVATE_KEY = "0x" + (Get-Content data\polygon-edge\node1\consensus\validator.key -Raw).Trim()
npx ts-node scripts/deploy-raw.ts

# 5. Start backend + frontend in dev mode
pnpm dev

# 6. Run all tests
pnpm test
```

### macOS / Linux (Terminal)

```bash
# 1. Start the blockchain + IPFS
docker compose up -d

# 2. Install all workspace dependencies
pnpm install

# 3. Compile the Solidity contract
pnpm compile

# 4. Deploy the contract using the premined validator key
export DEPLOYER_PRIVATE_KEY="0x$(cat data/polygon-edge/node1/consensus/validator.key)"
npx ts-node scripts/deploy-raw.ts

# 5. Start backend + frontend in dev mode
pnpm dev

# 6. Run all tests
pnpm test
```

The frontend is at **http://localhost:3000** and the backend API at **http://localhost:3001**.

> **First run note:** The Polygon Edge container auto-generates a genesis file, validator keys, and starts sealing blocks. Give it ~10 seconds before deploying the contract.

## Production Startup / Shutdown

The cross-platform TypeScript scripts manage the full startup and shutdown lifecycle:

```bash
# Start everything (Docker → IPFS → Polygon Edge → Backend → Frontend)
pnpm start
# or: npx ts-node scripts/startup.ts

# Stop everything gracefully
pnpm stop
# or: npx ts-node scripts/shutdown.ts
```

### Windows PowerShell Alternatives

```powershell
# Start
powershell -ExecutionPolicy Bypass -File scripts\startup.ps1

# Stop
powershell -ExecutionPolicy Bypass -File scripts\shutdown.ps1
```

## Auto-Start on Boot

Install as a system service that starts automatically on login:

```bash
pnpm start:service
# or: npx ts-node scripts/install-service.ts
```

This auto-detects your platform and installs the appropriate service:

| Platform | Service Manager | Mechanism |
|----------|----------------|-----------|
| **Windows** | Task Scheduler | `schtasks` with ONLOGON trigger |
| **macOS** | launchd | LaunchAgent plist |
| **Linux** | systemd | User service unit |

### Manual Service Controls

**Windows:**
| Action | Command |
|--------|---------|
| Start now | `schtasks /run /tn "AIMemoryChain"` |
| Stop | `npx ts-node scripts/shutdown.ts` |
| View logs | `Get-Content -Wait logs\startup.log` |
| Uninstall | `schtasks /delete /tn "AIMemoryChain" /f` |

**macOS:**
| Action | Command |
|--------|---------|
| Start now | `launchctl start com.ai-memory-chain` |
| Stop | `npx ts-node scripts/shutdown.ts` |
| View logs | `tail -f logs/startup.log` |
| Uninstall | `launchctl unload ~/Library/LaunchAgents/com.ai-memory-chain.plist` |

**Linux:**
| Action | Command |
|--------|---------|
| Start now | `systemctl --user start ai-memory-chain` |
| Stop | `systemctl --user stop ai-memory-chain` |
| Status | `systemctl --user status ai-memory-chain` |
| View logs | `journalctl --user -u ai-memory-chain -f` |
| Uninstall | `systemctl --user disable ai-memory-chain` |

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/memory` | Store a new memory (with security scanning) |
| `GET` | `/memory/list` | List all stored memory IDs + summaries |
| `GET` | `/memory/:id` | Full memory: on-chain metadata + IPFS content |
| `GET` | `/memory/health` | Network status (`{ polygon: bool, ipfs: bool }`) |
| `GET` | `/search` | Search/filter memories (text, type, tags, vector, date range) |
| `GET` | `/security/audit` | Security scan audit log (paginated, filterable) |
| `GET` | `/security/audit/stats` | Aggregate security statistics |
| `GET` | `/health` | Backend service health |
| `GET` | `/connect` | LAN addresses for network sharing |
| `GET` | `/ipfs/:cid` | Proxied IPFS content retrieval |

### POST /memory

Accepts JSON or multipart form data (for file uploads). All inputs are scanned for security threats before storage.

```json
{
  "summary": "Learned user prefers dark mode",
  "embedding": [0.1, -0.3, 0.5, 0.22, -0.81],
  "data": { "preference": "dark_mode", "confidence": 0.95 },
  "type": "note",
  "tags": ["preferences", "ui"]
}
```

**Response** (201):

```json
{
  "id": 0,
  "ipfsCID": "QmRUwDanaX1GkrzLfnFK7AGGBpi2EmpuEs397vZFX9YX3z",
  "sha256Hash": "0x7014ab343dc062f9b784ee6cdf7f0c00effcd619f6bcca230885ec519b0d495a",
  "timestamp": 1774198266,
  "txHash": "0xb561d333..."
}
```

### GET /search

| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Full-text search across summaries, content, tags, and custom data |
| `type` | string | Filter by memory type (`note`, `conversation`, `code`, `file`, `image`) |
| `tags` | string | Comma-separated tag filter (all must match) |
| `author` | string | Filter by author address (`0x...`) |
| `from` | number | Minimum timestamp (epoch seconds) |
| `to` | number | Maximum timestamp (epoch seconds) |
| `embedding` | JSON array | Embedding vector for cosine similarity ranking |
| `topK` | number | Max results (default 50) |

## Input Security

All memory inputs are scanned before storage:

| Threat Type | Examples |
|-------------|----------|
| **Prompt injection** | "Ignore all previous instructions", fake system prompts |
| **Jailbreak** | DAN mode, safety bypass requests |
| **XSS** | Script tags, event handlers, javascript: protocol |
| **SQL injection** | `'; DROP TABLE`, UNION attacks |
| **Command injection** | Shell commands via `${}`, backticks |
| **Path traversal** | `../../etc/passwd` in filenames |
| **Encoding attacks** | HTML entities, URL-encoded tags |

## Testing

The project includes the original 99 backend/SDK/contract tests plus comprehensive cross-platform script tests:

```bash
# Run all original tests (backend + SDK + contracts)
pnpm test

# Run cross-platform script tests only
pnpm test:scripts

# Run everything
pnpm test:all
```

### Script Test Suites

| Suite | Level | Tests | Coverage |
|-------|-------|-------|----------|
| `platform.test.ts` | Unit | 20 | OS detection, sleep, file size, paths, executables |
| `process-manager.test.ts` | Unit | 18 | PID files, process lifecycle, port detection |
| `config.test.ts` | Unit | 19 | Config loading, build detection, env vars |
| `logger.test.ts` | Unit | 16 | Logging, rotation, special characters |
| `docker.test.ts` | Unit | 7 | URL health checks, Docker detection |
| `startup-flow.test.ts` | Integration | 12 | Full startup sequence simulation |
| `shutdown-flow.test.ts` | Integration | 8 | Graceful + forced shutdown |
| `service-installer.test.ts` | Integration | 6 | Platform service config generation |
| `lifecycle.test.ts` | E2E | 12 | Start → health → stop lifecycle |

### Original Test Suites (Preserved)

| Suite | Framework | Tests | Coverage |
|-------|-----------|-------|----------|
| Backend unit | vitest | 6 | SHA-256 hashing |
| Backend security | vitest | 22 | Prompt injection, XSS, SQL injection, etc. |
| Backend audit log | vitest | 12 | SQLite CRUD, filtering, stats |
| Backend routes | vitest + supertest | 25 | All API endpoints |
| Backend E2E | vitest + supertest | 13 | Full memory lifecycle |
| Agent SDK | vitest | 9 | MemoryAgent against mock server |
| Smart Contract | Hardhat + chai | 12 | On-chain storage and retrieval |

## Project Structure

```
ai-memory-chain-win/
├── contracts/                 # Solidity smart contract
│   └── AIMemoryStorage.sol
├── test/                      # Smart contract tests
│   └── AIMemoryStorage.test.ts
├── scripts/
│   ├── lib/                   # Cross-platform utilities (NEW)
│   │   ├── platform.ts        #   OS detection, path resolution
│   │   ├── process-manager.ts #   Process spawn/kill/PID management
│   │   ├── config.ts          #   Dynamic config + build detection
│   │   ├── docker.ts          #   Docker + health check utilities
│   │   ├── logger.ts          #   Logging with rotation
│   │   └── index.ts           #   Barrel export
│   ├── __tests__/             # Cross-platform script tests (NEW)
│   │   ├── unit/              #   5 unit test files
│   │   ├── integration/       #   3 integration test files
│   │   └── e2e/               #   1 e2e test file
│   ├── startup.ts             # Cross-platform startup (REPLACES startup.sh)
│   ├── shutdown.ts            # Cross-platform shutdown (REPLACES shutdown.sh)
│   ├── install-service.ts     # Multi-platform service installer (REPLACES install-service.sh)
│   ├── startup.ps1            # PowerShell startup alternative (NEW)
│   ├── shutdown.ps1           # PowerShell shutdown alternative (NEW)
│   ├── vitest.config.ts       # Test config for scripts (NEW)
│   ├── edge-entrypoint.sh     # Docker entrypoint (unchanged)
│   ├── deploy-raw.ts          # Deploy via ethers.js (unchanged)
│   ├── deploy.ts              # Deploy via Hardhat (unchanged)
│   └── genesis.ts             # Genesis generator (unchanged)
├── backend/                   # Express API server (unchanged)
│   └── src/
│       ├── app.ts, index.ts
│       ├── routes/            # memory, search, audit, ipfs-proxy
│       ├── services/          # blockchain, ipfs, hash, security, audit-log
│       ├── types/
│       └── __tests__/         # Backend tests
├── agent-sdk/                 # TypeScript client SDK (unchanged)
├── frontend/                  # Next.js dashboard (unchanged)
├── docs/
│   └── creation-process.md    # This document (NEW)
├── .gitattributes             # Line ending enforcement (NEW)
├── docker-compose.yml         # Polygon Edge + IPFS (unchanged)
├── hardhat.config.ts          # Solidity config (unchanged)
├── deployment.json            # Contract address (unchanged)
└── package.json               # Updated scripts for cross-platform
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `RPC_URL` | `http://127.0.0.1:8545` | Polygon Edge JSON-RPC endpoint |
| `IPFS_API_URL` | `http://127.0.0.1:5001` | IPFS Kubo API |
| `IPFS_GATEWAY_URL` | `http://127.0.0.1:8080` | IPFS gateway (for reads) |
| `CONTRACT_ADDRESS` | *(from deployment.json)* | Deployed contract address |
| `DEPLOYER_PRIVATE_KEY` | — | Private key for signing transactions |
| `PORT` | `3001` | Backend server port |
| `FRONTEND_PORT` | `3000` | Frontend server port |
| `BACKEND_URL` | `http://localhost:3001` | Backend URL for frontend API proxy |
| `AUDIT_DB_PATH` | `backend/data/audit.sqlite` | Security audit SQLite database path |

## Changes from Original (macOS-only) Version

| What Changed | Original | Cross-Platform |
|-------------|----------|----------------|
| Startup script | `bash scripts/startup.sh` | `ts-node scripts/startup.ts` |
| Shutdown script | `bash scripts/shutdown.sh` | `ts-node scripts/shutdown.ts` |
| Service installer | macOS LaunchAgent only | Windows Task Scheduler + macOS LaunchAgent + Linux systemd |
| Path resolution | Hardcoded `/Users/mikefink/...` | Dynamic via `__dirname` |
| Executable discovery | Hardcoded `/opt/homebrew/bin/...` | `which`/`where` with fallbacks |
| Process by port | `lsof -ti:PORT` | `lsof` (Unix) / `netstat -ano` (Windows) |
| Kill process | `kill -15`/`kill -9` | `kill` (Unix) / `taskkill` (Windows) |
| Process alive check | `kill -0 PID` | `process.kill(0)` (Unix) / `tasklist` (Windows) |
| File size check | `stat -f%z` | `fs.statSync().size` |
| Build freshness | `find -newer` | `fs.statSync().mtimeMs` comparison |
| Line endings | No management | `.gitattributes` enforces LF/CRLF |
| PowerShell support | None | `startup.ps1` and `shutdown.ps1` |

## Additional Documentation

- **[docs/creation-process.md](docs/creation-process.md)** — Full analysis of macOS-specific code, design decisions, implementation details, and testing strategy for the Windows port.
