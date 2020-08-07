import "../node_modules/ol/ol.css";
import "./styles/page.css";
import "./styles/layers.css";
import "./styles/top_bar.css";

import {Map, View} from 'ol';
import TileLayer from 'ol/layer/Tile';
import TileWMS from 'ol/source/TileWMS';
import XYZ from 'ol/source/XYZ';

import {LayerObject} from './modules/layer.js';
import {WebGLCanvas} from './modules/webgl.js';
import {UiLayer, Ui} from './modules/ui.js';
import * as con from './modules/constructors.js';


const testMapView = new View({
    center: [-19529.660727, 6643944.717062],
    zoom: 7,
})

const testWMS = new XYZ({
    url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}.png",
    params: {
        'TILED': true, 
        'FORMAT': 'image/png',
        attributions: 'Sources: Esri, DigitalGlobe, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community',
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

var webgl = new WebGLCanvas("canvas_map");
var ui = new Ui(webgl);
var l1 = new LayerObject(testMapLayer1, testMapView);

const p1 = webgl.generatePseudoLayer(l1);
const uil1 = ui.addLayer(p1);

const pp1 = con.rgbaManipulation(webgl, p1, [2.5, 2.5, 2.5, 1.0]);
const uil2 = ui.addLayer(pp1);

const pp2 = con.apply3x3Kernel(webgl, pp1, [-1, -1, -1, -1, 16, -1, -1, -1, -1], 8);
const uil3 = ui.addLayer(pp2);

const pp3 = con.rgbPercentageFiltering(webgl, p1, 0.6, [0.0, 0.0, 0.0, 1.0], "g", ">");
const uil4 = ui.addLayer(pp3);

const pp4 = con.apply3x3Kernel(webgl, pp3, [-1, -1, -1, -1,  8, -1, -1, -1, -1], 1);
const uil5 = ui.addLayer(pp4);

// UI EVENTS
// select layer
document.addEventListener('click', (e) => {
    const layerDiv = e.target;
    if(layerDiv && layerDiv.classList.contains('layer') || layerDiv.classList.contains('layer_text')){
        ui.selectLayer(layerDiv, 'selected');
    }
});

// remove layer
document.addEventListener('click', (e) => {
    const deleteButton = e.target;
    if(deleteButton && deleteButton.classList.contains("delete_layer")){
        ui.removeLayer(deleteButton);
    }
});

// close processing gui -> hide gui container and remove gui
document.addEventListener('click', (e) => {
    const closeButton = e.target;
    if(closeButton && closeButton.id === "close_processing_gui"){
        const processingGui = document.getElementById("processing_gui");
        processingGui.style.visibility = "hidden";
        ui.removeGui();
    }
});

// open processing gui when dropdown selected
document.addEventListener('click', (e) => {
    const menuOption = e.target;
    if(menuOption && menuOption.classList.contains("dropdown_menu_option")){
        const buildGui = ui.guis[menuOption.dataset.id];
        buildGui(con);
    }
});

