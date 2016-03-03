// Upload routes

'use strict';

var aUnique = function(a){var b={},c,d=a.length,e=[];for(c=0;c<d;c+=1)b[a[c]]=a[c];for(c in b)if(b.hasOwnProperty(c))e.push(b[c]);return e;};

module.exports = function(app){
    if (app.twi.options.upload.method == "direct") {
        var fs = require('fs')
            , crypto = require('crypto')
            , minimatch = require("minimatch");
    }
    app.get('/upload', function(req, res) {
        var data = {active: 'upload/'};
        if (app.twi.options.upload.method == "imgur") data.imgur = app.twi.options.upload.imgur;
        res.render('includes/upload/'+app.twi.options.upload.method+'.jade', data);
    });

    //Fixes odd bug in the upload form
    app.get('/u/create', function(req, res) {
        res.send(' ');
    });

    app.post('/u/create', function(req, res) {
        if (req.isAuthenticated()) {
            app.providers.fileProvider.Respond(req, function(error, files) { //Handle response
                if (typeof(req.session.uploads) == 'undefined') req.session.uploads = [];
                if (typeof(req.session.uploadData) == 'undefined') req.session.uploadData = {};

                var immutablePlz = function(i) {
                    app.db.eval('db.code.findOne({ "_id": "getUniqueId"}).value()', {}, {nolock:1}, function(error, result) {
                        var fileid = files[i].id;
                        req.session.uploads.push(fileid);
                        req.session.uploadData[fileid] = files[i];
                        req.session.uploadData[fileid].a = result;
                        req.session.uploadData[fileid].d = {
                            width  : req.body.files[i].width,
                            height : req.body.files[i].height
                        };
                        if (app.twi.options.upload.method == "direct") {
                            var h = crypto.createHash('md5');
                            var f = fs.ReadStream(app.twi.options.upload.paths.store+name+data.ext);
                            f.on('data', function(d) {
                                h.update(d);
                            });
                            f.on('end', function() {
                                req.session.uploadData[fileid].h = h.digest('hex');
                                req.session.save(function(error){
                                    if (error) console.log("Session save error: "+error);
                                });
                            });
                        } else {
                            req.session.save(function(error){
                                if (error) console.log("Session save error (app.js:447): "+error);
                            });
                        }
                    });
                };
                for(var i = 0; i < files.length; i++) {
                    immutablePlz(i);
                }
                res.json(files);
            });
        } else {
            if (app.twi.options.upload.method == "direct") {
                for (var i = 0; i < req.files.files.length; i++) {
                    fs.unlink(req.files.files[i].path);
                }
            }
            res.json([{"error" : "You must be logged in to upload." }]);
        }
    });

    //Note we don't clean up after ourselves on imgur because it would cost us "points" :<
    app.delete('/u/delete/:name', function(req, res) {
        if (req.isAuthenticated()) {
            if (req.session.uploads.indexOf(req.params('name')) >= 0) {
                req.session.uploads.splice(req.session.uploads.indexOf(req.params('name')), 1);
                delete req.session.uploadData[req.params('name')];
                if (app.twi.options.upload.method == "direct") {
                    fs.readdir(app.twi.options.upload.paths.store, function(error, result) {
                        var files = minimatch.match(result, req.params('name')+'*', {});
                        for (var i = 0; i < files.length; i++) {
                            fs.unlink(app.twi.options.upload.paths.store+files[i]);
                        }
                    });
                }
                res.json([{"success" : 1 }]);
            } else {
                res.json([{"error" : "You don\'t have permission to remove this image." }]);
            }
        } else {
            res.json([{"error" : "You must be logged in to manage files." }]);
        }
    });
    app.post('/u/insert/:name', function(req, res) {
        if (req.isAuthenticated()) {
            var name = req.params('name');
            if (req.session.uploads.indexOf(name) != -1) {
                var data = req.session.uploadData[name];
                var tags = [];

                var respond = function() {
                    app.providers.implicationProvider.get(tags, function(error, implications){
                        tags = aUnique(tags.concat(implications));
                        var image = {
                            f: data.url,
                            d: ((req.body.source) ? req.body.source : null), //Why did I do this?
                            m: {
                                u: req.user.u,
                                s: data.size,
                                d: {
                                    w: data.d.width,
                                    h: data.d.height
                                }
                            },
                            t: tags,
                            u: new Date(),
                            n: data.thumbnail_url,
                            i: data.h,
                            a: data.a
                        };
                        app.providers.imageProvider.submitImages([image], function(error, result) {
                            if (error) {
                                console.log('Image Insert error (app.js:528):'+error);
                                res.json(error);
                            } else {
                                //submitImages supports arrays and acts as such, we'll only ever send it a single item here so we collapse its response
                                result = result[0];
                                res.json(result);
                                //Now for the stuff that isn't relevant to the upload form
                                if (!result.error) {
                                    //Rebuild the tag table
                                    app.providers.tagProvider.rebuildCount(function(error){
                                        if (error) console.log('Tag Rebuild Error (routes-upload.js:146): '+error);
                                    });
                                    app.providers.tagProvider.current = false;
                                }
                            }
                        });

                        // Cleanup session data
                        req.session.uploads.splice(req.session.uploads.indexOf(name), 1);
                        delete req.session.uploadData[name];
                    });
                };

                var taglist = req.body.tags;
                var track = taglist.length;
                for(var i = 0; i < taglist.length; i++) {
                    if (typeof(taglist[i]) != 'object') continue; //Silently drop malformed tags

                    (function(target){
                        app.providers.aliasProvider.check(target.n, function(error, result){
                            var tag = {};
                            if (result) {
                                tag = { //We can leave everything blank as if an alias exists then the tag must also exist
                                    p: '',
                                    n: result,
                                    m: {}
                                }
                            } else {
                                tag = { //Re-parse their slug name in the off chance someone is being sneaky I guess
                                    p : target.p,
                                    n : target.p.toLowerCase().replace(/[^a-z0-9-\(\)]/g, '-'),
                                    m : {
                                        a : req.user.u
                                    }   //Grats, you just became the author of this tag.
                                };      //   assuming the tag doesn't already have an author.
                            }

                            //Inserts non-existent tags and retrieves existent ones
                            app.providers.tagProvider.checkTag(tag, function(error, resp){
                                //Push the slug and move on
                                tags.push(resp.n);
                                --track;
                                if (track === 0) {
                                    respond();
                                }
                            });
                        });
                    })(taglist[i]);

                }
            } else {
                res.json([{"error" : "You didn\'t upload this file! What are you playing at?." }]);
            }
        } else {
            res.json([{"error" : "You must be logged in to manage files." }]);
        }
    });
};