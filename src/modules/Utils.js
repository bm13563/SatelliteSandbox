export const initialMapLoad = (map, callback, ...params) => {
    map.once('postrender', () => {
        callback(params)
    });
}
