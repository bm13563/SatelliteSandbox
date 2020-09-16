import {Map, View} from 'ol';

// "layers" are different to those in native openlayers. each "layer" needs to have it's own
// canvas for opengl to read from. this class creates a "layer" with it's own canvas from
// an openlayers layer. layers will be synced as long as the same view is used
export class LayerObject{
    constructor(olLayer, olView, bufferValue, cacheSize) {
        this.type = 'layerObject';
        this.olLayer = olLayer;
        this.olView = olView;
        this.bufferValue = bufferValue;
        this.mapOrderId = parseInt(this.olLayer.ol_uid);
        this.containerId = Date.now() + (Math.floor(Math.random() * 1000000));
        this.container;
        this.olMap;
        this.shaders = {};
        this.activeShader;
        // this is kinda ridiculous and definitely needs refactoring
        this._cacheSize = 250;
        this._imageCache = {};
        this._cacheOrder = {};
        this._cacheIndex = 0;
        this._cacheDelete = 0;
        this._createCanvasElement();
        this._createMap();
        this._preventCachedTilesBeingRequested();
    }

    // TODO tidy up this function -> work out if we give a shit about ol controls - it's easy enough to control a map without right?
    _createCanvasElement = () => {
        // get the container for the tile elements, pass the size of the container to apply buffer to the canvas container
        const container = document.getElementById("tile_container");
        const boundingRect = container.getBoundingClientRect();
        const div = document.createElement("div");
        div.classList.add("layer_object");
        div.setAttribute("id", this.containerId);
        // set width and height, factoring in buffer value
        div.width = this.bufferValue * boundingRect.width;
        div.height = this.bufferValue * boundingRect.height;
        div.style.width = `${div.width}px`;
        div.style.height = `${div.height}px`;
        // need to buffer the layer to ensure it's centred on our visible canvas. allows us to still use ol controls properly
        div.style.marginLeft = `-${((this.bufferValue * boundingRect.width) - boundingRect.width) / 2}px`
        div.style.marginTop = `-${((this.bufferValue * boundingRect.height) - boundingRect.height) / 2}px`;
        div.style.position = "absolute";
        div.style.zIndex = `${parseInt(this.olLayer.ol_uid)}`;
        container.appendChild(div);
        this.container = div;
        this.activeShaders = [];
    }

    _createMap = () => {
        const map = new Map({
            maxTilesLoading: 5,
            target: this.container,
            layers: [this.olLayer],
            view: this.olView,
        });
        map.getView().setZoom(12);
        // render the map without animation - prevents artifacts and reduces gpu overhead
        this.olLayer.getSource().tileOptions.transition = 0;
        // layers are not requested until they are used -> saves requests
        this.olLayer.setVisible(false);
        this.olMap = map;
    }

    // prevent any layer from requesting tiles that have been cached. does not appear that openlayers cahche prevents tile requests being made
    _preventCachedTilesBeingRequested = () => {
        this.olLayer.getSource().setTileLoadFunction((imageTile, src) => {
            // reformat the current tile source to match the key of the tile cache
            let tileCoords = imageTile.getTileCoord().join("/");
            // check if the tile has been cached
            if (tileCoords in this._imageCache) {
                console.log("using cached image")
                imageTile.image_ = this._imageCache[tileCoords];
            } else {
                imageTile.getImage().src = src;
                this._addToImageCache(tileCoords, imageTile.image_);
            }
        })
    }

    // makes sure that cache size doesn't exceed the cache limit - deletes the oldest tile if necessary
    _addToImageCache = (key, image) => {
        let imagesInCache = Object.keys(this._imageCache).length;
        if (imagesInCache >= this._cacheSize) {
            delete this._imageCache[this._cacheOrder[this._cacheDelete]];
            this._cacheDelete++;
        }
        this._imageCache[key] = image;
        this._cacheOrder[this._cacheIndex] = key;
        this._cacheIndex++;
    }
}