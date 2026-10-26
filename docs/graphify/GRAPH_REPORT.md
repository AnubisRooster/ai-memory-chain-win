# Graph Report - ai-memory-chain-win  (2026-10-26)

## Corpus Check
- 86 files · ~76,898 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 3, .jsonl 1, .css 1)

## Summary
- 557 nodes · 1026 edges · 25 communities (17 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- api.ts
- lifecycle.test.ts
- audit-log.ts
- package.json
- backend/package.json
- memory.ts
- frontend/package.json
- ipfs
- agent-sdk/package.json
- scripts
- compilerOptions
- compilerOptions
- MemoryAgent
- compilerOptions
- compilerOptions
- genesis.ts
- startup.ps1
- next.config.js
- pnpm-workspace.yaml
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

## Communities (25 total, 8 thin omitted)

### Community 0 - "api.ts"
Cohesion: 0.05
Nodes (66): dependencies, react@^18.3.0, react-dom@^18.3.0, Home(), BlockchainExplorer(), BlockchainExplorerProps, formatTime(), MEMORY_TYPES (+58 more)

### Community 1 - "lifecycle.test.ts"
Cohesion: 0.11
Nodes (42): installLinuxSystemd(), installMacOSLaunchAgent(), installWindowsTaskScheduler(), main(), platform, projectDir, ensureDir(), isSourceNewer() (+34 more)

### Community 2 - "audit-log.ts"
Cohesion: 0.07
Nodes (37): createApp(), getLanAddresses(), app, PORT, server, shutdown(), router, router (+29 more)

### Community 3 - "package.json"
Cohesion: 0.06
Nodes (42): config, dependencies, ethers@^6.11.0, description, devDependencies, concurrently@^8.2.0, eslint@^8.57.0, hardhat@^2.22.0 (+34 more)

### Community 4 - "backend/package.json"
Cohesion: 0.06
Nodes (44): dependencies, better-sqlite3@^12.8.0, cors@^2.8.5, ethers@^6.11.0, express@^4.19.0, morgan@^1.10.0, multer@^2.1.1, devDependencies (+36 more)

### Community 5 - "memory.ts"
Cohesion: 0.09
Nodes (32): upload, deepSearchObject(), router, ABI, getContract(), getContractAddress(), getMemoryCount(), getMemoryOnChain() (+24 more)

### Community 6 - "frontend/package.json"
Cohesion: 0.08
Nodes (26): next@^14.2.0, devDependencies, autoprefixer@^10.4.0, postcss@^8.4.0, tailwindcss@^3.4.0, @types/node@^20.11.0, @types/react@^18.3.0, @types/react-dom@^18.3.0 (+18 more)

### Community 7 - "ipfs"
Cohesion: 0.11
Nodes (21): interval, retries, test, timeout, container_name, environment, healthcheck, image (+13 more)

### Community 8 - "agent-sdk/package.json"
Cohesion: 0.12
Nodes (19): devDependencies, ts-node@^10.9.0, @types/node@^20.11.0, typescript@^5.4.0, vitest@^4.1.0, ts-node, @types/node, typescript (+11 more)

### Community 9 - "scripts"
Cohesion: 0.10
Nodes (20): scripts, build, compile, deploy, dev, dev:backend, dev:frontend, format (+12 more)

### Community 10 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 11 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, outDir, resolveJsonModule (+8 more)

### Community 12 - "MemoryAgent"
Cohesion: 0.18
Nodes (4): AgentSDKOptions, MemoryAgent, RecordMemoryInput, RecordMemoryResult

### Community 13 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, outDir, resolveJsonModule (+7 more)

### Community 14 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, outDir, resolveJsonModule (+7 more)

### Community 16 - "genesis.ts"
Cohesion: 0.40
Nodes (5): DATA_DIR, GENESIS_PATH, main(), NODE_DIR, run()

### Community 17 - "startup.ps1"
Cohesion: 0.83
Nodes (3): Stop-ProcessOnPort(), Wait-ForUrl(), Write-Log()

## Knowledge Gaps
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `hardhat` connect `package.json` to `lifecycle.test.ts`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `main()` (e.g. with `.log()` and `.rotateLogs()`) actually correct?**
  _`main()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `api.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05189873417721519 - nodes in this community are weakly interconnected._
- **Why does `scripts` connect `scripts` to `package.json`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Should `lifecycle.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10596491228070175 - nodes in this community are weakly interconnected._
- **Why does `better-sqlite3` connect `backend/package.json` to `audit-log.ts`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Should `audit-log.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.070578231292517 - nodes in this community are weakly interconnected._