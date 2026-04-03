---
title: TypeScript 学习笔记
date: 2024-01-15
excerpt: 记录学习 TypeScript 过程中的一些知识点。
---

# TypeScript 学习笔记

TypeScript 是 JavaScript 的超集，提供了类型系统和其他高级特性。

## 基本类型

```typescript
let name: string = "Alice";
let age: number = 25;
let isStudent: boolean = true;
```

## 接口

```typescript
interface User {
  name: string;
  age: number;
  email?: string; // 可选属性
}
```

## 类型别名

```typescript
type ID = string | number;
type Point = { x: number; y: number };
```

## 泛型

```typescript
function identity<T>(arg: T): T {
  return arg;
}
```

继续学习更多高级特性...