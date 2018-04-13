//this example is taken from passport-local login example.
//eureca.io stuff after expressjs configuration
//
//
const flash = require('connect-flash')
    , path = require('path')
    , express = require('express')
    , passport = require('passport')
    , LocalStrategy = require('passport-local').Strategy
    , serveStatic = require('serve-static')
    , session = require('express-session')
    , cookieParser = require('cookie-parser')
    , bodyParser = require('body-parser')
    , crypto = require('crypto')
    , expressLayouts = require('express-ejs-layouts');


//===[ Global parameters ]=====================================================================

//used to generate a hash associated with client sessions
const serverSideKey = 'averylongandsecurecryptokey';

//session secret (used to sign cookies)
const sessionSecret = 'averylongandsecurecryptokeyforsessioncookies';

//Session cookie name
const myCookieName = 'eureca.auth';

//This will simulate our users database
const users = [
    { id: 1, username: 'bob', password: 'secret', email: 'bob@example.com' }
    , { id: 2, username: 'joe', password: 'password', email: 'joe@example.com' }
];

//this will store information about authenticated users
const sessionHash = {};



//===[ Section 1 : passport authentication ]==================================================

//Helper functions to find a user by id or by username
function findById(id, fn) {
    var idx = id - 1;
    if (users[idx]) {
        fn(null, users[idx]);
    } else {
        fn(new Error('User ' + id + ' does not exist'));
    }
}

function findByUsername(username, fn) {
    for (var i = 0, len = users.length; i < len; i++) {
        var user = users[i];
        if (user.username === username) {
            return fn(null, user);
        }
    }
    return fn(null, null);
}

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    res.redirect('/login')
}


// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.
passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    findById(id, function (err, user) {
        done(err, user);
    });
});


// Use the LocalStrategy within Passport.
//   Strategies in passport require a `verify` function, which accept
//   credentials (in this case, a username and password), and invoke a callback
//   with a user object.  In the real world, this would query a database;
//   however, in this example we are using a baked-in set of users.
passport.use(new LocalStrategy(
    function (username, password, done) {
        // asynchronous verification, for effect...
        process.nextTick(function () {

            // Find the user by username.  If there is no user with the given
            // username, or the password is not correct, set the user to `false` to
            // indicate failure and set a flash message.  Otherwise, return the
            // authenticated `user`.
            findByUsername(username, function (err, user) {
                if (err) { return done(err); }
                if (!user) { return done(null, false, { message: 'Unknown user ' + username }); }
                if (user.password != password) { return done(null, false, { message: 'Invalid password' }); }
                return done(null, user);
            })
        });
    }
));

//============================================================================================




//===[ Section 2 : ExpressJS configuration ]==================================================

const MemoryStore = session.MemoryStore,
    sessionStore = new MemoryStore();


const app = express();
app.use(expressLayouts);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(bodyParser());
app.use(session({ key: myCookieName, store: sessionStore, secret: sessionSecret }));
// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use(serveStatic(path.join(__dirname, 'public')));

app.get('/', function (req, res) {

    // here we generate a secret token from client information end make it available 
    // on the web page that will call eureca.io server
    // the token is storen in an <input hidden> field
    // see views/index.ejs
    let authToken = '';
    if (req.isAuthenticated()) {
        const hmac = crypto.createHmac('sha256', serverSideKey);
        authToken = hmac.update(req.sessionID).digest('hex');
    
        if (!sessionHash[req.sessionID]) {
            console.log('token = ', authToken);
            sessionHash[req.sessionID] = {};
            sessionHash[req.sessionID].authToken = authToken;
        }
    }
    res.render('index', { user: req.user, eio: { hash: authToken } });
});

app.get('/account', ensureAuthenticated, function (req, res) {
    res.render('account', { user: req.user });
});

app.get('/login', function (req, res) {
    res.render('login', { user: req.user, message: req.flash('error') });
});


app.post('/login',
    passport.authenticate('local', { failureRedirect: '/login', failureFlash: true }),
    function (req, res) {
        res.redirect('/');
    });
app.get('/logout', function (req, res) {
    

    if (req.sessionID && sessionHash[req.sessionID]) {
        //force close eureca client connection
        const eurecaClientConn = eurecaServer.getConnection(sessionHash[req.sessionID].connectionID);    
        eurecaClientConn.close();
        delete sessionHash[req.sessionID];
    }
    
    req.logout();
    res.redirect('/');
});



//============================================================================================



//===[ Section 3 : Eureca.io ]================================================================


// all eureca.io stuff is here ////////////////////////////////////////

var cookie = require('cookie');

var Eureca = require('eureca.io');
//var EurecaServer = require('eureca.io').EurecaServer;
var eurecaServer = new Eureca.Server({
    transport: 'engine.io',
    allow:['hello'],
    
    authenticate: function (authToken, next) {

        //Read cookies
        const parsedCookies = cookie.parse(this.request.headers.cookie);

        //parse signed cookies 
        const sessionID = cookieParser.signedCookie(parsedCookies[myCookieName], sessionSecret);
        console.log('client sessionID', sessionID)
        
        //check if the received authToken from client matches the server side authToken
        if (sessionHash[sessionID] && sessionHash[sessionID].authToken === authToken) {
            //they match ! connection success
            sessionHash[sessionID].connectionID = this.connection.id;


            next();
        }
        else {
            next('Auth Failed');
        }
    }
});

eurecaServer.onConnect(function (connection) {
    var client = eurecaServer.getClient(connection.id);
    client.authenticated = false;
});
eurecaServer.exports.hello = function () {

    console.log('Hello from client ', this.connection.id);
    console.log('answering in 3 seconds');

    var clientProxy = this.clientProxy;
    setTimeout(function() {clientProxy.hello()}, 3000);
    
}

// stateChange is triggered by WebRTC transport, if you use something else, this will not trigger
// you can use the different states to notify the user about the progression of WebRTC connection
eurecaServer.on('stateChange', (state) => {
    console.log(' [info] State changed ', state);
});

/////////////////////////////////////////////////////////////////////////////



var server = require('http').createServer(app);
eurecaServer.attach(server);


console.log('\033[96mlistening on localhost:8000 \033[39m');
server.listen(8000);