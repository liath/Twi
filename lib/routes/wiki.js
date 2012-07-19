//Wiki routes
//TODO: Revert functionality in history

var tagRegex = /^[0-9a-z_\(\)-]+$/i,
    //Parse user submitted message (comments and post descriptions)
    parseMessage = function(a){a=a.replace(/\n/g,"<br />");a=a.replace(/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig,"<a href='$1'>$1</a>");return a=a.replace(/>>(\d+)/g,function(a,b){var c=$("#c"+b+" .username").html();return'<a class="commentlink" href="#c'+b+'">@'+c+"</a>"})};

module.exports = function(app){
    // View
    app.get(/^\/wiki\/view\/([0-9a-z_\(\)-]+)(?:\/(.*))?/, function(req, res) {
        var target = req.param(0);
        //We check for tag even if the wiki isn't a tag page because wiki pages can be created before tags
        app.providers.tagProvider.getInfo(target, function(error, tagdata) {
            var tag = tagdata[0];
            app.providers.wikiProvider.fetch(target, function(error, wiki) {
                if (!wiki && !tag) {
                    //Page doesn't exist, click to create
                    res.render('view/wiki/view.jade', {
                        new : true
                    });
                } else {
                    if (!wiki) {
                        wiki = {
                            n:tag.n,
                            p:tag.p,
                            d:'',
                            r:{
                                u:null,
                                t:null,
                                m:''
                            },
                            o:[],
                            t:1
                        };
                    }
                    if (tag) wiki.t = 1;
                    if (wiki.t === 0) {
                        //Not a tag wiki
                        res.render('view/wiki/view.jade', {
                            active: 'wiki/',
                            wiki: wiki,
                            tags: [] //[!n] In other *boorus this is a list of recently changed wiki pages - I'll get around to that - prolly just add a recent changes function to tagProvider
                        });
                    } else {
                        //A tag wiki!
                        wiki.c = tag.c;
                        app.providers.imageProvider.getByTags([tag.n], 1, 10, function(error, images) {
                            if (images == null) var images = [];
                            res.render('view/wiki/view.jade', {
                                active: 'wiki/',
                                recent: images,
                                wiki: wiki,
                                tags: [] //[!n] In other *boorus this is a list of recently changed wiki pages - I'll get around to that - prolly just add a recent changes function to tagProvider
                            });
                        });
                    }
                }
            });
        });
    });

    app.get(/^\/wiki\/edit\/([0-9a-z_\(\)-]+)(?:\/(.*))?/, function(req, res) {
        var target = req.param(0);
        app.providers.tagProvider.getInfo(target, function(error, tagdata) {
            var tag = tagdata[0];
            app.providers.wikiProvider.fetch(target, function(error, wiki) {
                if (!wiki && !tag) {
                    req.flash('info', 'That page didn\'t exist so I sent you to the create page.');
                    res.redirect('/wiki/new');
                } else {
                    if (!wiki) wiki = {
                        n:tag.n,
                        p:tag.p,
                        d:'',
                        r:{
                            u:null,
                            t:null,
                            m:''
                        },
                        o:[],
                        t:1
                    };
                    if (tag) {
                        wiki.c = tag.c;
                    }
                    res.render('view/wiki/edit.jade', {
                        active: 'wiki/',
                        wiki: wiki,
                        tags: [] //[!n] In other *boorus this is a list of recently changed wiki pages - I'll get around to that - prolly just add a recent changes function to tagProvider
                    });
                }
            });
        });
    });

    app.post(/^\/wiki\/edit\/([0-9a-z_\(\)-]+)?(?:\/(.*))?/, function(req, res) {
        if (!req.isAuthenticated()) {
            req.flash('error', 'You must be logged in to edit tags.');
            res.redirect('/wiki/edit/'+req.param(0));
        } else {
            var target = req.param(0);
            if (!target && req.body.name) {
                target = req.body.name.toLowerCase().replace(/[^a-z0-9-\(\)]/g, '-');
            }
            if (!tagRegex.test(target)) {
                req.flash('error', 'That name is invalid.');
                res.redirect('/post/'); //[!n] Probably a better place to send them than this
                // req.header.referer might be a good idea
            } else {
                if (!req.body.message) {
                    req.flash('error', 'Please fill out the pages text.');
                    res.redirect('/wiki/'); //[!n] See above note on redirecting
                } else {
                    app.providers.tagProvider.getInfo(target, function(error, tagdata) {
                        var tag = tagdata[0];
                        app.providers.wikiProvider.fetch(target, function(error, wiki) {
                            var what = '';
                            var flag = false;
                            if (!wiki && !tag) { //New post
                                if (!req.body.name) {
                                    req.flash('error', 'Please specify a name.');
                                    res.redirect('/wiki/'); //[!n] See above note on redirecting
                                    flag = true;
                                }
                                wiki = {
                                    n:target,
                                    p:req.body.name.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();}),
                                    d:parseMessage(req.body.message),
                                    r:{
                                        u:req.user.u,
                                        t:new Date(),
                                        m:req.body.message
                                    },
                                    o:[],
                                    t:0
                                };
                                what = 'created';
                            } else if (!wiki) { //New post, existing tag
                                wiki = {
                                    n:tag.n,
                                    p:tag.p,
                                    d:parseMessage(req.body.message),
                                    r:{
                                        u:req.user.u,
                                        t:new Date(),
                                        m:req.body.message
                                    },
                                    o:[],
                                    t:1
                                };
                                what = 'created';
                            } else {            //Wiki exists, we're just actually editing it
                                if (wiki.r.m === req.body.message.replace(/\r/g,'')) {
                                    req.flash('error', 'You don\'t appear to have changed anything.');
                                    res.redirect('/wiki/edit/'+target);
                                    flag = true;
                                } else {
                                    if (tag) wiki.t = 1;
                                    if (wiki.r.m.length > 0) wiki.o.push(wiki.r);
                                    wiki.r = {
                                        u: req.user.u,
                                        t: new Date(),
                                        m: req.body.message.replace(/\r/g,'')
                                    }
                                    wiki.d  = parseMessage(wiki.r.m);
                                    what = 'updated';
                                }
                            }
                            if (!flag) {
                                app.providers.wikiProvider.update(wiki, function(error, result){
                                    if (error) req.flash('error', error);
                                    else req.flash('info', 'Tag successfully '+what+'.');
                                    res.redirect('/wiki/edit/'+target);
                                });
                            }
                        });
                    });
                }
            }
        }
    });

    app.get(/^\/wiki\/history\/([0-9a-z_\(\)-]+)(?:\/(.*))?/, function(req, res) {
        var target = req.param(0);
        if (!tagRegex.test(target)) {
            req.flash('error', 'That name is invalid.');
            res.redirect('/post/'); //[!n] Probably a better place to send them than this
            // req.header.referer might be a good idea
        } else {
            app.providers.tagProvider.getInfo(target, function(error, tagdata) {
                var tag = tagdata[0];
                app.providers.wikiProvider.fetch(target, function(error, wiki) {
                    if (wiki) {
                        if (wiki.t == 1) wiki.c = tag.c || 0;
                        res.render('view/wiki/history.jade', {
                            active: 'wiki/',
                            wiki: wiki,
                            tags: [] //[!n] In other *boorus this is a list of recently changed wiki pages - I'll get around to that - prolly just add a recent changes function to tagProvider
                        });
                    } else {
                        req.flash('error', 'That tag doesn\'t exist.');
                        res.redirect('/post/');
                    }
                });
            });
        }
    });

    app.get('/wiki', function(req, res) {
        app.providers.wikiProvider.page(1, app.twi.options.wikiResultsPerPage, function(error, wiki) {
            res.render('view/wiki/index', {
                active: 'wiki/',
                wiki: wiki,
                tags: [] //[!n] In other *boorus this is a list of recently changed wiki pages - I'll get around to that - prolly just add a recent changes function to tagProvider
            });
        });
    });

    app.get('/wiki/new', function(req, res) {
        var wiki = {t:0};
        res.render('view/wiki/new', {
            active: 'wiki/',
            wiki: wiki,
            tags: [] //[!n] In other *boorus this is a list of recently changed wiki pages - I'll get around to that - prolly just add a recent changes function to tagProvider
        });
    });
}