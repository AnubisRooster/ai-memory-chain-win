# Graph Report - ai-memory-chain-win  (2026-09-07)

## Corpus Check
- 85 files · ~101,313 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 511 nodes · 835 edges · 25 communities (16 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- api.ts
- platform.ts
- security.ts
- package.json
- backend/package.json
- memory.ts
- frontend/package.json
- agent-sdk/package.json
- scripts
- compilerOptions
- compilerOptions
- compilerOptions
- compilerOptions
- MemoryAgent
- genesis.ts
- startup.ps1
- next.config.js
- graphify_pipeline.py
- next-env.d.ts
- edge-entrypoint.sh

## God Nodes (most connected - your core abstractions)
1. `scripts` - 20 edges
2. `main()` - 20 edges
3. `compilerOptions` - 16 edges
4. `Logger` - 15 edges
5. `compilerOptions` - 14 edges
6. `compilerOptions` - 13 edges
7. `compilerOptions` - 13 edges
8. `ensureDir()` - 13 edges
9. `sleep()` - 13 edges
10. `isWindows()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `MemoryTimeline` --indirect_call--> `load()`  [INFERRED]
  frontend/src/components/MemoryTimeline.tsx → frontend/src/components/MemoryDetail.tsx
- `server` --calls--> `getLanAddresses()`  [EXTRACTED]
  backend/src/index.ts → backend/src/app.ts
- `shutdown()` --calls--> `closeDB()`  [EXTRACTED]
  backend/src/index.ts → backend/src/services/audit-log.ts
- `AuditEntry` --references--> `SecurityThreat`  [EXTRACTED]
  backend/src/services/audit-log.ts → backend/src/services/security.ts
- `BlockchainExplorer()` --calls--> `searchMemories()`  [EXTRACTED]
  frontend/src/components/BlockchainExplorer.tsx → frontend/src/lib/api.ts

## Import Cycles
- None detected.

## Communities (25 total, 4 thin omitted)

### Community 0 - "api.ts"
Cohesion: 0.05
Nodes (57): BlockchainExplorer(), BlockchainExplorerProps, formatTime(), MEMORY_TYPES, ResultCard(), TabId, truncate(), ConnectInfo() (+49 more)

### Community 1 - "platform.ts"
Cohesion: 0.11
Nodes (41): installLinuxSystemd(), installMacOSLaunchAgent(), installWindowsTaskScheduler(), main(), platform, projectDir, ensureDir(), isSourceNewer() (+33 more)

### Community 2 - "security.ts"
Cohesion: 0.07
Nodes (40): createApp(), getLanAddresses(), app, PORT, server, shutdown(), router, router (+32 more)

### Community 3 - "package.json"
Cohesion: 0.04
Nodes (42): config, dependencies, ethers, description, devDependencies, concurrently, eslint, hardhat (+34 more)

### Community 4 - "backend/package.json"
Cohesion: 0.05
Nodes (41): dependencies, better-sqlite3, cors, ethers, express, morgan, multer, devDependencies (+33 more)

### Community 5 - "memory.ts"
Cohesion: 0.10
Nodes (31): upload, router, ABI, getContract(), getContractAddress(), getMemoryCount(), getMemoryOnChain(), getMemorySummaryOnChain() (+23 more)

### Community 6 - "frontend/package.json"
Cohesion: 0.06
Nodes (30): dependencies, next, react, react-dom, devDependencies, autoprefixer, postcss, tailwindcss (+22 more)

### Community 7 - "agent-sdk/package.json"
Cohesion: 0.10
Nodes (19): devDependencies, ts-node, @types/node, typescript, vitest, ts-node, @types/node, typescript (+11 more)

### Community 8 - "scripts"
Cohesion: 0.10
Nodes (20): scripts, build, compile, deploy, dev, dev:backend, dev:frontend, format (+12 more)

### Community 9 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 10 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, outDir, resolveJsonModule (+8 more)

### Community 11 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, outDir, resolveJsonModule (+7 more)

### Community 12 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, outDir, resolveJsonModule (+7 more)

### Community 13 - "MemoryAgent"
Cohesion: 0.20
Nodes (4): AgentSDKOptions, MemoryAgent, RecordMemoryInput, RecordMemoryResult

### Community 14 - "genesis.ts"
Cohesion: 0.40
Nodes (5): DATA_DIR, GENESIS_PATH, main(), NODE_DIR, run()

### Community 15 - "startup.ps1"
Cohesion: 0.83
Nodes (3): Stop-ProcessOnPort(), Wait-ForUrl(), Write-Log()

## Knowledge Gaps
- **237 isolated node(s):** `name`, `version`, `private`, `main`, `types` (+232 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 275 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `api.ts` to `frontend/package.json`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `express` connect `security.ts` to `backend/package.json`, `memory.ts`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `main()` (e.g. with `.log()` and `.rotateLogs()`) actually correct?**
  _`main()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _237 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `api.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05017543859649123 - nodes in this community are weakly interconnected._
- **Should `platform.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1057945566286216 - nodes in this community are weakly interconnected._
- **Should `security.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06561085972850679 - nodes in this community are weakly interconnected._