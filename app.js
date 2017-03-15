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
var port = process.env.PORT || 3000;


//setup the database

console.log(process.env.DATABASE_URL);

var connectionString;

if(process.env.DATABASE_URL) {
	connectionString = process.env.DATABASE_URL+"?ssl=true";
} else {
	connectionString = "postgres://postgres:Etienne!77@localhost:5433/shopkinstrading";	
} 

var massiveInstance = massive.connectSync({connectionString:connectionString});
app.set('db', massiveInstance);

//setup the templating engine
app.engine('html', mustacheExpress());
app.set('view engine', 'html');
app.set('views', __dirname+'/views');

app.use(express.static(__dirname+'/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));


//setup session middle ware
app.use(session({
	cookieName: 'session',
	secret: crypto.randomBytes(32).toString('hex'),
	duration: 30 * 60 * 1000,
	activeDuration: 5 * 60 * 1000
}));

// user setup middleware
app.use(function(req, res, next){

	res.locals.loggedIn = false; 

	console.log('running middleware');
	console.log(req.session.username);
	console.log(req.url);


	if(req.session && req.session.username) {
		var db = app.get('db');

		console.log(db);
		db.users.findOne({username: req.session.username}, function(err, user){
			if(err){
			
			} else {
				//clear the password field 
				user.password = null;

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



// authentication check middleware
app.use(function(req, res, next){


	if(req.url.startsWith('/admin')) {
		if(!res.locals.user || res.locals.user.username != 'scott@morrisonlive.ca') {
			res.redirect('/login');
		} else {
			next();
		}
	} else {
		next(); 
	}



});


/**
 * Application routes
 */

app.get('/', function(req, res){
	var templateData = usermanager.getSessionUserData(res);
	templateData['title'] = 'Shopkins Trading Post Home';
	templateData['keywords'] = 'Shopkins,Toys,Trading,Safe'; 
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

app.get('/shopkins/:season', function(req, res){
	var templateData = usermanager.getSessionUserData(res);
	var db = app.get('db');	
	var season = req.params['season'];

	templateData['title'] = 'Season '+season+' Shopkins ';
	templateData['keywords'] = 'Shopkins,Toys,Season '+season;

	if(res.locals.user) {
		db.run('SELECT shopkins.id, name, number, season, rarity, usercollection.count FROM shopkins'+
				' LEFT OUTER JOIN (SELECT * FROM collection WHERE userid = $1 ) AS usercollection ON shopkins.id = usercollection.shopkinid'+
				' WHERE season=$2 ORDER BY season, number', [res.locals.user.id, season], function(err, shopkins){
					templateData['shopkins'] = shopkins;

					console.log(shopkins[1]);

					res.render('shopkins', templateData);					
				});
	} else {
		db.shopkins.find({season: season}, {order: "season,number"}, function(err, shopkins){
			templateData['shopkins'] = shopkins; 
			res.render('shopkins', templateData);
		})
	}
});

app.post('/add/:shopkinid', function(req, res){

	if(!res.locals.user){
		res.send('{"error":"login"}');
	} else {


		var db = app.get('db');
		var shopkinid = req.params.shopkinid;
		//check if a collection record exists 
		db.collection.find({userid:res.locals.user.id, shopkinid: shopkinid}, function(err, collection){

			console.log('find requst completed');

			if(err){

				console.log(error);

				res.send(JSON.stringify({error: err}));
			} else {

				console.log(collection);

				var row; 

				if(collection.length > 0) {
					row = collection[0]
					row.count = row.count+1; 
				} else {
					row = {};
					row.userid = res.locals.user.id;
					row.shopkinid = parseInt(shopkinid);
					row.count = 1;
				}


				console.log(row);
				//save the collection recrod

				db.collection.save(row, function(err, savedCollection){					
					
					console.log(err);
					console.log(savedCollection);

					if(err){
						res.send(JSON.stringify({error: err}));
					} else {
						res.send(JSON.stringify(savedCollection));
					}
				});
			}


		});
	}
});

app.get('/myshopkins', function(req, res){
	
	var db = app.get('db');
	var templateData = usermanager.getSessionUserData(res);
	if(res.locals.user) {
		db.run('SELECT shopkins.id, name, number, season, rarity, collection.count FROM collection'+
				' INNER JOIN shopkins ON shopkins.id = collection.shopkinid'+
				' WHERE collection.userid = $1 ORDER BY season, number', [res.locals.user.id], function(err, shopkins){
					
					if(err)
						console.log(err);
					else 
						templateData['shopkins'] = shopkins;
					
					res.render('myshopkins', templateData);

		});
	} else {
		res.render('myshopkins', templateData);
	}

});


app.post('/remove/:shopkinid', function(req, res){

	var db = app.get('db');
	var shopkinid = req.params.shopkinid;

	if(!res.locals.user){
		res.send('{"error":"login"}');
	} else {
		db.collection.find({userid:res.locals.user.id, shopkinid: shopkinid}, function(err, colRecord){

			if(err) {
				console.log(error);
				res.send(JSON.stringify({error: err}));				
			} else {

				var row = colRecord[0];

				if(row.count == 1) {
					db.collection.destroy(row, function(err, colDestroyed){
						if(err) {
							res.send({"error":err});
						} else {
							res.send('{"success": true}');
						}
					});
				} else {
					row.count = row.count - 1;
					db.collection.save(row, function(err, colUpdated){
						if(err) {
							res.send({"error":err});
						} else {
							res.send('{"success": true}');
						}
					});
				}

			}

		});
	}

})


app.post('/toggletrading', function(req, res){

})


/**
 * User mangement routes
 */ 
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


/**
 * Administration routes
 */


app.get('/admin/users', function(req, res){

	if(!res.locals.user || res.locals.user.username != 'scott@morrisonlive.ca') {
		res.redirect('/authorization');
	}

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


app.post('/admin/remove/shopkin/:id', function(req, res){

	var db = app.get('db');
	var shopkinId = req.params.id; 

	db.shopkins.destroy({id:shopkinId}, function(err, shopkin){

		if(err) {
			res.setHeader('Content-Type', 'application/json');
			res.send('{"error" : '+JSON.stringify(err)+'}');
		} else {
			res.setHeader('Content-Type', 'application/json');
			res.send(JSON.stringify(shopkin));
		}

	});

});

app.post('/admin/save/shopkin', function(req, res){
	var db = app.get('db');
	var shopkin = req.body;
	db.shopkins.save(shopkin, function(err, shopkin){
		res.setHeader('Content-Type','application/json');
		res.send(JSON.stringify(shopkin));
	});
})

app.listen(port, function(){
	console.log('Example app listening on port 3000!');
})