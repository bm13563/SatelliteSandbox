import * as twgl from 'twgl.js';
import { PseudoLayer } from './pseudolayer.js';
import {unByKey} from 'ol/Observable';
import { ShaderPassEvent } from './events.js'

// a class representing the canvas to which webgl should render
// contains hard-coded shaders for rendering a pseudo layer "as is", and for flipping an image
// also contains state that controls how often the canvas can be rendered to -> prevents rendering before current pseudolayer is rendered
// uses twgl which makes everyone's life a million times easier. https://twgljs.org/docs/.
export class WebGLCanvas{
    constructor(canvas) {
        // restricts the framerate to a maximum of this value. will probably bounce back off canvas ready events
        this.frameLimiter = 1000/100;
        // whether the canvas is ready to rendered to. if false, pseudolayer will not be rendered, since the canvas is currently rendering a different
        // pseudolayer. allows textures and framebuffers from current pseudolayer to be removed, preventing memory issues
        this._canvasReady = true;
        // tracks how many shader passes have been done while rendering this pseudolayer. each pseudolayer has a predefined number of shader passes
        // that need to be completed to render it. once this number is reached, we know all data that needs to has gone to the gpu, and we can
        // start rendering a new layer. if updates with "set", will check how many shader passes have completed.
        this._requiredShaderPasses = 0;
        this._shaderPassEvent = new ShaderPassEvent(this._checkIfShaderPassesFinished);
        // webgl context
        this.gl = twgl.getContext(document.getElementById(canvas));
        // height and width of the webgl canvas
        this._width = this.gl.canvas.width;
        this._height = this.gl.canvas.height;
        // base vertex shader, with position and texture quads. stored for use in other shader programs, as these only require fragment shader
        let baseVertexShader = "#version 300 es\r\n\r\nin vec2 position;\r\nin vec2 texcoord;\r\n\r\nout vec2 o_texCoord;\r\n\r\nvoid main() {\r\n   gl_Position = vec4(position, 0, 1);\r\n   o_texCoord = texcoord;\r\n}";
        this._baseVertexShader = baseVertexShader;
        // flips the output, for converting from texture coordinates to clip coordinates
        let vFlipVertexShader = "#version 300 es\r\n\r\nin vec2 position;\r\nin vec2 texcoord;\r\n\r\nout vec2 o_texCoord;\r\n\r\nvoid main() {\r\n   gl_Position = vec4(position.x, position.y * -1.0, 0, 1);\r\n   o_texCoord = texcoord;\r\n}";
        // base fragment shader, for rendering a pseudolayer "as is"
        let baseFragmentShader = "#version 300 es\r\nprecision mediump float;\r\n\r\nin vec2 o_texCoord;\r\n\r\nuniform sampler2D f_image;\r\n\r\nout vec4 o_colour;\r\n\r\nvoid main() {\r\n   o_colour = texture(f_image, o_texCoord);\r\n}";
        // the base program. pre-compiled as used for every pseudolayer
        this._baseProgram = twgl.createProgramInfo(this.gl, [baseVertexShader, baseFragmentShader]);
        // the vertical flip program. pre-compiled as used for every pseudolayer
        this._vFlipProgram = twgl.createProgramInfo(this.gl, [vFlipVertexShader, baseFragmentShader]);
        // key = id of the pseudolayer, value = framebuffer containing the pseudolayer. allows multiple effects to be stacked
        this._framebufferTracker = {};
        // all textures, framebuffers, renderbuffers, arraybuffers and elementarraybuffers relating to each pseudolayer. allows these to be deleted once
        // a pseudolayer has been rendered, preventing memory issues.
        this._cleanupTracker = {_textures: [], _framebuffers: [], _renderbuffers: [], _arrayBuffers: [], _elementArrayBuffers: []};
        // the base openlayers maps for each layer. allows these to be made visible when needed
        this._mapsUsed = [];
        // the current events bound to the exiting pseudolayer
        this._canvasEvents = [];
    }

    // compiles webgl shaders from string
    _compileShaders = (fragmentShader) => {
        return twgl.createProgramInfo(this.gl, [this._baseVertexShader, fragmentShader]);
    }

    // creates a specified number of framebuffers
    _createFramebuffers = (number) => {
        let framebuffers = [];
        for (let x = 0; x < number; x++) {
            let fbo = twgl.createFramebufferInfo(this.gl);
            framebuffers.push(fbo);
            this._cleanupTracker._framebuffers.push(fbo);
            // adding the framebuffer object texture to the textures cleanup collection seems to prevent
            // the gpu memory leak
            this._cleanupTracker._textures.push(fbo.attachments[0]);
            // doesnt seem to have an effect, but for completeness
            this._cleanupTracker._renderbuffers.push(fbo.attachments[1]);
        }
        return framebuffers;
    }

