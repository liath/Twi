// Upload routes

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

                for(var i = 0; i < files.length; i++) { //Setup session data for the next callback so it's hopefully in place by the time it's needed :D
                    var j = i;
                    db.eval('db.code.findOne({ "_id": "getUniqueId"}).value()', {}, {nolock:1}, function(error, result) {
                        var i = j;
                        var fileid = files[i].id;
                        req.session.uploads.push(fileid);
                        req.session.uploadData[fileid] = files[i];
                        req.session.uploadData[fileid].a = result;
                        req.session.uploadData[fileid].d = {
                            width  : req.body.files[i].width, //This concerns me but I'm unsure why
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
            if (req.session.uploads.indexOf(req.param('name')) >= 0) {
                req.session.uploads.splice(req.session.uploads.indexOf(req.param('name')), 1);
                delete req.session.uploadData[req.param('name')];
                if (app.twi.options.upload.method == "direct") {
                    fs.readdir(app.twi.options.upload.paths.store, function(error, result) {
                        var files = minimatch.match(result, req.param('name')+'*', {});
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
            var name = req.param('name');
            if (req.session.uploads.indexOf(name) != -1) {
                var data = req.session.uploadData[name];
                //Make sure tags are slugged
                var tags = [];
                for(var i = 0; i < req.body.tags.length; i++) {
                    if (typeof(req.body.tags[i]) != 'object') continue; //Silently drop malformed tags

                    var tag = { //Reparse their slug name in the off chance someone is being sneaky I guess
                        p : req.body.tags[i].p,
                        n : req.body.tags[i].p.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                        m : {
                            a : req.user.u
                        }   //Grats, you just became the author of this tag.
                    }       //   assuming the tag doesn't already have an author.

                    //Spawn a call to insert the tag if it isn't already present
                    app.providers.tagProvider.checkTag(tag);
                    //Push the slug and move on
                    tags.push(tag.n);
                }
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
                }
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
                            app.providers.tagProvider.rebuildCount(function(error, result){console.log('Tag Rebuil Error (app.js:538): '+error);});
                            app.providers.tagProvider.current = false;
                            //Theres got to be a more efficient way to do this
                        }
                    }
                })

                // Cleanup session data
                req.session.uploads.splice(req.session.uploads.indexOf(name), 1);
                delete req.session.uploadData[name];
            } else {
                res.json([{"error" : "You didn\'t upload this file! What are you playing at?." }]);
            }
        } else {
            res.json([{"error" : "You must be logged in to manage files." }]);
        }
    });
}