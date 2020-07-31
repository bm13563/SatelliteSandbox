export class vao{
    constructor(gl) {
        this._gl = gl;
        this._id = gl.createVertexArray();
        this.vbos = {};
        this.attributeLocations = {};
    }

    addBuffer = (vbo, attribute, type=this._gl.FLOAT, normalized=false, stride=0, offset=0) => {
        const gl = this._gl;
        this.vbos[vbo._id] = vbo;
        this.attributeLocations[vbo._id] = attribute;
        gl.bindVertexArray(this._id);
        gl.enableVertexAttribArray(attribute);
        gl.vertexAttribPointer(attribute, vbo.dimension, type, normalized, stride, offset);
    }

    getAttributeFromBuffer = (vbo) => {
        return this.attributeLocations[vbo._id];
    }
}