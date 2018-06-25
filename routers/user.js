var express = require('express');
var router = express.Router();
var usermanager = require('../controllers/usermanager');
var mailer = require('../mailer');


router.get('/register', function(req, res){
    res.render('register');
});

router.post('/doRegistration', function(req, res){
    
    const userData = req.body;
    const errors = usermanager.validateNewUserForm(userData);

    if(errors.length == 0) {
        usermanager.createUser(userData, app.get('db'));
        mailer.sendWelcomeEmail(userData); 
        res.render('message', {'message':'Thanks for registering! You can now setup you collection and start trading.'});

    } else {
        res.render('register', {'errors': errors, 'values':userData});
    }

});

router.get('/login', function(req, res){
    res.render('login');
});


router.post('/login', function(req, res){

    let db = app.get('db');
    usermanager.verifyPassword(req.body.username, req.body.password, db, function(success){
        
        console.log('Success '+success);

        if(success){

            console.log('redirecting')

            req.session.username = req.body.username;


            console.log('set the username');
            res.redirect('back');

        } else {
            res.render('login', {errors: [{error: 'Invalid username or password'}]});
        }
    });
        
});


router.get('/logout', function(req, res){
    req.session.destroy(); 
    res.redirect('/');
});

router.get('/resetpassword', function(req, res){
    const db = router.get('db');
    res.render('resetpassword', templateData);
});

router.get('/changepassword(/:token)?/', function(req, res){
    const db = router.get('db');
    const templateData = usermanager.getSessionUserData(res);

    templateData['token'] = req.params.token;
    templateData['notoken'] = templateData['token'] === undefined; 
    console.log(templateData['notoken']);
    res.render('changepassword', templateData);

});

router.post('/changepassword', function(req, res) {

    console.log(req.body);
    const token = req.body.token;
    const password = req.body.password; 
    const password_confirmation = req.body.password_confirmation; 

});

router.get('/forgotpassword', function(req, res) {

    const templateData = usermanager.getSessionUserData(res);

    const token = req.body.token;
    const password = req.body.password; 
    const password_confirmation = req.body.password_confirmation; 
    res.render('forgotpassword', templateData);

});

router.post('/forgotpassword', function(req, res){

    const templateData = usermanager.getSessionUserData(res);
    const email = req.body.email;
    
    //get the user by email
    usermanager.resetUserPassword(email);
    res.render('forgotpasswordconfirmation');

})

module.exports = router;