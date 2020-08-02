import * as twgl from 'twgl.js';

export class WebGLObject{
    constructor(canvas, vertexShader, fragmentShader) {
        this.gl = twgl.getContext(document.getElementById(canvas));
        this.programInfo;
        this.compileShaders(vertexShader, fragmentShader);
        this.texture;
        this.create
    }

    compileShaders = (vertexShader, fragmentShader) => {
        const gl = this.gl;
        this.programInfo = twgl.createProgramInfo(gl, [vertexShader, fragmentShader]);
    }

    renderImage = (source) => {
        const gl = this.gl;
        const tex = twgl.createTexture(gl, {
            src: source,
        });
        this.startRendering(source, tex);
    }

    startRendering = (img, tex) => {
        const gl = this.gl;
        const programInfo = this.programInfo;
        requestAnimationFrame(render);
        function render() {
            const quadVertices = twgl.primitives.createXYQuadBufferInfo(gl);
            const uniforms = {
                u_image: tex,
            }
            twgl.resizeCanvasToDisplaySize(gl.canvas);
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
            gl.useProgram(programInfo.program);
            twgl.setBuffersAndAttributes(gl, programInfo, quadVertices);
            twgl.setUniforms(programInfo, uniforms);
            twgl.drawBufferInfo(gl, quadVertices, gl.TRIANGLES);
        }
    }
}