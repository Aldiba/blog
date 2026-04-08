// 白色网格交替着色器 - WebGL 版本

export const vertexShader = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

export const fragmentShader = `
  precision lowp float; // 小糸酱: 降低精度以节省 GPU 资源，视觉效果应该不会差太多
  
  varying vec2 v_texCoord;
  
  uniform float u_time;
  uniform vec2 u_resolution;
  
  // 用户可调参数
  uniform float u_time_speed;
  uniform float u_uv_scale;
  uniform int u_layers;
  uniform float u_color_saturation;
  uniform float u_pattern_detail;
  uniform float u_contrast;
  uniform float u_noise_intensity;
  uniform float u_vignette;
  uniform vec3 u_base_color;
  
  #define PI 3.14159265359
  
  vec3 hash32(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
    p3 += dot(p3, p3.yxz + 19.19);
    return fract((p3.xxy + p3.yzz) * p3.zyx);
  }
  
  vec4 disco(vec2 uv) {
    float v = abs(cos(uv.x * PI * u_pattern_detail) + cos(uv.y * PI * u_pattern_detail)) * 0.5;
    uv.x -= 0.5;
    vec3 cid2 = hash32(vec2(floor(uv.x - uv.y), floor(uv.x + uv.y)));
    cid2 = mix(u_base_color, cid2, u_color_saturation);
    return vec4(cid2, v);
  }
  
  void main() {
    vec2 uv = v_texCoord;
    uv.x *= u_resolution.x / u_resolution.y;
    uv.y = 1.0 - uv.y;
    
    float t = u_time * u_time_speed;
    uv *= u_uv_scale;
    uv -= vec2(t * 0.5, -t * 0.3);
    
    vec4 col = vec4(1.0);
    for(int i = 1; i <= 4; ++i) {
      if (i > u_layers) break;
      float fi = float(i);
      uv /= fi * 0.9;
      vec4 d = disco(uv);
      float curv = pow(d.a, 0.5);
      col *= clamp(d * curv, 0.5, 1.0);
      uv += t * (fi + 0.3);
    }
    
    col = clamp(col, 0.0, 1.0);
    vec2 N = v_texCoord - 0.5;
    N.x *= u_resolution.x / u_resolution.y;
    col = 1.0 - pow(1.0 - col, vec4(u_contrast));
    // col.rgb += hash32(gl_FragCoord.xy + u_time).r * u_noise_intensity;
    // col *= 1.0 - dot(N, N * 2.0) * u_vignette;
    col.a = 1.0;
    
    gl_FragColor = col;
  }
`;

export const defaultUniforms = {
  u_time_speed: 0.25,
  u_uv_scale: 8.0,
  u_layers: 4.0,
  u_color_saturation: 1.0,
  u_pattern_detail: 1.0,
  u_contrast: 55.0,
  u_noise_intensity: 0.01,    // 关闭噪点效果以提升性能
  u_vignette: 0.0,             // 关闭暗角效果以提升性能
  u_base_color: [0.5, 0.8, 1.0]
};