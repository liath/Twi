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
 *  ci: comments count / incrementor for ids
 *  c: comments
 *      i: id, just an incrementor
 *      a: author
 *      m: message
 *      t: time
 *      r: rating (up/down votes)
 */

var imgRegex = /^[0-9a-f]+$/i;
var tagRegex = /^[0-9a-z_\(\)]+$/i;
var index = {
    current: false,
    list: {}
}
var bsonLib = require('mongodb').BSON;

ImageProvider = function(database, resultsPerPage) {
    resultsLimit = resultsPerPage;
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
        if( error ) callback(error)
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
    this.getCollection(function(error, image_collection) {
        if( error ) callback(error)
        else {
            if (page != null && page > 0) {
                page = 1;
            }
            if (count != null && count > 0) {
                count = resultsLimit;
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
            if( error ) callback(error)
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

ImageProvider.prototype.getCount= function(callback) {
    this.getCollection(function(error, image_collection) {
        if( error ) callback(error)
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
        if( error ) callback(error)
        else {
            if( typeof(images.length)=="undefined")
                images = [images];

            //This is gonna look crazy, but bear with me.
            var insertCompleted = function (inserts, fails) {
                if (inserts && inserts.length > 0) {
                    if (fails.length > 0) results = results.concat(fails);
                    callback(null, inserts);
                } else if(fails.length > 0) {
                    callback(null, fails);
                } else {
                    callback([{'error' : 'No posts were created.'}]);
                }
            }
            inserts = [];
            fails = [];
            var count = images.length;
            for( var i =0;i< images.length;i++ ) {
                var image = images[i];
                if (image.f === undefined || image.n === undefined || image.i === undefined) continue;
                image.u = new Date();
                image.c = [];
                image.ci = 0;
                image.s = 0;
                image.v = 0;
                if( image.t === undefined ) image.t = [];
                if( image.m === undefined ) image.m = { views : 0 };

                image_collection.findOne({ i : image.i }, function (error, result) {
                    if (result) {
                        fails.push({ 'image': image.f, 'error' : 'Image already exists.', 'path' : '/post/'+result.a});
                        --count;
                        if (count == 0) {
                            insertCompleted(inserts, fails);
                            return;
                        }
                    } else {
                        image_collection.insert(image, function(err, results) {
                            if (err) {
                                fails.push({ 'image' : image.f, 'error' : err})
                            } else {
                                inserts.push(results[0]); //Collapse the array returned to us.
                            }
                            --count;
                            if (count == 0) {
                                insertCompleted(inserts, fails);
                                return;
                            }
                        });
                    }
                });
            }
        }
    });
};

ImageProvider.prototype.addComment = function(id, comment, callback) {
    if (imgRegex.test(id)) {
        this.getCollection(function(error, image_collection) {
            if( error ) callback(error)
            else {
                image_collection.findOne({a : id}, function(error, image) {
                    if (image !== null) {
                        comment.i = image.ci;
                        comment.r = 0;
                        image_collection.update({ _id : image._id }, {$inc : { ci : 1}, $push : { c : comment }}, {safe:true}, function(err, result) {
                            if( error ) callback(error)
                            else callback(null, result);
                        });
                    } else {
                        callback("Post not found?");
                    }
                });
            }
        });
    } else {
        callback("Invalid Image");
    }
}

ImageProvider.prototype.update = function(id, update, callback) {
    if (imgRegex.test(id)) {
        this.getCollection(function(error, image_collection) {
            if( error ) callback(error)
            else {
                image_collection.update({ _id : id }, update, {safe:true}, function(err, result) {
                    if( error ) callback(error)
                    else callback(null, result);
                });
            }
        });
    } else {
        callback("Invalid Image");
    }
}

exports.ImageProvider = ImageProvider;