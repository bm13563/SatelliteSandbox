import "../node_modules/ol/ol.css";
import "./styles/page.css";

import {Map, View} from 'ol';
import TileLayer from 'ol/layer/Tile';
import TileWMS from 'ol/source/TileWMS';
import XYZ from 'ol/source/XYZ';

import {LayerObject} from './modules/layer.js';
import {WebGLCanvas} from './modules/webgl.js';
import * as util from './modules/utils.js'

import rgbaManipulation from './shaders/processing/rgbaManipulation.shader';
import rgbFiltering from './shaders/processing/rgbFiltering.shader';
import rgbPercentageFiltering from './shaders/processing/rgbPercentageFiltering.shader';
import averageLayers from './shaders/processing/averageLayers.shader';
import apply3x3Kernel from './shaders/processing/apply3x3Kernel.shader';


const testMapView = new View({
    center: [-19529.660727, 6643944.717062],
    zoom: 7,
})

const testWMS = new XYZ({
    url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}.png",
    params: {
        // 'LAYERS': "TRUE_COLOR", 
        'TILED': true, 
        'FORMAT': 'image/png',
        attributions: 'Sources: Esri, DigitalGlobe, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community',
        // 'showLogo': false,
        // 'CRS': "EPSG:3857",
        // 'TIME': "2018-03-29/2018-05-29",
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

var webgl = new WebGLCanvas("canvas_map");
var l1 = new LayerObject(testMapLayer1, testMapView);
const p1 = webgl.generatePseudoLayer(l1);

const pp1 = webgl.processPseudoLayer({
    inputs: {
        rgbam_image: p1, 
    },
    shader: rgbaManipulation,
    variables: {
        rgbam_multiplier: [0.0, 1.0, 1.0, 1.0],
    },
    dynamics: {}
})

const pp2 = webgl.processPseudoLayer({
    inputs: {
        rgbfp_image: pp1,
    },
    shader: rgbPercentageFiltering,
    variables: {
        rgbfp_filter: 0.75,
        rgbfp_removed: [0.0, 0.0, 0.0, 1.0]
    },
    dynamics: {
        rgbfpd1_colour: "g",
        rgbfpd2_keep: ">",
    }
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
        a3k_kernelWeight: 1,
    },
    dynamics: {}
})

webgl.renderPseudoLayer(pp3, 5);

var thisLayer = pp3;
var otherLayer = pp1;
var intermediateLayer;
l1.olMap.on('click', () => {webgl.renderPseudoLayer(otherLayer, 5); intermediateLayer = thisLayer; thisLayer = otherLayer; otherLayer = intermediateLayer;})
