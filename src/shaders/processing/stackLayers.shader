#version 300 es
precision mediump float;

in vec2 o_texCoord;

uniform sampler2D sl1_image;
uniform sampler2D sl2_image;
uniform float sl1_weight;
uniform float sl2_weight;
uniform float sl_ignore;
uniform float sl_divisor;

out vec4 o_colour;

void main() {
    vec4 sl1_texture = texture(sl1_image, o_texCoord);
    vec4 sl2_texture = texture(sl2_image, o_texCoord);
    if (sl2_texture == vec4(0.0, 0.0, 0.0, 1.0)) {
        o_colour = sl1_texture;
    } else {
        vec4 sl1_weighted = sl1_texture * sl1_weight;
        vec4 sl2_weighted = sl2_texture * sl2_weight;
        vec4 sum_texture = sl1_weighted + sl2_weighted;
        o_colour = vec4((sum_texture / sl_divisor).rgb, 1);
    }
}