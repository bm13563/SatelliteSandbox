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
            const fbo = twgl.createFramebufferInfo(gl, [{
                width: 600,
                height: 500,
                target: gl.TEXTURE_2D,
                format: gl.RGBA,
                min: gl.NEAREST,
                max: gl.NEAREST,
                wrap: gl.CLAMP_TO_EDGE
            }], 600, 500);
            framebuffers.push(fbo);
        }
        return framebuffers;
    }

    renderPseudoLayer = (pseudolayer) => {       
        if (Object.keys(pseudolayer.layers).length === 1) {
            this._runSingleSource(pseudolayer);
        } else {
            this._runMultipleSources(pseudolayer);
        }
    }

    _runSingleSource = (pseudolayer) => {
        const source = pseudolayer.layers[0].container.querySelector("canvas");
        var textureID = twgl.createTexture(this.gl, {
            src: source,
        });
        const framebuffers = this._createFramebuffers();
        for (let x = 0; x < Object.keys(pseudolayer.shaders).length; x++) {
            const passProgram = pseudolayer.shaders[x];
            this.gl.useProgram(passProgram.program);
            const currentFramebuffer = framebuffers[x % 2];
            this._startRendering(
                textureID, 
                pseudolayer.uniforms[x],
                passProgram, 
                currentFramebuffer
            );
            var textureID = currentFramebuffer.attachments[0];
        };
        this._runFinalProgram(textureID);
    }

    _runMultipleSources = () => {
        var ben = 1;
    }

    _runFinalProgram = (textureID) => {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.gl.useProgram(this.finalProgram.program);
        this._startRendering(
            textureID, 
            {}, 
            this.finalProgram,
        );
    }

    _startRendering = (tex, inputUniform, programInfo, currentFramebuffer) => {
        const gl = this.gl;
        if (programInfo === this.finalProgram) {
            var textureUniform = { 'f_image': tex }
        } else {
            var textureUniform = { 'u_image': tex }
        }
        requestAnimationFrame(render);
        function render() {
            twgl.resizeCanvasToDisplaySize(gl.canvas);
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

            const quadVertices = twgl.primitives.createXYQuadBufferInfo(gl);
            twgl.setBuffersAndAttributes(gl, programInfo, quadVertices);

            gl.useProgram(programInfo.program);
            twgl.setUniforms(programInfo, inputUniform);
            twgl.setUniforms(programInfo, textureUniform);
            twgl.bindFramebufferInfo(gl, currentFramebuffer);
            twgl.drawBufferInfo(gl, quadVertices, gl.TRIANGLES);
        }
    }

    generatePseudoLayer = (args) => {
        const _layers = args.layers;
        const _shaders = args.shaders;
        const _uniforms = args.uniforms;
        const _compiledShaders = {};
        for (const key of Object.keys(_shaders)) {
            var compiledShader = this._compileShaders(_shaders[key]);
            _compiledShaders[key] = compiledShader;
        }
        return new PseudoLayer(_layers, _compiledShaders, _uniforms);
    }
}