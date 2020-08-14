#version 300 es
precision mediump float;

uniform sampler2D gs_image;

in vec2 o_texCoord;

out vec4 o_colour;

void main() {
    vec4 color = texture(gs_image, o_texCoord);
    float grey = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    o_colour = vec4(grey, grey, grey, color.a);
}