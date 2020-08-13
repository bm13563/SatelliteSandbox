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

// export class CanvasReadyEvent{
//     constructor(callback) {
        
//     }
// }

