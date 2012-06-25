/*
 * MongoDB Backend for Users
 *
 * User
 * u: name
 * p: hash?
 * e: email
 * m: {}
 *  j: join date
 *
 */

var userRegex = /^[0-9a-z\.\-\_]+$/i;

var crypto = require('crypto')
  , ObjectID = require('mongodb').ObjectID;

UserProvider = function(database) {
    this.db= database;
};

UserProvider.prototype.getCollection= function(callback) {
    this.db.collection('users', function(error, tag_collection) {
        if( error ) callback(error);
        else callback(null, tag_collection);
    });
};

UserProvider.prototype.findOne= function(user, callback) {
    if (userRegex.test(user.username)) {
        this.getCollection(function(error, collection) {
            if( error ) callback(error)
            else {
                regex = new RegExp("^"+user.username+"$", "i");
                collection.findOne( { u : regex }, function(error, results) {
                    if( error ) callback(error);
                    else {
                        callback(null, results);
                    }
                });
            }
        });
    } else {
        callback("Invalid Username");
    }
};

UserProvider.prototype.findById= function(id, callback) {
    this.getCollection(function(error, collection) {
        if( error ) callback(error)
        else {
            collection.findOne( { _id : new ObjectID(id) }, function(error, results) {
                if( error ) callback(error);
                else {
                    callback(null, results);
                }
            });
        }
    });
};

UserProvider.prototype.validate= function(user, password) {
    password = crypto.createHash('sha256').update(password).digest("hex");
    if (user.p == password) return true;
    return false;
};

UserProvider.prototype.findByToken= function(token, callback) {
    this.getCollection(function(error, collection) {
        if( error ) callback(error)
        else {
            collection.findOne( { 't.k' : token }, function(error, results) {
                if( error ) callback(error);
                else {
                    callback(null, results);
                }
            });
        }
    });
};

UserProvider.prototype.dropToken= function(user, callback) {
    this.getCollection(function(error, collection) {
        if( error ) callback(error)
        else {
            collection.update({ _id : user._id }, { $unset : { t : 1} }, {safe:true}, function(err, result) {
                if( error ) callback(error)
                else callback(null, result);
            });
        }
    });
}

UserProvider.prototype.createUser= function(user, password, emailaddress, callback) {
    var that = this;
    that.getCollection(function(error, collection) {
        if( error ) callback(error)
        else {
            var r = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            if (password.length < 6) {
                callback("Password needs to be at least six characters long.", null);
            } else if (user.length < 3) {
                callback("Username needs to be at least three characters long.", null);
            } else if (emailaddress.length < 6) {
                callback("You need to validate your email to use the board and the one you gave is clearly fake. Try again.", null);
            } else if (!r.test(emailaddress)) {
                callback("Invalid Email");
            } else {
                if (userRegex.test(user)) {
                    that.findOne({username : user}, function(error, result){
                        if (error)  {
                            callback(error, null);
                        } else if (result && result.u && result.u == user) {
                            callback("User already exists, if you have javascript on you should have seen a message saying as much.", null);
                        } else {
                            var token = crypto.createHash('sha1').update(user+(new Date()).getTime()+password).digest('hex').substr(Math.floor((Math.random()*30)+1), 8);
                            password = crypto.createHash('sha256').update(password).digest("hex");
                            user = {u: user, p: password, e: emailaddress, m: {j: new Date()}, t: {k: token, x:new Date()}};
                            collection.insert(user, function(err, result) {
                                if( error ) callback(error)
                                else callback(null, result[0]); //Returns an array when there should only ever be one result so we select 0.
                            });
                        }
                    });
                } else {
                    callback("Invalid characters in username. A-z, 0-9, and ._- are allowed. _ will be shown as a space for reference.");
                }
            }
        }
    });
};


exports.UserProvider = UserProvider;