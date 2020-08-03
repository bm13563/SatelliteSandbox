#version 300 es

in vec2 position;
in vec2 texcoord;

out vec2 o_texCoord;

void main() {
   gl_Position = vec4(position.x, position.y * -1.0, 0, 1);
   o_texCoord = texcoord;
}