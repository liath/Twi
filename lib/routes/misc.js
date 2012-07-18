//Ajax/Utility Routes

module.exports = function(app){
    app.get('/s/username/:user', function(req, res){
        app.providers.userProvider.findOne({ username: req.param('user') }, function (err, user) {
            if (user) res.json({available: false});
            else res.json({available: true});
        });
    });
    app.get('/s/tags', function(req, res){
        app.providers.tagProvider.getTags(function(error, result) {
            res.json(result);
        });
    });

    //Debugging routes
    /*app.get('/s/rebuild', function(req, res){
     app.providers.tagProvider.rebuildCount(function(error, result){
     console.log('Rebuild Error (app.js:573): '+error);
     app.providers.tagProvider.current = false;
     res.redirect('/s/tags');
     });
     });*/

    /* Uncomment if using nginx for static content.
     * app.get('*', function(req, res){
     *    res.redirect('/404.html');
     * });
     */
}