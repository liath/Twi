var options = {
        //Database info
        database: 'twi'
        , host: '192.168.1.250'
        , port: 27017
        //How many images appear in the list
        , resultsPerPage: 15
        //Mail settings, SMTP auth
        , mail : {
            host: 'smtp.gmail.com'
            , port: 587
            , ssl: false
            , user: 'services@exthilion.org'
            , pass: 'Nxd6997epntzyxaX'
        }
    }, user = {
        u: "Fluffy",
        t: {
            k: 'lolololol'
        },
        e: '0xWolfx0@Exthilion.org'
    }, info = {
        domain: 'exthilion.org'
    }, email = require("mailer");

email.send({
    host : options.mail.host,              // smtp server hostname
    port : options.mail.port,                     // smtp server port
    ssl: options.mail.ssl,                       // for SSL support - REQUIRES NODE v0.3.x OR HIGHER
    domain : info.domain,            // domain used by client to identify itself to server
    to : user.e,
    from : "no-reply@"+info.domain,
    subject : "Account verification email",
    template: "mail/verify-html.txt",
    data: {
      "user"   : user.u,
      "domain" : info.domain,
      "token"  : user.t.k
    },
    authentication : 'login',        // auth login is supported; anything else is no auth
    username : options.mail.user,        // username
    password : options.mail.pass         // password
},
function(err, result){
    if(err){
        console.log(err);
    } else {
        console.log('Success!');
    }
});