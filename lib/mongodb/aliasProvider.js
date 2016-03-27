/* eslint one-var:0, no-var:0, func-names:0, prefer-arrow-callback:0, prefer-template:0 */
/*
 * MongoDB Provider for Aliases
 *
 * f: From
 * t: To
 * r: reason
 *
 */

var tagRegex = /^[0-9a-z\(\)-]+$/i;

var AliasProvider = function (database) {
  this.db = database;
};

AliasProvider.prototype.get = function (tag, callback) {
  if (tagRegex.test(tag)) {
    this.db.findOne({
      f: tag
    }, function (error, resp) {
      callback(error, resp);
    });
  } else {
    callback('Not found');
  }
};

AliasProvider.prototype.check = function (tag, callback) {
  this.get(tag, function (error, resp) {
    if (resp) callback(null, resp.t);
    else callback(null, null);
  });
};

AliasProvider.prototype.page = function (page, offset, callback) {
  this.db.find().skip(((page || 1) - 1) * (offset || 25))
  .limit(offset || 25).toArray(function (error, results) {
    if (error) callback(error);
    else callback(null, results);
  });
};

exports.AliasProvider = AliasProvider;
