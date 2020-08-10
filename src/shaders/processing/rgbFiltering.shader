#version 300 es
precision mediump float;

in vec2 o_texCoord;

uniform float rgbf_filter[3];
uniform vec4 rgbf_removed;
uniform sampler2D rgbf_image;

out vec4 o_colour;

void main() {
    vec4 raw_colour = texture(rgbf_image, o_texCoord);
    float remove = 0.0;

    if(raw_colour.r {rgbfd1_remove} rgbf_filter[0]){
        remove = 1.0;
    }

    if(raw_colour.g {rgbfd1_remove} rgbf_filter[1]){
        remove = 1.0;
    }

    if(raw_colour.b {rgbfd1_remove} rgbf_filter[2]){
        remove = 1.0;
    }

    vec4 final_colour;
    if(remove == 1.0){
        final_colour = rgbf_removed;
    } else {
        final_colour = raw_colour;
    }

    o_colour = final_colour;
}