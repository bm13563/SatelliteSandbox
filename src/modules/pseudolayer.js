export class PseudoLayer{
    constructor(inputs, shader, variables) {
        this.type = 'pseudolayer';
        this.id = Date.now() + (Math.floor(Math.random() * 1000000));
        this.inputs = inputs;
        this.shader = shader;
        this.variables = variables;
        this.maps = [];
        this.layers = [];
        this._getMaps(this);
        this.maps.sort((x, y) => {return x.mapId - y.mapId});
        this.maps = this.maps.map(({ map }) => map);
        this._getLayers();
    }

    _getMaps = (thisLayer) => {
        for (const key of Object.keys(thisLayer.inputs)) {
            if (thisLayer.inputs[key].type === "pseudolayer") {
                this._getMaps(thisLayer.inputs[key]);
            } else {
                const map = thisLayer.inputs[key].olMap;
                const mapId = thisLayer.inputs[key].mapOrderId;
                this.maps.push({mapId: mapId, map: map});
            }
        }
    }

    _getLayers = () => {
        for (var x = 0; x < this.maps.length; x++) {
            const thisLayer = this.maps[x].getLayers().getArray()[0];
            this.layers.push(thisLayer);
        }
    }
}