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
        usermanager.createUser(userData, req.app.get('db'));
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

    let db = req.app.get('db');
    usermanager.verifyPassword(req.body.username, req.body.password, db, function(success){
        
        console.log('Success '+success);

        if(success){

            console.log('redirecting')
            req.session.username = req.body.username;
            console.log('set the username');

            if(res.locals.returnUrl) 
                res.redirect(res.locals.returnUrl);
            else 
                res.redirect('/myshopkins');

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
    const db = req.app.get('db');
    res.render('resetpassword', templateData);
});

router.get('/changepassword(/:token)?/', function(req, res){
    
    let templateData = usermanager.getSessionUserData(res);
    templateData['token'] = req.params.token;
    templateData['notoken'] = templateData['token'] === undefined; 
    const db = req.app.get('db');

    if(templateData['notoken'] && res.locals.user) {
        
        console.log(templateData['notoken']);
        res.render('changepassword', templateData);
    } else if(!templateData['notoken']){

        db.user.findOne({password_reset_token: templateData['notoken']}).then(user => {
            res.locals.token = req.params.token
            res.render('changepassword');
        }).error(err => {
            console.log(err);
            res.redirect('/user/login');
        });

    } else{
        res.redirect('/user/login');
    }

});

router.post('/changepassword', function(req, res) {

    let db = req.app.get('db');

    let user = res.locals.user;
    let password = req.body.new_password;
    let token = req.body.token;

    let templateData = usermanager.getSessionUserData(res);
    templateData['token'] = token;
    templateData['notoken'] = (token === undefined || token === '');

    if(req.body.new_password != req.body.new_password_confirmation) {
        templateData['errors'] = [{error: 'passwords must match'}];
        res.render('changepassword',  templateData);
        return;
    }

    if(user) {
        usermanager.verifyPassword(user.username, req.body.current_password, db, function(valid){
            if(valid) {              

                console.log('user output');
                console.log(user);

                usermanager.setUserPassword(user, password, (user) => {
                    db.users.save(user).then( dbUser => {
                        res.render('changepasswordconfirmation');
                    }).catch(err => {
                        console.log(err);
                    });
                });
            } else {
                console.log('invalid current password');
                templateData['errors'] = [{error: 'Invalid current password'}];
                res.render('changepassword',  templateData);
            }

        });
        //update password
    } else if (token){
        //validate token 
        user.findOne({password_reset_token: token}).then(user => {
            usermanager.setUserPassword(user, password, (user) => {
                db.users.save(user).then( dbUser => {
                    res.render('changepasswordconfirmation');
                }).error(err => {
                    templateData['errors'] = [{error: 'Invalid token'}];
                    res.render('changepassword', templateData);
                });
            });        
        }).error(err => {
            templateData['errors'] = [{error: 'Invalid token'}];
            res.render('changepassword', templateData);
        })
        

    } else {
        templateData['errors'] = [{error: 'Invalid request'}];
        res.render('changepassword', templateData);
    }

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
    const db = req.app.get('db');

    usermanager.resetUserPassword(email, db);
    res.render('forgotpasswordconfirmation');

})

module.exports = router;