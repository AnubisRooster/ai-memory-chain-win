# Graph Report - ai-memory-chain-win  (2026-09-21)

## Corpus Check
- 85 files · ~101,688 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .sol 1, .jsonl 1)

## Summary
- 533 nodes · 944 edges · 24 communities (18 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- api.ts
- lifecycle.test.ts
- audit-log.ts
- memory.ts
- backend/package.json
- frontend/package.json
- package.json
- agent-sdk/package.json
- scripts
- compilerOptions
- compilerOptions
- MemoryAgent
- compilerOptions
- compilerOptions
- graphify_pipeline.py
- devDependencies
- genesis.ts
- startup.ps1
- next.config.js
- next-env.d.ts
- edge-entrypoint.sh

## God Nodes (most connected - your core abstractions)
1. `main()` - 21 edges
2. `scripts` - 20 edges
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
- `poll()` --calls--> `getHealth()`  [EXTRACTED]
  frontend/src/components/NetworkStatus.tsx → frontend/src/lib/api.ts
- `server` --calls--> `getLanAddresses()`  [EXTRACTED]
  backend/src/index.ts → backend/src/app.ts
- `shutdown()` --calls--> `closeDB()`  [EXTRACTED]
  backend/src/index.ts → backend/src/services/audit-log.ts
- `AuditEntry` --references--> `SecurityThreat`  [EXTRACTED]
  backend/src/services/audit-log.ts → backend/src/services/security.ts

## Import Cycles
- None detected.

## Communities (24 total, 6 thin omitted)

### Community 0 - "api.ts"
Cohesion: 0.05
Nodes (57): BlockchainExplorer(), BlockchainExplorerProps, formatTime(), MEMORY_TYPES, ResultCard(), TabId, truncate(), ConnectInfo() (+49 more)

### Community 1 - "lifecycle.test.ts"
Cohesion: 0.11
Nodes (48): ref_child_process, ref_fs, ref_http, ref_os, ref_path, ref_vitest, installLinuxSystemd(), installMacOSLaunchAgent() (+40 more)

### Community 2 - "audit-log.ts"
Cohesion: 0.07
Nodes (40): createApp(), getLanAddresses(), app, PORT, server, shutdown(), router, router (+32 more)

### Community 3 - "memory.ts"
Cohesion: 0.09
Nodes (34): upload, deepSearchObject(), router, ABI, getContract(), getContractAddress(), getMemoryCount(), getMemoryOnChain() (+26 more)

### Community 4 - "backend/package.json"
Cohesion: 0.05
Nodes (41): dependencies, better-sqlite3, cors, ethers, express, morgan, multer, devDependencies (+33 more)

### Community 5 - "frontend/package.json"
Cohesion: 0.06
Nodes (31): dependencies, next, react, react-dom, devDependencies, autoprefixer, postcss, tailwindcss (+23 more)

### Community 6 - "package.json"
Cohesion: 0.07
Nodes (28): config, dependencies, ethers, description, engines, node, pnpm, ethers (+20 more)

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

### Community 11 - "MemoryAgent"
Cohesion: 0.19
Nodes (5): AgentSDKOptions, MemoryAgent, RecordMemoryInput, RecordMemoryResult, ref_https

### Community 12 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, outDir, resolveJsonModule (+7 more)

### Community 13 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, outDir, resolveJsonModule (+7 more)

### Community 14 - "graphify_pipeline.py"
Cohesion: 0.13
Nodes (13): graphify_analyze, graphify_build, graphify_cluster, graphify_detect, graphify_export, graphify_extract, graphify_llm, graphify_report (+5 more)

### Community 15 - "devDependencies"
Cohesion: 0.13
Nodes (15): devDependencies, concurrently, eslint, hardhat, @nomicfoundation/hardhat-toolbox, prettier, prettier-plugin-solidity, ts-node (+7 more)

### Community 16 - "genesis.ts"
Cohesion: 0.40
Nodes (5): DATA_DIR, GENESIS_PATH, main(), NODE_DIR, run()

### Community 17 - "startup.ps1"
Cohesion: 0.83
Nodes (3): Stop-ProcessOnPort(), Wait-ForUrl(), Write-Log()

## Knowledge Gaps
- **237 isolated node(s):** `name`, `version`, `private`, `main`, `types` (+232 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 286 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `hardhat` connect `package.json` to `lifecycle.test.ts`?**
  _High betweenness centrality (0.112) - this node is a cross-community bridge._
- **Why does `scripts` connect `scripts` to `package.json`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `better-sqlite3` connect `backend/package.json` to `audit-log.ts`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `main()` (e.g. with `.log()` and `.rotateLogs()`) actually correct?**
  _`main()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _237 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `api.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.051228070175438595 - nodes in this community are weakly interconnected._
- **Should `lifecycle.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10596491228070175 - nodes in this community are weakly interconnected._