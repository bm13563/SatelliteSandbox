import * as L from 'leaflet/src/Leaflet';

export class Map {
    constructor() {
        this.map = L.map('tile_map').setView([51.505, -0.09], 13);
    }

    addLayer = (layer) => {
        layer.layer.addTo(this.map);
    }
}
