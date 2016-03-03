//Posting routes

'use strict';

//Make unique
var aUnique = function(a){var b={},c,d=a.length,e=[];for(c=0;c<d;c+=1)b[a[c]]=a[c];for(c in b)if(b.hasOwnProperty(c))e.push(b[c]);return e;};

module.exports = function(app){
    // View post
    app.get(/^\/post\/([a-zA-Z0-9]+)(?:\/(.*))?/, function(req, res) {
        app.providers.imageProvider.getImage(req.params[0], function(error, image) {
            if (error) {
                req.flash('error', error);
                res.redirect('/post')
            } else {
                app.providers.commentProvider.fetch(image.a, function(error, comment) {
                    comment = comment || {c:[]};
                    app.providers.tagProvider.getInfo(image.t, function(error, tagdata) {
                        tagdata = tagdata || [];
                        res.render('view/post.jade', {
                            active: '',
                            image: image,
                            tags: tagdata,
                            comment: comment
                        })
                    });
                });
            }
        });
    });
    //Update post
    app.post(/^\/post\/([a-zA-Z0-9]+)(?:\/(.*))?/, function(req, res) {
        var id = req.params[0];
        if (!req.isAuthenticated()) {
            req.flash('error', 'You must be logged in to edit posts.');
            res.redirect('/post/'+id);
        } else {
            app.providers.imageProvider.getImage(id, function(error, image) {
                if (error) {
                    req.flash('error', error);
                    res.redirect('/post/'+req.params[0]);
                } else {
                    var update = {$set : {}};

                    //Content Rating
                    var cr = req.body.contentRating;
                    var r = ['Safe', 'Questionable', 'Explicit'];
                    if (cr && r.indexOf(cr) >= 0) {
                        update.$set['m.r'] = ((r.indexOf(cr))+1);
                    }

                    //Source
                    if (req.body.source && req.body.source.length > 1) {    //The length check is kind of arbitrary but I was
                        update.$set.d = req.body.source;                    // thinking an artist who uploaded something could
                    }                                                       // very well say 'me' and still be valid.

                    //Tags
                    if (req.body.tags) {
                        var tags = req.body.tags.split(",");
                        var nt = [];
                        for (var i = 0; i < tags.length; i++) {
                            var s = tags[i];
                            s = s.replace(/(^\s*)|(\s*$)/gi,"");
                            s = s.replace(/[ ]{2,}/gi," ");
                            s = s.replace(/\n /,"\n");
                            if (s.length == 0) continue;
                            var tag = {
                                //Proper Case
                                p : s.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();}),
                                //Sluggify
                                n : s.toLowerCase().replace(/[^a-z0-9-\(\)]/g, '-'),
                                //If tag exists already this will just be ignored.
                                m : { a : req.user.u }
                            };
                            nt.push(tag.n); //We only want slugs in image.t
                            app.providers.tagProvider.checkTag(tag); //Inserts tag is it doesnt exists
                        }
                        update.$set.t = nt;
                    }

                    app.providers.imageProvider.update(image._id, update, function(error) {
                        if (error) {
                            console.log('Image Edit Error (routes-post.js:84): '+error);
                            req.flash('error', req.flash('info', 'Changes applied successfully!'));
                        } else {
                            req.flash('info', 'Changes applied successfully!');

                            //Do a rebuild on tags now
                            app.providers.tagProvider.rebuildCount(function(error){
                                if (error) console.log('Tag Rebuild Error (routes-post.js:90): '+error);
                            });
                            app.providers.tagProvider.current = false;
                        }
                        res.redirect('/post/'+id);
                    });
                }
            });
        }
    });

    // Add comment
    app.post('/s/comment/:id', function(req, res) {
        if (!req.isAuthenticated()) {
            req.flash('error', 'You must be logged in to comment.');
            res.redirect('/post/'+req.params('id'))
        } else {
            //Parse comment
            var comment = {
                a: req.user.u,
                t: new Date(),
                m: req.body.message.replace(/</g, '')
            };
            app.providers.commentProvider.add(req.params('id'), comment, function(error){
                if (error) req.flash('error', error);
                else req.flash('info', 'Your post has been added!');
                res.redirect('/post/'+req.params('id'))
            });
        }
    });

    //Post index and search
    app.get('/post', function(req, res){
        var respond = function(images) {
            var tags = [];
            for( var i =0;i< images.length;i++ ) {
                for( var j =0;j< images[i].t.length;j++ ) {
                    tags.push(images[i].t[j]);
                }
            }
            tags = aUnique(tags);
            app.providers.tagProvider.getInfo(tags, function(error, tagdata) {
                if (!tagdata) tagdata = [];
                res.render('view/posts.jade', {
                    active: 'post/',
                    images: images,
                    tags: tagdata
                })
            });
        };
        if (req.query.tags) {
            var rabbitHole = function(query){
                app.providers.imageProvider.getByTags(query, 1, app.twi.options.resultsPerPage, function(error, images) {
                    if (images == null) images = [];
                    respond(images);
                });
            };
            var tags = req.query.tags.split(' ');
            var query = [];
            var count = tags.length;
            for( var i =0;i< tags.length;i++ ) {
                (function(tag){
                    app.providers.aliasProvider.check(tag, function(error, resp){
                        if (resp) query.push(resp);
                        else query.push(tag);
                        --count;
                        if (count === 0) rabbitHole(query);
                    });
                })(tags[i]);
            }
        } else {
            app.providers.imageProvider.getIndexPage(1, app.twi.options.resultsPerPage, function(error, images) {
                if (images == null) images = [];
                respond(images);
            });
        }
    });
};