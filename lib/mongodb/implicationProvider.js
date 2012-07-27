/*
 * MongoDB Provider for Implications
 * 
 * n: tag slug
 * l: [] : list of tags it implies
 * r: reason
 *
 */

'use strict';

var ImplicationProvider = function(database) {
    this.db = database;
};

ImplicationProvider.prototype.getCollection= function(callback) {
    this.db.collection('implications', function(error, collection) {
        if( error ) callback(error);
        else callback(null, collection);
    });
};

ImplicationProvider.prototype.get = function(tags, callback) {
    tags = (Array.isArray(tags)) ? tags : [tags];
    this.getCollection(function(error, collection){
        if (error) console.log('Error in ImplicationProvider.js(line 26): '+error);
        collection.find({n : { $in : tags } }, function(error, resp) {
            if (error) console.log('Error in ImplicationProvider.js(line 28): '+error);
            var implications = [];
            for (var i = 0; i < resp.length; i++) implications.concat(resp[i].l);
            callback(error, implications);
        });
    });
};

ImplicationProvider.prototype.page = function(page, offset, callback) {
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

exports.ImplicationProvider = ImplicationProvider;