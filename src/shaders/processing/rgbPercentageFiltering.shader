#version 300 es
precision mediump float;

in vec2 o_texCoord;

uniform float rgbfp_filter;
uniform vec4 rgbfp_removed;
uniform sampler2D rgbfp_image;

out vec4 o_colour;

void main() {
    vec4 raw_colour = texture(rgbfp_image, o_texCoord);
    float sum_colours = raw_colour.r + raw_colour.g + raw_colour.b;
    float threshold_colour = raw_colour.{rgbfpd1_colour} / sum_colours;
    if(raw_colour.{rgbfpd1_colour} {rgbfpd2_keep} threshold_colour){
        raw_colour.{rgbfpd1_colour} = raw_colour.{rgbfpd1_colour};
    } else {
        raw_colour = rgbfp_removed;
    }
    o_colour = raw_colour;
}