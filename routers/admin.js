var express = require('express');
var router = express.Router();

router.get('/users', function(req, res){
    const db = app.get('db');
    const templateData = usermanager.getSessionUserData(res);

    db.users.find({}).then(users => {
        templateData['users'] = users;
        res.render('admin-users', templateData);
    }).catch(err => {
        res.render('admin-users', templateData);
    });	

});

router.get('/shopkins', function(req, res){
    const db = app.get('db');
    db.shopkins.find({}).then(shopkins => {
        res.render('admin-shopkins', {'shopkins': shopkins || []});
    });
});


router.get('/shopkin/:id', function(req, res){

    var db = app.get('db');
    var shopkinId = req.params.id;

    db.shopkins.find({id: shopkinId}).then(shopkin => {
        res.setHeader('Content-Type','application/json');
        res.send(JSON.stringify(shopkin));
    });

})


router.post('/remove/shopkin/:id', function(req, res){

    const db = app.get('db');
    const shopkinId = req.params.id; 

    db.shopkins.destroy({id:shopkinId}).then(shopkin => {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(shopkin));
    }).catch(err => {
        res.setHeader('Content-Type', 'application/json');
        res.send('{"error" : '+JSON.stringify(err)+'}');
    });

});

router.post('/save/shopkin', function(req, res){
    const db = app.get('db');
    const shopkin = req.body;
    db.shopkins.save(shopkin).then(shopkin => {
        res.setHeader('Content-Type','application/json');
        res.send(JSON.stringify(shopkin));
    });
})

module.exports = router;