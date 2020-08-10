#version 300 es
precision mediump float;

in vec2 o_texCoord;

uniform float rgbfp_filter[3];
uniform vec4 rgbfp_removed;
uniform sampler2D rgbfp_image;

out vec4 o_colour;

void main() {
    vec4 raw_colour = texture(rgbfp_image, o_texCoord);
    float sum_colours = raw_colour.r + raw_colour.g + raw_colour.b;
    float remove = 0.0;

    if(raw_colour.r / sum_colours {rgbfpd2_keep} rgbfp_filter[0]){
        remove = 1.0;
    }

    if(raw_colour.g / sum_colours {rgbfpd2_keep} rgbfp_filter[1]){
        remove = 1.0;
    }

    if(raw_colour.b / sum_colours {rgbfpd2_keep} rgbfp_filter[2]){
        remove = 1.0;
    }

    vec4 final_colour;
    if(remove == 1.0){
        final_colour = rgbfp_removed;
    } else {
        final_colour = raw_colour;
    }

    o_colour = final_colour;
}