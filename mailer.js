const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
exports.sendWelcomeEmail = function(userdata) {
	const msg = {
		to: userdata.email,
		from: 'scott@morrisonlive.ca',
		subject: 'Welcome to Shopkins Tradding Post!',
		text: 'Make sure to setup your collection and we\'ll notify you when we find a trade match with your doubles',
		html: '<strong>Make sure to setup your collection and we\'ll notify you when we find a trade match with your doubles</strong>'
	};
	sgMail.send(msg);
};