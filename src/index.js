import "../node_modules/ol/ol.css";
import "./styles/page.css";
import "./styles/layers.css";
import "./styles/top_bar.css";
import "./styles/guis.css";

import {Map, View} from 'ol';
import TileLayer from 'ol/layer/Tile';
import TileWMS from 'ol/source/TileWMS';
import XYZ from 'ol/source/XYZ';

import {LayerObject} from './modules/layer.js';
import {WebGLCanvas} from './modules/webgl.js';
import {UiLayer, Ui} from './modules/ui.js';
import {Constructor} from './modules/constructor.js';


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
var con = new Constructor();
var ui = new Ui(webgl, con);
var l1 = new LayerObject(testMapLayer1, testMapView);

const p1 = webgl.generatePseudoLayer(l1);
const pp1 = con.rgbaManipulation({
    webgl: webgl, 
    rgbam_image: p1, 
    rgbam_multiplier: [1.5, 1.5, 1.5, 1.0],
});
// webgl.activatePseudolayer(pp1, 5);
// const pp3 = con.rgbaManipulation({
//     webgl: webgl, 
//     rgbam_image: p1, 
//     rgbam_multiplier: [1.5, 1.5, 1.5, 1.5],
// });

// const pp2 = con.stackLayers({
//     webgl: webgl,
//     sl1_image: p1,
//     sl2_image: pp1,
//     sl1_weight: 1.5,
//     sl2_weight: 1.0,
//     sl_multiplier: 2.0,
// })

// for (let x = 0; x < 1000; x++) {
//     const r = Math.random() * 2.5;
//     webgl.renderPseudoLayer(pp1, 5);
// }

// function test() {
//     setTimeout(() => {
//         console.log("run")
//         const r = Math.random() * 2.5;
//         const pp1 = con.rgbaManipulation({
//             webgl: webgl, 
//             rgbam_image: p1, 
//             rgbam_multiplier: [r, 1.0, 1.0, 1.0],
//         });
//         webgl.activatePseudolayer(pp1, 5);
//         test();   
//     }, 1000)
// }

// test();



ui.addUiLayer(p1);
// ui.addUiLayer(pp1);
// ui.addUiLayer(pp3);



// const pp1 = con.rgbaManipulation(webgl, p1, [2.5, 2.5, 2.5, 1.0]);

// const pp2 = con.apply3x3Kernel(webgl, pp1, [-1, -1, -1, -1, 16, -1, -1, -1, -1], 8);


// const pp3 = con.rgbPercentageFiltering(webgl, p1, [1.0, 1.0, 1.0], [0.0, 0.0, 0.0, 1.0], ">");

// const pp4 = con.apply3x3Kernel(webgl, pp3, [-1, -1, -1, -1,  8, -1, -1, -1, -1], 1);

// UI EVENTS
// select layer
document.addEventListener('click', (e) => {
    const layerDiv = e.target;
    if(layerDiv && layerDiv.classList.contains('layer') || layerDiv.classList.contains('layer_text')){
        ui.activateUiLayer(layerDiv);
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
        var pseudolayer = webgl.generatePseudoLayer(pseudolayer);
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