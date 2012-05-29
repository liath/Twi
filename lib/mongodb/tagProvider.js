/*
 * MongoDB Backend for Tags
 *
 * Tags
 * n: name
 * p: pretty name
 * d: description
 * u: timestamp
 * m: array: random/unsure
 * a: array: aliases
 * c: count of posts using this tag
 *
 * TODO: Edit tag, handle c: and p:
 */

var tagRegex = /^[0-9a-z_\(\)]+$/i;
var resultsLimit = 30;

TagProvider = function(database) {
    this.db= database;
};

TagProvider.prototype.getCollection= function(callback) {
    this.db.collection('tags', function(error, tag_collection) {
        if( error ) callback(error);
        else callback(null, tag_collection);
    });
};

TagProvider.prototype.getTagList= function(page, count, callback) {
    this.getCollection(function(error, tag_collection) {
        if( error ) callback(error)
        else {
            if (page != null && page > 0) {
                page = 1;
            }
            if (count != null && count > 0) {
                count = resultsLimit;
            }
            tag_collection.find({}, {_id:0, u:0, c:0}).skip((page-1)*count).limit(count).toArray(function(error, results) {
                if( error ) callback(error);
                else callback(null, results);
            });
        }
    });
};

TagProvider.prototype.getInfo= function(search, callback) {
    tags = [];
    if (Array.isArray(search)) {
        for( var i =0;i< search.length;i++ ) {
            if (tagRegex.test(search[i])) {
                tags.push(search[i]);
            }
        }
    } else {
        if (tagRegex.test(search)) {
            tags.push(search)
        }
    }
    if (search.length > 0) {
        this.getCollection(function(error, tag_collection) {
            if( error ) callback(error)
            else {
                tag_collection.find({n : {$in : search}}).toArray(function(error, result) {
                    if( error ) callback(error);
                    else callback(null, result);
                });
            }
        });
    } else {
        callback("Invalid Tag name");
    }
};

TagProvider.prototype.create= function(name, description, author, callback) {
    if (tagRegex.test(name)) {
        this.getCollection(function(error, tag_collection) {
            if( error ) callback(error)
            else {
                tag_collection.findOne({n : name}, function(error, result) {
                    if( error ) callback(error);
                    else if (result !== null) {
                        tag = {n: name, d: description, u: new Date(), m: {a: author}, a: []};
                        tag_collection.insert(tag, function() {
                            callback(null, tag);
                        });
                    } else {
                        callback("Tag already exists");
                    }
                });
            }
        });
    } else {
        callback("Invalid Tag name");
    }
};

exports.TagProvider = TagProvider;