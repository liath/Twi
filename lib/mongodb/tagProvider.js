/* eslint one-var:0, no-var:0, func-names:0, prefer-arrow-callback:0, prefer-template:0 */
/* eslint no-console:0, no-undef:0 */
/*
 * MongoDB Backend for Tags
 *
 * Tags
 * n: name
 * p: pretty name
 * u: timestamp
 * m: array: random/unsure
 * c: count of posts using this tag
 *
 */

var tagRegex = /^[0-9a-z\(\)-]+$/i;
var resultsLimit = 30;

var TagProvider = function (database) {
  this.db = database;
  // Keeps track of whether or not the local list of tags is up to date
  this.current = false;
  // List of all tag data
  this.list = [];
  // Pool of callbacks waiting on a rebuild,
  // I don't even know if one instance can respond to anothers requests
  this.gtPool = []; // So this will be fun...
  // Flag that says getTags is rebuilding
  this.rebuild = false;
  // Timestamp of last rebuild
  this.rebuildExpire = Math.round((new Date()).getTime() / 1000);
  // Rebuild every x seconds. This would be better moved to something
  // like redis so all threads can share an update
  this.rebuildTime = 10;
};


TagProvider.prototype.page = function (page, count, callback) {
  this.db.find({}, {
    _id: 0
  }).skip(((page || 1) - 1) * (count || resultsLimit))
  .limit(count || resultsLimit).toArray(function (error, results) {
    if (error) callback(error);
    else callback(null, results);
  });
};

TagProvider.prototype.getTags = function (callback) {
  var that = this;
  if (this.current &&
    ((Math.round((new Date()).getTime() / 1000)) - this.rebuildExpire) < this.rebuildTime) {
    callback(null, this.list);
  } else {
    if (this.rebuild) {
      this.gtPool.push(callback);
      return;
    }
    this.rebuild = true;
    this.list = {};
    this.page(1, 0, function (error, input) {
      var result = input;
      var i;
      var c;
      for (i = 0; i < result.length; i++) {
        c = false;
        if (!result[i].n && !result[i].p) {
          console.log('Ghosted tag detected');
          console.log(result[i]);
          continue;
        } else if (!result[i].p) {
          result[i].p = result[i].n.replace(/-/g, ' ').replace(/\w\S*/g, function (txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
          });
          c = true;
        } else if (!result[i].n) { // Note that this 'if' being hit is very unlikely.
          c = true;                // Iunno what would cause it, so it's here as 'just in case'
          result[i].n = result[i].p.toLowerCase().replace(/[^a-z0-9-\(\)]/g, '-');
        }
        if (typeof (result[i].m) === 'undefined') {
          result[i].m = {};
          c = true;
        }
        if (typeof (result[i].u) === 'undefined') {
          result[i].u = new Date();
          c = true;
        }
        if (c) {
          that.update(result[i], function (err, res) {
            console.log('Recovered tag: ' + res.n);
          });
        }
        that.list[result[i].n] = result[i];
      }
      that.current = true;
      that.rebuild = false;
      that.rebuildExpire = Math.round((new Date()).getTime() / 1000);
      callback(error, that.list);

      // We've already unblocked processing by here so the bucket shouldn't grow.
      for (i = 0; i < that.gtPool.length; i++) {
        that.gtPool[i](error, that.list);
      }
      that.gtPool = [];
    });
  }
};

TagProvider.prototype.getInfo = function (search, callback) {
  var tags = [];
  var i;

  if (Array.isArray(search)) {
    for (i = 0; i < search.length; i++) {
      if (tagRegex.test(search[i])) {
        tags.push(search[i]);
      }
    }
  } else {
    if (tagRegex.test(search)) {
      tags.push(search);
    }
  }
  if (tags.length > 0) {
    // Lets getTags decide if a database call is needed.
    this.getTags(function (error, taglist) {
      var resp = [];
      for (i = 0; i < tags.length; i++) {
        if (taglist[tags[i]]) resp.push(taglist[tags[i]]);
      }
      if (error) callback(error);
      else callback(null, resp);
    });
  } else {
    callback('Invalid Tag name');
  }
};

// Exportable blind update
TagProvider.prototype.update = function (tag, callback) {
  this.db.update({
    n: tag.n
  }, tag, {
    upsert: true
  }, function () {
    this.current = false;
    this.getInfo(tag.n, function (error, result) {
      callback(error, result);
    });
  });
};


// Check if a tag exists already, if not create it.
TagProvider.prototype.checkTag = function (input, callback) {
  var tag = input;
  if (tagRegex.test(tag.n)) {
    this.getTags(function () { // Make sure the below works somehow
      var valid = this.list[tag.n] || false;
      if (!valid) {
        tag.u = tag.u || new Date();
        tag.m = tag.m || {};
        tag.a = tag.a || [];
        tag.c = tag.c || 0;

        this.db.insert(tag, function (error, result) {
          if (result) {
            this.current = false;
          }
          if (callback) callback(error, result[0]);
        });
      } else {
        if (callback) callback(null, valid);
      }
    });
  }
};

// Rebuilds the counters for how many images use a tag
TagProvider.prototype.rebuildCount = function (callback) {
  var map = function () {
      this.t.forEach(function (a) {
        emit(a, 1);
      });
    },
    red = function (a, c) {
      var b = 0;
      c.forEach(function () {
        ++b;
      });
      return b;
    },
    prs = function () {
      db.tagData.find().forEach(function (v) {
        db.tags.update({
          n: v._id
        }, {
          $set: {
            c: v.value
          }
        }, true);
      });
    };

  this.db.mapReduce(map, red, {
    out: {
      merge: 'tagData'
    }
  }, function (error) {
    if (error) callback(error); else {
      this.db.eval(prs.toString(), {}, {
        nolock: 1
      }, function (err, res) {
        if (err) callback(err); else {
          callback(null, res);
        }
      });
    }
  });
};

// Remove unused tags
TagProvider.prototype.reaper = function (callback) {
  this.rebuildCount(function () {
    this.db.remove({
      c: 0
    }, function (error, result) {
      if (error) callback(error);
      else callback(null, result);
    });
  });
};

exports.TagProvider = TagProvider;
