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
    this.current = false;
    this.list = [];
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

TagProvider.prototype.getTags= function(callback) {
    if (this.current) return this.list;
    else {
        this.current = true;
        this.getTagList(1,-1,function(error, result) {
            this.list = result;
            callback(error, result);
        });
    }
}

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
    if (tags.length > 0) {
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
        this.current = false;
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

TagProvider.prototype.rebuildCount = function(callback) {
    var that = this;
    this.db.collection('images', function(error, image_collection) {
        var map=function(){this.t.forEach(function(a){emit(a,1)})},
            red=function(a,c){var b=0;c.forEach(function(){++b});return b},
            prs=function(){
                db.tagData.find().forEach(function(v){
                    db.tags.update({n:v._id}, {$set:{c:v.value}});
                });
            };

        image_collection.mapReduce(map, red, {out: {merge:"tagData"}}, function(error, result){
            if (error) callback(error);
            else {
                that.db.eval(prs.toString(), {}, {nolock:1}, function(error, result) {
                    if (error) callback(error);
                    else {
                        callback(null, result);
                    }
                });
            }
        });

    });
}

exports.TagProvider = TagProvider;