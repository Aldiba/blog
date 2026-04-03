shader_type canvas_item;

// group_uniforms for Godot 4.x compatibility
group_uniforms Colors;
uniform vec4 line_color : source_color = vec4(1.0, 1.0, 1.0, 1.0);
uniform vec4 bg_color : source_color = vec4(0.0, 0.0, 0.0, 0.0);

// 新增：噪声纹理和效果控制参数
group_uniforms Roughness_and_Breakup;
uniform sampler2D noise_texture : source_color,filter_linear_mipmap,repeat_enable;
uniform float distortion_strength : hint_range(0.0, 0.1, 0.0001) = 0.0001; // 扭曲强度
uniform float noise_scale : hint_range(1.0, 20.0, 0.5) = 7.0; // 噪声缩放（数值越大，噪点越小越密集）
uniform float breakup_threshold : hint_range(0.0, 1.0, 0.01) = 0.45; // 破碎阈值（越高，线条越破碎）

group_uniforms Spiral_Settings;
uniform float spiral_arms : hint_range(1.0, 20.0, 1.0) = 3.0;
uniform float density : hint_range(1.0, 50.0, 0.5) = 15.0;
uniform float line_thickness : hint_range(0.0, 0.5, 0.01) = 0.02;
uniform bool clockwise = true;

group_uniforms Animation;
uniform bool shrink_inwards = true;
uniform float speed : hint_range(0.0, 20.0, 0.1) = 2.0;

group_uniforms Fade;
uniform float fade_center_size : hint_range(0.0, 1.0, 0.01) = 0.1;
uniform float fade_blur_range : hint_range(0.0, 1.0, 0.01) = 0.2;

void fragment() {
    vec2 viewport_size = 1.0 / TEXTURE_PIXEL_SIZE;

    // 宽高比校正
    vec2 base_uv = UV - 0.5;
    base_uv *= max(viewport_size.x, viewport_size.y) / viewport_size;

    // --- 核心改动：应用噪声 ---

    // 1. 从噪声纹理中采样
    // 我们用基础UV乘以一个缩放值来控制噪声的纹理大小
    vec4 noise = texture(noise_texture, base_uv * noise_scale);

    // 2. 扭曲坐标
    // 将噪声值从[0, 1]范围映射到[-1, 1]范围，然后乘以强度，加到原始UV上
    vec2 distortion_offset = (noise.rg * 2.0 - 1.0) * distortion_strength;
    vec2 uv = base_uv + distortion_offset;
    
    // --- 后续计算使用扭曲后的UV ---

    float radius = length(uv);
    float angle = atan(uv.y, uv.x);

    float inward_direction = shrink_inwards ? -1.0 : 1.0;
    float rotation_direction = clockwise ? 1.0 : -1.0;

    float angle_component = (angle / (PI * 2.0)) * spiral_arms * rotation_direction;
    float spiral_value = radius * density + angle_component + TIME * speed * inward_direction;
    
    float line_value = fract(spiral_value);
    float line = smoothstep(0.5 - line_thickness / 2.0, 0.5, line_value) - smoothstep(0.5, 0.5 + line_thickness / 2.0, line_value);
    
    // 3. 打碎线条
    // 使用 step 函数，当噪声的红色通道值大于阈值时，返回1.0，否则返回0.0。
    // 将这个结果乘到 line 上，就能有效地“擦除”掉噪声暗部的线条。
    line *= step(breakup_threshold, noise.r);
    
    // 中心淡化
    float fade = smoothstep(fade_center_size, fade_center_size + fade_blur_range, radius);
    
    // 混合颜色
    float mix_factor = line * fade;
    vec4 final_color = mix(bg_color, line_color, mix_factor);
	
    COLOR = final_color;
}