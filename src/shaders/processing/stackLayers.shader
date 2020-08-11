#version 300 es
precision mediump float;

in vec2 o_texCoord;

uniform sampler2D sl1_image;
uniform sampler2D sl2_image;
uniform float sl1_weight;
uniform float sl2_weight;
uniform float sl_multiplier;

out vec4 o_colour;

void main() {
    vec4 sl1_texture = texture(sl1_image, o_texCoord) * sl1_weight;
    vec4 sl2_texture = texture(sl2_image, o_texCoord) * sl2_weight;
    vec4 sum_texture = sl1_texture + sl2_texture;
    o_colour = vec4((sum_texture / sl_multiplier).rgb, 1);
}