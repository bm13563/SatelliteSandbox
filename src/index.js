import "../node_modules/ol/ol.css";
import "./styles/page.css";
import "./styles/layers.css";
import "./styles/top_bar.css";
import "./styles/guis.css";

import {Map, View} from 'ol';
import {get as getProjection} from 'ol/proj';
import {getTopLeft, getWidth} from 'ol/extent';

import TileLayer from 'ol/layer/Tile';
import TileWMS from 'ol/source/TileWMS';
import WMTS from 'ol/source/WMTS';
import WMTSTileGrid from 'ol/tilegrid/WMTS';
import XYZ from 'ol/source/XYZ';

import {LayerObject} from './modules/layer.js';
import {WebGLCanvas} from './modules/webgl.js';
import {UiLayer, Ui} from './modules/ui.js';
import {Constructor} from './modules/constructor.js';

import {getRenderPixel} from 'ol/render';


// set up project projection
const projection = getProjection('EPSG:3857');

// set up tile matrix if a wmts is used
const projectionExtent = projection.getExtent();
const size = getWidth(projectionExtent) / 256;
var resolutions = new Array(14);
var matrixIds = new Array(14);
for (var z = 0; z < 14; ++z) {
    // generate resolutions and matrixIds arrays for this WMTS
    resolutions[z] = size / Math.pow(2, z);
    matrixIds[z] = z;
}

// set a map view
const testMapView = new View({
    center: [27288.019098, 6575113.173091],
    zoom: 12,
    projection: projection,
})

const trueColour = new XYZ({
    url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}.png",
    params: {
        'TILED': true, 
        'FORMAT': 'image/png',
        attributions: 'Sources: Esri, DigitalGlobe, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community',
    },
    attribution: "test",
    crossOrigin: "anonymous",
});

// var trueColour = new TileWMS({
//     url: 'https://gibs-{a-c}.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi?',
//     params: {
//         LAYERS: 'MODIS_Terra_CorrectedReflectance_TrueColor',
//         FORMAT: 'image/jpeg',
//         CRS: 'EPSG:3857',
//         TIME: '2020-01-01',
//         TILED: true,
//     },
//     projection: projection,
//     crossOrigin: "anonymous",
// });

const testWMS = new TileWMS({
    url: "https://services.sentinel-hub.com/ogc/wms/e28a9327-dd59-4020-9bad-ee8e5087fca4",
    params: {
        'LAYERS': "FALSE_COLOR", 
        'TILED': true, 
        'FORMAT': 'image/png',
        'showLogo': false,
        'CRS': "EPSG:3857",
        'TIME': "2020-06-26/2020-07-26",
    },
    attribution: "test",
    crossOrigin: "anonymous",
});

const testWMS2 = new TileWMS({
    url: "https://services.sentinel-hub.com/ogc/wms/e28a9327-dd59-4020-9bad-ee8e5087fca4",
    params: {
        'LAYERS': "TRUE_COLOR", 
        'TILED': true, 
        'FORMAT': 'image/png',
        'showLogo': false,
        'CRS': "EPSG:3857",
        'TIME': "2020-06-26/2020-07-26",
    },
    attribution: "test",
    crossOrigin: "anonymous",
});

const testMapLayer1 = new TileLayer({
    source: testWMS,
    visible: true,
    title: "Sentinel testing",
    opacity: 1,
    minZoom: 1,
});

const testMapLayer2 = new TileLayer({
    source: testWMS2,
    visible: true,
    title: "Sentinel testing",
    opacity: 1,
    minZoom: 1,
});

var webgl = new WebGLCanvas("canvas_map");
var con = new Constructor();
var ui = new Ui(webgl, con);
var l1 = new LayerObject(testMapLayer1, testMapView);
var l2 = new LayerObject(testMapLayer2, testMapView);

const p1 = webgl.generatePseudoLayer(l1);
const p2 = webgl.generatePseudoLayer(l2);

const ep2 = con.rgbaManipulation({
    webgl: webgl,
    rgbam_image: p2,
    rgbam_multiplier: [1.5, 1.5, 1.5, 1.0],
})

const pp1 = con.rgbFiltering({
    webgl: webgl,
    rgbf_image: p1,
    rgbf_filter: [0.58, 0.58, 0.58],
    rgbf_removed: [0.0, 0.0, 0.0, 1.0],
    rgbfd1_remove: "<",
})

const pp2 = con.greyscale({
    webgl: webgl,
    gs_image: pp1,
})

const pp3 = con.sobelEdgeDetection({
    webgl: webgl,
    sed_image: pp2,
})

const pp4 = con.rgbaManipulation({
    webgl: webgl,
    rgbam_image: pp3,
    rgbam_multiplier: [1.0, 0.0, 1.0, 1.0],
})

const pp5 = con.rgbFiltering({
    webgl: webgl,
    rgbf_image: pp4,
    rgbf_filter: [1.0, 0.0, 1.0],
    rgbf_removed: [0.0, 0.0, 0.0, 1.0],
    rgbfd1_remove: "<",
})

const pp6 = con.stackLayers({
    webgl: webgl,
    sl1_image: ep2,
    sl2_image: pp5, 
    sl1_weight: 0,
    sl2_weight: 1.0,
    sl_divisor: 1.0,
})

ui.addUiLayer(p1);
ui.addUiLayer(ep2);
ui.addUiLayer(pp1);
ui.addUiLayer(pp2);
ui.addUiLayer(pp3);
ui.addUiLayer(pp4);
ui.addUiLayer(pp5);
ui.addUiLayer(pp6);

const layerToActivate = ui.getUiLayerFromPseudolayer(pp6);
ui.activateUiLayer(layerToActivate);



// UI EVENTS
// select layer
document.addEventListener('click', (e) => {
    const layerDiv = e.target;
    if(layerDiv && layerDiv.classList.contains('layer') || layerDiv.classList.contains('layer_text')){
        ui.activateUiLayerFromDOM(layerDiv);
    }
});

// remove layer
document.addEventListener('click', (e) => {
    const deleteButton = e.target;
    if(deleteButton && deleteButton.classList.contains("delete_layer")){
        ui.removeUiLayer(deleteButton);
    }
});

// close processing gui -> hide gui container and remove gui
document.addEventListener('click', (e) => {
    const closeButton = e.target;
    if(closeButton && closeButton.id === "close_gui"){
        ui.removeGui();
    }
});

// open processing gui when dropdown selected
document.addEventListener('click', (e) => {
    const menuOption = e.target;
    if(menuOption && menuOption.classList.contains("dropdown_menu_option")){
        const buildGui = ui.guis[menuOption.dataset.id];
        buildGui();
    }
});

// generate a new ui layer from selected layer
document.addEventListener('click', (e) => {
    const newLayer = e.target;
    if(newLayer && newLayer.id === "new_layer"){
        var pseudolayer = ui.activeUiLayer.pseudolayer;
        // generate a new pseudolayer before adding a new layer, just in case the old pseudolayer is the same
        // as the new pseudolayer
        // var pseudolayer = webgl.generatePseudoLayer(pseudolayer);
        ui.addUiLayer(pseudolayer);
    }
});

// reset a ui layer
document.addEventListener('click', (e) => {
    const resetLayer = e.target;
    if(resetLayer && resetLayer.id === "reset_layer"){
        ui.resetUiLayer();
    }
});