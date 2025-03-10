---
title: Comparison
description: How is oRPC different from other RPC or REST solutions?
---

# Comparison

This comparison table helps you understand how oRPC differs from other popular TypeScript RPC and REST solutions.

- ✅ First-class, built-in support
- 🟡 Lacks features, or requires third-party integrations
- 🛑 Not supported or not documented

| Feature                  | oRPC | tRPC | ts-rest | Description                                                        |
| ------------------------ | ---- | ---- | ------- | ------------------------------------------------------------------ |
| End-to-end Type Safety   | ✅   | ✅   | ✅      | Full TypeScript type inference from backend to frontend.           |
| End-to-end Type Error    | ✅   | 🛑   | ✅      | Full TypeScript type inference for Error from backend to frontend. |
| React Query Integration  | ✅   | ✅   | 🟡      | Native support for React Query/TanStack Query.                     |
| Vue Query Integration    | ✅   | 🛑   | 🟡      | Native support for Vue Query/TanStack Query.                       |
| Pinia Colada Integration | ✅   | 🛑   | 🛑      | Native support for Pinia Colada.                                   |
| With Contract-First      | ✅   | 🛑   | ✅      | API definitions before implementation.                             |
| Without Contract-First   | ✅   | ✅   | 🛑      | API definitions and implementation are combined in same place      |
| File Operations          | ✅   | 🟡   | 🟡      | Built-in support for file uploads/downloads.                       |
| OpenAPI Support          | ✅   | 🟡   | 🟡      | Generation and consumption of OpenAPI specs.                       |
| Server Actions Support   | ✅   | ✅   | 🛑      | React/Next.js Actions compatibility.                               |
| Server-Sent Event (SSE)  | ✅   | ✅   | 🛑      | Server-Sent Event (SSE) support.                                   |
| WebSockets               | 🛑   | ✅   | 🛑      | WebSockets support.                                                |
| Nest.js integration      | 🛑   | 🟡   | ✅      | Integration with Nest.js.                                          |
