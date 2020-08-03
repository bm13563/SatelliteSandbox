import * as twgl from 'twgl.js';

export class WebGLCanvas{
    constructor(canvas, vertexShader, finalvertex, finalFragment) {
        this.gl = twgl.getContext(document.getElementById(canvas));
        this.vertexShader = vertexShader;
        this.finalProgram = twgl.createProgramInfo(this.gl, [finalvertex, finalFragment])
        this.activeLayers = [];
        this.targetCanvases = [];
        this.programs = [];
    }

    compileShaders = (fragmentShader) => {
        const gl = this.gl;
        this.programs.push(twgl.createProgramInfo(gl, [this.vertexShader, fragmentShader]));
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

    activateLayer = (layer) => {
        if (this.activeLayers.includes(layer)) {
            return;
        }
        this.activeLayers.push(layer);
        for (let x = 0; x < layer.activeShaders.length; x++) {
            this.compileShaders(layer.activeShaders[x]);
        }
    }

    activateLayers = (layers) => {
        for (let x = 0; x < layers.length; x++) {
            const layer = layers[x];
            if (this.activeLayers.includes(layer)) {
                return;
            }
            this.activeLayers.push(layer);
            for (let y = 0; y < layer.activeShaders.length; y++) {
                this.compileShaders(layer.activeShaders[y]);
            }
        }
    }

    runAttachedPrograms = (args) => {
        const sources = this.activeLayers.length;
        const passes = this.programs.length;
        if (sources === 1) {
            this._runSingleSource(args, passes);
        } else {
            this._runMultipleSources(args, passes, sources);
        }
    }

    _runSingleSource = (args, passes) => {
        const source = this.activeLayers[0].container.querySelector("canvas");
        var textureID = twgl.createTexture(this.gl, {
            src: source,
        });
        const framebuffers = this._createFramebuffers();
        for (let x = 0; x < passes; x++) {
            const passProgram = this.programs[x];
            this.gl.useProgram(passProgram.program);
            const currentFramebuffer = framebuffers[x % 2];
            this.startRendering(
                textureID, 
                args[x].uniforms,
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
        this.startRendering(
            textureID, 
            {}, 
            this.finalProgram,
        );
    }

    startRendering = (tex, inputUniform, programInfo, currentFramebuffer) => {
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
}