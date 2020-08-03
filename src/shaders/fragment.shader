#version 300 es
precision mediump float;

in vec2 o_texCoord;

uniform vec4 u_multiplier;
uniform sampler2D u_image;

out vec4 o_colour;

void main() {
   o_colour = texture(u_image, o_texCoord) * u_multiplier;
}