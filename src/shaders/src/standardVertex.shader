#version 300 es

in vec2 position;
in vec2 texcoord;

uniform mat3 u_texMatrix;

out vec2 o_texCoord;

void main() {
   gl_Position = vec4(position, 0, 1);
   o_texCoord = (u_texMatrix * vec3(texcoord, 1)).xy;
}