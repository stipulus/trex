Trex is a library built for both browser based javascript and server-side nodejs. This library contains 10 different work-in-progress light-weight modules that can be used to develop efficient data driven websites in a matter of hours.

***

* `trex.isNode`: Boolean value to use in multi-platform javascript files.  
```javascript
var fun = function () {};
if(isNode) {
    process.nextTick(fun);  
} else {
    setTimeout(fun);
}
```

* `trex.class()`: Simliare to prototypejs this is for defining a basic class in javascript/nodejs and provides a base for other modules in the trex library.
```javascript
var Item = trex.class({
    construct: function (name) {
        console.log('hello '+name+'!');
    }
});
var item = new Item('tom');
//prints "hello tom!"
```

* `new trex.Hurdle(callback)`: Hurdle uses the class definition from trex.class() and provides similiar functionality to a javascript promise, but with one key difference. It is up to the developer to call hurdle.set() and hurdle.complete(), and when all hurdles that have been "set" are "complete" the callback will be run asyncronously.
```javascript
var hurdle = new Hurdle();
var item1,item5;
hurdle.set();
$.get('/item/5').then(function (data) {
    item5 = data;
    hurdle.complete();
});
hurdle.set();
$.get('/item/1').then(function (data) {
    item1 = data;
    hurdle.complete();
});
hurdle.then(function () {
    //runs after both item1 and item5 have been returned
});
```

* `new trex.Cookie('cookie-name')`: Cookie is a class that can be used on either nodejs or browser-based javascript to set and retrieve client cookies.
```javascript
var cookie = new Cookie('token');
//get
var token = cookie.get();
//set
cookie.value = 'as9p8hapst';
cookie.set();
```

* `trex.safeTimeout`: Built on top of setTimeout, this module uses many short timeouts to make up timeouts set with this tool. This is to try and avoid process blocking in nodejs.
```javascript
var fiveminutes = 1000*60*5;
tres.safeTimeout.set(function () {
    //run after 5 minutes
}, fiveminutes);
```
