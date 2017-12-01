var http = require('http');
var express = require('express');
var crypto = require('crypto');
const massive = require('massive');
var mustacheExpress = require('mustache-express');
var bodyParser = require('body-parser');
var multer = require('multer');
var session = require('client-sessions');
var usermanager = require('./usermanager');
var trader = require('./trader');

const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

var app = express();
var port = process.env.PORT || 3000;

var connectionString;

if(process.env.DATABASE_URL) {
	connectionString = process.env.DATABASE_URL+"?ssl=true";
} else {
	connectionString = "postgres://postgres:Etienne!77@localhost:5433/shopkinstrading";	
} 

massive(connectionString).then(massiveInstance => {

	app.set('db', massiveInstance);

	//setup the templating engine
	app.engine('html', mustacheExpress());
	app.set('view engine', 'html');
	app.set('views', __dirname+'/views');

	app.use(express.static(__dirname+'/public'));
	app.use(express.static(__dirname+'/games'));
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
		if(req.session && req.session.username) {
			var db = app.get('db');

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
		templateData['howitworks'] = true;
		res.render('howitworks', templateData);
	});

	app.get('/trades', function(req, res){
		var templateData = usermanager.getSessionUserData(res);
		templateData['trades'] = true;

		var db = app.get('db');
		if(res.locals.user) {

			db.run('SELECT trades.id, shopkins1.number as number1, shopkins2.number as number2, user1, user2, user1accepted, user2accepted, status FROM trades '+
						' LEFT OUTER JOIN shopkins AS shopkins1 ON user1item = shopkins1.id '+
						 ' LEFT OUTER JOIN shopkins AS shopkins2 ON user2item = shopkins2.id WHERE user1 = $1 OR user2 = $1', [res.locals.user.id], function(err, currenttrades){
						 
						 	if(err) {
						 		console.log(err);
						 	}


						 	var tradeset = [];
						 	for(var i=0; i<currenttrades.length; ++i) {

						 		var t = {id: currenttrades[i]['id']}

						 		if(currenttrades[i].user1 == res.locals.user.id ) {
						 			t.shopkin1number = currenttrades[i]['number1'];
						 			t.shopkin2number = currenttrades[i]['number2'];
						 			t.accepted = currenttrades[i]['user1accepted'];
						 			t.partnerAccepted = currenttrades[i]['user2accepted'];

						 		} else {
						 			t.shopkin1number = currenttrades[i]['number2'];
						 			t.shopkin2number = currenttrades[i]['number1'];
						 			t.accepted = currenttrades[i]['user2accepted'];
						 			t.partnerAccepted = currenttrades[i]['user1accepted'];				 			
						 		}

						 		if(t.accepted && t.partnerAccepted) {
						 			t.image = 'trade-accepted.png';
						 		} else if(t.accepted) {
						 			t.image = 'trade-left-accept.png';
						 		} else if(t.partnerAccepted) {
						 			t.image = 'trade-right-accept.png';
						 		} else {
						 			t.image = 'trade-initiated.png';
						 		}


						 		tradeset.push(t);
						 	}


						 	templateData['currenttrades'] = tradeset; 
						 	res.render('trades', templateData);

						 });
		} else {
			res.redirect('login');
		}

	});


	app.post('/shopkins/trade/accept/:tradeid', function(req, res) {

		if(!res.locals.user){
			res.send('{"error":"login"}');
		} else {

			var db = app.get('db');
			var tradeid = req.params.tradeid;

			db.trades.find({id:tradeid}, function(err, trades){

				var trade = trades[0];

				if(err) {
					res.send(JSON.stringify({error: err}));
				}

				if(trade.user1 == res.locals.user.id) {
					trade.user1accepted = true;
				} else {
					trade.user2accepted = true; 
				}

				db.trades.save(trade, function(err, updatedTrade){

					if(err) {
						res.send(JSON.stringify({error: err}));
					} else {
						res.send(JSON.stringify(updatedTrade));
					}

				});
			});

		}

	});


	app.get('/shopkins/:season', function(req, res){
		const templateData = usermanager.getSessionUserData(res);
		templateData['shopkinactive'] = true;
		const db = app.get('db');	

		const season = req.params['season'];

		templateData['title'] = 'Season '+season+' Shopkins ';
		templateData['keywords'] = 'Shopkins,Toys,Season '+season;

		if(res.locals.user) {
			db.run('SELECT shopkins.id, name, number, season, rarity, usercollection.count FROM shopkins'+
					' LEFT OUTER JOIN (SELECT * FROM collection WHERE userid = $1 ) AS usercollection ON shopkins.id = usercollection.shopkinid'+
					' WHERE season=$2 ORDER BY season, number', [res.locals.user.id, season], function(err, shopkins){
						templateData['shopkins'] = shopkins;
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


			const db = app.get('db');
			const shopkinid = req.params.shopkinid;
			//check if a collection record exists 
			db.collection.find({userid:res.locals.user.id, shopkinid: shopkinid}, function(err, collection){

				console.log('find requst completed');

				if(err){

					console.log(error);

					res.send(JSON.stringify({error: err}));
				} else {

					console.log(collection);

					const row; 

					if(collection.length > 0) {
						row = collection[0]
						row.count = row.count+1; 
						trader.findTrades(res.locals.user.id, shopkinid, db);

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
		
		const db = app.get('db');
		const templateData = usermanager.getSessionUserData(res);
		templateData['myshopkins'] = true;
		if(res.locals.user) {


			console.log(res.locals.user.trading_active);

			if(res.locals.user.trading_active)
				templateData['active'] = res.locals.user.trading_active;

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
			res.redirect('login');
		}

	});


	app.post('/toggleactive', function(req, res){

		const db = app.get('db');

		if(res.locals.user) {
		
			console.log(req.body.checked);
			console.log(res.locals.user.id)

			db.run('UPDATE users SET trading_active = $1 WHERE id = $2', [req.body.checked, res.locals.user.id], function(err, user){

				if(err) {
					console.log(err);
				} else {

					if(req.body.checked) {
						db.run('SELECT shopkinid FROM collection WHERE userid = $1 AND count > 1', [res.locals.user.id], function(err, collections){

							for(let i=0; i<collections.length; ++i) {
							
								console.log('finding trades');
								trader.findTrades(res.locals.user.id, collections[i].shopkinid);
							}
						});
					}
				}

			});
		}
	});

	app.post('/remove/:shopkinid', function(req, res){

		const db = app.get('db');
		const shopkinid = req.params.shopkinid;

		if(!res.locals.user){
			res.send('{"error":"login"}');
		} else {
			db.collection.find({userid:res.locals.user.id, shopkinid: shopkinid}, function(err, colRecord){

				if(err) {
					console.log(error);
					res.send(JSON.stringify({error: err}));				
				} else {

					const row = colRecord[0];

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


	/**
	 * User mangement routes
	 */ 
	app.get('/register', function(req, res){
		res.render('register');
	});

	app.post('/doRegistration', function(req, res){
		
		const userData = req.body;
		const errors = usermanager.validateNewUserForm(userData);

		if(errors.length == 0) {
			usermanager.createUser(userData, app.get('db'));

			const msg = {
				to: userData.email,
				from: 'scott@morrisonlive.ca',
				subject: 'Welcome to Shopkins Tradding Post!',
				text: 'Make sure to setup your collection and we\'ll notify you when we find a trade match with your doubles',
				html: '<strong>Make sure to setup your collection and we\'ll notify you when we find a trade match with your doubles</strong>'
			};

			sgMail.send(msg);
			res.render('message', {'message':'Thanks for registering! You can now setup you collection and start trading.'});

		} else {
			res.render('register', {'errors': errors, 'values':userData});
		}

	});

	app.get('/login', function(req, res){
		res.render('login');
	});


	app.post('/login', function(req, res){

		const db = app.get('db');
		usermanager.verifyPassword(req.body.username, req.body.password, db, function(success){
			if(success){
				req.session.username = req.body.username;
				res.redirect('myshopkins');
			} else {
				res.render('login', {errors: [{error: 'Invalid username or password'}]});
			}
		});
			
	});


	app.get('/logout', function(req, res){
		req.session.destroy(); 
		res.redirect('/');
	});

	app.get('/resetpassword', function(req, res){
		const db = app.get('db');
		const templateData = usermanager.getSessionUserData(res);
		templateData['notoken'] = true; 
		res.render('resetpassword', templateData);
	});

	app.get('/resetpassword:/token', function(req, res){
		const db = app.get('db');
		const templateData = usermanager.getSessionUserData(res);

		//validate the token 

		//if it's valid show the reset password form with the token other wise show access denied 
		templateData['token'] = req.params.token; 

		console.log(templateData['token']);
		res.render('resetpassword', templateData);

	});

	app.post('/resetpassword', function(req, res) {

		console.log(req.body);

		const token = req.body.token;
		const password = req.body.password; 
		const password_confirmation = req.body.password_confirmation; 

	});


	/**
	 * Administration routes
	 */


	app.get('/admin/users', function(req, res){


		const db = app.get('db');
		const templateData = usermanager.getSessionUserData(res);


		db.users.find({}, function(err, users){

			if(err)  {
				res.render('admin-users', templateData);
			} else {
				templateData['users'] = users;
				res.render('admin-users', templateData);
			}

		});	

	});

	app.get('/admin/shopkins', function(req, res){
		const db = app.get('db');
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

		const db = app.get('db');
		const shopkinId = req.params.id; 

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
		const db = app.get('db');
		const shopkin = req.body;
		db.shopkins.save(shopkin, function(err, shopkin){
			res.setHeader('Content-Type','application/json');
			res.send(JSON.stringify(shopkin));
		});
	})

	app.listen(port, function(){
		console.log('Example app listening on port 3000!');
	})

}).catch(error => console.log(error.message));