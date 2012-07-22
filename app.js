/*
 *  Note:
 *  Browser -> Cloudflare -> Us(302 redirect) -> Image server (Amazon/Imgur/etc)
 *
 * TODO: Add a reaper for unused tags to the cron - Note that in the event of tag corruption, rebuilding from the
 *  images collection isn't entirely sufficient, I suppose I could de-sluggify though.. hmm. replace - with ' ' and
 *  pretty case it.... Why didn't I just do that?
 *
 * TODO: Make all uploads hit this before offloading them to storage so we can do an md5 check. Pretty sure I'll
 * have to do that anyways to implement AWS support and I dislike having my imgur key out in the open.
 *
 * TODO: Make view count only increase on unique ip or something
 * This can be as simple as storing a cookie and only counting views from cookieless browsers
 * To as wildly complex as arrays of bloom filters tracking unique ip addresses for every image
 * Perhaps even use google analytics to track it for us and occasionally query them for the count...
 *
 * TODO: On the note of view counts, if we leave them as is we should prolly pool them then update them from cron so
 * we aren't spawning a database call for every image load for something so trivial
 *
 * TODO: Finish the voting system on posts, prolly be some quick ajax
 *
 * TODO: Keep track of x number of recent wiki/tag changes
 *
 * TODO: When a user looks up an expensive item we can prolly store the item in redis(session) to save a second lookup if they post to that item
 *
 * TODO: Make descriptions for tags use markdown
 *
 * TODO: Consider lazy loading comments
 *
 * TODO: Implement tag alias searching in tagProvider on lookups
 *
 * TODO: Find and cleanup lines marked with notes. ([!n])
 *
 * TODO: Add quick reply to comment listings
 *
 * TODO: Support for Favorites, Subscriptions, Popular (I guess order by view count?), random, and recent changes (hafta have like a queue we push when posts get edited)
 *
 * TODO: Pagination is disabled pretty much every where but it's implemented in the providers, just need to handle the get variable
 *
 * NOTES: Some DB functions exists across pretty much every provider, we can prolly abstract those out and just pass the collection to common function
 */

// Load configuration
var options = require('./settings.js');
options.version = 'v0.0.4';

/**
 * Module dependencies.
 */
var express = require('express')
  , Db = require('mongodb').Db
  , Server = require('mongodb').Server
  , ImageProvider = require('./lib/mongodb/imageProvider').ImageProvider
  , TagProvider = require('./lib/mongodb/tagProvider').TagProvider
  , UserProvider = require('./lib/mongodb/userProvider').UserProvider
  , WikiProvider = require('./lib/mongodb/wikiProvider').WikiProvider
  , CommentProvider = require('./lib/mongodb/commentProvider').CommentProvider
  , FileProvider = require('./lib/upload/'+options.upload.method+'.js').Storage
  , passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy
  , flash = require('connect-flash');

if  (options.redis) {
    var RedisStore = require("connect-redis")(express);
}

//App setup
var app = module.exports = express.createServer();
app.twi = {};
app.twi.options = options;

//Providers
var db = new Db(app.twi.options.database.name, new Server(app.twi.options.database.host, app.twi.options.database.port, {auto_reconnect: true}, {}));
db.open(function(error){
    db.authenticate(app.twi.options.database.user, app.twi.options.database.pass, function(error, result) {
        if (error) console.log('DB Auth Error (app.js:142)'+error);
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
app.providers = {};
app.providers.commentProvider = new CommentProvider(db);
app.providers.fileProvider = new FileProvider(app.twi.options);
app.providers.imageProvider= new ImageProvider(db, app.twi.options.resultsPerPage);
app.providers.tagProvider = new TagProvider(db);
app.providers.userProvider = new UserProvider(db);
app.providers.wikiProvider = new WikiProvider(db);

function setup() {
    return function (req, res, next) {
        //Template globals
        res.locals.session = req.session;
        res.locals.board = {
            name    : app.twi.options.name,
            domain  : app.twi.options.domain,
            version : app.twi.options.version
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
            console.log('FlashMsg Error: '+res.locals.board.flash[i]);
        }
        res.locals.board.uploadMethod = app.twi.options.upload.method;

        next();
    }
}
app.configure('all', function(){
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');

    app.use(express.bodyParser(
      {
        uploadDir: ((app.twi.options.upload.method == "direct") ? app.twi.options.upload.paths.temp : null)
      }
    ));

    app.use(express.methodOverride());
    app.use(express.cookieParser(app.twi.options.sessionKey));

    if  (app.twi.options.redis) {
        if (app.settings.env == 'production') {
            var conf = {
                h: false, //Host
                t: false, //Port
                d: false, //Db
                s: false  //Pass
            }
            if (process.env.REDISTOGO_URL) {
                var url = require('url'),
                    redisUrl = url.parse(process.env.REDISTOGO_URL),
                    redisAuth = redisUrl.auth.split(':');
                conf.h = redisUrl.hostname;
                conf.t = redisUrl.port;
                conf.d = redisAuth[0];
                conf.s = redisAuth[1];
            } else if (app.twi.options.redis.host) {
                conf.h = app.twi.options.redis.host;
                conf.t = app.twi.options.redis.port;
                conf.d = app.twi.options.redis.db;
                conf.s = app.twi.options.redis.pass;
            }
            app.use(express.session({
                store: new RedisStore({
                    host : conf.h,
                    port : conf.t,
                    db   : conf.d,
                    pass : conf.s
                })
            }));
        } else {
            if (app.twi.options.redis && app.twi.options.redis.host) {
                app.use(express.session({
                    store: new RedisStore({
                        host : app.twi.options.redis.host,
                        port : app.twi.options.redis.port,
                        db   : app.twi.options.redis.db,
                        pass : app.twi.options.redis.pass
                    })
                }));
            } else {
                app.use(express.session({ store: new RedisStore }));
            }
        }
    } else {
        app.use(express.session());
    }
    app.use(flash());
    app.use(passport.initialize());
    app.use(passport.session());

    app.use(setup());//Setup Twi

    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
    app.use(express.errorHandler());
});

passport.use(new LocalStrategy(
    function(username, password, done) {
        app.providers.userProvider.findOne({ username: username }, function (err, user) {
            if (err) { return done(err); }
            if (!user) {
                return done(null, false, { message: 'Unknown user' });
            }
            if (user.t) return done(null, false, { message: 'You must verify your account before you can log in.' });
            if (!app.providers.userProvider.validate(user, password)) {
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
    app.providers.userProvider.findById(id, function (err, user) {
        done(err, user);
    });
});

//Include the routes
require('./lib/routes/index')(app);
//Except this one because passport is here and it would be silly and wasteful to ship it elsewhere
app.post('/login',
    passport.authenticate('local', {
        failureRedirect: '/login',
        failureFlash: 'Login failed.',
        successRedirect: '/post',
        successFlash: 'You have been logged in.'
    })
);

// Cron
setInterval(function() {
    app.providers.userProvider.reaper(function(error, result){
        if (error) console.log('User Reaper Error (app.js:588): '+error);
    });
},3600000); //One hour

//Boot
var port = process.env.PORT || 3000;
app.listen(port, function(){
    console.log("Twi booting on port %s in %s mode", port, app.settings.env);
});