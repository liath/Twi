/* eslint one-var:0, no-var:0, func-names:0, prefer-arrow-callback:0, prefer-template:0 */
// Routes

module.exports = function (app) {
  // Site index
  app.get('/', function (req, res) {
    app.providers.imageProvider.getCount(function (error, count) {
      res.render('index.jade', {
        count,
        locals: res.locals
      });
    });
  });

  // Post routes
  require('./post')(app);

  // Comment routes
  require('./comment')(app);

  // Wiki routes
  require('./wiki')(app);

  // User routes
  require('./user')(app);

  // Tag routes
  require('./tag')(app);

  // Upload routes
  require('./upload')(app);

  // Ajax/Utility Routes
  require('./misc')(app);
};
