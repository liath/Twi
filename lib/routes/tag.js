// Tag Routes

'use strict';

module.exports = function(app){
    app.get('/tag', function(req, res) {
        app.providers.tagProvider.page(1, app.twi.options.wikiResultsPerPage, function(error, tags) {
            res.render('view/tag/list', {
                active: 'tag/',
                tags: tags
            });
        });
    });

    app.get('/tag/implications', function(req, res) {
        app.providers.implicationProvider.page(1, app.twi.options.wikiResultsPerPage, function(error, results) {
            res.render('view/tag/implications', {
                active: 'tag/',
                implications: results
            });
        });
    });

    app.get('/tag/aliases', function(req, res) {
        app.providers.implicationProvider.page(1, app.twi.options.wikiResultsPerPage, function(error, results) {
            res.render('view/tag/aliases', {
                active: 'tag/',
                implications: results
            });
        });
    });
};