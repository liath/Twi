/*
 * Imgur storage provider
 *
 */

ImgurStorage = function() {};

ImgurStorage.prototype.Respond = function(files, req, callback) {
    var response = [];
    for(var i = 0; i < files.length; i++) {
        if (files[i].type.substr(0,5) == 'image') {
            var ext = files[i].type.substr(6);
            response.push({
                'name'          : files[i].name,
                'size'          : files[i].size,
                'ext'           : ext,
                'url'           : files[i].links.original,
                'thumbnail_url' : files[i].links.large_thumbnail,
                'delete_url'    : '/u/delete/'+name,
                'delete_type'   : 'DELETE',
                'id'            : files[i].hash
            });
            db.eval('db.code.findOne({ "_id": "getUniqueId"}).value()', {}, {nolock:1}, function(error, result) {
                req.session.uploadData[files[i].name].a = result;
                req.session.uploadData[files[i].name].d = {
                    width  : files[i].width,
                    height : files[i].height
                };
                req.session.save(function(error){
                    console.log(error);
                });
            });
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

exports.ImgurStorage = ImgurStorage;