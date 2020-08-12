import * as twgl from 'twgl.js';
import { PseudoLayer } from './pseudolayer.js';
import {unByKey} from 'ol/Observable';

// a class representing the canvas to which webgl should render to
// contains hard-coded "final shaders" to render an unaltered image from a framebuffer, always used for the final shader pass
// a framebuffer is always used -> even if a single shader is being applied, still goes through a framebuffer, then through final shaders
// framebuffer tracker is essentially a global variable, used for reconstructing and using pseudolayers in further processing
export class WebGLCanvas{
    constructor(canvas) {
        this.gl = twgl.getContext(document.getElementById(canvas));
        this.width = this.gl.canvas.width;
        this.height = this.gl.canvas.height;
        var baseVertexShader = "#version 300 es\r\n\r\nin vec2 position;\r\nin vec2 texcoord;\r\n\r\nout vec2 o_texCoord;\r\n\r\nvoid main() {\r\n   gl_Position = vec4(position, 0, 1);\r\n   o_texCoord = texcoord;\r\n}";
        var vFlipVertexShader = "#version 300 es\r\n\r\nin vec2 position;\r\nin vec2 texcoord;\r\n\r\nout vec2 o_texCoord;\r\n\r\nvoid main() {\r\n   gl_Position = vec4(position.x, position.y * -1.0, 0, 1);\r\n   o_texCoord = texcoord;\r\n}";
        var baseFragmentShader = "#version 300 es\r\nprecision mediump float;\r\n\r\nin vec2 o_texCoord;\r\n\r\nuniform sampler2D f_image;\r\n\r\nout vec4 o_colour;\r\n\r\nvoid main() {\r\n   o_colour = texture(f_image, o_texCoord);\r\n}";
        this.baseVertexShader = baseVertexShader;
        this.baseProgram = twgl.createProgramInfo(this.gl, [baseVertexShader, baseFragmentShader]);
        this.vFlipProgram = twgl.createProgramInfo(this.gl, [vFlipVertexShader, baseFragmentShader]);
        this.framebufferTracker = {};
        this.shaderPasses = 0;
        this.frameTracker = 0;
        this.mapsUsed = [];
        this.currentEvent = false;
    }

    // compiles webgl shaders from string
    _compileShaders = (fragmentShader) => {
        const gl = this.gl;
        return twgl.createProgramInfo(gl, [this.baseVertexShader, fragmentShader]);
    }

    // creates a specified number of framebuffers
    _createFramebuffers = (number) => {
        const gl = this.gl;
        let framebuffers = [];
        for (let x = 0; x < number; x++) {
            const fbo = twgl.createFramebufferInfo(gl);
            framebuffers.push(fbo);
        }
        return framebuffers;
    }

    // generates a texture from an image
    _generateTexture = (source) => {
        return twgl.createTexture(this.gl, {
            src: source,
        });
    }

    // cant guarantee that webgl object will be garbage collected
    _deleteTexturesFromGpu = (textures) => {
        for (const key of Object.keys(textures)) {
            this.gl.deleteTexture(textures[key]);
        };
    }

    // cant guarantee that webgl object will be garbage collected
    _deleteFramebuffersFromGpu = () => {
        for (const key of Object.keys(this.framebufferTracker)) {
            twgl.bindFramebufferInfo(false);
            this.gl.deleteFramebuffer(this.framebufferTracker[key]);
        }; 
    }

    // renders a pseudo layer with the attached shader applied. reconstructs any child pseudolayers first, stores framebuffers for these
    // children in the framebuffertracker, then uses the framebuffers to apply any processing
    _renderPseudoLayer = (pseudolayer) => {
        this.shaderPasses = 0;
        // get all child pseudolayers
        this._recurseThroughChildLayers(pseudolayer, pseudolayer);
        // render the target pseudolayer
        const framebufferTexture = this._generatePseudoLayer(pseudolayer);
        // flip the output of the current operation
        this._runvFlipProgram(framebufferTexture);
        this.framebufferTracker = {};
        this._deleteFramebuffersFromGpu();
    }

