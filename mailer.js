const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
exports.sendWelcomeEmail = function(userdata) {
	const msg = {
		to: userdata.email,
		from: 'scott@morrisonlive.ca',
		subject: 'Welcome to Shopkins Tradding Post',
		text: 'Make sure to setup your collection and we\'ll notify you when we find a trade match with your doubles',
		html: '<strong>Make sure to setup your collection and we\'ll notify you when we find a trade match with your doubles</strong>'
	};
	sgMail.send(msg);
};

exports.sendForgotPassword = function(email) {
	
	let token = '123'
	let msg = {
		to: email,
		from: 'scott@morrisonlive.ca',
		subject: 'Shopkins Trading Post Password Reset',
		text: 'A reset password request has been made for your shopkins trading post account click here to reset',
		html: '<p></p>'
	}
	msg.addSubstitution('%reset_url%', 'https://hidden-fortress-14040.herokuapp.com/user/changepassword/'+token);

	msg.addFilter('templates','enable',1);
	msg.addFilter('templates', 'template_id', 'e3ff56dd-7111-415a-b8d0-371c0683a4f6');
	sgMail.send(msg, (err, response) => {

		if(err){
			console.log(err);
		}


	});

};

exports.sendTradeFound = function(userdata, trade) {
	const msg = {
		to: userdata.email,
		from: 'scott@morrisonlive.ca',
		subject: 'Trade Found',
		text: 'Good news! We found a potential trade please review the trade and confirm if you would like to make the trade',
		html: '<strong>Good news! We found a potential trade please review the trade and confirm if you would like to make the trade</strong>'
	}
	sgMail.send(msg);
};

exports.sendTradeAccepted = function(userdata) {
	const msg = {
		to: userdata.email,
		from: 'scott@morrisonlive.ca',
		subject: 'Trade Found',
		text: 'Your trading partner has accepted the trade please review the trade and confirm if you would like to make the trade',
		html: '<strong>Your trading partner has accepted the trade please review the trade and confirm if you woulkd like to make the trade</strong>'
	}
	sgMail.send(msg);	
};

exports.sendTradeConfirmed = function(userdata) {
	const msg = {
		to: userdata.email,
		from: 'scott@morrisonlive.ca',
		subject: 'Trade Confirmed',
		text: 'Trade has been confirmed please print the attached trade confirmation and send the shopkin to 585 Walden Gate, Kingston ON, K7M8R5 with the confirmation',
		html: '<strong>Your trading partner has accepted the trade please review the trade and confirm if you woulkd like to make the trade</strong>'
	}
	sgMail.send(msg);	
}

