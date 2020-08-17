export class PseudoLayer{
    constructor(shaderName, inputs, shader, variables) {
        this.type = 'pseudolayer';
        this.id = Date.now() + (Math.floor(Math.random() * 1000000));
        this.inputs = inputs;
        this.shaderName = shaderName;
        this.shader = shader;
        this.variables = variables;
        this.maps = [];
        this.layers = [];
        // base number of shader passes for every layer is 1 (gets vertically flipped at the end).
        // a pass is then done for every new program that is added
        this.shaderPasses = 1;
        this._getShaderPasses(this);
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

    _getShaderPasses = (thisLayer) => {
        // if there are multiple inputs to a single program, decrease the difference between the number of inputs
        // and the number of programs (1). necessary because this function counts the number of inputs, in order
        // to recurse through the whole pseudolayer
        var inputNumber = Object.keys(thisLayer.inputs).length;
        this.shaderPasses = this.shaderPasses + (1 - inputNumber);
        for (const key of Object.keys(thisLayer.inputs)) {
            const nextLayer = thisLayer.inputs[key];
            if (nextLayer.type === "layerObject") {
                this.shaderPasses++;
            } else {
                this.shaderPasses++
                this._getShaderPasses(nextLayer);
            }
        }
    }

    updateVariables = (variables) => {
        for (let key of Object.keys(variables)) {
            this.variables[key] = variables[key];
        }
    }
}