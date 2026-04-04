---
title: Vite 使用指南
date: 2024-02-01
excerpt: 介绍 Vite 这个快速的前端构建工具。
cover: ./posts/vite-guide.assets/1.jpg
---

# Vite 使用指南

Vite 是一个由 Vue.js 作者尤雨溪创建的前端构建工具。

## 特性

- 极速的冷启动
- 即时的热更新
- 原生 ES 模块

## 快速开始

```bash
npm create vite@latest my-project
cd my-project
npm install
npm run dev
```

## 配置

Vite 配置文件 `vite.config.ts`：

```typescript
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/',
  server: {
    port: 3000
  },
  build: {
    outDir: 'dist'
  }
})
```