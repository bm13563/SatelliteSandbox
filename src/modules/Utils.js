export const initialise = () => {
    const canvas = document.createElement("canvas")
    const gl = canvas.getContext("webgl2");
    canvas.id = 'objectGlCanvas'
    document.body.appendChild(canvas);
    if (gl === null) {
        alert("Unable to initialize WebGL. Your browser or machine may not support it.");
        return;
    }
    return gl;
}

export const randomInt = (maxVal) => {
    return Math.floor(Math.random() * maxVal);
  }

export const createRandomF32Array = (arrSize, maxVal) => {
    return Float32Array.from({length: arrSize}, () => randomInt(maxVal));
}

export const generateQuad = (x, y, width, height) => {
    var x1 = x;
    var x2 = x + width;
    var y1 = y;
    var y2 = y + height;
    return new Float32Array([x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2,])
}

export const toRadians = (angle) => {
    return angle /180 * Math.PI;
}

export const tileMapToCanvasMap = () => {
    const canvas = document.getElementById("canvas_map");
    canvas.width = canvas.getBoundingClientRect().width;
    canvas.height = canvas.getBoundingClientRect().height;
    const context = canvas.getContext('2d');
    const mapTiles = document.getElementsByClassName("leaflet-tile-loaded");
    const paneContainer = document.getElementsByClassName("leaflet-map-pane")[0];
    const tileContainer = mapTiles[0].parentElement;
    const zoomTransform = parseTransform(paneContainer);
    const panTransform = parseTransform(tileContainer);
    const tileTransform = [zoomTransform[0] + panTransform[0], zoomTransform[1] + panTransform[1]];
    for (let x = 0; x < mapTiles.length; x++) {
        var imageWidth = mapTiles[x].naturalWidth;
        var imageHeight = mapTiles[x].naturalHeight;
        var imageTransform = parseTransform(mapTiles[x]);
        context.drawImage(mapTiles[x], 0, 0, imageWidth, imageHeight, imageTransform[0] + tileTransform[0], imageTransform[1] + tileTransform[1], imageWidth, imageHeight);
    }
}

export const parseTransform = (element) => {
    const transformMatrix = element.style.transform;
    var regExp = /\(([^)]+)\)/;
    var parsedTransformMatrix = regExp.exec(transformMatrix)[1];
    parsedTransformMatrix = parsedTransformMatrix.replace(/[^0-9\-.,]/g, "").split(",");
    return [parseInt(parsedTransformMatrix[0]), parseInt(parsedTransformMatrix[1])]
}