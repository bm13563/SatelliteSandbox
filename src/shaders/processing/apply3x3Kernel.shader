#version 300 es
precision mediump float;

uniform sampler2D a3k_image;
uniform float a3k_textureWidth;
uniform float a3k_textureHeight;
uniform float a3k_kernel[9];
uniform float a3k_kernelWeight;

in vec2 o_texCoord;

out vec4 o_colour;

void main() {
   vec2 onePixel = vec2(1.0 / a3k_textureWidth, 1.0 / a3k_textureHeight);
   vec4 colorSum =
       texture(a3k_image, o_texCoord + onePixel * vec2(-1, -1)) * a3k_kernel[0] +
       texture(a3k_image, o_texCoord + onePixel * vec2( 0, -1)) * a3k_kernel[1] +
       texture(a3k_image, o_texCoord + onePixel * vec2( 1, -1)) * a3k_kernel[2] +
       texture(a3k_image, o_texCoord + onePixel * vec2(-1,  0)) * a3k_kernel[3] +
       texture(a3k_image, o_texCoord + onePixel * vec2( 0,  0)) * a3k_kernel[4] +
       texture(a3k_image, o_texCoord + onePixel * vec2( 1,  0)) * a3k_kernel[5] +
       texture(a3k_image, o_texCoord + onePixel * vec2(-1,  1)) * a3k_kernel[6] +
       texture(a3k_image, o_texCoord + onePixel * vec2( 0,  1)) * a3k_kernel[7] +
       texture(a3k_image, o_texCoord + onePixel * vec2( 1,  1)) * a3k_kernel[8] ;
   o_colour = vec4((colorSum / a3k_kernelWeight).rgb, 1);
}