import "../node_modules/ol/ol.css";
import "./styles/page.css";

import {Map, View} from 'ol';
import TileLayer from 'ol/layer/Tile';
import TileWMS from 'ol/source/TileWMS';

import {LayerObject} from './modules/layer.js';
import {WebGLCanvas} from './modules/webgl.js';
import * as util from './modules/utils.js'

import standardVertex from './shaders/src/standardVertex.shader';
import changeRGB from './shaders/processing/changeRGB.shader';
import averageLayers from './shaders/processing/averageLayers.shader';


const testMapView = new View({
    center: [-7337.954715, 6709336.594760],
    zoom: 7,
})

const testWMS = new TileWMS({
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

const testWMS2 = new TileWMS({
    url: "https://services.sentinel-hub.com/ogc/wms/e25b0e1d-5cf3-4abe-9091-e9054ef6640a",
    params: {
        'LAYERS': "TRUE_COLOR", 
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

var webgl = new WebGLCanvas("canvas_map", standardVertex);
var testLayerObject = new LayerObject(testMapLayer1, testMapView);
var testLayerObject2 = new LayerObject(testMapLayer2, testMapView);

var testPseudoLayer = webgl.generatePseudoLayer({
    inputs: {
        0: {
            al1_image: testLayerObject,
            al2_image: testLayerObject2,
        }, 
        1: {
            crgb_image: false,
        }
    },
    shaders: {0: averageLayers, 1: changeRGB},
    variables: {
        0: {}, 
        1: {
            crgb_multiplier: [1.0, 0.0, 0.0, 1.0],
        },
    },
})

testPseudoLayer.onRender(() => {
    webgl.renderPseudoLayer(testPseudoLayer);
});

// testLayerObject.olMap.on("postrender", (e) => {
//     console.log(e)
//     webgl.renderPseudoLayer(testPseudoLayer);
// });

// testLayerObject.addShader(fragmentShader);
// // testLayerObject.addShader(fragmentShader);
// webgl.activateLayer(testLayerObject);

// testLayerObject.olMap.on("postrender", () => {
//     webgl.runAttachedPrograms([{
//         uniforms: {
//             u_multiplier: [0.5, 0.3, 1, 1],
//         },
//     },
//     ])
// })



// var red = document.getElementById("red-range").value / 100;
// var green = document.getElementById("green-range").value / 100;
// var blue = document.getElementById("blue-range").value / 100;
// document.getElementById("red-value").innerHTML = red;
// document.getElementById("green-value").innerHTML = green;
// document.getElementById("blue-value").innerHTML = blue;

// testLayerObject.olMap.on("postrender", () => {
//     webgl.runAttachedPrograms([{
//         uniforms: {
//             u_multiplier: [red, green, blue, 1],
//         },
//     },
//     ])
// })

// document.getElementById("red-range").oninput = function() {
//     red = this.value / 100;
//     document.getElementById("red-value").innerHTML = red;
//     webgl.runAttachedPrograms([{
//         uniforms: {
//             u_multiplier: [red, green, blue, 1],
//         },
//     },
//     ])
// }

// document.getElementById("green-range").oninput = function() {
//     green = this.value / 100;
//     document.getElementById("green-value").innerHTML = green;
//     webgl.runAttachedPrograms([{
//         uniforms: {
//             u_multiplier: [red, green, blue, 1],
//         },
//     },
//     ])
// }

// document.getElementById("blue-range").oninput = function() {
//     blue = this.value / 100;
//     document.getElementById("blue-value").innerHTML = blue;
//     webgl.runAttachedPrograms([{
//         uniforms: {
//             u_multiplier: [red, green, blue, 1],
//         },
//     },
//     ])
// }

