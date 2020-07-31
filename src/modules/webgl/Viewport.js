export class viewport{
    constructor(gl, height, width) {
        this._gl = gl;
        this.canvas = gl.canvas;
        this.height = height;
        this.width = width;
        this.canvas.width = width;
        this.canvas.height = height;
        this.shader;
        this.resolutionUniform;
    }

    activateShader = (shader, resolution) => {
        this.shader = shader;
        this.resolutionUniform = resolution;
        shader.activate();
    }

    draw = (count, primitiveType, offset=0) => {
        var resolutionUniform = this.resolutionUniform;
        this.clear();
        this._gl.uniform2f(this.shader.uniforms[resolutionUniform], this.width, this.height);
        this._gl.viewport(0, 0, this.width, this.height);
        this._gl.drawArrays(primitiveType, offset, count);
    }
    
    clear = () => {
        this._gl.clearColor(0, 0, 0, 0);
        this._gl.clear(this._gl.COLOR_BUFFER_BIT);
    }
}