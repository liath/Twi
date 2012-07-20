/*
 * MongoDB Backend for Comments
 *
 * For now, I'm operating off the premise that all comments are linked to images
 *
 * Comments
 *  a: image.a
 *  i: Incrementor for comment ids
 *  c: comments
 *      i: id, just an incrementor
 *      a: author
 *      m: message
 *      t: time
 *      r: rating (up/down votes)
 */

var imgRegex = /^[0-9a-f]+$/i;

CommentProvider = function(database) {
    this.db = database;
};

CommentProvider.prototype.getCollection= function(callback) {
    this.db.collection('comments', function(error, collection) {
        if( error ) callback(error);
        else callback(null, collection);
    });
};

CommentProvider.prototype.fetch = function(id, callback) {
    this.getCollection(function(error, collection) {
        if( error ) callback(error)
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
                    collection.update({ a: target.a }, {$inc : { i : 1}, $push : { c : comment }}, {safe:true}, function(err, result) {
                        if( error ) callback(error)
                        else callback(null, result);
                    });
                } else { // Create new comment since one doesn't exist yet
                    comment.i = 0;
                    comment.r = 0;
                    var target = {
                        a: id,
                        i: 1,
                        c: [comment]
                    }
                    collection.insert(target, {safe:true}, function(err, result) {
                        if( error ) callback(error)
                        else callback(null, result);
                    });
                }
            });
        });
    } else {
        callback("Invalid Image");
    }
}


CommentProvider.prototype.page = function(page, offset, callback) {
    this.getCollection(function(error, collection) {
        if( error ) callback(error)
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

exports.CommentProvider = CommentProvider;