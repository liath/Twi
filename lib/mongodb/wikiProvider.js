/*
 * MongoDB Backend for Wiki stuff
 *
 * Tags
 * n: name
 * d: description
 * r: unformatted description
 *  {
 *      u: username
 *      t: datetime
 *      m: description
 *  }
 * o: [dr, dr] old raws for history page - Should prolly limit the bounds of this
 *
 */

WikiProvider = function(database) {
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
        if( error ) callback(error)
        else {
            wiki_collection.findOne({n : name }, function(error, result){
                if (error) callback(error, null);
                else {
                    if (typeof(result.n) === 'string') {
                        callback(null, result);
                    } else {
                        callback(null, {
                            n: name,
                            d: '',
                            r: {
                                u: null,
                                t: null,
                                m: ''
                            },
                            o: []
                        });
                    }
                }
            });
        }
    });
};

WikiProvider.prototype.update = function(entry, callback) {
    this.getCollection(function(error, wiki_collection) {
        if( error ) callback(error)
        else {
            wiki_collection.update({n : entry.n }, entry, true, function(error, result){
                callback(null, result);
            });
        }
    });
};

exports.WikiProvider = WikiProvider;