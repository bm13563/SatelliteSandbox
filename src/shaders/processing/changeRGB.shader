#version 300 es
precision mediump float;

in vec2 o_texCoord;

uniform vec4 crgb_multiplier;
uniform sampler2D crgb_image;

out vec4 o_colour;

void main() {
   o_colour = texture(crgb_image, o_texCoord) * crgb_multiplier;
}