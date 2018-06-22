var http = require('http');
var express = require('express');
var crypto = require('crypto');
const massive = require('massive');
var mustacheExpress = require('mustache-express');
var bodyParser = require('body-parser');
var multer = require('multer');
var session = require('client-sessions');
var usermanager = require('./controllers/usermanager');
var userRoutes = require('./routers/user');
var adminRoutes = require('./routers/admin');
var mailer = require('./mailer');
var trader = require('./trader');
var app = express();
const port = process.env.PORT || 3001;

let connectionString;

if(process.env.DATABASE_URL) {
	connectionString = process.env.DATABASE_URL+"?ssl=true";
} else {
	connectionString = "postgres://postgres:etienne77@localhost:5433/postgres";	
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
			const db = app.get('db');
			db.users.findOne({username: req.session.username}).then(user => {
				
				user.password = null;
				res.locals.loggedIn = true;
				res.locals.user = user;
				req.session.username = user.username;
				next();
			}).catch(err => {
				console.log(err);
				next(); 
			})		
		} else {
			next();
	 	}
	});

	// authentication check middleware
	app.use(function(req, res, next){
		if(req.url.startsWith('/admin')) {
			if(!res.locals.user || res.locals.user.username != 'scott@morrisonlive.ca') {
				res.redirect('/user/login');
			} else {
				next();
			}
		} else {
			next(); 
		}
	});

	app.use('/user', userRoutes);


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

			db.query('SELECT trades.id, shopkins1.number as number1, shopkins2.number as number2, user1, user2, user1accepted, user2accepted, status FROM trades '+
						' LEFT OUTER JOIN shopkins AS shopkins1 ON user1item = shopkins1.id '+
						 ' LEFT OUTER JOIN shopkins AS shopkins2 ON user2item = shopkins2.id WHERE user1 = $1 OR user2 = $1', [res.locals.user.id]).then(currenttrades => {
						 
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
			res.redirect('/user/login');
		}

	});


	app.post('/shopkins/trade/accept/:tradeid', function(req, res) {

		if(!res.locals.user){
			res.send('{"error":"login"}');
		} else {

			var db = app.get('db');
			var tradeid = req.params.tradeid;

			db.trades.find({id:tradeid}).then(trades => {

				var trade = trades[0];

				if(trade.user1 == res.locals.user.id) {
					trade.user1accepted = true;
				} else {
					trade.user2accepted = true; 
				}

				db.trades.save(trade).then(updatedTrade => {

					res.send(JSON.stringify(updatedTrade));
				}).catch(errrr => {
					res.send(JSON.stringify({error: err}));
				})

			}).catch(err => {
				res.send(JSON.stringify({error: err}));
			});

		}

	});


	app.get('/shopkins/:season', function(req, res){
		

		console.log('loading season');

		const templateData = usermanager.getSessionUserData(res);
		templateData['shopkinactive'] = true;
		const db = app.get('db');	
		const season = req.params['season'];

		templateData['title'] = 'Season '+season+' Shopkins ';
		templateData['keywords'] = 'Shopkins,Toys,Season '+season;

		console.log(season);


		if(res.locals.user) {
			db.query('SELECT shopkins.id, name, number, season, rarity, usercollection.count FROM shopkins'+
					' LEFT OUTER JOIN (SELECT * FROM collection WHERE userid = $1 ) AS usercollection ON shopkins.id = usercollection.shopkinid'+
					' WHERE season=$2 ORDER BY season, number', [res.locals.user.id, season]).then(shopkins => {
						templateData['shopkins'] = shopkins;
						res.render('shopkins', templateData);
					});
		} else {

			console.log('getting shopkins');

			db.shopkins.find({season: season}, {order: "season,number"}).then(shopkins => {
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
			db.collection.find({userid:res.locals.user.id, shopkinid: shopkinid}).then(collection => {

				console.log('find requst completed');

					console.log(collection);

					let row; 

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

					db.collection.save(row).then(savedCollection => {			
						
						console.log(err);
						console.log(savedCollection);

						res.send(JSON.stringify(savedCollection));
						
					}).catch(err => {
						res.send(JSON.stringify({error: err}));
					});
				

			}).catch(err => {
				res.send(JSON.stringify({error: err}));
			});
		}
	});

	app.get('/myshopkins', function(req, res){
		

		console.log('in my shopkins');


		let db = app.get('db');
		let templateData = usermanager.getSessionUserData(res);
		templateData['myshopkins'] = true;
		
		
		console.log(res.locals.user);

		if(res.locals.user) {

			console.log('loading');
			console.log(res.locals.user.trading_active);

			if(res.locals.user.trading_active)
				templateData['active'] = res.locals.user.trading_active;



			db.query('SELECT shopkins.id, name, number, season, rarity, collection.count FROM collection'+
					' INNER JOIN shopkins ON shopkins.id = collection.shopkinid'+
					' WHERE collection.userid = $1 ORDER BY season, number', [res.locals.user.id]).then(shopkins => {
						

					templateData['shopkins'] = shopkins;	
					res.render('myshopkins', templateData);

			}).catch(err => {
				console.log(err);	
			});
		} else {
			res.redirect('/user/login');
		}

	});


	app.post('/toggleactive', function(req, res){

		const db = app.get('db');

		if(res.locals.user) {
		
			console.log(req.body.checked);
			console.log(res.locals.user.id)

			db.query('UPDATE users SET trading_active = $1 WHERE id = $2', [req.body.checked, res.locals.user.id]).then(user => {

				if(err) {
					console.log(err);
				} else {

					if(req.body.checked) {
						db.query('SELECT shopkinid FROM collection WHERE userid = $1 AND count > 1', [res.locals.user.id]).then(collections => {

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

		let db = app.get('db');
		let shopkinid = req.params.shopkinid;

		if(!res.locals.user){
			res.send('{"error":"login"}');
		} else {
			db.collection.find({userid:res.locals.user.id, shopkinid: shopkinid}).then( colRecord => {



					let row = colRecord[0];
					if(row.count == 1) {
						db.collection.destroy(row).then(colDestroyed => {
							res.send('{"success": true}');
						}).catch(err => {
							res.send({"error":err});
						});
					} else {
						row.count = row.count - 1;
						db.collection.save(row).then(colUpdated => {
							res.send('{"success": true}');
						}).catch(err => {
							res.send({"error":err});
						});
					}

			}).catch(err => {
				console.log(err);
				res.send(JSON.stringify({error: err}));
			});
		}

	})

	app.listen(port, function(){
		console.log('Example app listening on port '+port+'!');
	})

}).catch(error => console.log(error.message));