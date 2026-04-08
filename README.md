# 此处是神经元的墓地

> 被抛下的，被放弃的，粘连在一起，如雨般落下

一个使用 TypeScript + Vite 构建的静态博客，带有 WebGL 动态背景和背景音乐播放器。

## 功能特色

- 🎨 **WebGL 着色器背景** - 流动的网格动画，如神经元般闪烁
- 🎵 **背景音乐播放器** - 自动播放随机音乐，点击切换歌曲
- 📝 **Markdown 文章支持** - 在 `src/posts/*.md` 中添加文章即可
- 🖼️ **自动封面扫描** - 文章同名的 `.assets` 文件夹中的图片自动设为封面
- ✨ **展开/收起动画** - 点击文章标题平滑展开内容
- 🕐 **侧边时间线导航** - 右侧固定时间线，快速跳转到任意文章

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 http://localhost:5173/

## 添加新文章

在 `src/posts/` 目录下创建 `.md` 文件：

```markdown
---
title: 文章标题
date: 2024-03-01
excerpt: 文章摘要...
tags: 标签1, 标签2
---

文章内容...
```

将封面图片放入同目录下的 `.assets` 文件夹（如 `hello-world.assets/1.png`），即可自动显示。

## 构建部署

```bash
# 构建生产版本
npm run build

# 构建结果输出到 dist/ 目录
```

## 部署到 GitHub Pages（使用 Actions）

1. 在 GitHub 创建仓库
2. 推送代码：
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/你的用户名/blog.git
   git push -u origin main
   ```
3. 仓库会自动生成 `workflows` 部署到 GitHub Pages（如果没有，手动在仓库设置中启用 GitHub Pages，选择 "GitHub Actions"）

## 项目结构

```
blog/
├── src/
│   ├── main.ts          # 主逻辑：文章扫描、路由、音乐播放
│   ├── webgl-shader.ts  # WebGL 渲染器
│   ├── shader.ts        # 着色器代码
│   ├── style.css        # 所有样式
│   └── posts/           # 文章目录
│       ├── hello-world.md
│       └── hello-world.assets/  # 封面图片
├── res/
│   ├── music/           # 背景音乐 .mp3
│   └── shader/         # 备用着色器文件
├── index.html
├── package.json
└── vite.config.ts
```

## 使用说明

- 点击标题展开/收起文章
- 点击右上角 🎵 按钮控制音乐播放
- 右侧时间线点击可快速跳转文章

## 技术栈

- TypeScript
- Vite
- marked（Markdown 解析）
- 纯 CSS 动画（无框架）
- WebGL 着色器
- 哈希路由（hash-based routing）

---

*「即使是被丢弃的神经元，也会在某个角落继续闪烁吧。」*