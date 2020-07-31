export class vbo{
    constructor(gl, data, dimensions, type) {
        this._gl = gl;
        this.dimension = dimensions;
        this._type = (type == null && gl.STATIC_DRAW);
        this._id = gl.createBuffer();
        this.vbos = {};
        this.bindData(data);
    }

    bindData = (data) => {
        const gl = this._gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, this._id);
        gl.bufferData(gl.ARRAY_BUFFER, data, this._type);
    }
}