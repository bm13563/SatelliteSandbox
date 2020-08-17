import {unByKey} from 'ol/Observable';

// checks if all buffers have been sent to the gpu -> if they have then true, if not then false
// this is updated every frame
export class ShadersReadyEvent{
    constructor(callback) {
        this.shadersReady = true;
        this._passes = 0;
        this._expectedPasses = 0;
        this._callback = callback;
    }

    // set the number of expected passes. should happen when a pseudolayer is activated
    log = (passes) => {
        this._expectedPasses = passes;
    }

    // called when a shader finishes a pass
    increment = () => {
        this._passes++;
        this.check(this._passes);
    }

    // checks if the expected number of passes has been completed
    check = () => {
        if (this._passes === this._expectedPasses) {
            this._passes = 0;
            this._callback();
        }
    }

    // called once all data has been sent to the gpu and the buffers deleted
    ready = () => {
        this.shadersReady = true;
    }

    // called as soon as rendering starts
    notReady = () => {
        this.shadersReady = false;
    }
}

// alows rendering of multiple maps (inputs) by preventing the canvas from rendering until all maps
// are on the DOM. this is updated every new pseudolayer
export class MapsReadyEvent{
    constructor(callback) {
        this.mapsReady = false;
        // private variable that stops the mapsReadys event from being updated while it is rendering
        // the current maps
        this._finishedMaps = true;
        this._numberMapsReady = 0;
        this._expectedNumberMapsReady = 0;
        this._callback = callback;
        this._events = [];
        this._maps = [];
    }

    wait = (maps) => {
        if (this._finishedMaps) {
            this._finishedMaps = false;
            this._maps = maps;
            this._expectedNumberMapsReady = this._maps.length;
            for (let x = 0; x < maps.length; x++) {
                let event = maps[x].once("postrender", () => {
                    this._numberMapsReady++;
                    this._events.push(event);
                    this.check();
                })
            }
        }
    }

    check = () => {
        if (this._numberMapsReady === this._expectedNumberMapsReady) {
            this._numberMapsReady = 0;
            // unbind the event handlers set above
            for (let x = 0; x < this._events.length; x++) {
                let currentEvent = this._events[x];
                unByKey(currentEvent);
            }
            this._events = [];
            this._expectedNumberMapsReady = 0;
            // request a render animation -> starts the tiles loading in
            for (let x = 0; x < this._maps.length; x++) {
                let thisMap = this._maps[x];
                thisMap.render();
            }
            this._maps = [];
            this._finishedMaps = true;
            this.mapsReady = true;
        }
    }

    ready = () => {
        this.mapsReady = true;
    }

    notReady = () => {
        this.mapsReady = false;
    }
}
    
// checks that the necessary layers are visible on the map. this is updated every new pseudolayer
export class LayersReadyEvent{
    constructor() {
        this.layersReady = false;
        this._layersUsed = [];
    }

    // thankfully this is synchronous
    wait = (layers) => {
        for (let x = 0; x < layers.length; x++) {
            layers[x].setVisible(true);
            this._layersUsed.push(layers[x]);
        }
        this.layersReady = true;
    }

    ready = () => {
        this.layersReady = true;
    }

    notReady = () => {
        if (this._layersUsed.length > 0) {
            for (let x = 0; x < this._layersUsed.length; x++) {
                this._layersUsed[x].setVisible(false);
            }
            // empties map array to be written to by the next pseudolayer
            this._layersUsed = [];
        }
        this.layersReady = false;
    }
}

