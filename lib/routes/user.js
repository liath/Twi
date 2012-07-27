//User routes

'use strict';

var nodemailer = require("nodemailer");

module.exports = function(app){
    var smtpT = nodemailer.createTransport("SMTP", {
        service: app.twi.options.mail.service,
        auth : {
            user: app.twi.options.mail.user,
            pass: app.twi.options.mail.pass
        }
    });
    app.get('/login', function(req, res){
        res.render('login.jade', {
            active: 'login/'
        })
    });
    app.post('/s/create', function(req, res){
        app.providers.userProvider.createUser(req.body.username, req.body.password, req.body.email, function (error, user){
            if (error) {
                req.flash('error', error);
                res.redirect('/login');
            } else {
                var email = {
                    to : user.e,
                    from : "no-reply@"+app.twi.options.domain,
                    subject : "Account verification email",
                    html : '<div>Thank you for registering '+user.u+',</div><br/><div>Click <a href="//'+app.twi.options.domain+'/s/verify/'+user.t.k+'">here<a/> to finish!</div>'
                };
                smtpT.sendMail(email, function(error) {
                    if(error){
                        console.log('Mail Error (app.js:370):'+error);
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
        app.providers.userProvider.findByToken(req.param('token'), function(error, user){
            if (error) {
                req.flash('error', error);
                res.redirect('/login');
            } else {
                app.providers.userProvider.dropToken(user, function(error) {
                    if (error) console.log('Verify Error (app.js:389):'+error);
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
};