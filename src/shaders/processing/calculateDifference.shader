#version 300 es
precision mediump float;

// uniform vec4 cd_positive_colour;
// uniform vec4 cd_negative_colour;
uniform sampler2D cd_image1;
uniform sampler2D cd_image2;

in vec2 o_texCoord;

out vec4 o_colour;

void main() {
    vec4 image1 = texture(cd_image1, o_texCoord);
    vec4 image2 = texture(cd_image2, o_texCoord);
    // vec4 positive_difference = (cd_positive_colour.r - image1.r, cd_positive_colour.g - image1.g, cd_positive_colour.b - image1.b, 1.0);
    // vec4 negative_difference = (cd_negative_colour.r - image1.r, cd_negative_colour.g - image1.g, cd_negative_colour.b - image1.b, 1.0);
    vec3 positive_difference = vec3(0.0, 0.0, 1.0) - image1.rgb;
    vec3 negative_difference = vec3(1.0, 0.0, 0.0) - image1.rgb;
    float image_difference = ((image1.r - image2.r) + (image1.g - image2.g) + (image1.b - image2.b)) / 3.0;

    vec4 final_colour = vec4(image1.r - image_difference, 0.0, image1.b + image_difference, 1.0);
    if (abs(image_difference) < 0.4) {
        final_colour = vec4(0.0, 0.0, 0.0, 1.0);
    }
    if (image1.r == 0.0) {
        final_colour = vec4(0.0, 0.0, 0.0, 1.0);
    }

    o_colour = final_colour;
}