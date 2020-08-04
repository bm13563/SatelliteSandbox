import * as twgl from 'twgl.js';
import { PseudoLayer } from './pseudolayer.js';

export class WebGLCanvas{
    constructor(canvas, vertexShader) {
        this.gl = twgl.getContext(document.getElementById(canvas));
        this.vertexShader = vertexShader;
        var finalVertex = "#version 300 es\r\n\r\nin vec2 position;\r\nin vec2 texcoord;\r\n\r\nout vec2 o_texCoord;\r\n\r\nvoid main() {\r\n   gl_Position = vec4(position.x, position.y * -1.0, 0, 1);\r\n   o_texCoord = texcoord;\r\n}";
        var finalFragment = "#version 300 es\r\nprecision mediump float;\r\n\r\nin vec2 o_texCoord;\r\n\r\nuniform sampler2D f_image;\r\n\r\nout vec4 o_colour;\r\n\r\nvoid main() {\r\n   o_colour = texture(f_image, o_texCoord);\r\n}";
        this.finalProgram = twgl.createProgramInfo(this.gl, [finalVertex, finalFragment])
    }

    _compileShaders = (fragmentShader) => {
        const gl = this.gl;
        return twgl.createProgramInfo(gl, [this.vertexShader, fragmentShader]);
    }

    _createFramebuffers = () => {
        const gl = this.gl;
        const framebuffers = [];
        for (let x = 0; x < 2; x++) {
            const fbo = twgl.createFramebufferInfo(gl);
            framebuffers.push(fbo);
        }
        return framebuffers;
    }

    _generateTexture = (source) => {
        return twgl.createTexture(this.gl, {
            src: source,
        });
    }

    renderPseudoLayer = (pseudolayer) => {       
        const framebuffers = this._createFramebuffers();
        for (let x = 0; x < Object.keys(pseudolayer.shaders).length; x++) {
            const inputs = {}
            for (const key of Object.keys(pseudolayer.inputs[x])) {
                if (pseudolayer.inputs[x][key]) {
                    var textureId = this._generateTexture(pseudolayer.inputs[x][key].container.querySelector("canvas"));
                    inputs[key] = textureId;
                } else {
                    inputs[key] = framebufferTexture;
                }
            }
            const passProgram = pseudolayer.shaders[x];
            const currentFramebuffer = framebuffers[x % 2];
            this._startRendering(
                inputs, 
                pseudolayer.variables[x],
                passProgram, 
                currentFramebuffer
            );
            var framebufferTexture = currentFramebuffer.attachments[0];
        };
        this._runFinalProgram(framebufferTexture);
    }

    _runFinalProgram = (framebufferTexture) => {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.gl.useProgram(this.finalProgram.program);
        this._startRendering(
            {f_image: framebufferTexture}, 
            {}, 
            this.finalProgram,
        );
    }

    _startRendering = (inputs, variables, programInfo, currentFramebuffer) => {
        const gl = this.gl;
        requestAnimationFrame(render);
        function render() {
            twgl.resizeCanvasToDisplaySize(gl.canvas);
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

            const quadVertices = twgl.primitives.createXYQuadBufferInfo(gl);
            twgl.setBuffersAndAttributes(gl, programInfo, quadVertices);

            gl.useProgram(programInfo.program);
            twgl.setUniforms(programInfo, inputs);
            twgl.setUniforms(programInfo, variables);
            twgl.bindFramebufferInfo(gl, currentFramebuffer);
            twgl.drawBufferInfo(gl, quadVertices, gl.TRIANGLES);
        }
    }

    generatePseudoLayer = (args) => {
        const inputs = args.inputs;
        const shaders = args.shaders;
        const variables = args.variables;
        const compiledShaders = {};
        for (const key of Object.keys(shaders)) {
            var compiledShader = this._compileShaders(shaders[key]);
            compiledShaders[key] = compiledShader;
        }
        return new PseudoLayer(inputs, compiledShaders, variables);
    }
}