export class Environment {
    constructor() {
        this.variables = {};
        this._addDefaultVariables();
    }

    addVariable = (name, variable) => {
        this.variables[name] = variable;
    }

    updateVariable = (name, variable) => {
        this.variable[name] = variable;
    }

    removeVariable = (name) => {
        delete this.variables[name];
    }

    getVariableIfExists = (name) => {
        if ((object.hasOwnProperty('id'))) {
            return this.variables[name];
        } else {
            return false;
        }
    }

    _addDefaultVariables = () => {
        this.variables.testTile = "https://services.sentinel-hub.com/ogc/wms/061d4336-8ed1-44a5-811e-65eea5ee06c4";
    }
}