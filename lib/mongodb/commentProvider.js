/*
 * MongoDB Backend for Comments
 *
 * For now, I'm operating off the premise that all comments are linked to images
 *
 * Comments
 *  a: image.a
 *  i: Incrementor for comment ids
 *  k: keywords
 *  c: comments
 *      i: id, just an incrementor
 *      a: author
 *      m: message
 *      t: time
 *      r: rating (up/down votes)
 */

'use strict';

var aUnique = function(a){var b={},c,d=a.length,e=[];for(c=0;c<d;c+=1)b[a[c]]=a[c];for(c in b)if(b.hasOwnProperty(c))e.push(b[c]);return e;}
    , keywordify = function(string, current) {
        var words = string.split(/\W/gim),
            ret = [];

        for (var i = 0; i < words.length; i++) {
            if (words[i].length < 3) continue;
            ret.push(words[i]);
        }
        ret = aUnique(ret.concat(current));
        return ret;
    }
    , notIn = function(a, b) { //We only need the values of a that aren't in b
        var r = [];            // The different methods I thought up: http://jsperf.com/js-not-in-array
                               // As Chrome ran IndexOf the fastest and node uses v8, that what I picked.
        for (var i = 0; i < a.length; i++) {
            if (b.indexOf(a[i]) == -1) {
                r.push(a[i]);
            }
        }

        return r;
    }
    , imgRegex = /^[0-9a-f]+$/i;

var CommentProvider = function(database) {
    this.db = database;
    this.db.ensureIndex('comments', { keywords : 1});
};

CommentProvider.prototype.getCollection= function(callback) {
    this.db.collection('comments', function(error, collection) {
        if( error ) callback(error);
        else callback(null, collection);
    });
};

CommentProvider.prototype.fetch = function(id, callback) {
    this.getCollection(function(error, collection) {
        if( error ) callback(error);
        else {
            collection.findOne({a : id }, function(error, result){
                if (error) callback(error, null);
                else {
                    callback(null, result);
                }
            });
        }
    });
};

CommentProvider.prototype.add = function(id, comment, callback) {
    if (imgRegex.test(id)) {
        var that  = this;
        this.getCollection(function(error, collection) {
            that.fetch(id, function(error, target) {
                if (target !== null) {
                    comment.i = target.i;
                    comment.r = 0;
                    var keywords = keywordify(comment.m, target.k);
                    keywords = notIn(keywords, target.k);
                    collection.update({ a: target.a }, {$inc : { i : 1}, $push : { c : comment }, $pushAll : {k : keywords}}, {safe:true}, function(err, result) {
                        if( error ) callback(error);
                        else callback(null, result);
                    });
                } else { // Create new comment since one doesn't exist yet
                    comment.i = 0;
                    comment.r = 0;
                    target = {
                        a: id,
                        i: 1,
                        k: keywordify(comment.m, []),
                        c: [comment]
                    };
                    collection.insert(target, {safe:true}, function(err, result) {
                        if( error ) callback(error);
                        else callback(null, result);
                    });
                }
            });
        });
    } else {
        callback("Invalid Image");
    }
};


CommentProvider.prototype.page = function(page, offset, callback) {
    this.getCollection(function(error, collection) {
        if( error ) callback(error);
        else {
            page = page || 1;
            offset = offset || 25;
            collection.find().sort({$natural:-1}).skip((page-1)*offset).limit(offset).toArray(function(error, results) {
                if( error ) callback(error);
                else callback(null, results);
            });
        }
    });
};

CommentProvider.prototype.search = function(query, page, offset, callback) {
    this.getCollection(function(error, collection) {
        if( error ) callback(error);
        else {
            query = query.split(/\W/gim); //Take only the words in the query, we only index on words anyways
            page = page || 1;
            offset = offset || 25;
            collection.find({ k : { $all : query } }).sort({$natural:-1}).skip((page-1)*offset).limit(offset).toArray(function(error, results) {
                if( error ) callback(error);
                else callback(null, results);
            });
        }
    });
};

exports.CommentProvider = CommentProvider;