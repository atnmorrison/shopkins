exports.findTrades = function(userId, doubleId, db) {

	//find shopkins that the user has 
	db.query('SELECT * FROM collection WHERE userid = $1', [userId]).then(alreadyHave => {

			var haveIds = [];
			for(var i=0; i<alreadyHave.length; ++i) {
				haveIds.push(alreadyHave.shopkinid);
			}

			//find shopkins that are doubles that don't belong to the user 
			db.query('SELECT * FROM collection LEFT JOIN users ON collection.userid = users.id  WHERE userid != $1 AND count > 1 AND users.trading_active = true', [userId]).then(possibleTrades => {

					//users who already have the double
					db.query('SELECT * FROM collection WHERE userid !=$1 AND shopkinid = $2', [userId, doubleId]).then(disqualified => {

						var disqualifiedUserIds = [];
						for(collection in disqualified) {
							disqualifiedUserIds.push(disqualified[collection].userid);
						}


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
									}).then(trade => {
										console.log(trade)
									}).catch(err => {
										console.log(err);
									});
								}
							}
					
					}).catch(err => {
						console.log(err);
					});
				
			}).catch(err => {
				console.log(err);
			});
	}).catch(err => {
		console.log(err);
	});
}