import { Map } from "./modules/Map.js";
import { Layer } from "./modules/Layer.js";
import { Environment } from "./modules/Environment.js";
import * as utils from "./modules/Utils.js"
import "../node_modules/leaflet/dist/leaflet.css";
import "./styles/page.css";

var environment = new Environment();
var testLayer = new Layer({ 
    url: environment.variables.testTile,
    options: {
        layers: "NDVI",
        format: "image/png",
        showLogo: false,
    }
 });
var testMap = new Map()
testMap.addLayer(testLayer);

testLayer.layer.on('load', function() { utils.tileMapToCanvasMap(); });


