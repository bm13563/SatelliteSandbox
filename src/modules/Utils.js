export const initialMapLoad = (map, callback, ...params) => {
    map.once('postrender', () => {
        callback(params)
    });
}

export const canvasToImageData = (selector) => {
    const canvas = document.querySelector(selector);
    const context = canvas.getContext('2d');
    return context.getImageData(0, 0, canvas.width, canvas.height);
}


export const imageDataToCanvas = (selector, data) => {
    const canvas = document.querySelector(selector);
    const context = canvas.getContext('2d');
    canvas.width = canvas.getBoundingClientRect().width;
    canvas.height = canvas.getBoundingClientRect().height;
    context.putImageData(data, 0, 0);
}