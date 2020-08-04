export class PseudoLayer{
    constructor(inputs, shaders, variables) {
        this.inputs = inputs;
        this.shaders = shaders;
        this.variables = variables;
        this.maps = this._getMaps();
    }

    _getMaps = () => {
        const maps = [];
        for (const outerKey of Object.keys(this.inputs)) {
            for (const innerKey of Object.keys(this.inputs[outerKey])) {
                const map = this.inputs[outerKey][innerKey].olMap;
                if (map) {
                    maps.push(map);
                }
            }
        }
        return maps;
    }

    updateVariableValue = (index, variable, value) => {
        this.variables[index][variable] = value;
    }

    onRender = (callback) => {
        this.maps[this.maps.length-1].on("postrender", (e) => {
            callback();
        });
    }
}