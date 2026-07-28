var u = db.users.findOne({"_id":"U003"});
print(JSON.stringify({_id: u._id, weeklyTotal: u.weeklyTransactionTotal, weeklyLimit: u.weeklyTransactionLimit, maxBenef: u.maxBeneficiaryAmount, dailyLimit: u.dailyTransactionLimit}));
db.users.updateMany({}, {"$set":{"weeklyTransactionTotal":0}});
db.users.updateMany({},{"$set":{"weeklyTransactionLimit":5000000}});
print("All weekly limits reset");
