/* eslint one-var:0, no-var:0, func-names:0, prefer-arrow-callback:0, prefer-template:0 */
/*
 * MongoDB Backend for Images
 *
 * Images
 *  f: filePath
 *  d: source path
 *  m: metadata
 *  Exif/Created/Perhaps region info for tagging and commenting on parts of an image
 *  image size, posters name, content rating - Eg, Mature/Teen
 *  t: tags
 *  u: timestamp
 *  n: thumbnail
 *  i: md5
 *  s: Peer rating
 *  v: views
 *  a: numeric post id
 */

var imgRegex = /^[0-9a-f]+$/i;

var ImageProvider = function (database, resultsPerPage) {
  this.resultsLimit = resultsPerPage;
  this.db = database;
};

ImageProvider.prototype.getIndexPage = function (page, count, callback) {
  this.db.find().skip(((page || 1) - 1) * (count || 15))
    .limit(count || 15).toArray(function (error, results) {
      if (error) callback(error);
      else callback(null, results);
    });
};

ImageProvider.prototype.getByTags = function (tags, page, count, callback) {
  this.db.find({
    t: {
      $all: tags
    }
  }).skip(((page || 1) - 1) * (count || this.resultsLimit))
    .limit(count || this.resultsLimit).toArray(function (error, results) {
      if (error) callback(error);
      else callback(null, results);
    });
};

ImageProvider.prototype.getImage = function (id, callback) {
  if (imgRegex.test(id)) {
    this.db.findOne({
      a: id
    }, function (error, result) {
      if (error) callback(error); else {
        if (result === null) {
          callback('Invalid Post');
        } else {
          this.db.update({
            _id: result._id
          }, {
            $inc: {
              v: 1
            }
          });
          callback(null, result);
        }
      }
    });
  } else {
    callback('Invalid Post');
  }
};

ImageProvider.prototype.getBatch = function (search, callback) {
  var count = search.length;
  var found = [];
  var i;
  var checkImage = function (error, result) {
    found.push(result);
    --count;
    if (count === 0) callback(error, found);
  };
  if (count === 0) {
    callback(null, []);
  } else {
    for (i = 0; i < search.length; i++) {
      this.getImage(search[i], checkImage);
    }
  }
};

ImageProvider.prototype.getCount = function (callback) {
  this.db.count(function (error, result) {
    if (error) callback(error); else {
      callback(null, result);
    }
  });
};

ImageProvider.prototype.submitImages = function (images, callback) {
  var submit = (typeof (images.length) === 'undefined') ? images : [images];
  var image;
  var i;

  // This is gonna look crazy, but bear with me.
  var inserts = [];
  var fails = [];
  var count = submit.length;
  var insertCompleted = function (yay, nay) {
    var results = yay;
    if (yay && yay.length > 0) {
      if (nay.length > 0) results = results.concat(nay);
      callback(null, results);
    } else if (fails.length > 0) {
      callback(null, fails);
    } else {
      callback([{
        error: 'No posts were created.'
      }]);
    }
  };
  var inserter = function (img) {
    this.db.findOne({
      i: img.i
    }, function (error, result) {
      if (result) {
        fails.push({
          image: result.f,
          error: 'Image already exists.',
          path: '/post/' + result.a
        });
        --count;
        if (count === 0) {
          insertCompleted(inserts, fails);
        }
      } else {
        this.db.insert(img, function (err, results) {
          if (err) {
            fails.push({
              image: img.f,
              error: err
            });
          } else {
            inserts.push(results[0]); // Collapse the array returned to us.
          }
          --count;
          if (count === 0) {
            insertCompleted(inserts, fails);
          }
        });
      }
    });
  };
  for (i = 0; i < submit.length; i++) {
    image = submit[i];
    if (image.f === undefined || image.n === undefined || image.i === undefined) continue;
    image.u = new Date();
    image.s = 0;
    image.v = 0;
    if (image.t === undefined) image.t = [];
    if (image.m === undefined) {
      image.m = {
        views: 0
      };
    }
    inserter(image);
  }
};

ImageProvider.prototype.update = function (id, update, callback) {
  if (imgRegex.test(id)) {
    this.db.update({
      _id: id
    }, update, {
      safe: true
    }, function (err, result) {
      if (err) callback(err);
      else callback(null, result);
    });
  } else {
    callback('Invalid Image');
  }
};

exports.ImageProvider = ImageProvider;
