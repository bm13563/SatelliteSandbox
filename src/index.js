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
    zoom: 6,
    projection: projection,
})

// const testWMS = new XYZ({
//     url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}.png",
//     params: {
//         'TILED': true, 
//         'FORMAT': 'image/png',
//         attributions: 'Sources: Esri, DigitalGlobe, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community',
//     },
//     attribution: "test",
//     crossOrigin: "anonymous",
// });

// const testWMS = new TileWMS({
//     url: "https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi/ASTER_GDEM_Color_Index",
//     params: {
//         'TILED': true, 
//     },
//     attribution: "test",
//     crossOrigin: "anonymous",
// });#

var brEVI2001 = new TileWMS({
    url: 'https://gibs-{a-c}.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi?',
    params: {
        LAYERS: 'MODIS_Terra_L3_EVI_16Day',
        FORMAT: 'image/png',
        CRS: 'EPSG:3857',
        TIME: '2001-01-01',
    },
    projection: projection,
    crossOrigin: "anonymous",
});

var brEVI2020 = new TileWMS({
    url: 'https://gibs-{a-c}.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi?',
    params: {
        LAYERS: 'MODIS_Terra_L3_EVI_16Day',
        FORMAT: 'image/png',
        CRS: 'EPSG:3857',
        TIME: '2020-01-01',
    },
    projection: projection,
    crossOrigin: "anonymous",
});

var brEVI2001Layer = new TileLayer({
    source: brEVI2001,
    visible: true,
    title: "Sentinel testing",
    opacity: 1,
    minZoom: 1,
});

var brEVI2020Layer = new TileLayer({
    source: brEVI2020,
    visible: true,
    title: "Sentinel testing",
    opacity: 1,
    minZoom: 1,
});

var webgl = new WebGLCanvas("canvas_map");
var con = new Constructor();
var ui = new Ui(webgl, con);
var l1 = new LayerObject(brEVI2001Layer, testMapView);
var l2 = new LayerObject(brEVI2020Layer, testMapView);

const p1 = webgl.generatePseudoLayer(l1);
const p2 = webgl.generatePseudoLayer(l2);

const pp1 = con.calculateDifference({
    webgl: webgl,
    cd_image1: p1,
    cd_image2: p2,
})

ui.addUiLayer(p1);
ui.addUiLayer(p2);
ui.addUiLayer(pp1);



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
    if(closeButton && closeButton.id === "close_processing_gui"){
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