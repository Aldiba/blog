import { marked } from "marked";

// 这里是不是该放点 BGM...啊已经有了！
// 嗯...就这样吧

// ============================================================
// 自动扫描文章（import.meta.glob）
// 这样就可以自动找到所有文章了！
// 呀↑哈～！好方便！

// 元数据：eager 加载，用 ?frontmatter 只提取 YAML 头部（不包含正文）
const mdMetaModules = import.meta.glob("./posts/*.md", {
  query: '?frontmatter',
  eager: true
});

// 正文：lazy 加载，点击展开时才动态导入完整 markdown
const mdBodyModules = import.meta.glob("./posts/*.md", {
  query: '?raw',
  eager: false
});

// 封面图片自动扫描
const coverModules = import.meta.glob("./posts/*.assets/*.jpg", { eager: true });
const coverModulesPng = import.meta.glob("./posts/*.assets/*.png", { eager: true });
const allCoverModules = { ...coverModules, ...coverModulesPng };

// ============================================================
// 背景音乐扫描 - 调试
// 最开始路径错了！
// 嗯...用 ../res/music 就对了
// 呀↑哈～！终于找到了！
// 用相对路径从 src 目录向上查找 res 目录
const musicModules = import.meta.glob("../res/music/*.mp3", { eager: true });
const musicFiles = Object.keys(musicModules);
if (import.meta.env.DEV) {
  console.log('扫描到的音乐文件:', musicFiles);
}
let audioPlayer: HTMLAudioElement | null = null;
let isPlaying = false;
let currentTrackIndex = 0;

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
  cover?: string;
  content: string;
  tags?: string[];
}

// 文章列表
export const posts: Post[] = [];

// 展开的文章 ID 集合
const expandedPosts = new Set<string>();

