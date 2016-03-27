/* eslint one-var:0, no-var:0, func-names:0, prefer-arrow-callback:0 */
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

var aUnique = function aUnique(a) {
    var b = {},
      c,
      d = a.length,
      e = [];
    for (c = 0; c < d; c += 1) b[a[c]] = a[c];
    for (c in b) if (b.hasOwnProperty(c)) e.push(b[c]);
    return e;
  },
  keywordify = function keywordify(string, current) {
    var words = string.split(/\W/gim),
      ret = [],
      i;

    for (i = 0; i < words.length; i++) {
      if (words[i].length < 3) continue;
      ret.push(words[i]);
    }
    ret = aUnique(ret.concat(current));
    return ret;
  },
  notIn = function notIn(a, b) { // We only need the values of a that aren't in b
    var r = [],
      i; // The different methods I thought up: http://jsperf.com/js-not-in-array
    // As Chrome ran IndexOf the fastest and node uses v8, that what I picked.
    for (i = 0; i < a.length; i++) {
      if (b.indexOf(a[i]) === -1) {
        r.push(a[i]);
      }
    }

    return r;
  },
  imgRegex = /^[0-9a-f]+$/i;

var CommentProvider = function (collection) {
  this.db = collection;
  this.db.ensureIndex('keywords');
};

CommentProvider.prototype.fetch = function (id, callback) {
  this.db.findOne({
    a: id
  }, function (err, result) {
    if (err) callback(err, null); else {
      callback(null, result);
    }
  });
};

CommentProvider.prototype.add = function (id, comment, callback) {
  var insert = comment;
  if (imgRegex.test(id)) {
    this.fetch(id, function (error, target) {
      if (target !== null) {
        insert.i = target.i;
        insert.r = 0;
        this.db.update({
          a: target.a
        }, {
          $inc: {
            i: 1
          },
          $push: {
            c: insert
          },
          $pushAll: {
            k: notIn(keywordify(comment.m, target.k), target.k)
          }
        }, {
          safe: true
        }, function (err, result) {
          if (error) callback(error);
          else callback(null, result);
        });
      } else { // Create new comment since one doesn't exist yet
        insert.i = 0;
        insert.r = 0;
        insert.a = id;
        insert.i = 1;
        insert.k = keywordify(comment.m, []);
        insert.c = [comment];

        this.db.insert(insert, {
          safe: true
        }, function (err, result) {
          if (error) callback(error);
          else callback(null, result);
        });
      }
    });
  } else {
    callback('Invalid Image');
  }
};

CommentProvider.prototype.page = function (page, offset, callback) {
  this.db.find().sort({
    $natural: -1
  }).skip(((page) ? page - 1 : 0) * (offset || 25))
  .limit(offset || 25).toArray(function (error, results) {
    if (error) callback(error);
    else callback(null, results);
  });
};

CommentProvider.prototype.search = function (query, page, offset, callback) {
  this.db.find({
    k: {
      $all: query.split(/\W/gim) // Take only the words in the query,
    }                            // we only index on words anyways
  }).sort({
    $natural: -1
  }).skip(((page) ? page - 1 : 0) * (offset || 25))
  .limit(offset || 25).toArray(function (error, results) {
    if (error) callback(error);
    else callback(null, results);
  });
};

exports.CommentProvider = CommentProvider;
