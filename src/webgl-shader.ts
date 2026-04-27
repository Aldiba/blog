// WebGL 着色器渲染器
import { vertexShader, fragmentShader, defaultUniforms } from "./shader";

class WebGLShader {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private uniforms: { [key: string]: WebGLUniformLocation | null };
  private startTime: number;
  private animationId: number | null = null;
  private isVisible: boolean = true;
  private lastFrameTime: number = 0;
  private readonly targetFPS: number = 24;
  private readonly resolutionScale: number = 0.5; // 降低分辨率到 50%，性能提升约 75%

  constructor(canvasId: string) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      throw new Error(`Canvas element '${canvasId}' not found`);
    }
    this.canvas = canvas;
    
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl") as WebGLRenderingContext;
    if (!gl) {
      throw new Error("WebGL not supported");
    }
    this.gl = gl;

    this.program = this.createProgram(vertexShader, fragmentShader);
    this.uniforms = this.getUniformLocations();
    this.startTime = Date.now();

    this.resize();
    this.setupBuffers(); // 初始化时只调用一次
    
    // 监听窗口大小变化
    window.addEventListener("resize", () => this.resize());
    
    // 监听页面可见性变化 -  切后台时暂停渲染，节省资源！
    document.addEventListener("visibilitychange", () => {
      this.isVisible = document.visibilityState === "visible";
      if (this.isVisible) {
        // 页面重新可见时恢复渲染
        this.start();
      } else {
        // 页面不可见时停止渲染 - 别浪费电
        this.stop();
      }
    });
  }

  private createShader(type: number, source: string): WebGLShader | null {
    const shader = this.gl.createShader(type);
    if (!shader) return null;

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error("Shader compile error:", this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }
    return shader as unknown as WebGLShader;
  }

  private createProgram(vsSource: string, fsSource: string): WebGLProgram {
    const vs = this.createShader(this.gl.VERTEX_SHADER, vsSource);
    const fs = this.createShader(this.gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) throw new Error("Failed to create shaders");

    const program = this.gl.createProgram();
    if (!program) throw new Error("Failed to create program");

    this.gl.attachShader(program, vs);
    this.gl.attachShader(program, fs);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error("Program link error:", this.gl.getProgramInfoLog(program));
      throw new Error("Failed to link program");
    }
    return program;
  }

  private getUniformLocations(): { [key: string]: WebGLUniformLocation | null } {
    return {
      u_time: this.gl.getUniformLocation(this.program, "u_time"),
      u_resolution: this.gl.getUniformLocation(this.program, "u_resolution"),
      u_time_speed: this.gl.getUniformLocation(this.program, "u_time_speed"),
      u_uv_scale: this.gl.getUniformLocation(this.program, "u_uv_scale"),
      u_layers: this.gl.getUniformLocation(this.program, "u_layers"),
      u_color_saturation: this.gl.getUniformLocation(this.program, "u_color_saturation"),
      u_pattern_detail: this.gl.getUniformLocation(this.program, "u_pattern_detail"),
      u_contrast: this.gl.getUniformLocation(this.program, "u_contrast"),
      u_noise_intensity: this.gl.getUniformLocation(this.program, "u_noise_intensity"),
      u_vignette: this.gl.getUniformLocation(this.program, "u_vignette"),
      u_base_color: this.gl.getUniformLocation(this.program, "u_base_color"),
    };
  }

  private setupBuffers() {
    // 全屏四边形
    const positions = new Float32Array([
      -1, -1,  1, -1,  -1, 1,
      -1, 1,   1, -1,   1, 1,
    ]);
    const texCoords = new Float32Array([
      0, 0,  1, 0,  0, 1,
      0, 1,  1, 0,  1, 1,
    ]);

    const posBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, posBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);

    const posLoc = this.gl.getAttribLocation(this.program, "a_position");
    this.gl.enableVertexAttribArray(posLoc);
    this.gl.vertexAttribPointer(posLoc, 2, this.gl.FLOAT, false, 0, 0);

    const texBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, texBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, texCoords, this.gl.STATIC_DRAW);

    const texLoc = this.gl.getAttribLocation(this.program, "a_texCoord");
    this.gl.enableVertexAttribArray(texLoc);
    this.gl.vertexAttribPointer(texLoc, 2, this.gl.FLOAT, false, 0, 0);
  }

  private resize() {
    this.canvas.width = Math.floor(window.innerWidth * this.resolutionScale);
    this.canvas.height = Math.floor(window.innerHeight * this.resolutionScale);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  render() {
    // 页面不可见时不渲染 - 节省 GPU 资源！
    if (!this.isVisible) {
      return;
    }
    
    // 帧率限制 - 就像电影的帧率一样，保持流畅就行
    const now = Date.now();
    const elapsed = now - this.lastFrameTime;
    const frameInterval = 1000 / this.targetFPS;
    
    if (elapsed < frameInterval) {
      return;
    }
    this.lastFrameTime = now - (elapsed % frameInterval);
    
    this.gl.useProgram(this.program);

    const time = (Date.now() - this.startTime) / 1000;

    // 设置 uniforms
    this.gl.uniform1f(this.uniforms.u_time, time);
    this.gl.uniform2f(this.uniforms.u_resolution, this.canvas.width, this.canvas.height);
    this.gl.uniform1f(this.uniforms.u_time_speed, defaultUniforms.u_time_speed);
    this.gl.uniform1f(this.uniforms.u_uv_scale, defaultUniforms.u_uv_scale);
    this.gl.uniform1i(this.uniforms.u_layers, defaultUniforms.u_layers);
    this.gl.uniform1f(this.uniforms.u_color_saturation, defaultUniforms.u_color_saturation);
    this.gl.uniform1f(this.uniforms.u_pattern_detail, defaultUniforms.u_pattern_detail);
    this.gl.uniform1f(this.uniforms.u_contrast, defaultUniforms.u_contrast);
    this.gl.uniform1f(this.uniforms.u_noise_intensity, defaultUniforms.u_noise_intensity);
    this.gl.uniform1f(this.uniforms.u_vignette, defaultUniforms.u_vignette);
    this.gl.uniform3fv(this.uniforms.u_base_color, defaultUniforms.u_base_color);

    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
  }

  start() {
    const loop = () => {
      this.render();
      this.animationId = requestAnimationFrame(loop);
    };
    loop();
  }

  stop() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}

// 初始化
export function initBackground(canvasId: string = "shader-canvas") {
  try {
    const shader = new WebGLShader(canvasId);
    shader.start();
    return shader;
  } catch (e) {
    console.error("Failed to initialize WebGL shader:", e);
    return null;
  }
}