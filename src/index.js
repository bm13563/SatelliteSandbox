import "../node_modules/ol/ol.css";
import "./styles/page.css";

import {Map, View} from 'ol';
import TileLayer from 'ol/layer/Tile';
import TileWMS from 'ol/source/TileWMS';

import {LayerObject} from './modules/layer.js';
import {WebGLCanvas} from './modules/webgl.js';
import * as util from './modules/utils.js'

import changeRGB from './shaders/processing/changeRGB.shader';
import averageLayers from './shaders/processing/averageLayers.shader';
import apply3x3Kernel from './shaders/processing/apply3x3Kernel.shader';


const testMapView = new View({
    center: [-7337.954715, 6709336.594760],
    zoom: 7,
})

const testWMS = new TileWMS({
    url: "https://services.sentinel-hub.com/ogc/wms/e25b0e1d-5cf3-4abe-9091-e9054ef6640a",
    params: {
        'LAYERS': "TRUE_COLOR", 
        'TILED': true, 
        'FORMAT': 'image/png',
        'showLogo': false,
        'CRS': "EPSG:3857",
        'TIME': "2018-03-29/2018-05-29",
    },
    attribution: "test",
    crossOrigin: "anonymous",
});

const testWMS2 = new TileWMS({
    url: "https://services.sentinel-hub.com/ogc/wms/e25b0e1d-5cf3-4abe-9091-e9054ef6640a",
    params: {
        'LAYERS': "NDVI", 
        'TILED': true, 
        'FORMAT': 'image/png',
        'showLogo': false,
        'CRS': "EPSG:3857",
    },
    attribution: "test",
    crossOrigin: "anonymous",
});

const testMapLayer1 = new TileLayer({
    source: testWMS,
    visible: true,
    title: "Sentinel testing",
    opacity: 1,
    minZoom: 6,
});

const testMapLayer2 = new TileLayer({
    source: testWMS2,
    visible: true,
    title: "Sentinel testing",
    opacity: 1,
    minZoom: 6,
});

var webgl = new WebGLCanvas("canvas_map");
var l1 = new LayerObject(testMapLayer1, testMapView);
const p1 = webgl.generatePseudoLayer(l1);

const pp1 = webgl.processPseudoLayer({
    inputs: {
        crgb_image: p1, 
    },
    shader: changeRGB,
    variables: {
        crgb_multiplier: [2.5, 2.5, 2.5, 1.0],
    },
    dynamics: {}
})

const pp2 = webgl.processPseudoLayer({
    inputs: {
        a3k_image: pp1,
    },
    shader: apply3x3Kernel,
    variables: {
        a3k_textureWidth: webgl.width,
        a3k_textureHeight: webgl.height,
        a3k_kernel: [
            -1, -1, -1,
            -1, 16, -1,
            -1, -1, -1
         ],
        a3k_kernelWeight: 8,
    },
    dynamics: {}
})

const pp3 = webgl.processPseudoLayer({
    inputs: {
        a3k_image: pp2,
    },
    shader: apply3x3Kernel,
    variables: {
        a3k_textureWidth: webgl.width,
        a3k_textureHeight: webgl.height,
        a3k_kernel: [
            -1, -1, -1,
            -1,  8, -1,
            -1, -1, -1
         ],
        a3k_kernelWeight: 0.5,
    },
    dynamics: {}
})

const pp4 = webgl.processPseudoLayer({
    inputs: {
        al1_image: pp2,
        al2_image: pp3,
    },
    shader: averageLayers,
    variables: {},
    dynamics: {},
})

webgl.renderPseudoLayer(pp4, 5);

l1.olMap.on('click', () => {webgl.renderPseudoLayer(pp1, 5); })