// ============================================================
// HTML 转义函数，防止 XSS 攻击
// ...这个不写的话会被黑客打爆
// 哦
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// 简单的 HTML 净化函数 - 移除危险标签和属性
function sanitizeHtml(html: string): string {
  // 移除 <script> 标签及其内容
  let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  // 移除 <iframe>, <embed>, <object> 等嵌入标签
  clean = clean.replace(/<(iframe|embed|object)\b[\s\S]*?<\/\1>/gi, '');
  clean = clean.replace(/<(iframe|embed|object)\b[^>]*\/?>/gi, '');
  // 移除事件属性（双引号、单引号、无引号）
  clean = clean.replace(/\s+on\w+\s*=\s*"[^"]*"/gi, '');
  clean = clean.replace(/\s+on\w+\s*=\s*'[^']*'/gi, '');
  clean = clean.replace(/\s+on\w+\s*=\s*\S+/gi, '');
  // 移除危险协议
  clean = clean.replace(/(href|src|xlink:href)\s*=\s*["']\s*javascript:/gi, '$1="javascript-removed:');
  clean = clean.replace(/(href|src|xlink:href)\s*=\s*["']\s*data:/gi, '$1="data-removed:');
  return clean;
}

// 修复图片路径 - 将绝对路径/相对路径转换为可访问的路径
// D:\Github_Up\blog\src\posts\xxx.jpg -> /src/posts/xxx.jpg
// ./posts/xxx.jpg -> /src/posts/xxx.jpg
function fixImagePath(src: string): string {
  // 统一使用正斜杠
  let normalized = src.replace(/\\/g, '/');
  
  // 处理绝对路径 D:\Github_Up\blog\...
  const blogIndex = normalized.indexOf('blog/');
  if (blogIndex !== -1) {
    return '/' + normalized.substring(blogIndex + 5);
  }
  
  // 处理相对路径 ./posts/xxx 或 posts/xxx
  if (normalized.startsWith('./')) {
    return '/' + normalized.substring(2);
  }
  if (normalized.startsWith('posts/')) {
    return '/src/' + normalized;
  }
  
  return src;
}

// 修复 HTML 内容中的所有图片路径
function fixHtmlImagePaths(html: string): string {
  return html.replace(
    /(<img[^>]+src=["'])([^"']+)(["'])/gi,
    (_match, prefix, src, suffix) => {
      return `${prefix}${fixImagePath(src)}${suffix}`;
    }
  );
}

// 解析 YAML 字符串为键值对
function parseMetaYaml(yaml: string): Record<string, string> {
  const meta: Record<string, string> = {};
  for (const line of yaml.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const colonIndex = trimmed.indexOf(":");
    if (colonIndex > 0) {
      const key = trimmed.substring(0, colonIndex).trim();
      const value = trimmed.substring(colonIndex + 1).trim();
      if (key) meta[key] = value;
    }
  }
  return meta;
}

// 解析 Markdown 文件的 frontmatter 和正文
function parseFrontmatter(content: string): { meta: Record<string, string>; body: string } {
  const match = content.match(/^---\s*([\s\S]*?)\s*---[\s\S]*$/);
  if (!match) {
    return {
      meta: { title: "无标题", date: new Date().toISOString().split("T")[0], excerpt: "" },
      body: content,
    };
  }

  const body = content.replace(/^---[\s\S]*?---/, "").trim();
  return { meta: parseMetaYaml(match[1]), body };
}

// 正文缓存：首次展开时解析并缓存，后续直接复用
const contentCache = new Map<string, string>();

// 加载文章元数据（仅 frontmatter，不包含正文）
function loadPosts() {
  for (const [path, module] of Object.entries(mdMetaModules)) {
    const frontmatter = (module as { default: string }).default;
    const meta = frontmatter ? parseMetaYaml(frontmatter) : {};

    const id = path.replace("./posts/", "").replace(".md", "");
    const cover = findCover(path);
    const tags = meta.tags ? meta.tags.split(",").map(t => t.trim()) : [];

    posts.push({
      id,
      title: meta.title || "无标题",
      date: meta.date || new Date().toISOString().split("T")[0],
      excerpt: meta.excerpt || "",
      cover: cover || (meta.cover ? fixImagePath(meta.cover) : undefined),
      content: "", // 延迟加载
      tags,
    });
  }

  posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function findCover(postPath: string): string | undefined {
  const postDir = postPath.replace("./posts/", "").replace(".md", "");
  const assetsDir = `./posts/${postDir}.assets/`;

  for (const [path, module] of Object.entries(allCoverModules)) {
    if (path.startsWith(assetsDir)) {
      return (module as { default: string }).default;
    }
  }
  return undefined;
}

// 按需加载文章正文（动态导入 → marked 解析 → 缓存）
async function loadPostContent(id: string): Promise<string> {
  if (contentCache.has(id)) return contentCache.get(id)!;

  const loader = mdBodyModules[`./posts/${id}.md`];
  if (!loader) return '<p>文章未找到</p>';

  const module = await loader();
  const raw = (module as { default: string }).default;
  const { body } = parseFrontmatter(raw);
  const html = fixHtmlImagePaths(sanitizeHtml(marked.parse(body) as string));
  contentCache.set(id, html);
  return html;
}

// ============================================================
// 路由处理
// ============================================================
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

// ============================================================
// 切换展开/收起
// ============================================================
async function togglePost(id: string) {
  const wasExpanded = expandedPosts.has(id);

  if (wasExpanded) {
    // 收起：折叠动画完成后重建 DOM
    const body = document.querySelector(`[data-post-id="${id}"] .post-body`) as HTMLElement;
    if (body) {
      body.style.maxHeight = '0';
      body.style.opacity = '0';
      body.style.paddingTop = '0';
      body.style.paddingBottom = '0';
    }
    setTimeout(() => {
      expandedPosts.delete(id);
      renderHome();
    }, 600);
  } else {
    // 展开：先显示加载状态
    expandedPosts.add(id);
    renderHome();

    // 如果已缓存则直接展开，否则加载正文
    if (!contentCache.has(id)) {
      const body = document.querySelector(`[data-post-id="${id}"] .post-body`) as HTMLElement;
      if (body) {
        body.innerHTML = '<p style="text-align:center;color:#888;">加载中...</p>';
        body.style.maxHeight = '100px';
        body.style.opacity = '1';
        body.style.paddingTop = '1rem';
        body.style.paddingBottom = '1rem';
      }
    }

    const content = await loadPostContent(id);
    const post = posts.find(p => p.id === id);
    if (post) post.content = content;

    // 注入正文并展开
    const body = document.querySelector(`[data-post-id="${id}"] .post-body`) as HTMLElement;
    if (body) {
      body.innerHTML = content;
      body.style.maxHeight = '0';
      // 强制回流后重新计算高度
      requestAnimationFrame(() => {
        body.style.maxHeight = body.scrollHeight + 'px';
        body.style.opacity = '1';
        body.style.paddingTop = '1rem';
        body.style.paddingBottom = '1rem';
      });
    }
  }
}

// ============================================================
// 滚动到指定文章
// ============================================================
async function scrollToPost(id: string) {
  const postElement = document.getElementById(`post-${id}`);
  if (postElement) {
    postElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // 展开文章
    if (!expandedPosts.has(id)) {
      await togglePost(id);
    }
  }
}

// ============================================================
// 背景音乐播放控制
// 这个符号...不错
// ...点击一下就暂停播放了
// 雏菜喜欢这个设计！
function playNextTrack() {
  if (musicFiles.length === 0) {
    console.warn('没有找到音乐文件');
    return;
  }
  
  // 随机选择下一首
  currentTrackIndex = Math.floor(Math.random() * musicFiles.length);
  const trackPath = musicFiles[currentTrackIndex].replace('./', '/');
  
  if (audioPlayer) {
    audioPlayer.src = trackPath;
    audioPlayer.play().catch(e => console.error('播放失败:', e));
  }
}

function toggleMusic() {
  // 首次点击时创建 Audio 对象
  if (!audioPlayer) {
    audioPlayer = new Audio();
    audioPlayer.loop = false;
    audioPlayer.addEventListener('ended', playNextTrack);
    audioPlayer.addEventListener('play', () => {
      // 音频已解锁
    }, { once: true });
  }
  
  if (isPlaying) {
    // 暂停
    audioPlayer.pause();
    isPlaying = false;
    updateMusicButton();
  } else {
    // 播放
    if (musicFiles.length > 0) {
      if (!audioPlayer.src) {
        playNextTrack();
      } else {
        const playPromise = audioPlayer.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => {
            console.warn('播放被阻止:', e.message);
            // 尝试重新加载并播放
            audioPlayer!.load();
            audioPlayer!.play().catch(console.error);
          });
        }
      }
      isPlaying = true;
      updateMusicButton();
    }
  }
}

function updateMusicButton() {
  const btn = document.querySelector('.music-toggle');
  if (btn) {
    btn.textContent = isPlaying ? '♪' : '♪';
    if (isPlaying) {
      btn.classList.add('playing');
    } else {
      btn.classList.remove('playing');
    }
  }
}

// 自动播放音乐（页面加载后1秒）
function autoPlayMusic() {
  if (musicFiles.length === 0) return;
  
  if (!audioPlayer) {
    audioPlayer = new Audio();
    audioPlayer.loop = false;
    audioPlayer.addEventListener('ended', playNextTrack);
    
    // 尝试解锁音频上下文
    audioPlayer.addEventListener('play', () => {
      // 音频已解锁
    }, { once: true });
  }
  
  playNextTrack();
  isPlaying = true;
  updateMusicButton();
}

// 首页组件 - 带动画效果
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
      <h1>此处是神经元的墓地<span class="music-toggle" onclick="window.toggleMusic()">♪</span></h1>
      <p class="subtitle">被抛下的，被放弃的，粘连在一起，如雨般落下</p>
    </header>
    <main class="main">
      <!-- 侧边时间线导航 -->
      <aside class="timeline-sidebar">
        <div class="timeline-line"></div>
        ${posts.map((post) => `
          <div class="timeline-node" onclick="window.scrollToPost('${post.id}')">
            <span class="timeline-dot"></span>
            <span class="timeline-label">${escapeHtml(post.title)}</span>
          </div>
        `).join('')}
      </aside>
      <div class="posts-container">
        <div class="posts-list">
          ${posts.map(post => {
            const isExpanded = expandedPosts.has(post.id);
             
            return `
              <article class="post-card ${isExpanded ? 'expanded' : ''}" data-post-id="${post.id}" id="post-${post.id}">
                <div class="post-header-clickable" onclick="window.togglePost('${post.id}')">
                  <div class="post-title-section">
                    <h2>${escapeHtml(post.title)}</h2>
                    <time>${post.date}</time>
                    ${post.tags && post.tags.length > 0 ? `
                      <div class="post-tags">
                        ${post.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
                      </div>
                    ` : ''}
                  </div>
                  <span class="expand-icon ${isExpanded ? 'rotated' : ''}">▶</span>
                </div>
                
                ${post.cover ? `
                  <div class="post-cover-mini ${isExpanded ? 'expanded' : ''}">
                    <img src="${post.cover}" class="cover-image" alt="封面" onerror="this.style.display='none'" />
                  </div>
                ` : ''}
                
                <div class="post-body${isExpanded ? ' expanded' : ''}">
                  ${isExpanded ? (post.content || '<p class="loading-hint">加载中...</p>') : `
                    <p class="post-excerpt">${escapeHtml(post.excerpt)}</p>
                    <p class="read-more-hint">点击展开阅读更多...</p>
                  `}
                </div>
              </article>
            `;
          }).join("")}
        </div>
      </div>
    </main>
    <footer class="footer">
      <p>&copy; 1066-2999 困难星人</p>
    </footer>
  `;
}

// 全局函数供 onclick 调用
(window as unknown as Record<string, unknown>).togglePost = togglePost;
(window as unknown as Record<string, unknown>).scrollToPost = scrollToPost;
(window as unknown as Record<string, unknown>).toggleMusic = toggleMusic;

// 注册路由
router.addRoute("/", renderHome);

// 启动应用
function init() {
  loadPosts();
  renderHome();
  // 加载完成后 1 秒自动播放音乐
  setTimeout(autoPlayMusic, 1000);
}

// ============================================================
// 改善 WebGL 错误处理
// ============================================================
import { initBackground } from "./webgl-shader";
const shader = initBackground("shader-canvas");

if (!shader) {
  const style = document.createElement('style');
  style.textContent = `
    .webgl-fallback {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      z-index: -1;
    }
  `;
  document.head.appendChild(style);
  
  const fallback = document.createElement('div');
  fallback.className = 'webgl-fallback';
  document.body.insertBefore(fallback, document.body.firstChild);
  
  console.warn('WebGL 背景初始化失败，已使用纯色备用背景');
}

// 运行
init();