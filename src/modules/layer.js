import {Map, View} from 'ol';
import MousePosition from 'ol/control/MousePosition';
import {createStringXY} from 'ol/coordinate';
import {defaults as defaultControls} from 'ol/control';
import * as twgl from 'twgl.js';

// "layers" are different to those in native openlayers. each "layer" needs to have it's own
// canvas for opengl to read from. this class creates a "layer" with it's own canvas from
// an openlayers layer. layers will be synced as long as the same view is used
export class LayerObject{
    constructor(olLayer, olView) {
        this.type = 'layerObject';
        this.olLayer = olLayer;
        this.olView = olView;
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
        // add mouse location 
        const mousePositionControl = new MousePosition({
            coordinateFormat: createStringXY(4),
            projection: 'EPSG:3857',
            undefinedHTML: '&nbsp;',
        });

        const map = new Map({
            controls: defaultControls().extend([mousePositionControl]),
            target: this.container,
            layers: [this.olLayer],
            view: this.olView,
        });
        map.getView().setZoom(15);
        // render the map without animation - prevents artifacts and reduces gpu overhead
        this.olLayer.getSource().tileOptions.transition = 0;
        // layers are not requested until they are used -> saves requests
        this.olLayer.setVisible(false);
        this.olMap = map;
    }
}