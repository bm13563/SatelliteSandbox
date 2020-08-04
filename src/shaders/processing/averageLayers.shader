#version 300 es
precision mediump float;

in vec2 o_texCoord;

uniform sampler2D al1_image;
uniform sampler2D al2_image;

out vec4 o_colour;

void main() {
    vec4 al1_texture = texture(al1_image, o_texCoord);
    vec4 al2_texture = texture(al2_image, o_texCoord);
    vec4 sum_texture = al1_texture + al2_texture;
    o_colour = sum_texture / vec4(2.0, 2.0, 2.0, 1.0);
}