    // recurses through the child layers of a pseudolayer to reconstruct all input pseudolayers
    // target pseudolayer needs to be passed, to ensure that the function doesn't try to build
    // the target pseudolayer before the child pseudolayers are completed
    _recurseThroughChildLayers = (thisLayer, originalLayer) => {
        for (const key of Object.keys(thisLayer.inputs)) {
            const nextLayer = thisLayer.inputs[key];
            if (nextLayer.type === "layerObject") {
                const framebufferTexture = this._generatePseudoLayer(thisLayer);
                this.framebufferTracker[thisLayer.id] = framebufferTexture;
            } else {
                this._recurseThroughChildLayers(nextLayer, originalLayer);
                if (!(thisLayer.id === originalLayer.id)) {
                    const framebufferTexture = this._generatePseudoLayer(thisLayer);
                    this.framebufferTracker[thisLayer.id] = framebufferTexture;
                }
            }
        }
    }

    // generates a framebuffer that represents a pseudolayer
    _generatePseudoLayer = (pseudolayer) => {
        const framebuffer = this._createFramebuffers(1)[0];
        const renderInputs = {};
        const inputs = pseudolayer.inputs;
        const renderVariables = pseudolayer.variables;
        const renderShader = pseudolayer.shader;
        for (const key of Object.keys(inputs)) {
            if (inputs[key].type === "layerObject") {
                const textureId = this._generateTexture(inputs[key].container.querySelector("canvas"));
                renderInputs[key] = textureId;
            } else {
                renderInputs[key] = this.framebufferTracker[inputs[key].id];
            }
        }
        this._startRendering(
            renderInputs, 
            renderVariables,
            renderShader, 
            framebuffer
        );
        var framebufferTexture = framebuffer.attachments[0];
        return framebufferTexture;
    }

    _runvFlipProgram = (framebufferTexture) => {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.gl.useProgram(this.vFlipProgram.program);
        this._startRendering(
            {f_image: framebufferTexture}, 
            {}, 
            this.vFlipProgram,
        );
    }

    _startRendering = (inputs, variables, programInfo, currentFramebuffer) => {
        const gl = this.gl;
        const deleteGPUTextures = this._deleteTexturesFromGpu;
        this.shaderPasses++;
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
            deleteGPUTextures(inputs);
        }
    }

    generatePseudoLayer = (layer) => {
        return new PseudoLayer(
            "baseProgram",
            {f_image: layer},
            this.baseProgram,
            {},
        )
    }

    // edited to only allow one shader program to be passed at a time
    processPseudoLayer = (args) => {
        const dynamicShader = this._addDynamicsToShader(args.shader, args.dynamics);
        const compiledShader = this._compileShaders(dynamicShader);
        return new PseudoLayer(args.shaderName, args.inputs, compiledShader, args.variables);
    }

    _addDynamicsToShader = (shader, dynamics) => {
        if (dynamics === {}) {
            return shader;
        } else {
            for (const key of Object.keys(dynamics)) {
                const regex = new RegExp("{" + key + "}", "g");
                shader = shader.replace(regex, dynamics[key].toString());
            }
        }
        return shader;
    }

    renderPseudoLayer = (pseudolayer, throttle) => {
        this.stopRendering();
        // set maps used to generate pseudolayer to visible
        for (let x = 0; x < pseudolayer.layers.length; x++) {
            pseudolayer.layers[x].setVisible(true);
            this.mapsUsed.push(pseudolayer.layers[x]);
        }
        // sets the current event handler
        this.currentEvent = pseudolayer.maps[pseudolayer.maps.length-1].on("postrender", () => {
            if (this.frameTracker % throttle === 0) {
                this._renderPseudoLayer(pseudolayer);
            }
            this.frameTracker++;
        });
    }

    stopRendering = () => {
        // set maps previously used to generate pseudolayer to invisible -> prevent unnecessary tile calls
        if (this.mapsUsed.length > 0) {
            for (let x = 0; x < this.mapsUsed.length; x++) {
                this.mapsUsed[x].setVisible(false);
            }
            this.mapsUsed = [];
        }
        // remove the current event handler if it exists
        if (this.currentEvent) {
            this.frameTracker = 0;
            unByKey(this.currentEvent);
            this.currentEvent = false;
        }
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    }
}