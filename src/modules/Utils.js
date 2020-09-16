export const initialMapLoad = (map, callback, ...params) => {
    map.once('postrender', () => {
        callback(params)
    });
}


/**
 * Takes twoMatrix3s, a and b, and computes the product in the order
 * that pre-composes b with a.  In other words, the matrix returned will
 * @param {module:webgl-2d-math.Matrix3} a A matrix.
 * @param {module:webgl-2d-math.Matrix3} b A matrix.
 * @return {module:webgl-2d-math.Matrix3} the result.
 * @memberOf module:webgl-2d-math
 * FROM https://webglfundamentals.org/webgl/resources/webgl-2d-math.js
 */
export const matrix3x3Multiply = (a, b) => {
    const a00 = a[0 * 3 + 0];
    const a01 = a[0 * 3 + 1];
    const a02 = a[0 * 3 + 2];
    const a10 = a[1 * 3 + 0];
    const a11 = a[1 * 3 + 1];
    const a12 = a[1 * 3 + 2];
    const a20 = a[2 * 3 + 0];
    const a21 = a[2 * 3 + 1];
    const a22 = a[2 * 3 + 2];
    const b00 = b[0 * 3 + 0];
    const b01 = b[0 * 3 + 1];
    const b02 = b[0 * 3 + 2];
    const b10 = b[1 * 3 + 0];
    const b11 = b[1 * 3 + 1];
    const b12 = b[1 * 3 + 2];
    const b20 = b[2 * 3 + 0];
    const b21 = b[2 * 3 + 1];
    const b22 = b[2 * 3 + 2];
    return [
      a00 * b00 + a01 * b10 + a02 * b20,
      a00 * b01 + a01 * b11 + a02 * b21,
      a00 * b02 + a01 * b12 + a02 * b22,
      a10 * b00 + a11 * b10 + a12 * b20,
      a10 * b01 + a11 * b11 + a12 * b21,
      a10 * b02 + a11 * b12 + a12 * b22,
      a20 * b00 + a21 * b10 + a22 * b20,
      a20 * b01 + a21 * b11 + a22 * b21,
      a20 * b02 + a21 * b12 + a22 * b22,
    ];
}

// rebuild of https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage.
// srcx and src y are pixel offsets from top left, srcwidth and srcheight are the size of the image, dstwidth and dstheight are the size
// of the rendering canvas
export const scaleTextureCoordsToCropImage = (srcX, srcY, srcWidth, srcHeight, dstWidth, dstHeight) => {
    const texXOff   = srcX / srcWidth;
    const texYOff   = srcY / srcHeight;
    const texXScale = dstWidth / srcWidth;
    const texYScale = dstHeight / srcHeight;
    const texOffMat = [
        1, 0, 0,
        0, 1, 0,
        texXOff, texYOff, 1,
    ];
    const texScaleMat = [
        texXScale, 0, 0,
        0, texYScale, 0,
        0, 0, 1,
    ];
    return matrix3x3Multiply(texOffMat, texScaleMat)
}