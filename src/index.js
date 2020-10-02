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
    center: [-348342.647153, 6658410.424665],
    zoom: 15,
    projection: projection,
})

// const trueColour = new XYZ({
//     url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}.png",
//     params: {
//         'TILED': true, 
//         'FORMAT': 'image/png',
//         attributions: 'Sources: Esri, DigitalGlobe, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community',
//     },
//     attribution: "test",
//     crossOrigin: "anonymous",
// });

const sentinelSource1 = new TileWMS({
    url: "https://services.sentinel-hub.com/ogc/wms/e28a9327-dd59-4020-9bad-ee8e5087fca4",
    params: {
        'LAYERS': "FALSE_COLOR", 
        'TILED': true, 
        'FORMAT': 'image/jpeg',
        'showLogo': false,
        'CRS': "EPSG:3857",
        'TIME': "2020-09-28",
    },
    attribution: "test",
    crossOrigin: "anonymous",
});

const sentinelSource2 = new TileWMS({
    url: "https://services.sentinel-hub.com/ogc/wms/e28a9327-dd59-4020-9bad-ee8e5087fca4",
    params: {
        'LAYERS': "FALSE_COLOR", 
        'TILED': true, 
        'FORMAT': 'image/jpeg',
        'showLogo': false,
        'CRS': "EPSG:3857",
        'TIME': "2020-08-14",
    },
    attribution: "test",
    crossOrigin: "anonymous",
});

const sentinelLayer1 = new TileLayer({
    source: sentinelSource1,
    visible: true,
    title: "Sentinel testing",
    opacity: 1,
    minZoom: 1,
});

const sentinelLayer2 = new TileLayer({
    source: sentinelSource2,
    visible: true,
    title: "Sentinel testing",
    opacity: 1,
    minZoom: 1,
});

var webgl = new WebGLCanvas("canvas_map");
var con = new Constructor();
var ui = new Ui(webgl, con);
var aSentinel1 = new LayerObject(sentinelLayer1, testMapView);
var aSentinel2 = new LayerObject(sentinelLayer2, testMapView);

const enhancedSentinel1 = con.rgbaManipulation({
    webgl: webgl,
    rgbam_image: aSentinel1,
    rgbam_multiplier: [1.5, 1.5, 1.5, 1.0],
})

const enhancedSentinel2 = con.rgbaManipulation({
    webgl: webgl,
    rgbam_image: aSentinel2,
    rgbam_multiplier: [1.5, 1.5, 1.5, 1.0],
})

const ndwiSentinel1 = con.calculateNDWI({
    webgl: webgl,
    cndwi_image: enhancedSentinel1,
})

const ndwiSentinel2 = con.calculateNDWI({
    webgl: webgl,
    cndwi_image: enhancedSentinel2,
})

// const sobelSentinel1 = con.sobelEdgeDetection({
//     webgl: webgl,
//     sed_image: ndwiSentinel1,
// })

// const sobelSentinel2 = con.sobelEdgeDetection({
//     webgl: webgl,
//     sed_image: ndwiSentinel2,
// })

ui.addUiLayer(enhancedSentinel1);
ui.addUiLayer(enhancedSentinel2);
ui.addUiLayer(ndwiSentinel1);
ui.addUiLayer(ndwiSentinel2);
const layerToActivate = ui.getUiLayerFromPseudolayer(enhancedSentinel1);
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