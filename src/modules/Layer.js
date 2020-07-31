import * as L from 'leaflet/src/Leaflet';

export class Layer {
    constructor({
        url,
        options = {}
    }={}) {
        this.url = url;
        this.options = options;
        this.layer = L.tileLayer.wms(url, options);
    }
}
