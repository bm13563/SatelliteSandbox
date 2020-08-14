#version 300 es
precision mediump float;

uniform sampler2D sed_image;
uniform float sed_textureWidth;
uniform float sed_textureHeight;

in vec2 o_texCoord;

out vec4 o_colour;

void main() {
    vec2 onePixel = vec2(1.0 / sed_textureWidth, 1.0 / sed_textureHeight);

    float tl = texture(sed_image, o_texCoord + onePixel * vec2(-1, -1)).r;
    float tm = texture(sed_image, o_texCoord + onePixel * vec2( 0, -1)).r;
    float tr = texture(sed_image, o_texCoord + onePixel * vec2( 1, -1)).r;
    float ml = texture(sed_image, o_texCoord + onePixel * vec2(-1,  0)).r;
    float mm = texture(sed_image, o_texCoord + onePixel * vec2( 0,  0)).r;
    float mr =texture (sed_image, o_texCoord + onePixel * vec2( 1,  0)).r;
    float bl = texture(sed_image, o_texCoord + onePixel * vec2(-1,  1)).r;
    float bm = texture(sed_image, o_texCoord + onePixel * vec2( 0,  1)).r;
    float br = texture(sed_image, o_texCoord + onePixel * vec2( 1,  1)).r;

    float[9] x_kernel = float[9](1.0, 0.0, -1.0, 2.0, 0.0, -2.0, 1.0, 0.0, -1.0);

    float dx =
        tl * x_kernel[0] + 
        tm * x_kernel[1] + 
        tr * x_kernel[2] + 
        ml * x_kernel[3] + 
        mm * x_kernel[4] + 
        mr * x_kernel[5] + 
        bl * x_kernel[6] + 
        bm * x_kernel[7] + 
        br * x_kernel[8] ;

    float[9] y_kernel = float[9](-1.0, -2.0, -1.0, 0.0, 0.0, 0.0, 1.0, 2.0, 1.0);

    float dy =
        tl * y_kernel[0] + 
        tm * y_kernel[1] + 
        tr * y_kernel[2] + 
        ml * y_kernel[3] + 
        mm * y_kernel[4] + 
        mr * y_kernel[5] + 
        bl * y_kernel[6] + 
        bm * y_kernel[7] + 
        br * y_kernel[8] ;

    float mag = length(vec2(dx, dy));
    o_colour = vec4(vec3(mag), 1.0);
}