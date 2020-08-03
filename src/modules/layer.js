import {Map, View} from 'ol';
import * as twgl from 'twgl.js';

// "layers" are different to in native openlayers. each "layer" needs to have it's own
// canvas for opengl to read from. this class creates a "layer" with it's own canvas from
// an openlayers layer. layers will be synced as long as the same view is used
export class LayerObject{
    constructor(olLayer, olView) {
        this.olLayer = olLayer;
        this.olView = olView;
        this.containerId = Date.now() + (Math.floor(Math.random() * 1000000));
        this.container;
        this._createCanvasElement();
        this.olMap;
        this._createMap();
        this.shaders = {};
        this.activeShader;
    }

    _createCanvasElement = () => {
        const container = document.getElementById("tile_container");
        const boundingRect = container.getBoundingClientRect();
        const div = document.createElement("div");
        div.classList.add("layer_object");
        div.setAttribute("id", this.containerId);
        div.width = boundingRect.width;
        div.height = boundingRect.height;
        div.style.width = `${div.width}px`
        div.style.height = `${div.height}px`
        div.style.position = "absolute";
        div.style.top = "0px";
        div.style.zIndex = `${parseInt(this.olLayer.ol_uid)}`;
        container.appendChild(div);
        this.container = div;
        this.activeShaders = [];
    }

    _createMap = () => {
        const map = new Map({
            target: this.container,
            layers: [this.olLayer],
            view: this.olView,
        });
        this.olMap = map;
    }

    addShader = (shader) => {
        this.activeShaders.push(shader);
    }

    addShaders = (shaders) => {
        for (let x = 0; x < this.shaders.length; x++) {
            this.activeShaders.push(shaders[x]);
        }
    }

    removeShader = (shader) => {
        this.activeShaders.filter(item => item !== shader)
    }

    removeShaders = () => {
        this.activeShaders = [];
    }

}