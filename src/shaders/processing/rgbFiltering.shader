#version 300 es
precision mediump float;

in vec2 o_texCoord;

uniform float rgbf_filter;
uniform vec4 rgbf_removed;
uniform sampler2D rgbf_image;

out vec4 o_colour;

void main() {
    vec4 raw_colour = texture(rgbf_image, o_texCoord);

    if(raw_colour.{rgbfd1_colour} {rgbfd2_keep} rgbf_filter){
        raw_colour.{rgbfd1_colour} = raw_colour.{rgbfd1_colour};
    } else {
        raw_colour = rgbf_removed;
    }

    o_colour = raw_colour;
}