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
        this.cleanupTracker = {textures: [], framebuffers: [], renderbuffers: [], arrayBuffers: [], elementArrayBuffers: []};
        this.shaderPassTracker = [];
        this.canvasReady = true;
        this.mapsUsed = [];
        this.currentEvent = false;
    }

    // compiles webgl shaders from string
    _compileShaders = (fragmentShader) => {
        let gl = this.gl;
        return twgl.createProgramInfo(gl, [this.baseVertexShader, fragmentShader]);
    }

    // creates a specified number of framebuffers
    _createFramebuffers = (number) => {
        let gl = this.gl;
        let framebuffers = [];
        for (let x = 0; x < number; x++) {
            let fbo = twgl.createFramebufferInfo(gl);
            framebuffers.push(fbo);
            this.cleanupTracker.framebuffers.push(fbo);
            // adding the framebuffer object texture to the textures cleanup collection seems to prevent
            // the gpu memory leak
            this.cleanupTracker.textures.push(fbo.attachments[0]);
            // doesnt seem to have an effect, but for completeness
            this.cleanupTracker.renderbuffers.push(fbo.attachments[1]);
        }
        return framebuffers;
    }

    // generates a texture from an image
    _generateTexture = (source) => {
        let texture = twgl.createTexture(this.gl, {
            src: source,
        });
        this.cleanupTracker.textures.push(texture);
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
            this.mapsUsed.push(pseudolayer.layers[x]);
        }
        // sets the current event handlers. from this point until renderPseudoLayer is called again, every frame update
        // attempts to render the pseudolayer
        this.currentEvent = pseudolayer.maps[pseudolayer.maps.length-1].on("postrender", () => {
            // tries to render the pseudolayer. if the canvas is still in the previous render pass, will return
            this._renderPseudoLayer(pseudolayer);
        });
    }

    // should undo all of the state set up by the activatePseudolayer method
    deactivatePseudolayer = () => {
        // set maps previously used to generate pseudolayer to invisible -> prevent unnecessary tile calls
        if (this.mapsUsed.length > 0) {
            for (let x = 0; x < this.mapsUsed.length; x++) {
                this.mapsUsed[x].setVisible(false);
            }
            // empties map array to be written to by the next pseudolayer
            this.mapsUsed = [];
        }
        // remove the current event handler if it exists
        if (this.currentEvent) {
            this.frameTracker = 0;
            unByKey(this.currentEvent);
            this.currentEvent = false;
        }
        // clear the canvas
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    }

        // renders a pseudo layer with the attached shader applied. reconstructs any child pseudolayers first, stores framebuffers for these
    // children in the framebuffertracker, then uses the framebuffers to apply any processing
    _renderPseudoLayer = (pseudolayer) => {
        // check if the canvas has finished passing all buffers from the previous frame to the gpu. if it hasn't, skip this rendering
        // frame. only happens when the map is updated extremely rapidly. can potentially cause an issue where the last action isn't
        // seen but edge case. may look for a workaround
        if (!(this.canvasReady)) {
            console.log("not ready to render, returning")
            return;
        }
        // set the canvas as unavailable for rendering
        this.canvasReady = false;
        // get all child pseudolayers
        this._recurseThroughChildLayers(pseudolayer, pseudolayer);
        // render the target pseudolayer
        let framebuffer = this._generatePseudoLayer(pseudolayer);
        // flip the output of the current operation
        this._runvFlipProgram(framebuffer.attachments[0]);
        this._tidyUp(pseudolayer);
    }

    // cant guarantee that webgl object will be garbage collected -> was having an issue where 
    // if textures and framebuffers weren't unbound after draw call, they weren't being garbage collected
    // which caused memory errors. next 2 functions are the solution to this. checks whether the shader has
    // done all of it's passes (as asynchronous, need to check for this otherwise unbinding happens before
    // some shader passses have finished, which means the textures and framebuffers cant be bound during draw call). once
    // all of the passes have been done, unbinds and deletes all textures and framebuffers, clears global
    // variables and resets the shader pass counter
    _tidyUp = (pseudolayer) => {
        let shaderPassTracker = this.shaderPassTracker;
        let cleanUpGpuMemory = this._cleanUpGpuMemory;

        setTimeout(waitForResult);

        function waitForResult() {
            if (shaderPassTracker.length === pseudolayer.shaderPasses) {
                cleanUpGpuMemory();
            } else {
                setTimeout(waitForResult);
            }
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

        for (let x = 0; x < this.cleanupTracker.framebuffers.length; x++) {
            let framebufferToDelete = this.cleanupTracker.framebuffers[x]
            this.gl.deleteFramebuffer(framebufferToDelete.framebuffer);
        }

        for (let x = 0; x < this.cleanupTracker.renderbuffers.length; x++) {
            let renderBufferToDelete = this.cleanupTracker.renderbuffers[x]
            this.gl.deleteRenderbuffer(renderBufferToDelete);
        }

        for (let x = 0; x < this.cleanupTracker.textures.length; x++) {
            let textureToDelete = this.cleanupTracker.textures[x];
            this.gl.deleteTexture(textureToDelete);
        }

        for (let x = 0; x < this.cleanupTracker.arrayBuffers.length; x++) {
            let bufferToDelete = this.cleanupTracker.arrayBuffers[x];
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, bufferToDelete);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, 1, this.gl.STATIC_DRAW);
            this.gl.deleteBuffer(bufferToDelete);
        }

        for (let x = 0; x < this.cleanupTracker.elementArrayBuffers.length; x++) {
            let bufferToDelete = this.cleanupTracker.elementArrayBuffers[x];
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, bufferToDelete);
            this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, 1, this.gl.STATIC_DRAW);
            this.gl.deleteBuffer(bufferToDelete);
        }

        this.framebufferTracker = {};
        this.cleanupTracker = {textures: [], framebuffers: [], renderbuffers: [], arrayBuffers: [], elementArrayBuffers: []};
        this.shaderPassTracker = [];
        this.canvasReady = true;
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
                    this.framebufferTracker[thisLayer.id] = framebuffer;
                }
            } else {
                this._recurseThroughChildLayers(nextLayer, originalLayer);
                if (!(thisLayer.id === originalLayer.id)) {
                    let framebuffer = this._generatePseudoLayer(thisLayer);
                    this.framebufferTracker[thisLayer.id] = framebuffer;
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
                renderInputs[key] = this.framebufferTracker[inputs[key].id].attachments[0];
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
        this.gl.useProgram(this.vFlipProgram.program);
        this._startRendering(
            {f_image: framebufferTexture}, 
            {}, 
            this.vFlipProgram,
        );
    }

    _startRendering = (inputs, variables, programInfo, currentFramebuffer) => {
        let gl = this.gl;
        let shaderPassTracker = this.shaderPassTracker;
        let cleanupTracker = this.cleanupTracker;
        requestAnimationFrame(render);

        function render() {
            twgl.resizeCanvasToDisplaySize(gl.canvas);
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

            const quadVertices = twgl.primitives.createXYQuadBufferInfo(gl);
            cleanupTracker.arrayBuffers.push(quadVertices.attribs.normal.buffer);
            cleanupTracker.arrayBuffers.push(quadVertices.attribs.position.buffer);
            cleanupTracker.arrayBuffers.push(quadVertices.attribs.texcoord.buffer);
            cleanupTracker.elementArrayBuffers.push(quadVertices.indices);
            twgl.setBuffersAndAttributes(gl, programInfo, quadVertices);

            gl.useProgram(programInfo.program);
            twgl.setUniforms(programInfo, inputs);
            twgl.setUniforms(programInfo, variables);
            twgl.bindFramebufferInfo(gl, currentFramebuffer);

            shaderPassTracker.push(true);
            twgl.drawBufferInfo(gl, quadVertices, gl.TRIANGLES);
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