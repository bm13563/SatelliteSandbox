#version 300 es
precision mediump float;

in vec2 o_texCoord;

uniform sampler2D f_image;

out vec4 o_colour;

void main() {
   o_colour = texture(f_image, o_texCoord);
}