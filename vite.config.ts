import { defineConfig, Plugin } from 'vite';

// 自定义插件：处理 ?frontmatter 查询，只提取 markdown 的 YAML 头部
function frontmatterPlugin(): Plugin {
  return {
    name: 'frontmatter',
    transform(code, id) {
      if (id.includes('.md') && id.includes('?frontmatter')) {
        const match = code.match(/^---\s*([\s\S]*?)\s*---/);
        return {
          code: `export default ${JSON.stringify(match ? match[1] : '')};`,
          map: null,
        };
      }
    },
  };
}

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  plugins: [frontmatterPlugin()],
});
