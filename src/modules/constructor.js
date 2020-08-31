import rgbaManipulationShader from '../shaders/processing/rgbaManipulation.shader';
import rgbFilteringShader from '../shaders/processing/rgbFiltering.shader';
import rgbPercentageFilteringShader from '../shaders/processing/rgbPercentageFiltering.shader';
import stackLayers from '../shaders/processing/stackLayers.shader';
import apply3x3KernelShader from '../shaders/processing/apply3x3Kernel.shader';
import sobelEdgeDetection from '../shaders/processing/sobelEdgeDetection.shader';
import greyscale from '../shaders/processing/greyscale.shader';
import calculateNDWI from '../shaders/processing/calculateNDWI.shader';

export class Constructor{
    // takes in a pseudolayer and a vec4 (float 0-1)
    rgbaManipulation = ({webgl, rgbam_image, rgbam_multiplier}={}) => {
        const pseudolayer = webgl.processPseudoLayer({
            shaderName: "rgbaManipulation",
            inputs: {
                rgbam_image: rgbam_image, 
            },
            shader: rgbaManipulationShader,
            variables: {
                rgbam_multiplier: rgbam_multiplier,
            },
            dynamics: {}
        })
        return pseudolayer;
    }

    // takes in a pseudolayer, a 3x3 matrix and a float 
    apply3x3Kernel = ({webgl, a3k_image, a3k_kernel, a3k_kernelWeight}={}) => {
        const pseudolayer = webgl.processPseudoLayer({
            shaderName: "apply3x3Kernel",
            inputs: {
                a3k_image: a3k_image,
            },
            shader: apply3x3KernelShader,
            variables: {
                a3k_textureWidth: webgl.gl.canvas.width,
                a3k_textureHeight: webgl.gl.canvas.height,
                a3k_kernel: a3k_kernel,
                a3k_kernelWeight: a3k_kernelWeight,
            },
            dynamics: {}
        })
        return pseudolayer;
    }

    // takes in 2 pseudolayers
    averageLayers = ({webgl, al1_image, al2_image}={}) => {
        const pseudolayer = webgl.processPseudoLayer({
            shaderName: "averageLayers",
            inputs: {
                al1_image: al1_image,
                al2_image: al2_image,
            },
            shader: averageLayersShader,
            variables: {},
            dynamics: {},
        })
        return pseudolayer;
    }

    // takes in a pseudolayer, a float (0-1), a vec4 (float 0-1) and a string ("<", ">")
    rgbFiltering = ({webgl, rgbf_image, rgbf_filter, rgbf_removed, rgbfd1_remove}={}) => {
        // todo handling for dynamics
        const pseudolayer = webgl.processPseudoLayer({
            shaderName: "rgbFiltering",
            inputs: {
                rgbf_image: rgbf_image,
            },
            shader: rgbFilteringShader,
            variables: {
                rgbf_filter: rgbf_filter,
                rgbf_removed: rgbf_removed,
            },
            dynamics: {
                rgbfd1_remove: rgbfd1_remove,
            }
        })
        return pseudolayer;
    }

    // takes in a pseudolayer, a float (0-1), a vec4 (float 0-1) and a string ("<", ">")
    rgbPercentageFiltering = ({webgl, rgbfp_image, rgbfp_filter, rgbfp_removed, rgbfpd1_remove}={}) => {
        // todo handling for dynamics
        const pseudolayer = webgl.processPseudoLayer({
            shaderName: "rgbPercentageFiltering",
            inputs: {
                rgbfp_image: rgbfp_image,
            },
            shader: rgbPercentageFilteringShader,
            variables: {
                rgbfp_filter: rgbfp_filter,
                rgbfp_removed: rgbfp_removed,
            },
            dynamics: {
                rgbfpd1_remove: rgbfpd1_remove,
            }
        })
        return pseudolayer;
    }

    stackLayers = ({webgl, sl1_image, sl2_image, sl1_weight, sl2_weight, sl_divisor}={}) => {
        const pseudolayer = webgl.processPseudoLayer({
            shaderName: "stackLayers",
            inputs: {
                sl1_image: sl1_image,
                sl2_image: sl2_image,
            },
            shader: stackLayers,
            variables: {
                sl1_weight: sl1_weight,
                sl2_weight: sl2_weight,
                sl_divisor: sl_divisor,
            },
            dynamics: {}
        })
        return pseudolayer;
    }

    sobelEdgeDetection = ({webgl, sed_image}={}) => {
        const pseudolayer = webgl.processPseudoLayer({
            shaderName: "sobelEdgeDetection",
            inputs: {
                sed_image: sed_image,
            },
            shader: sobelEdgeDetection,
            variables: {
                sed_textureWidth: 900,
                sed_textureHeight: 700,
                // sed_textureWidth: webgl.gl.canvas.width,
                // sed_textureHeight: webgl.gl.canvas.height,
            },
            dynamics: {}
        })
        return pseudolayer;
    }

    greyscale = ({webgl, gs_image}={}) => {
        const pseudolayer = webgl.processPseudoLayer({
            shaderName: "greyscale",
            inputs: {
                gs_image: gs_image,
            },
            shader: greyscale,
            variables: {},
            dynamics: {},
        })
        return pseudolayer;
    }

    calculateNDWI = ({webgl, cndwi_image}={}) => {
        const pseudolayer = webgl.processPseudoLayer({
            shaderName: "calculateNDWI",
            inputs: {
                cndwi_image: cndwi_image,
            },
            shader: calculateNDWI,
            variables: {},
            dynamics: {},
        })
        return pseudolayer;
    }
}