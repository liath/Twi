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
            var query = [];
            for (var i = 0; i < results.length; i++) {
                query.push(results[i].f);
                query.push(results[i].t);
            }
            app.providers.tagProvider.getInfo(query, function(error,tags){
                for (var i = 0; i < results.length; i++) {
                    for(var j = 0; j < tags.length; j++) {
                        if (results[i].f === tags[j].n) {
                            results[i].f = {
                                n: tags[j].n,
                                p: tags[j].p,
                                c: tags[j].c
                            };
                        } else if (results[i].t === tags[j].n) {
                            results[i].t = {
                                n: tags[j].n,
                                p: tags[j].p,
                                c: tags[j].c
                            };
                        }
                    }
                }
                res.render('view/tag/implications', {
                    active: 'tag/',
                    implications: results
                });
            });
        });
    });

    app.get('/tag/aliases', function(req, res) {
        app.providers.aliasProvider.page(1, app.twi.options.wikiResultsPerPage, function(error, results) {
            res.render('view/tag/aliases', {
                active: 'tag/',
                aliases: results
            });
        });
    });
};