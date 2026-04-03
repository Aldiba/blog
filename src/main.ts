import { marked } from "marked";

// 导入所有 MD 文件
import helloWorldMd from "./posts/hello-world.md?raw";
import typescriptNotesMd from "./posts/typescript-notes.md?raw";
import viteGuideMd from "./posts/vite-guide.md?raw";

// 配置 marked
marked.setOptions({
  gfm: true,
  breaks: true,
});

// 文章数据接口
export interface Post {
  id: string;
  title: string;
  date: string;
  excerpt: string;
  content: string;
}

// 文章列表
export const posts: Post[] = [];

// 展开的文章 ID 集合
const expandedPosts = new Set<string>();

// 解析 Markdown 文件的 frontmatter
function parseFrontmatter(content: string): { meta: Record<string, string>; body: string } {
  const match = content.match(/^---\s*([\s\S]*?)\s*---[\s\S]*$/);
  if (!match) {
    return {
      meta: { title: "无标题", date: new Date().toISOString().split("T")[0], excerpt: "" },
      body: content,
    };
  }

  const meta: Record<string, string> = {};
  const metaLines = match[1].split("\n");
  for (const line of metaLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const colonIndex = trimmed.indexOf(":");
    if (colonIndex > 0) {
      const key = trimmed.substring(0, colonIndex).trim();
      const value = trimmed.substring(colonIndex + 1).trim();
      if (key) {
        meta[key] = value;
      }
    }
  }

  const body = content.replace(/^---[\s\S]*?---/, "").trim();
  return { meta, body };
}

// 加载所有 MD 文件
function loadPosts() {
  const mdFiles = [
    { path: "./posts/hello-world.md", content: helloWorldMd },
    { path: "./posts/typescript-notes.md", content: typescriptNotesMd },
    { path: "./posts/vite-guide.md", content: viteGuideMd },
  ];
  
  for (const { path, content } of mdFiles) {
    const { meta, body } = parseFrontmatter(content);
    const id = path.split("/").pop()?.replace(".md", "") || "";
    
    posts.push({
      id,
      title: meta.title || "无标题",
      date: meta.date || new Date().toISOString().split("T")[0],
      excerpt: meta.excerpt || "",
      content: marked.parse(body) as string,
    });
  }

  posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// 路由处理
class Router {
  private routes: Map<string, () => void> = new Map();

  constructor() {
    window.addEventListener("hashchange", () => this.handleRoute());
    window.addEventListener("load", () => this.handleRoute());
  }

  addRoute(path: string, handler: () => void) {
    this.routes.set(path, handler);
  }

  handleRoute() {
    const hash = window.location.hash.slice(1) || "/";
    const handler = this.routes.get(hash);
    if (handler) {
      handler();
    } else {
      this.routes.get("/")?.();
    }
  }

  navigate(path: string) {
    window.location.hash = path;
  }
}

const router = new Router();

// 切换文章展开/收起状态
function togglePost(id: string) {
  if (expandedPosts.has(id)) {
    expandedPosts.delete(id);
  } else {
    expandedPosts.add(id);
  }
  renderHome();
}

// 首页组件 - 改为折叠列表形式
function renderHome() {
  const app = document.getElementById("app")!;
  
  if (posts.length === 0) {
    app.innerHTML = `
      <header class="header">
        <h1>我的博客</h1>
        <p class="subtitle">加载中...</p>
      </header>
    `;
    return;
  }

  app.innerHTML = `
    <header class="header">
      <h1>我的博客</h1>
      <p class="subtitle">记录学习与生活</p>
    </header>
    <main class="main">
      <div class="posts-list">
        ${posts.map(post => {
          const isExpanded = expandedPosts.has(post.id);
          const displayContent = isExpanded ? post.content : post.excerpt;
          
          return `
            <article class="post-card ${isExpanded ? 'expanded' : ''}">
              <div class="post-header" onclick="window.togglePost('${post.id}')">
                <h2>${post.title}</h2>
                <time>${post.date}</time>
                <span class="expand-icon">${isExpanded ? '▼' : '▶'}</span>
              </div>
              ${isExpanded ? `
                <div class="post-body">
                  ${displayContent}
                </div>
              ` : `
                <p class="post-excerpt">${displayContent}</p>
                <p class="read-more-hint">点击展开阅读更多...</p>
              `}
            </article>
          `;
        }).join("")}
      </div>
    </main>
    <footer class="footer">
      <p>&copy; 2024 我的博客</p>
    </footer>
  `;
}

// 全局函数供 onclick 调用
(window as unknown as Record<string, unknown>).togglePost = togglePost;

// 注册路由
router.addRoute("/", renderHome);

// 启动应用
function init() {
  loadPosts();
  renderHome();
}

// 初始化背景着色器
import { initBackground } from "./webgl-shader";
initBackground("shader-canvas");

// 运行
init();