# 我的个人博客

使用 TypeScript + Vite 构建的静态博客。

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 http://localhost:5173/

## 构建部署

```bash
# 构建生产版本
npm run build

# 构建结果输出到 dist/ 目录
```

## 部署到 GitHub Pages

1. 在 GitHub 创建仓库 `blog`
2. 推送代码：
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/你的用户名/blog.git
   git push -u origin main
   ```
3. 在仓库设置中启用 GitHub Pages：
   - Source 选择 "Deploy from a branch"
   - Branch 选择 "gh-pages"，folder 选择 "/ (root)"
   - 或者使用 Actions 自动部署

## 添加新文章

在 `src/main.ts` 的 `posts` 数组中添加新文章：
```typescript
{
  id: "4",
  title: "新文章标题",
  date: "2024-03-01",
  excerpt: "文章摘要",
  content: "文章内容（支持 HTML）"
}
```

## 技术栈

- TypeScript
- Vite
- 纯 CSS（无框架）
- 哈希路由（hash-based routing）