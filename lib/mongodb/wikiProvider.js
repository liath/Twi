/*
 * MongoDB Backend for Wiki stuff
 *
 * Wiki
 * n: name
 * p: pretty name
 * d: description
 * r: unformatted description
 *  {
 *      u: username
 *      t: datetime
 *      m: description
 *  }
 * o: [dr, dr] old raws for history page - Should prolly limit the bounds of this
 * t: type (Tag vs not tag I guess)
 *      0 - Not a tag
 *      1 - Tag
 */

'use strict';

var WikiProvider = function(database) {
    this.db= database;
};

WikiProvider.prototype.getCollection= function(callback) {
    this.db.collection('wiki', function(error, wiki_collection) {
        if( error ) callback(error);
        else callback(null, wiki_collection);
    });
};

WikiProvider.prototype.fetch = function(name, callback) {
    this.getCollection(function(error, wiki_collection) {
        if( error ) callback(error);
        else {
            wiki_collection.findOne({n : name }, function(error, result){
                if (error) callback(error, null);
                else {
                    callback(null, result);
                }
            });
        }
    });
};

WikiProvider.prototype.update = function(entry, callback) {
    this.getCollection(function(error, wiki_collection) {
        if( error ) callback(error);
        else {
            wiki_collection.update({n : entry.n }, entry, {upsert:true}, function(error, result){
                callback(null, result);
            });
        }
    });
};

WikiProvider.prototype.page = function(page, offset, callback) {
    this.getCollection(function(error, collection) {
        if( error ) callback(error);
        else {
            page = page || 1;
            offset = offset || 25;
            collection.find().skip((page-1)*offset).limit(offset).toArray(function(error, results) {
                if( error ) callback(error);
                else callback(null, results);
            });
        }
    });
};

exports.WikiProvider = WikiProvider;