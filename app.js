var http = require('http');
var express = require('express');
var crypto = require('crypto');
var massive = require('massive');
var mustacheExpress = require('mustache-express');
var bodyParser = require('body-parser');
var multer = require('multer');
var session = require('client-sessions');
var usermanager = require('./usermanager');

var app = express();

//setup the database
var connectionString = "postgres://postgres:Etienne!77@localhost:5433/shopkinstrading";
var massiveInstance = massive.connectSync({connectionString:connectionString});
app.set('db', massiveInstance);

//setup the templating engine
app.engine('html', mustacheExpress());
app.set('view engine', 'html');
app.set('views', __dirname+'\\views');

app.use(express.static(__dirname+'\\public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));


//setup session middle ware
app.use(session({
	cookieName: 'session',
	secret: crypto.randomBytes(32).toString('hex'),
	duration: 30 * 60 * 1000,
	activeDuration: 5 * 60 * 1000
}));


app.use(function(req, res, next){

	res.locals.loggedIn = false; 

	console.log('running middleware');
	console.log(req.session.username);

	if(req.session && req.session.username) {
		var db = app.get('db');
		db.users.findOne({username: req.session.username}, function(err, user){
			if(err){
			
			} else {
				res.locals.loggedIn = true;
				res.locals.user = user;
				req.session.username = user.username;
			}
			next();
		});		
	} else {
		next();
 	}
});


app.get('/', function(req, res){
	var templateData = usermanager.getSessionUserData(res);
	res.render('main', templateData);
});

app.get('/howitworks', function(req, res){
	var templateData = usermanager.getSessionUserData(res);
	res.render('howitworks', templateData);
});

app.get('/trades', function(req, res){
	var templateData = usermanager.getSessionUserData(res);
	res.render('trades', templateData);
});

app.get('/shopkins', function(req, res){
	var templateData = usermanager.getSessionUserData(res);
	var db = app.get('db');	

	db.shopkins.find({}, function(err, shopkins){
		templateData['shopkins'] = shopkins; 
		res.render('shopkins', templateData);
	})

	
});

app.get('/myshopkins', function(req, res){
	var templateData = usermanager.getSessionUserData(res);
	res.render('myshopkins', templateData);
});

app.get('/register', function(req, res){
	res.render('register');
});

app.post('/doRegistration', function(req, res){
	
	var userData = req.body;
	var errors = usermanager.validateNewUserForm(userData);

	if(errors.length == 0) {
		usermanager.createUser(userData, app.get('db'));
		res.render('message', {'message':'Thanks for registering! You can now setup you collection and start trading.'});	
	} else {
		res.render('register', {'errors': errors, 'values':userData});
	}

});

app.get('/login', function(req, res){
	res.render('login');
});


app.post('/login', function(req, res){

	var db = app.get('db');
	usermanager.verifyPassword(req.body.username, req.body.password, db, function(success){
		if(success){
			req.session.username = req.body.username;
			res.redirect('myshopkins');
		} else {
			res.render('login', {errors: [{error: 'Invalid username or password'}]});
		}
	});
		
});




app.get('/resetpassword', function(req, res){
	var db = app.get('db');
	var templateData = usermanager.getSessionUserData(res);
	templateData['notoken'] = true; 
	res.render('resetpassword', templateData);
});

app.get('/resetpassword:/token', function(req, res){
	var db = app.get('db');
	var templateData = usermanager.getSessionUserData(res);

	//validate the token 

	//if it's valid show the reset password form with the token other wise show access denied 
	templateData['token'] = req.params.token; 

	console.log(templateData['token']);
	res.render('resetpassword', templateData);

});

app.post('/resetpassword', function(req, res) {

	console.log(req.body);

	var token = req.body.token;
	var password = req.body.password; 
	var password_confirmation = req.body.password_confirmation; 

});

app.get('/admin/users', function(req, res){
	res.render('admin-users', {'test':'pretty cool'});
})

app.get('/admin/shopkins', function(req, res){
	var db = app.get('db');
	db.shopkins.find({}, function(err, shopkins){
		res.render('admin-shopkins', {'shopkins': shopkins || []});
	});
});


app.get('/admin/shopkin/:id', function(req, res){

	var db = app.get('db');
	var shopkinId = req.params.id;

	db.shopkins.find({id: shopkinId}, function(err, shopkin){
		res.setHeader('Content-Type','application/json');
		res.send(JSON.stringify(shopkin));
	});

})

app.post('/admin/save/shopkin', function(req, res){
	var db = app.get('db');
	var shopkin = req.body;
	db.shopkins.save(shopkin, function(err, shopkin){
		res.setHeader('Content-Type','application/json');
		res.send(JSON.stringify(shopkin));
	});
})

app.listen(3000, function(){
	console.log('Example app listening on port 3000!');
})