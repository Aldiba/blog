import { marked } from "marked";

// 这里是不是该放点 BGM...啊已经有了！
// 嗯...就这样吧

// ============================================================
// 自动扫描文章（import.meta.glob）
// 这样就可以自动找到所有文章了！
// 呀↑哈～！好方便！

// 使用 import.meta.glob 自动扫描
const mdModules = import.meta.glob("./posts/*.md", { 
  query: '?raw', 
  eager: true 
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
const debugMusicModules = import.meta.glob("../res/music/*");
console.log('music glob 结果:', debugMusicModules);
console.log('music glob keys:', Object.keys(debugMusicModules));

// 正确路径
const musicModules = import.meta.glob("../res/music/*.mp3", { eager: true });
const musicFiles = Object.keys(musicModules);
console.log('扫描到的音乐文件:', musicFiles);
let audioPlayer: HTMLAudioElement | null = null;
let isPlaying = false;
let currentTrackIndex = 0;
let musicUnlocked = false;

// 配置 marked
marked.setOptions({
  gfm: true,
  breaks: true,
});

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
  // 移除 <onclick>, <onerror> 等事件属性
  clean = clean.replace(/\s+on\w+="[^"]*"/gi, '');
  // 移除 javascript: 协议
  clean = clean.replace(/javascript:/gi, '');
  // 移除 data: 协议（可能用于_base64 攻击）
  clean = clean.replace(/data:/gi, '');
  return clean;
}

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

// 加载所有 MD 文件（使用自动扫描）
function loadPosts() {
  for (const [path, module] of Object.entries(mdModules)) {
    const content = (module as { default: string }).default;
    const { meta, body } = parseFrontmatter(content);
    
    const id = path.replace("./posts/", "").replace(".md", "");
    const cover = findCover(path);
    const tags = meta.tags ? meta.tags.split(",").map(t => t.trim()) : [];
    
    posts.push({
      id,
      title: meta.title || "无标题",
      date: meta.date || new Date().toISOString().split("T")[0],
      excerpt: meta.excerpt || "",
      cover: cover || meta.cover,
      content: sanitizeHtml(marked.parse(body) as string),
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
function togglePost(id: string) {
  const card = document.querySelector(`[data-post-id="${id}"]`);
  const body = card?.querySelector('.post-body') as HTMLElement;
  const wasExpanded = expandedPosts.has(id);
  
  if (wasExpanded) {
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
    expandedPosts.add(id);
    renderHome();
    requestAnimationFrame(() => {
      const newBody = document.querySelector(`[data-post-id="${id}"] .post-body`) as HTMLElement;
      if (newBody) {
        newBody.style.maxHeight = newBody.scrollHeight + 'px';
        newBody.style.opacity = '1';
        newBody.style.paddingTop = '1rem';
        newBody.style.paddingBottom = '1rem';
      }
    });
  }
}

// ============================================================
// 滚动到指定文章
// ============================================================
function scrollToPost(id: string) {
  const postElement = document.getElementById(`post-${id}`);
  if (postElement) {
    postElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // 展开文章
    if (!expandedPosts.has(id)) {
      togglePost(id);
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
  console.log('播放:', trackPath);
  
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
      musicUnlocked = true;
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
      musicUnlocked = true;
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
        ${posts.map((post, index) => `
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
                    <img src="${post.cover}" class="cover-image" alt="封面" />
                  </div>
                ` : ''}
                
                <div class="post-body${isExpanded ? ' expanded' : ''}">
                  ${isExpanded ? post.content : `
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