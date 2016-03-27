/* eslint one-var:0, no-var:0, func-names:0, prefer-arrow-callback:0, prefer-template:0 */
/*
 * MongoDB Provider for Implications
 *
 * f: Predicate
 * t: Consequent
 * r: reason
 *
 */


var ImplicationProvider = function (database) {
  this.db = database;
};

ImplicationProvider.prototype.get = function (tags, callback) {
  var i;
  this.db.find({
    f: {
      $in: (Array.isArray(tags)) ? tags : [tags]
    }
  }).toArray(function (error, resp) {
    var implications = [];
    for (i = 0; i < resp.length; i++) {
      implications.push(resp[i].t);
    }
    callback(error, implications);
  });
};

ImplicationProvider.prototype.page = function (page, offset, callback) {
  this.db.find().skip(((page || 1) - 1) * (offset || 25))
  .limit(offset || 25).toArray(function (error, results) {
    if (error) callback(error);
    else callback(null, results);
  });
};

exports.ImplicationProvider = ImplicationProvider;
