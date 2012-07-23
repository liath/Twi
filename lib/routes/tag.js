// Tag Routes

module.exports = function(app){
    app.get('/tag', function(req, res) {
        app.providers.tagProvider.page(1, app.twi.options.wikiResultsPerPage, function(error, tags) {
            res.render('view/tag/list', {
                active: 'tag/',
                tags: tags
            });
        });
    });
};