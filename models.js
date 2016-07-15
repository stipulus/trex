if(typeof require === 'function') {
	trex = require('./trex');
	trex.api.config(require('./config').api);
}

var Item = trex.api.Model.prototype.extend({
	table:'items',
	params: {
		qty:Number,
		name:String
	},
	access: {
	}
});