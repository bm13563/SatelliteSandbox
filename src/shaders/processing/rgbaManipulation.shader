#version 300 es
precision mediump float;

in vec2 o_texCoord;

uniform vec4 rgbam_multiplier;
uniform sampler2D rgbam_image;

out vec4 o_colour;

void main() {
   o_colour = texture(rgbam_image, o_texCoord) * rgbam_multiplier;
}