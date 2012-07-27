/*
 * MongoDB Provider for Aliases
 *
 * f: From
 * t: To
 * r: reason
 * 
 */

'use strict';

var tagRegex = /^[0-9a-z\(\)-]+$/i;

var AliasProvider = function(database) {
    this.db = database;
};

AliasProvider.prototype.getCollection= function(callback) {
    this.db.collection('aliases', function(error, collection) {
        if( error ) callback(error);
        else callback(null, collection);
    });
};

AliasProvider.prototype.get = function(tag, callback) {
    if (tagRegex.test(tag)) {
        this.getCollection(function(error, collection){
            if (error) console.log('Error in AliasProvider.js(line 28): '+error);
            collection.findOne({f : tag }, function(error, resp) {
                if (error) console.log('Error in AliasProvider.js(line 30): '+error);
                callback(error, resp);
            });
        });
    } else {
        callback('Not found');
    }
};

AliasProvider.prototype.check = function(tag, callback) {
    this.get(tag, function(error, resp){
       if (resp) callback(null, resp.t);
       else callback(null, null);
    });
};

AliasProvider.prototype.page = function(page, offset, callback) {
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

exports.AliasProvider = AliasProvider;