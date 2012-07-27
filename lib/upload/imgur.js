/*
 * Imgur storage provider
 *
 */

'use strict';

var ImgurStorage = function() {};

ImgurStorage.prototype.Respond = function(req, callback) {
    var files = req.body.files;
    var response = [];
    for(var i = 0; i < files.length; i++) {
        if (files[i].type.substr(0,5) == 'image') {
            response.push({
                'name'          : files[i].name,
                'size'          : files[i].size,
                'ext'           : files[i].type.substr(6),
                'url'           : files[i].links.original,
                'thumbnail_url' : files[i].links.large_thumbnail,
                'delete_url'    : '/u/delete/'+files[i].hash,
                'delete_type'   : 'DELETE',
                'id'            : files[i].hash,
                'h'             : files[i].hash
            });
            console.log(files[i].links.delete_page);
        } else {
            response.push({
                'name'  : files[i].name,
                'size'  : files[i].size,
                'error' : 'Failed MIME check'
            });
        }
    }
    callback(null, response);
};

exports.Storage = ImgurStorage;