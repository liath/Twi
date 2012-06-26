/*
 *  Notes:
 *  Browser -> Cloudflare -> Us(302 redirect) -> Image server (Amazon/Imgur/etc)
 *
 * TODO: Add a reaper for unused tags to the cron - Note that in the event of tag corruption, rebuilding from the
 *  images collection isn't entirely sufficient, I suppose I could de-sluggify though.. hmm. replace - with ' ' and
 *  pretty case it.... Why didn't I just do that?
 *
 * TODO: Make all uploads hit this before offloading them to storage so we can do an md5 check. Pretty sure I'll
 * have to do that anyways to implement AWS support and I dislike having my imgur key out in the open.
 */

// Configuration
var options = require('./settings.js');
options.version = 'v0.0.2';

/**
 * Module dependencies.
 */
var express = require('express')
  , Db = require('mongodb').Db
  , Server = require('mongodb').Server
  , ImageProvider = require('./lib/mongodb/imageProvider').ImageProvider
  , TagProvider = require('./lib/mongodb/tagProvider').TagProvider
  , UserProvider = require('./lib/mongodb/userProvider').UserProvider
  , passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy
  , nodemailer = require("nodemailer")
  , flash = require('connect-flash');

var app = module.exports = express.createServer();


var FileProvider = require('./lib/upload/'+options.upload.method+'.js').Storage;
var fileProvider = new FileProvider(options);

if (options.upload.method == "direct") {
    var fs = require('fs')
        , crypto = require('crypto')
        , minimatch = require("minimatch");
}

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');

  app.use(express.bodyParser(
      {
        uploadDir: ((options.upload.method == "direct") ? options.upload.paths.temp : null)
      }
  ));

  app.use(express.methodOverride());
  app.use(express.cookieParser("twibooru wut"));
  app.use(express.session());
  app.use(flash());
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
    app.use(express.errorHandler());
});

//Providers
var db = new Db(options.database.name, new Server(options.database.host, options.database.port, {auto_reconnect: true}, {}));
db.open(function(error){
    db.authenticate(options.database.user, options.database.pass, function(error, result) {
        if (error) console.log(error);
        var getUniqueId = function(){
            var rand=0;
            while(true){
                rand=(Math.floor(Math.random()*1000)+(new Date()).getTime()).toString(16);
                if(db.images.findOne({a:rand},{_id:1})) {
                    continue;}else{break;}
            }
            return rand;
        };
        db.eval('var func = '+getUniqueId.toString()+' db.code.insert({"_id" : "getUniqueId", "value" : func });', function(error, result) {

        });
    });
});

var imageProvider= new ImageProvider(db, options.resultsPerPage);
var tagProvider = new TagProvider(db);
var userProvider = new UserProvider(db);

var smtpT = nodemailer.createTransport("SMTP", {
    service: options.mail.service,
    auth : {
        user: options.mail.user,
        pass: options.mail.pass
    }
})

passport.use(new LocalStrategy(
    function(username, password, done) {
        userProvider.findOne({ username: username }, function (err, user) {
            if (err) { return done(err); }
            if (!user) {
                return done(null, false, { message: 'Unknown user' });
            }
            if (user.t) return done(null, false, { message: 'You must verify your account before you can log in.' });
            if (!userProvider.validate(user, password)) {
                return done(null, false, { message: 'Invalid password' });
            }
            return done(null, user);
        });
    }
));
passport.serializeUser(function(user, done) {
    done(null, user._id);
});
passport.deserializeUser(function(id, done) {
    userProvider.findById(id, function (err, user) {
        done(err, user);
    });
});

//Template globals
app.locals.use(function(req, res, done) {
    res.locals.session = req.session;
    res.locals.board = {
        name    : options.name,
        domain  : options.domain,
        version : options.version
    };
    res.locals.board.authenticated = false;
    if (req.isAuthenticated()) {
        res.locals.board.authenticated = true;
        res.locals.board.user = req.user;
    }
    res.locals.board.flash = {
        error : req.flash('error'),
        info : req.flash('info')
    };
    for( var i =0;i< res.locals.board.flash.length;i++ ) {
        console.log(res.locals.board.flash[i]);
    }
    res.locals.board.uploadMethod = options.upload.method;
    done();
});

