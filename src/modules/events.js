import { toStringHDMS } from "ol/coordinate";
import {unByKey} from 'ol/Observable';

export class ShaderPassEvent{
    constructor(callback) {
        this._passes = 0;
        this._callback = callback;
    }

    increment = () => {
        this._passes++;
        this._callback(this._passes);
    }

    reset = () => {
        this._passes = 0;
    }
}

// alows rendering of multiple maps (inputs) by preventing the canvas from rendering until all maps
// are on the DOM
export class MapsReadyEvent{
    constructor(callback) {
        this._callback = callback;
        this._mapsReady = 0;
        this._events = [];
        this._maps = [];
        this._expectedMaps = 1;
    }

    wait = (maps) => {
        this._maps = maps;
        this._expectedMaps = maps.length;
        for (let x = 0; x < maps.length; x++) {
            let event = maps[x].once("postrender", () => {
                let thisMap = maps[x];
                this._mapsReady++;
                this._events.push(event);
                this.check();
            })
        }
    }

    check = () => {
        if (this._mapsReady === this._expectedMaps) {
            this._mapsReady = 0;
            for (let x = 0; x < this._events.length; x++) {
                let currentEvent = this._events[x];
                unByKey(currentEvent);
            }
            this._events = [];
            this._expectedMaps = 1;
            for (let x = 0; x < this._maps.length; x++) {
                let thisMap = this._maps[x];
                thisMap.render();
            }
            this._maps = [];
            this._callback();
        }
    }
    
}

