var massive = require('massive');

var connectionString;
if(process.env.DATABASE_URL) {
	connectionString = process.env.DATABASE_URL+"?ssl=true";
} else {
	connectionString = "postgres://postgres:Etienne!77@localhost:5433/shopkinstrading";	
} 

var db = massive.connectSync({connectionString:connectionString});


exports.findTrades = function(userId, doubleId) {

	//find shopkins that the user has 
	db.run('SELECT * FROM collection WHERE userid = $1', [userId], function(err, alreadyHave) {

		if(err) {
			console.log(err);
		} else {

			var haveIds = [];
			for(var i=0; i<alreadyHave.length; ++i) {
				haveIds.push(alreadyHave.shopkinid);
			}

			//find shopkins that are doubles that don't belong to the user 
			db.run('SELECT * FROM collection LEFT JOIN users ON collection.userid = users.id  WHERE userid != $1 AND count > 1 AND users.trading_active = true', [userId], function(err, possibleTrades){
				if(err) {
					console.log(err);
				} else {
					//users who already have the double
					db.run('SELECT * FROM collection WHERE userid !=$1 AND shopkinid = $2', [userId, doubleId], function(err, disqualified){

						var disqualifiedUserIds = [];
						for(collection in disqualified) {
							disqualifiedUserIds.push(disqualified[collection].userid);
						}

						if(err) {
							console.log(err);
						} else {

							for(var j=0; j<possibleTrades.length; ++j) {
								if(disqualifiedUserIds.indexOf(possibleTrades[j].userid) < 0 && alreadyHave.indexOf(possibleTrades[j].shopkinid) < 0) {
									db.trades.save({  
											user1: userId,
											user2: possibleTrades[j].userid,
											user1item: doubleId,
											user2item: possibleTrades[j].shopkinid,
											user1accepted: false,
											user2accepted: false,
											status: 'Started'
										}, function(err, trade){
										console.log(err);
										console.log(trade)
									});
								}
							}
						}
					});
				}
			});

		}
	});
}