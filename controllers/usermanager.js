	const crypto = require('crypto');
	const uuidv4 = require('uuid/v4');
	const mailer = require('../mailer');


	exports.setUserPassword = function(user, password, cb) {
		var salt = crypto.randomBytes(32);
		user.salt = salt.toString('hex');
		crypto.pbkdf2(password, salt, 100000, 512, 'sha512', (err, key) => {
			user.password = key.toString('hex'); 
			cb(user);
		});
	}

	exports.resetUserPassword = function(email, db) {

		console.log(db);

		db.users.findOne({username: email}).then(user => {
			if(user) {
				const resetToken = uuidv4();
				user.password_reset = true;
				user.password_reset_token = resetToken;
				db.users.save(user).then(dbUser => {
					mailer.sendForgotPassword(email, resetToken);
				}).catch(err => {
					console.log(error);
				});
			}
		}).catch(err => {
			console.log(err);
		});

	};

	exports.createUser = function(userData, db){
		
		var salt = crypto.randomBytes(32);
		var address = {};
		address.street = userData.address;
		address.city = userData.city;
		address.state = userData.province; 
		address.country = userData.country; 
		address.postal_code = userData.postalcode;

		var user = {};
		user.firstname = userData.firstName;
		user.lastname = userData.lastName;
		user.username = userData.email;
		

		module.exports.setUserPassword(user, userData.password, (user) => {

			db.addresses.save(address).then(dbAddress => {

				if(err){
				  console.log(err);
				}

				console.log(dbAddress);

				user.address_id = dbAddress.id;
				db.users.save(user).then( dbUser => {
					if(err) {
						console.log(err);
					}
				});

			});

		});

	};

	exports.validateNewUserForm = function(userData){
		console.log('validating user input');

		var errors = [];
		if(!userData.firstName) {
			errors.push({'error':'First Name is required'});
		}

		if(!userData.lastName) {
			errors.push({'error':'Last Name is required'});
		}

		if(!userData.email) {
			errors.push({'error':'Email is required'});
		}

		if(!userData.password) {
			errors.push({'error':'Password is required'});
		} else if(userData.password.length < 8) {
			errors.push({'error':'Password must be at least 8 characters'});
		} else if(userData.password !== userData.confirmPassword) {
			errors.push({'error':'Passwords don\'t match'});
		}
		return errors; 
	};


	exports.getSessionUserData = function(res) {

		let userData = {};

		console.log('is logged in'+res.locals.loggedIn);

		if(res.locals.loggedIn) {

			userData['user'] = {};
			userData['user']['firstname'] = res.locals['user']['firstname'];
			userData['user']['lastname'] = res.locals['user']['lastname'];
			userData['user']['username'] = res.locals['user']['username'];
		} else {
			userData['guest'] = true; 
		}

		return userData; 
	}


	exports.verifyPassword = function(username, password, db, cb){

		db.users.findOne({username: username}).then( user => {
			let salt = Buffer.from(user.salt, "hex");

			console.log(salt);

			console.log(password);

			crypto.pbkdf2(password, salt, 100000, 512, 'sha512', (err, key) => {
				if(user.password == key.toString('hex')){
					cb(true);
				} else {
					cb(false);
				}
			});

		}).catch(err =>{
			console.log(err);
			cb(false);
		});

	}