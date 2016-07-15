

function main() {

	var user = new trex.api.User();
	user.data.username = 'tyler';
	user.data.password = 'pass';
	//user.create();
	user.login().then(function (data) {
		console.log(user.data);

		//create
		var cat3 = new Item({
			qty: 55,
			name:'cat'
		});
		cat3.save().then(function (data) {
			console.log('create',cat3.data);
			//delete
			cat3.delete().then(function (data) {
				console.log('delete',cat3.data);
			});
		});

		//read
		/*var cat2 = new Item('576dcdf6d2f84f7f3b0203b6');
		cat2.get().then(function (data) {
			console.log('get', cat2.data);
		}).error(function (reason) {
			console.log(reason);
		});

		//read unauthorized
		var cat2 = new Item('576dab091cd68e1837fbde8d');
		cat2.get().then(function (data) {
			console.log('get', cat2.data);
		}).error(function (reason) {
			console.log(reason);
		});

		//update
		var cat4 = new Item('576dcdf7d2f84f7f3b0203b9');
		cat4.data.qty = Math.round(Math.random()*100);
		cat4.save().then(function (data) {
			console.log('update', cat4.data);
		}).error(function (reason) {
			console.log(reason);
		});*/

		//find
		var cat = new Item();
		cat.data.qty = 26;
		cat.find().then(function (data) {
			console.log('find', cat.data);
		}).error(function (reason) {
			console.log(reason);
		});

	}).error(function (reason) {
		console.log(reason);
	});
}