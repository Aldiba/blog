shader_type canvas_item;

uniform float time_speed : hint_range(0.1, 3.0) = 0.25;
uniform float uv_scale : hint_range(1.0, 20.0) = 8.0;
uniform int layers : hint_range(1, 4) = 4;
uniform float color_saturation : hint_range(0.0, 2.0) = 1.0;
uniform float pattern_detail : hint_range(0.5, 5.0) = 1.0;
uniform float contrast : hint_range(1.0, 50.0) = 30.0;
uniform float noise_intensity : hint_range(0.0, 0.2) = 0.02;
uniform float vignette : hint_range(0.0, 1.0) = 0.2;
uniform vec3 base_color = vec3(0.5, 0.8, 1.0);

vec3 hash32(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
    p3 += dot(p3, p3.yxz+19.19);
    return fract((p3.xxy+p3.yzz)*p3.zyx);
}

vec4 disco(vec2 uv) {
    // 更平面化的图案生成
    float v = abs(cos(uv.x * PI * pattern_detail) + cos(uv.y * PI * pattern_detail)) * 0.5;
    uv.x -= 0.5;
    vec3 cid2 = hash32(vec2(floor(uv.x - uv.y), floor(uv.x + uv.y)));
    cid2 = mix(base_color, cid2, color_saturation); // 颜色混合
    return vec4(cid2, v);
}

void fragment() {
    vec2 R = 1.0/SCREEN_PIXEL_SIZE;
    vec2 uv = FRAGCOORD.xy/R.xy;
    uv.x *= R.x/R.y;
    uv.y = 1.0 - uv.y;

    float t = TIME * time_speed;
    uv *= uv_scale;
    uv -= vec2(t*0.5, -t*0.3);

    vec4 col = vec4(1.0);
    for(int i = 1; i <= 4; ++i) {
        if (i > layers) break;
        float fi = float(i);
        uv /= fi*0.9;
        vec4 d = disco(uv);
        // 简化曲线计算
        float curv = pow(d.a, 0.5);
        col *= clamp(d * curv, 0.5, 1.0); // 提高下限值使颜色更平
        uv += t*(fi+0.3);
    }

    // 平面化后处理
    col = clamp(col, 0.0, 1.0);
    vec2 N = (FRAGCOORD.xy/R.xy) - 0.5;
    col = 1.0 - pow(1.0 - col, vec4(contrast));
    col.rgb += hash32(FRAGCOORD.xy + TIME).r*noise_intensity;
    col *= 1.0 - dot(N, N*2.0)*vignette; // 可调暗角
    col.a = 1.0;

    COLOR = col;
}