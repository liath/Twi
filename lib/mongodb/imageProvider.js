/*
 * MongoDB Backend for Images
 *
 * Images
 *  f: filePath
 *  d: source path
 *  m: metadata
 *  Exif/Created/Perhaps region info for tagging and commenting on parts of an image
 *  image size, posters name, content rating - Eg, Mature/Teen
 *  t: tags
 *  u: timestamp
 *  n: thumbnail
 *  i: md5
 *  s: Peer rating
 *  v: views
 *  a: numeric post id
 */

'use strict';

var imgRegex = /^[0-9a-f]+$/i;
var index = {
    current: false,
    list: {}
};

var ImageProvider = function(database, resultsPerPage) {
    this.resultsLimit = resultsPerPage;
    this.db = database;
};

ImageProvider.prototype.getCollection= function(callback) {
    this.db.collection('images', function(error, image_collection) {
        if( error ) callback(error);
        else callback(null, image_collection);
    });
};

ImageProvider.prototype.getIndexPage= function(page, count, callback) {
    this.getCollection(function(error, image_collection) {
        if( error ) callback(error);
        else {
            page = page || 1;
            count = count || 15;
            image_collection.find().skip((page-1)*count).limit(count).toArray(function(error, results) {
                if( error ) callback(error);
                else callback(null, results);
            });
        }
    });
};

ImageProvider.prototype.getByTags= function(tags,  page, count, callback) {
    var that = this;
    this.getCollection(function(error, image_collection) {
        if( error ) callback(error);
        else {
            if (page != null && page > 0) {
                page = 1;
            }
            if (count != null && count > 0) {
                count = that.resultsLimit;
            }
            image_collection.find( { t : { $all : tags } } ).skip((page-1)*count).limit(count).toArray(function(error, results) {
                if( error ) callback(error);
                else callback(null, results);
            });
        }
    });
};

ImageProvider.prototype.getImage= function(id, callback) {
    if (imgRegex.test(id)) {
        this.getCollection(function(error, image_collection) {
            if( error ) callback(error);
            else {
                image_collection.findOne({a : id}, function(error, result) {
                    if( error ) callback(error);
                    else {
                        if (result == null) {
                            callback("Invalid Post");
                        } else {
                            image_collection.update({ _id : result._id }, {$inc : { v : 1 }});
                            callback(null, result);
                        }
                    }
                });
            }
        });
    } else {
        callback("Invalid Post");
    }
};

ImageProvider.prototype.getBatch = function(search, callback) {
    var count = search.length;
    if (count == 0) {
        callback(null, []);
    } else {
        var found = [];

        for (var i = 0; i < search.length; i++) {
            this.getImage(search[i], function(error, result){
                found.push(result);
                --count;
                if (count == 0) callback(error, found);
            });
        }
    }
};

ImageProvider.prototype.getCount= function(callback) {
    this.getCollection(function(error, image_collection) {
        if( error ) callback(error);
        else {
            image_collection.count(function(error, result) {
                if( error ) callback(error);
                else {
                    callback(null, result);
                }
            });
        }
    });
};

ImageProvider.prototype.submitImages = function(images, callback) {
    this.getCollection(function(error, image_collection) {
        if( error ) callback(error);
        else {
            if( typeof(images.length)=="undefined")
                images = [images];

            //This is gonna look crazy, but bear with me.
            var insertCompleted = function (inserts, fails) {
                if (inserts && inserts.length > 0) {
                    var results = [];
                    if (fails.length > 0) results = results.concat(fails);
                    callback(null, results);
                } else if(fails.length > 0) {
                    callback(null, fails);
                } else {
                    callback([{'error' : 'No posts were created.'}]);
                }
            };
            var inserts = [];
            var fails = [];
            var count = images.length;
            for( var i =0;i< images.length;i++ ) {
                var image = images[i];
                if (image.f === undefined || image.n === undefined || image.i === undefined) continue;
                image.u = new Date();
                image.s = 0;
                image.v = 0;
                if( image.t === undefined ) image.t = [];
                if( image.m === undefined ) image.m = { views : 0 };

                image_collection.findOne({ i : image.i }, function (error, result) {
                    if (result) {
                        fails.push({ 'image': result.f, 'error' : 'Image already exists.', 'path' : '/post/'+result.a});
                        --count;
                        if (count == 0) {
                            insertCompleted(inserts, fails);
                        }
                    } else {
                        image_collection.insert(result, function(err, results) {
                            if (err) {
                                fails.push({ 'image' : result.f, 'error' : err})
                            } else {
                                inserts.push(results[0]); //Collapse the array returned to us.
                            }
                            --count;
                            if (count == 0) {
                                insertCompleted(inserts, fails);
                            }
                        });
                    }
                });
            }
        }
    });
};

ImageProvider.prototype.update = function(id, update, callback) {
    if (imgRegex.test(id)) {
        this.getCollection(function(error, image_collection) {
            if( error ) callback(error);
            else {
                image_collection.update({ _id : id }, update, {safe:true}, function(err, result) {
                    if( error ) callback(error);
                    else callback(null, result);
                });
            }
        });
    } else {
        callback("Invalid Image");
    }
};

exports.ImageProvider = ImageProvider;