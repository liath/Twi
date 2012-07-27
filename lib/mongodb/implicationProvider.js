/*
 * MongoDB Provider for Implications
 * 
 * n: tag slug
 * l: [] : list of tags it implies
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
        if (error) console.log('Error in ImplicationProvider.js(line 24): '+error);
        collection.find({n : { $in : tags } }, function(error, resp) {
            if (error) console.log('Error in ImplicationProvider.js(line 26): '+error);
            var implications = [];
            for (var i = 0; i < resp.length; i++) implications.concat(resp[i].l);
            callback(error, implications);
        });
    });
};

exports.ImplicationProvider = ImplicationProvider;