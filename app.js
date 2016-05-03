/* eslint strict:0, no-console:0, no-var:0, vars-on-top:0, one-var:0, prefer-template:0 */
/* eslint block-scoped-var:0, no-param-reassign:0, arrow-body-style:0 */
// no-var: We aren't ES6 yet
/*
 * You don't need to edit anything in this file. Go look at settings.js.example.
 */

'use strict';

// Load configuration
var options;
console.log('Attempting to load configuration...');
if (process.env.TWI_SETTINGS) {
  console.log('Loading settings from Environment...');
  try {
    options = JSON.parse(process.env.TWI_SETTINGS);
  } catch (e) {
    console.log('Loading from Environment failed, attempting to load from file...');
  }
}
if (!options) {
  try {
    options = require('./settings.js');
  } catch (e) {
    console.error('Twi has failed to boot.' +
      'No configuration found in TWI_SETTINGS or ./settings.js.');
    process.exit(e.code);
  }
}

options.version = 'v0.0.5';

/**
 * Module dependencies.
 */
var http = require('http'),
  express = require('express'),
  session = require('express-session'),
  morgan = require('morgan'),
  ImageProvider = require('./lib/mongodb/imageProvider').ImageProvider,
  AliasProvider = require('./lib/mongodb/aliasProvider').AliasProvider,
  TagProvider = require('./lib/mongodb/tagProvider').TagProvider,
  UserProvider = require('./lib/mongodb/userProvider').UserProvider,
  WikiProvider = require('./lib/mongodb/wikiProvider').WikiProvider,
  CommentProvider = require('./lib/mongodb/commentProvider').CommentProvider,
  ImplicationProvider = require('./lib/mongodb/implicationProvider').ImplicationProvider,
  FileProvider = require('./lib/upload/' + options.upload.method + '.js').Storage,
  passport = require('passport'),
  LocalStrategy = require('passport-local').Strategy,
  flash = require('flash');

if (options.redis) {
  var RedisStore = require('connect-redis')(session);
} else {
  var MongoStore = require('connect-mongo')(session);
}

// App setup
var app = express();
app.twi = {};
app.twi.options = options;

// Providers
app.providers = {};
var dbUrl = 'mongodb://' + app.twi.options.database.user + ':' + app.twi.options.database.pass + '@' + app.twi.options.database.host + ':' + app.twi.options.database.port + '/' + app.twi.options.database.name;
var mongojs = require('mongojs');
var db = mongojs(dbUrl);
app.db = db;
app.providers.commentProvider = new CommentProvider(db.collection('comments'));
app.providers.fileProvider = new FileProvider(app.twi.options);
app.providers.imageProvider = new ImageProvider(db.collection('images'),
app.twi.options.resultsPerPage);
app.providers.aliasProvider = new AliasProvider(db.collection('aliases'));
app.providers.tagProvider = new TagProvider(db.collection('tags'));
app.providers.userProvider = new UserProvider(db.collection('users'));
app.providers.wikiProvider = new WikiProvider(db.collection('wiki'));
app.providers.implicationProvider = new ImplicationProvider(app.db.collection('implications'));

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

// app.use(express.bodyParser({
//     uploadDir:
//    ((app.twi.options.upload.method == 'direct') ? app.twi.options.upload.paths.temp : null)
// }));

var sessionInfo = {
  resave: false,
  saveUninitialized: false,
  secret: app.twi.options.sessionKey
};

if (app.twi.options.redis) {
  var conf = {
    h: false, // Host
    t: false, // Port
    d: false, // Db
    s: false // Pass
  };
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
  if (conf.h) {
    sessionInfo.store = new RedisStore({
      host: conf.h,
      port: conf.t,
      db: conf.d,
      pass: conf.s
    });
  } else {
    sessionInfo.store = new RedisStore();
  }
} else {
  sessionInfo.store = new MongoStore({db: app.db})
}
app.use(session(sessionInfo));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use((req, res, next) => {
  // Template globals
  res.locals.session = req.session;
  res.locals.board = {
    name: app.twi.options.name,
    domain: app.twi.options.domain,
    version: app.twi.options.version
  };
  res.locals.board.authenticated = false;
  if (req.isAuthenticated()) {
    res.locals.board.authenticated = true;
    res.locals.board.user = req.user;
  }
  res.locals.board.flash = {
    // error: req.flash('error'),
    // info: req.flash('info')
  };

  for (var i = 0; i < res.locals.board.flash.length; i++) {
    console.log('FlashMsg Error: ' + res.locals.board.flash[i]);
  }
  res.locals.board.uploadMethod = app.twi.options.upload.method;

  next();
});

app.use(express.static(__dirname + '/public'));

app.use(morgan('dev', {
  skip: (req, res) => {
    return res.statusCode < 400;
  }
}));

passport.use(new LocalStrategy(
  (username, password, done) => {
    app.providers.userProvider.findOne({
      username
    }, (err, user) => {
      if (err) {
        return done(err);
      }
      if (!user) {
        return done(null, false, {
          message: 'Unknown user'
        });
      }
      if (user.t) {
        return done(null, false, {
          message: 'You must verify your account before you can log in.'
        });
      }
      if (!app.providers.userProvider.validate(user, password)) {
        return done(null, false, {
          message: 'Invalid password'
        });
      }
      return done(null, user);
    });
  }
));
passport.serializeUser((user, done) => {
  done(null, user._id);
});
passport.deserializeUser((id, done) => {
  app.providers.userProvider.findById(id, (err, user) => {
    done(err, user);
  });
});

// Include the routes
require('./lib/routes/index')(app);
// Except this one because passport is here and it would be silly and wasteful to ship it elsewhere
app.post('/login',
  passport.authenticate('local', {
    failureRedirect: '/login',
    failureFlash: 'Login failed.',
    successRedirect: '/post',
    successFlash: 'You have been logged in.'
  })
);

// Cron
setInterval(() => {
  app.providers.userProvider.reaper((error) => {
    if (error) console.log('User Reaper Error (app.js:205): ' + error);
  });
  app.providers.tagProvider.reaper((error) => {
    if (error) console.log('Tag Reaper Error (app.js:208): ' + error);
  });
}, 3600000); // One hour

app.set('port', process.env.PORT || 3000);
var server = http.createServer(app).listen(app.get('port'), () => {
  console.log('Twi booting on port %s in %s mode', app.get('port'), process.env.NODE_ENV);
});

module.exports = server;
