#version 300 es
precision mediump float;

in vec2 o_texCoord;

uniform float cl_width;
uniform sampler2D cl_image1;
uniform sampler2D cl_image2;

out vec4 o_colour;

void main() {

    vec4 half_colour;
    if (o_texCoord.x > cl_width) {
        half_colour = texture(cl_image2, o_texCoord);
    } else {
        half_colour = texture(cl_image1, o_texCoord);
    }

    o_colour = half_colour;
}