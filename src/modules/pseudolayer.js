export class PseudoLayer{
    constructor(inputs, shader, variables) {
        this.type = 'pseudolayer';
        this.id = Date.now() + (Math.floor(Math.random() * 1000000));
        this.inputs = inputs;
        this.shader = shader;
        this.variables = variables;
        this.maps = [];
        this._getMaps(this);
        this.maps.sort((x, y) => {return x.mapId - y.mapId});
        this.maps = this.maps.map(({ map }) => map)
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

    // addPass = () {
    // }

    onRender = (callback) => {
        this.maps[this.maps.length-1].on("postrender", (e) => {
            callback();
        });
    }

    stack = (pseudolayer) => {

    }
}