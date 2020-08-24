#version 300 es
precision mediump float;

in vec2 o_texCoord;

uniform sampler2D cndwi_image;

out vec4 o_colour;

void main() {
    vec4 image_bands = texture(cndwi_image, o_texCoord);
    float green = image_bands.g;
    float nir = image_bands.r;

    float ndwi = (green - nir) / (green + nir);

    o_colour = vec4(ndwi, 0.0, 0.0, 1.0);
}