//Routes

'use strict';

module.exports = function(app){
    //Site index
    app.get('/', function(req, res){
        app.providers.imageProvider.getCount(function(error, count) {
            res.render('index.jade', {
                count: count
            });
        });
    });

    //Post routes
    require('./post')(app);

    //Comment routes
    require('./comment')(app);

    //Wiki routes
    require('./wiki')(app);

    //User routes
    require('./user')(app);

    //Tag routes
    require('./tag')(app);

    //Upload routes
    require('./upload')(app);

    //Ajax/Utility Routes
    require('./misc')(app);
};