// Copy this file to settings.js then edit it.


var settings = {
    sessionKey : "twibooru wut", //CHANGE ME FOR THE LOVE OF CERTAIN CELESTIAL GODDESSES WHO WILL GO UNNAMED HERE
    database: {
        name: 'fathomless-atoll-32496'
        , host: 'l3855uft9zao23e2.cbetxkdyhwsb.us-east-1.rds.amazonaws.com'
        , port:  3306
        , user: 'qrf66zh5lf555afq' //Some mongo setups won't require authentication. Not sure if you need to as well. Prolly will.
        , pass: 'fshueekuwfbtuxgf'
    }
    /*Set redis to false to disable it completely. (, redis : false,
                                                    , resultsPerPage : 15
                                                    ...)*/
    , redis : {
        //If ENV has REDISTOGOURL it will be used instead and this will be ignored
        host   : ''
        , port : ''
        , db   : ''
        , pass : ''
    }
    //How many images appear in the list page (/post)
    , redis : false,
    , resultsPerPage: 15
    , wikiResultsPerPage: 20
    //Mail settings, SMTP auth. See https://github.com/andris9/Nodemailer for more
    //I'm using gmail so that's what everything is configured for
    , mail : {
        service: "Gmail"
        , user: 'e.yo.knighty@gmail.com'
        , pass: 'password'
    },
    upload: {
        method : 'imgur', // Valid options are imgur and direct

        //Only required if you use the imgur method
        imgur : "IMGUR ANONYMOUS API KEY",

        //Only required if you use the direct method
        paths: {
            temp: '/tmp/', //Can be anywhere really so long as it isn't in ./public
            store: './public/images/', //Where images are actually saved, should be left as is unless you're hosted
                                       // somewhere that doesn't allow write access, like Heroku.
            serve: '/images/' //url prefix for images, if store is ./public/images then the default is fine.
        }
    },
    // Site name. It appears on the index page and at the top left of every other page
    name: 'Really Awesome Board',
    //Domain the site runs from. Currently only used for emailing users.
    domain: "really-awesome-board.com"
};

module.exports = settings;