    // generates a texture from an image
    _generateTexture = (source) => {
        let texture = twgl.createTexture(this.gl, {
            src: source,
        });
        this._cleanupTracker._textures.push(texture);
        return texture;
    }

    // method that is called externally. activates the map layers of the current pseudolayer, which renders them to the
    // openlayers canvas. this canvas is then used as a texture input for the base pseudolayer, and processing is added
    // on top of that
    activatePseudolayer = (pseudolayer) => {
        // remove the maps used to render the previous pseudolayer and their handlers
        this.deactivatePseudolayer();
        // set maps used to generate pseudolayer to visible. also fires the postrender event
        for (let x = 0; x < pseudolayer.layers.length; x++) {
            pseudolayer.layers[x].setVisible(true);
            this._mapsUsed.push(pseudolayer.layers[x]);
        }
        // sets the current event handlers. from this point until activatePseudolayer is called again, every frame update
        // attempts to render the pseudolayer. allows for smooth movement of the map
        let frameRender = pseudolayer.maps[pseudolayer.maps.length-1].on("postrender", () => {
            // tries to render the pseudolayer. if the canvas is still in the previous render pass, will return
            // check if the canvas has finished passing all buffers from the previous frame to the gpu. if it hasn't, skip rendering this pseudolayer
            if (this._canvasReady) {
                this._canvasReady = false;
                this._renderPseudoLayer(pseudolayer);
            };
        });
        this._canvasEvents.push(frameRender);
    }

    // should undo all of the state set up by the activatePseudolayer method
    deactivatePseudolayer = () => {
        // set maps previously used to generate pseudolayer to invisible -> prevent unnecessary tile calls
        if (this._mapsUsed.length > 0) {
            for (let x = 0; x < this._mapsUsed.length; x++) {
                this._mapsUsed[x].setVisible(false);
            }
            // empties map array to be written to by the next pseudolayer
            this._mapsUsed = [];
        }
        // remove the current event handler if it exists
        for (let x = 0; x < this._canvasEvents.length; x++) {
            let currentEvent = this._canvasEvents[x];
            unByKey(currentEvent);
        }
        // unbind all references to canvas events
        this._canvasEvents = [];
    }

    clearCanvas = () => {
        // clear the canvas
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    }

    // called by the _shaderPassEvent wheneve a shader pass is completed. checks if all passes are done
    _checkIfShaderPassesFinished = (shaderPasses) => {
        if (shaderPasses === this._requiredShaderPasses) {
            this._cleanUpGpuMemory();
        }
    }

