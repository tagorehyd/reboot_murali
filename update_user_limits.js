db.users.updateOne({"_id":"U001"},{"$set":{"maxBeneficiaryAmount":500000,"dailyTransactionLimit":1000000}});
db.users.updateOne({"_id":"U002"},{"$set":{"maxBeneficiaryAmount":500000,"dailyTransactionLimit":1000000}});
db.users.updateOne({"_id":"U003"},{"$set":{"maxBeneficiaryAmount":500000,"dailyTransactionLimit":1000000}});
print("User limits updated");
