/*
 * Direct image storage provider
 *
 */

'use strict';

var imageMagick = require('imagemagick')
  , fs = require('fs')
  , opts = {
        width: 200,
        height: 200
    };

/* WINDOWS Only!
 * Download ImageMagick from http://www.imagemagick.org/script/binary-releases.php
 * You'll want the Portable one (ImageMagick-6.7.7-2-Q16-windows.zip at time of writing)
 * drop the folder inside that zip into the root folder. Where app.js is.
 * then uncomment and adjust the lines below.
 *
 * *nix - Depends on your distro, prolly something like /usr/bin/identify
 */
imageMagick.identify.path = './res/ImageMagick/identify.exe';
imageMagick.convert.path = './res/ImageMagick/convert.exe';


var DirectStorage = function(opts) {
    var paths = opts.upload.paths;
    if (typeof(paths) != "undefined") {
        this.temp  = (paths.temp.substr(-1,1) == '/') ? paths.temp : paths.temp+'/';
        this.store  = (paths.store.substr(-1,1) == '/') ? paths.store : paths.store+'/';
        this.serve  = (paths.serve.substr(-1,1) == '/') ? paths.serve : paths.serve+'/';
    } else {
        this.temp  = __dirname+'/uploads/';
        this.store = './public/images/';
        this.serve = '/public/images/';
    }
    this.temp = this.temp.replace(/\\/g, '\\\\').replace(/\\/g, '/');
    this.store = this.store.replace(/\\/g, '\\\\').replace(/\\/g, '/');
    this.serve = this.serve.replace(/\\/g, '\\\\').replace(/\\/g, '/');
};

DirectStorage.prototype.Respond = function(req, callback) {
    var files = req.files.files;
    var response = [];
    for(var i = 0; i < files.length; i++) {
        if (files[i].type.substr(0,5) == 'image') {
            var path = files[i].path.replace(/\\/g, '\\\\').replace(/\\/g, '/');
            var name = (path.substr(path.lastIndexOf('/')+1));
            var ext  = '.'+files[i].type.substr(6);
            var file  = this.store+name+ext;
            var thumb = this.store+name+'-t'+ext;
            (function(file, thumb, name){
                fs.rename(path, file, function(err) {
                    if (err) console.log(err);
                    else {
                        imageMagick.resize({
                            width   : opts.width,
                            height  : opts.height,
                            srcPath : file,
                            dstPath : thumb
                        }, function(err){
                            if (err) throw err;
                            imageMagick.identify(file, function(err, results){
                                db.eval('db.code.findOne({ "_id": "getUniqueId"}).value()', {}, {nolock:1}, function(error, result) {
                                    //Result is the ID from the above and results is the IM identify output - just clarifying
                                    req.session.uploadData[name].a = result;
                                    req.session.uploadData[name].d = {
                                        width  : results.width,
                                        height : results.height
                                    };
                                    req.session.save(function(error){
                                        console.log(error);
                                    });
                                });
                            });
                        });
                    }
                });
            })(file, thumb, name);


            response.push({
                'name'          : files[i].name,
                'size'          : files[i].size,
                'ext'           : ext,
                'url'           : this.serve+name+ext,
                'thumbnail_url' : this.serve+name+'-t'+ext,
                'delete_url'    : '/u/delete/'+name,
                'delete_type'   : 'DELETE',
                'id'            : name
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



exports.DirectStorage = Storage;