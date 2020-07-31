// creates a single set of linked shaders containing a vertex and a fragment shader
export class shader {
    constructor(gl, rawVertex, rawFragment, transformFeedbackAttribs=false) {
        this.gl = gl
        const vertex = this.compile(gl.VERTEX_SHADER, rawVertex);
        const fragment = this.compile(gl.FRAGMENT_SHADER, rawFragment);
        this.program = this.program(vertex, fragment, transformFeedbackAttribs);
        this.attributes = {};
        this.uniforms = {};
    }

    compile = (shaderType, shaderSource) => {
        const gl = this.gl;
        var shader = gl.createShader(shaderType);
        gl.shaderSource(shader, shaderSource);
        gl.compileShader(shader);
        var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
        if (success) {
          return shader;
        }
        console.log(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
    }

    program = (rawVertex, rawFragment, transformFeedbackAttribs) => {
        const gl = this.gl;
        var program = gl.createProgram();
        gl.attachShader(program, rawVertex);
        gl.attachShader(program, rawFragment);

        if (!(transformFeedbackAttribs === false)) {
            gl.transformFeedbackVaryings(program, [transformFeedbackAttribs], gl.INTERLEAVED_ATTRIBS);
        }

        gl.linkProgram(program);
        var success = gl.getProgramParameter(program, gl.LINK_STATUS);
        if (success) {
          return program;
        }
        gl.deleteProgram(program);
    }

    logAttribute = (attributeName) => {
        const gl = this.gl;
        const attributeLocation = gl.getAttribLocation(this.program, attributeName);
        if (!(attributeName in this.attributes)) {
            this.attributes[attributeName] = attributeLocation;
        }
    }

    logUniform = (uniformName) => {
        const gl = this.gl;
        const uniformLocation = gl.getUniformLocation(this.program, uniformName);
        if (!(uniformName in this.uniforms)) {
            this.uniforms[uniformName] = uniformLocation;
        }
    }

    activate = () => {
        const gl = this.gl;
        gl.useProgram(this.program);
    }

    deactivate = () => {
        const gl = this.gl;
        gl.useProgram(0);
    }
}