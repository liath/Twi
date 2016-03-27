/* eslint one-var:0, no-var:0, func-names:0, prefer-arrow-callback:0, prefer-template:0 */
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

var WikiProvider = function (database) {
  this.db = database;
};

WikiProvider.prototype.fetch = function (name, callback) {
  this.db.findOne({
    n: name
  }, function (error, result) {
    if (error) callback(error, null); else {
      callback(null, result);
    }
  });
};

WikiProvider.prototype.update = function (entry, callback) {
  this.db.update({
    n: entry.n
  }, entry, {
    upsert: true
  }, function (error, result) {
    callback(null, result);
  });
};

WikiProvider.prototype.page = function (page, offset, callback) {
  this.db.find().skip(((page || 1) - 1) * (offset || 25))
  .limit(offset || 25).toArray(function (error, results) {
    if (error) callback(error);
    else callback(null, results);
  });
};

exports.WikiProvider = WikiProvider;
