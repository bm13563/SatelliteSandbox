const pp1 = webgl.processPseudoLayer({
    inputs: {
        rgbam_image: p1, 
    },
    shader: rgbaManipulation,
    variables: {
        rgbam_multiplier: [2.5, 2.5, 2.5, 1.0],
    },
    dynamics: {}
})

const pp2 = webgl.processPseudoLayer({
    inputs: {
        a3k_image: pp1,
    },
    shader: apply3x3Kernel,
    variables: {
        a3k_textureWidth: webgl.width,
        a3k_textureHeight: webgl.height,
        a3k_kernel: [
            -1, -1, -1,
            -1, 16, -1,
            -1, -1, -1
         ],
        a3k_kernelWeight: 8,
    },
    dynamics: {}
})

const pp3 = webgl.processPseudoLayer({
    inputs: {
        a3k_image: pp2,
    },
    shader: apply3x3Kernel,
    variables: {
        a3k_textureWidth: webgl.width,
        a3k_textureHeight: webgl.height,
        a3k_kernel: [
            -1, -1, -1,
            -1,  8, -1,
            -1, -1, -1
         ],
        a3k_kernelWeight: 0.5,
    },
    dynamics: {}
})

const pp4 = webgl.processPseudoLayer({
    inputs: {
        al1_image: pp2,
        al2_image: pp3,
    },
    shader: averageLayers,
    variables: {},
    dynamics: {},
})