    _cleanUpGpuMemory = () => {
        let numTextureUnits = this.gl.getParameter(this.gl.MAX_TEXTURE_IMAGE_UNITS);
        for (let unit = 0; unit < numTextureUnits; ++unit) {
            this.gl.activeTexture(this.gl.TEXTURE0 + unit);
            this.gl.bindTexture(this.gl.TEXTURE_2D, null);
            this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, null);
        }
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null);
        this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, null);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

        for (let x = 0; x < this._cleanupTracker._framebuffers.length; x++) {
            let framebufferToDelete = this._cleanupTracker._framebuffers[x]
            this.gl.deleteFramebuffer(framebufferToDelete.framebuffer);
        }

        for (let x = 0; x < this._cleanupTracker._renderbuffers.length; x++) {
            let renderBufferToDelete = this._cleanupTracker._renderbuffers[x]
            this.gl.deleteRenderbuffer(renderBufferToDelete);
        }

        for (let x = 0; x < this._cleanupTracker._textures.length; x++) {
            let textureToDelete = this._cleanupTracker._textures[x];
            this.gl.deleteTexture(textureToDelete);
        }

        for (let x = 0; x < this._cleanupTracker._arrayBuffers.length; x++) {
            let bufferToDelete = this._cleanupTracker._arrayBuffers[x];
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, bufferToDelete);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, 1, this.gl.STATIC_DRAW);
            this.gl.deleteBuffer(bufferToDelete);
        }

        for (let x = 0; x < this._cleanupTracker._elementArrayBuffers.length; x++) {
            let bufferToDelete = this._cleanupTracker._elementArrayBuffers[x];
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, bufferToDelete);
            this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, 1, this.gl.STATIC_DRAW);
            this.gl.deleteBuffer(bufferToDelete);
        }

        this._framebufferTracker = {};
        this._cleanupTracker = {_textures: [], _framebuffers: [], _renderbuffers: [], _arrayBuffers: [], _elementArrayBuffers: []};
        this._shaderPassEvent.reset();
        setTimeout(() => {
            this._canvasReady = true;
        }, this.frameLimiter) 
    }

    // renders a pseudo layer with the attached shader applied. reconstructs any child pseudolayers first, stores framebuffers for these
    // children in the framebuffertracker, then uses the framebuffers to apply any processing
    _renderPseudoLayer = (pseudolayer) => {
        this._requiredShaderPasses = pseudolayer.shaderPasses;
        // get all child pseudolayers
        this._recurseThroughChildLayers(pseudolayer, pseudolayer);
        // render the target pseudolayer
        let framebuffer = this._generatePseudoLayer(pseudolayer);
        // flip the output of the current operation
        this._runvFlipProgram(framebuffer.attachments[0]);
    }

    // recurses through the child layers of a pseudolayer to reconstruct all input pseudolayers
    // target pseudolayer needs to be passed, to ensure that the function doesn't try to build
    // the target pseudolayer before the child pseudolayers are completed
    _recurseThroughChildLayers = (thisLayer, originalLayer) => {
        for (let key of Object.keys(thisLayer.inputs)) {
            let nextLayer = thisLayer.inputs[key];
            if (nextLayer.type === "layerObject") {
                if (!(thisLayer.id === originalLayer.id)) {
                    let framebuffer = this._generatePseudoLayer(thisLayer);
                    this._framebufferTracker[thisLayer.id] = framebuffer;
                }
            } else {
                this._recurseThroughChildLayers(nextLayer, originalLayer);
                if (!(thisLayer.id === originalLayer.id)) {
                    let framebuffer = this._generatePseudoLayer(thisLayer);
                    this._framebufferTracker[thisLayer.id] = framebuffer;
                }
            }
        }
    }

    // generates a framebuffer that represents a pseudolayer
    _generatePseudoLayer = (pseudolayer) => {
        let framebuffer = this._createFramebuffers(1)[0];
        let renderInputs = {};
        let inputs = pseudolayer.inputs;
        let renderVariables = pseudolayer.variables;
        let renderShader = pseudolayer.shader;
        for (let key of Object.keys(inputs)) {
            if (inputs[key].type === "layerObject") {
                let textureId = this._generateTexture(inputs[key].container.querySelector("canvas"));
                renderInputs[key] = textureId;
            } else {
                renderInputs[key] = this._framebufferTracker[inputs[key].id].attachments[0];
            }
        }
        this._startRendering(
            renderInputs, 
            renderVariables,
            renderShader, 
            framebuffer
        );
        return framebuffer;
    }

    _runvFlipProgram = (framebufferTexture) => {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this._startRendering(
            {f_image: framebufferTexture}, 
            {}, 
            this._vFlipProgram,
        );
    }

    _startRendering = (inputs, variables, programInfo, currentFramebuffer) => {
        let gl = this.gl;
        let webglCanvas = this;
        requestAnimationFrame(render);

        function render() {
            twgl.resizeCanvasToDisplaySize(gl.canvas);
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

            const quadVertices = twgl.primitives.createXYQuadBufferInfo(gl);
            webglCanvas._cleanupTracker._arrayBuffers.push(quadVertices.attribs.normal.buffer);
            webglCanvas._cleanupTracker._arrayBuffers.push(quadVertices.attribs.position.buffer);
            webglCanvas._cleanupTracker._arrayBuffers.push(quadVertices.attribs.texcoord.buffer);
            webglCanvas._cleanupTracker._elementArrayBuffers.push(quadVertices.indices);
            twgl.setBuffersAndAttributes(gl, programInfo, quadVertices);

            gl.useProgram(programInfo.program);
            twgl.setUniforms(programInfo, inputs);
            twgl.setUniforms(programInfo, variables);
            twgl.bindFramebufferInfo(gl, currentFramebuffer);

            twgl.drawBufferInfo(gl, quadVertices, gl.TRIANGLES);
            webglCanvas._shaderPassEvent.increment();
        }
    }

    generatePseudoLayer = (layer) => {
        return new PseudoLayer(
            "baseProgram",
            {f_image: layer},
            this._baseProgram,
            {},
        )
    }

    // edited to only allow one shader program to be passed at a time
    processPseudoLayer = (args) => {
        let dynamicShader = this._addDynamicsToShader(args.shader, args.dynamics);
        let compiledShader = this._compileShaders(dynamicShader);
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
}