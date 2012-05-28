/*
 * Direct image storage provider
 *
 */

DirectStorage = function(path) {
    if (typeof(path) != "undefined") this.path = path;
    else this.path = __dirname;
};
DirectStorage.prototype.Store = function(image, callback) {

};
exports.DirectStorage = DirectStorage;