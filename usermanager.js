	crypto = require('crypto');


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
		user.salt = salt.toString('hex');

		crypto.pbkdf2(userData.password, salt, 100000, 512, 'sha512', (err, key) => {
	  		if (err) throw err;
	  	
	  		user.password = key.toString('hex'); 
	  		console.log(user.password);

	  		db.addresses.save(address, function(err, dbAddress){

	  			if(err){
	  			  console.log(err);
	  			}

	  			console.log(dbAddress);

	  			user.address_id = dbAddress.id;
	  			db.users.save(user, function(err, dbUser){
	  				if(err) {
	  					console.log(err);
	  				}
	  			});

	  		});

	  		console.log(key.toString('hex'));  // '3745e48...aa39b34'
		
		});


		console.log('creating user');
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

		var userData = {};

		console.log(res.locals.loggedIn);

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

		db.users.findOne({username: username}, function(err, user){
			var salt = Buffer.from(user.salt, "hex");
			crypto.pbkdf2(password, salt, 100000, 512, 'sha512', (err, key) => {
				if(user.password == key.toString('hex')){
					cb(true);
				} else {
					cb(false);
				}
			});

		});

	}