// Routes
app.get('/', function(req, res){
    imageProvider.getCount(function(error, count) {
        res.render('index.jade', {
            count: count
        });
    });
});

// ------------------------------------------------------------------------------------------------------- Post routes
//View post
app.get(/^\/post\/([a-zA-Z0-9]+)(?:\/(.*))?/, function(req, res) {
    imageProvider.getImage(req.params[0], function(error, result) {
        if (error) {
            req.flash('error', error);
            res.redirect('/post')
        } else {
            tagProvider.getInfo(result.t, function(error, tagdata) {
                if (!tagdata) tagdata = [];
                res.render('view/post.jade', {
                    active: '',
                    image: result,
                    tags: tagdata
                })
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
        imageProvider.getImage(id, function(error, image) {
            if (error) {
                req.flash('error', error);
                res.redirect('/post/'+req.params[0]);
            } else {
                var update = {$set : {}};

                //Content Rating
                var cr = req.body.contentRating;
                var r = ['Safe', 'Questionable', 'Explicit']
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
                        s = tags[i];
                        s = s.replace(/(^\s*)|(\s*$)/gi,"");
                        s = s.replace(/[ ]{2,}/gi," ");
                        s = s.replace(/\n /,"\n");
                        if (s.length == 0) continue;
                        var tag = {
                            //Proper Case
                            p : s.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();}),
                            //Sluggify
                            n : s.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                            //If tag exists already this will just be ignored.
                            m : { a : req.user.u }
                        }
                        nt.push(tag.n); //We only want slugs in image.t
                        tagProvider.checkTag(tag); //Inserts tag is it doesnt exists
                    }
                    update.$set.t = nt;
                }

                imageProvider.update(image._id, update, function(error, result) {
                    if (error) {
                        console.log(error);
                        req.flash('error', req.flash('info', 'Changes applied successfully!'));
                    } else {
                        req.flash('info', 'Changes applied successfully!');

                        //Do a rebuild on tags now
                        tagProvider.rebuildCount(function(error, result){console.log(error);});
                        tagProvider.current = false;
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
    } else {
        //Parse comment
        var comment = {
            a: req.user.u,
            t: new Date(),
            m: req.body.message.replace(/</g, '')
        }
        imageProvider.addComment(req.param('id'), comment, function(error, result){
            if (error) req.flash('error', error);
            else req.flash('info', 'Your post has been added!');
        });
    }
    res.redirect('/post/'+req.param('id'));
});

//Post index
app.get('/post', function(req, res){
    imageProvider.getIndexPage(1, 30, function(error, images) {
        if (images == null) var images = [];
        var tags = [];
        for( var i =0;i< images.length;i++ ) {
            for( var j =0;j< images[i].t.length;j++ ) {
                tags.push(images[i].t[j]);
            }
        }
        tagProvider.getInfo(tags, function(error, tagdata) {
            if (!tagdata) tagdata = [];
            res.render('view/posts.jade', {
                active: 'post',
                images: images,
                tags: tagdata
            })
        });
    });
});

// ----------------------------------------------------------------------------------------------- User Account Routes
app.get('/login', function(req, res){
    res.render('login.jade', {
        active: 'login'
    })
});
app.post('/login',
    passport.authenticate('local', {
        failureRedirect: '/login',
        failureFlash: 'Login failed.',
        successRedirect: '/post',
        successFlash: 'You have been logged in.'
    })
);
app.post('/s/create', function(req, res){
    userProvider.createUser(req.body.username, req.body.password, req.body.email, function (error, user){
        if (error) {
            req.flash('error', error);
            res.redirect('/login');
        } else {
            var email = {
                to : user.e,
                from : "no-reply@"+options.domain,
                subject : "Account verification email",
                html : '<div>Thank you for registering '+user.u+',</div><br/><div>Click <a href="http://'+options.domain+'/s/verify/'+user.t.k+'">here<a/> to finish!</div>'
            }
            smtpT.sendMail(email, function(error, resp) {
                if(error){
                    console.log(error);
                    req.flash('error', error);
                    res.redirect('/login');
                } else {
                    req.flash('info', "You've been sent a confirmation email, check it for instructions.");
                    res.redirect('/login');
                }
            });
        }
    });
});

app.get('/s/verify/:token', function(req, res){
    userProvider.findByToken(req.param('token'), function(error, user){
        if (error) {
            req.flash('error', error);
            res.redirect('/login');
        } else {
            userProvider.dropToken(user, function(error, result) {
                if (error) console.log('Verify Error:'+error);
                req.flash('info', "Account verified, you may now login.");
                res.redirect('/login');
            });
        }
    });
});

app.get('/logout', function(req, res){
    req.logOut();
    res.redirect('/post');
});


//------------------------------------------------------------------------------------------------------- Upload routes
app.get('/upload', function(req, res) {
    if (!req.isAuthenticated()) {
        req.flash('error', 'You must be logged in to upload.');
    }
    res.render('includes/upload/'+options.upload.method+'.jade', {
        active: 'upload'
    });
});

//Fixes odd bug in the upload form
app.get('/u/create', function(req, res) {
    res.send(' ');
});

app.post('/u/create', function(req, res) {
    if (req.isAuthenticated()) {
        fileProvider.Respond(req, function(error, files) { //Handle response
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
                    if (options.upload.method == "direct") {
                        var h = crypto.createHash('md5');
                        var f = fs.ReadStream(options.upload.paths.store+name+data.ext);
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
                            if (error) console.log("Session save error: "+error);
                        });
                    }
                });
            }
            res.json(files);
        });
    } else {
        if (options.upload.method == "direct") {
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
            if (options.upload.method == "direct") {
                fs.readdir(options.upload.paths.store, function(error, result) {
                    var files = minimatch.match(result, req.param('name')+'*', {});
                    for (var i = 0; i < files.length; i++) {
                        fs.unlink(options.upload.paths.store+files[i]);
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
                tagProvider.checkTag(tag);
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
            imageProvider.submitImages([image], function(error, result) {
                if (error) {
                    console.log(error);
                    res.json(error);
                } else {
                    //submitImages supports arrays and acts as such, we'll only ever send it a single item here so we collapse its response
                    result = result[0];
                    res.json(result);
                    //Now for the stuff that isn't relevant to the upload form
                    if (!result.error) {

                        //Rebuild the tag table
                        tagProvider.rebuildCount(function(error, result){console.log(error);});
                        tagProvider.current = false;
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


// --------------------------------------------------------------------------------------------------------- AJAX Stuff
app.get('/s/username/:user', function(req, res){
    userProvider.findOne({ username: req.param('user') }, function (err, user) {
        if (user) res.json({available: false});
        else res.json({available: true});
    });
});
app.get('/s/tags', function(req, res){
    tagProvider.getTags(function(error, result) {
       res.json(result);
    });
});
app.get('/s/rebuild', function(req, res){
    tagProvider.rebuildCount(function(error, result){
        console.log(error);
        tagProvider.current = false;
        res.redirect('/s/tags');
    });
});

app.get('/s/test', function(req, res){
    console.log(req.user);
    res.send(' ');
});

app.post('/debug', function(req, res){
    res.json({upload : {
        image : {
            hash: "1OLOL",
            height: 900,
            width: 900,
            type: 'image/png'
        },
        links : {
            delete_page : "/lawl",
            large_thumbnail : '/lawl.png',
            original : '/lol.png'
        }
    }});
});

/* Uncomment if using nginx for static content.
 * app.get('*', function(req, res){
 *    res.redirect('/404.html');
 * });
 */

// Cron
setInterval(function() {
    userProvider.reaper(function(error, result){
        if (error) console.log('User Reaper Error: '+error);
    });
},3600000); //One hour

//Boot
var port = process.env.PORT || 3000;
app.listen(port, function(){
    console.log("Express server listening on port %s in %s mode", port, app.settings.env);
});