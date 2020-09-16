import {Map, View} from 'ol';
import * as twgl from 'twgl.js';

// "layers" are different to those in native openlayers. each "layer" needs to have it's own
// canvas for opengl to read from. this class creates a "layer" with it's own canvas from
// an openlayers layer. layers will be synced as long as the same view is used
export class LayerObject{
    constructor(olLayer, olView, bufferValue) {
        this.type = 'layerObject';
        this.olLayer = olLayer;
        this.olView = olView;
        this.bufferValue = bufferValue;
        this.mapOrderId = parseInt(this.olLayer.ol_uid);
        this.containerId = Date.now() + (Math.floor(Math.random() * 1000000));
        this.container;
        this.olMap;
        this.shaders = {};
        this.activeShader;
        this._createCanvasElement();
        this._createMap();
    }

    _createCanvasElement = () => {
        // get the container for the tile elements, pass the size of the container to apply buffer to the canvas container
        const container = document.getElementById("tile_container");
        const boundingRect = container.getBoundingClientRect();
        // return the size of the "buffered" bounding rectangle
        const bufferedBoundingRect = this._applyBufferToWebglCanvas(boundingRect);
        // create a div to attach the new layer to
        const div = document.createElement("div");
        div.classList.add("layer_object");
        div.setAttribute("id", this.containerId);
        div.width = bufferedBoundingRect.width;
        div.height = bufferedBoundingRect.height;
        div.style.width = `${div.width}px`;
        div.style.height = `${div.height}px`;
        div.style.marginLeft = `-${(this.bufferValue*100 - 100) / 2}%`;
        div.style.marginTop = `-${((this.bufferValue*100 - 100) / 2) * (bufferedBoundingRect.height / bufferedBoundingRect.width)}%`;
        div.style.position = "absolute";
        div.style.zIndex = `${parseInt(this.olLayer.ol_uid)}`;
        container.appendChild(div);
        this.container = div;
        this.activeShaders = [];
    }

    // apply a buffer area around the viewport to cache adjacent tiles
    _applyBufferToWebglCanvas = (boundingRect) => {
        const canvasContainer = document.getElementById("canvas_map");
        canvasContainer.style.width = `${this.bufferValue*100}%`;
        canvasContainer.style.height = `${this.bufferValue*100}%`;
        canvasContainer.style.marginLeft = `-${(this.bufferValue*100 - 100) / 2}%`;
        // need to factor in aspect ratio as seems to use percentage of element width
        canvasContainer.style.marginTop = `-${((this.bufferValue*100 - 100) / 2) * (boundingRect.height / boundingRect.width)}%`;
        return canvasContainer.getBoundingClientRect();
    }

    _createMap = () => {
        const map = new Map({
            maxTilesLoading: 6,
            target: this.container,
            layers: [this.olLayer],
            view: this.olView,
        });
        map.getView().setZoom(12);
        // render the map without animation - prevents artifacts and reduces gpu overhead
        this.olLayer.getSource().tileOptions.transition = 0;
        // layers are not requested until they are used -> saves requests
        this.olLayer.setVisible(false);
        this.olMap = map;
    }

    // _preventCachedTilesBeingRequested = () => {

    // }
}