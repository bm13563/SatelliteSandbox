import "../node_modules/ol/ol.css";
import "./styles/page.css";
import {Map, View} from 'ol';
import TileLayer from 'ol/layer/Tile';
import TileWMS from 'ol/source/TileWMS';
import * as util from './modules/utils.js'
import vertexShader from './shaders/vertex.shader';
import fragmentShader from './shaders/fragment.shader';
import {WebGLObject} from './modules/webgl.js';

const testMapView = new View({
    center: [-7337.954715, 6709336.594760],
    zoom: 7,
})

const testWMS = new TileWMS({
    url: "https://services.sentinel-hub.com/ogc/wms/061d4336-8ed1-44a5-811e-65eea5ee06c4",
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

const testMapLayer = new TileLayer({
    source: testWMS,
    visible: true,
    title: "Sentinel testing",
    opacity: 1,
    minZoom: 6,
});

const testMap = new Map({
  target: "tile_map",
  layers: [testMapLayer],
  view: testMapView,
});

var webgl = new WebGLObject("canvas_map", vertexShader, fragmentShader);
// webgl.renderImage(imageData);

testMap.on("postrender", () => {
    const canvas = document.querySelector("#tile_map canvas");
    webgl.renderImage(canvas);
})

// import * as twgl from 'twgl.js';
// // import vertexShader from './shaders/vertex.shader';
// // import fragmentShader from './shaders/fragment.shader';

// const gl = twgl.getContext(document.getElementById("canvas_map"));
// const programInfo = twgl.createProgramInfo(gl, [vertexShader, fragmentShader]);
      
// var tex = twgl.createTexture(gl, {
//     src: 'https://farm6.staticflickr.com/5695/21506311038_9557089086_m_d.jpg',
// }, (err, tex, img) => {
//     startRendering(img);
// });

// export const startRendering = (img) => {
//     requestAnimationFrame(render);
//     function render() {
//         const quadVertices = twgl.primitives.createXYQuadBufferInfo(gl);
//         console.log(quadVertices);
//         const uniforms = {
//             u_image: tex,
//         }
//         twgl.resizeCanvasToDisplaySize(gl.canvas);
//         console.log(gl.canvas.width, gl.canvas.height)
//         gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
//         gl.useProgram(programInfo.program);
//         twgl.setBuffersAndAttributes(gl, programInfo, quadVertices);
//         twgl.setUniforms(programInfo, uniforms);
//         twgl.drawBufferInfo(gl, quadVertices, gl.TRIANGLES);
//     }
// }