/*
 * Direct image storage provider
 *
 */
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
 */
imageMagick.identify.path = './res/ImageMagick/identify.exe';
imageMagick.convert.path = './res/ImageMagick/convert.exe';


DirectStorage = function(paths) {
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

//Middleware for storing the uploads
DirectStorage.prototype.Parse = function(req, res, imageProvider) {
    for(var i = 0; i <= req.files.length; i++) {
        if (req.files[i].type.substr(0,5) != 'image') continue;
        var h = crypto.createHash('md5');
        var f = fs.ReadStream(req.files[i].path);
        f.on('data', function(d) {
            h.update(d);
        });
        f.on('end', function() {
            var d = shasum.digest('hex')
              , newpath = this.serve+d+'.'+req.files[i].type.substr(6)
              , tmbpath   = this.serve+d+'-t.'+req.files[i].type.substr(6);

        });
    }
}
DirectStorage.prototype.Respond = function(files, callback) {
    var response = [];
    for(var i = 0; i < files.length; i++) {
        if (files[i].type.substr(0,5) == 'image') {
            var path = files[i].path.replace(/\\/g, '\\\\').replace(/\\/g, '/');
            var name = (path.substr(path.lastIndexOf('/')+1));
            var ext  = '.'+files[i].type.substr(6);
            var file  = this.store+name+ext
            var thumb = this.store+name+'-t'+ext;
            fs.rename(path, file, function(err) {
                if (err) console.log(err);
                else {
                    imageMagick.resize({
                        width   : opts.width,
                        height  : opts.height,
                        srcPath : file,
                        dstPath : thumb
                    }, function(err, stdout, stderr){
                        if (err) throw err
                        console.log(stderr);
                        console.log(stdout);
                    });
                }
            });

            response.push({
                'name'          : files[i].name,
                'size'          : files[i].size,
                'url'           : this.serve+name+ext,
                'thumbnail_url' : this.serve+name+'-t'+ext,
                'delete_url'    : '/u/delete/'+name,
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



exports.DirectStorage = DirectStorage;