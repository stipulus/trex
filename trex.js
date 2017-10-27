var trex = (function () {
    var isNode = (typeof document === 'undefined' && typeof module !== 'undefined' && module.exports);

    var oopi = {};
    (function () {
        var pub = oopi;
        var rand = {
            len: 6,
            chars: 'abacdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890',
            gen: function () {
                var str = '';
                var charlen = this.chars.length;
                for(var i = this.len;i > 0;i--)
                    str += this.chars.charAt(Math.floor(Math.random()*charlen));
                return str;
            }
        };
        function newobj(obj) {
            if(obj === 'object') {
                var newobj = {};
                for(var i in obj)
                    newobj[i] = newobj(obj[i]);
                return newobj;
            } else {
                return obj;
            }
        }
        var base = {
            extend: function (child,abstract) {
                child.__constructors = new Array();
                if(this.__constructors) 
                    child.__constructors = child.__constructors.concat(this.__constructors);
                    
                if(typeof child.construct === 'function') {
                    child.__constructors.unshift(child.construct);
                }
                for(var i in this)
                    if(i === '__constructors');//do nothing
                    else if(typeof child[i] === 'undefined' && i !== 'super') {
                        child[i] = newobj(this[i]);
                    } else {
                        if(typeof child.super === 'undefined') {
                            child.super = {};
                        }
                        if(typeof this[i] === 'function') {
                            if(i !== '__constructors')
                                child.super[i] = this[i].bind(child);
                        } else {
                            child.super[i] = newobj(this[i]);
                        }
                    }
                if(!abstract) validateInterface(child);
                function F() {
                    if(abstract)
                        throw new Error('Cannot construct abstract class.');
                    for(var i = child.__constructors.length-1;i >= 0;i--)
                        child.__constructors[i].apply(this,arguments);
                }
                F.implements = function (interface) {
                    if(typeof child.__interface === 'object')
                        for(var i in interface)
                            child.__interface[i] = interface[i];
                    else
                        child.__interface = interface;
                    if(!abstract) validateInterface(child);
                    return F;
                }
                F.prototype = child;
                if(typeof this.onExtend === 'function') this.onExtend(F);
                return F;
            }
        };
        function validateInterface(child) {
            if(typeof child.__interface === 'object')
                for(var i in child.__interface)
                    if(typeof child[i] !== child.__interface[i])
                        throw new Error('Required attribute or method '+i+' is '+(typeof child[i])+', expected '+child.__interface[i]+'.');
        }
        pub.abstract = function (child) {
            return base.extend(child,true);
        };
        pub.class = function (child) {
            return base.extend(child);
        };
        pub.implement = function (interface,child) {
            if(typeof child.__interface === 'object')
                for(var i in interface)
                    child.__interface[i] = interface[i];
            else
                child.__interface = interface;
            validateInterface(child);
            return pub.class(child);
        };
        pub.interface = function (child) {
            for(var i in child)
                switch (child[i]) {
                    case 'undefined':
                    case 'object':
                    case 'boolean':
                    case 'number':
                    case 'string':
                    case 'symbol':
                    case 'function':
                    case 'object':
                    break;
                    default:
                    throw new Error('Interface definition expected a datatype for '+i+', found '+child[i]+'.');
                }
            return child;
        };
    })();

    var Hurdle = oopi.class({
        i:null,
        callback: null,
        construct: function (callback,i) {
            this.i = i || 0;
            if(typeof callback === 'function') this.callback = callback;
        },
        set: function (num) {
            if(typeof num !== 'number') num = 1;
            this.i+=num;
        },
        complete: function (options) {
            this.i--;
            var self = this;
            if(isNode) {
                process.nextTick(function () {
                    if(self.i <= 0 && typeof self.callback === 'function') {
                        self.i = 0;
                        self.callback(options);
                        delete self.callback;
                    }
                });
            } else {
                setTimeout(function () {
                    if(self.i <= 0 && typeof self.callback === 'function') {
                        self.i = 0;
                        self.callback(options);
                        delete self.callback;
                    }
                });
            }
        },
        error: function (fun) {
            if(typeof fun === 'function') {
                this.errorCallback = fun;
                return this;
            } else {
                var self = this;
                this.callback = null;
                if(isNode) {
                    process.nextTick(function () {
                        if(typeof self.errorCallback === 'function') {
                            self.errorCallback(fun);
                            delete self.errorCallback;
                        }
                    });
                } else {
                    setTimeout(function () {
                        if(typeof self.errorCallback === 'function') {
                            self.errorCallback(fun);
                            delete self.errorCallback;
                        }
                    });
                }
            }
        },
        then:function (callback) {
            if(typeof callback === 'function') this.callback = callback;
            return this;
        },
        fail:function (callback) {
            if(typeof callback === 'function') this.errorCallback = callback;
            return this;
        }
    });

    var Cookie = oopi.class({
        name:null,
        value:null,
        expire:5,
        path:null,
        construct: function (name,value,path) {
            this.name = name;
            if(value) this.value = value;
            this.path = path || '/';
        },
        get: function (request) {
            if(this.value === null) {
                var name = this.name + "=";
                var ca;
                if(isNode) {
                    ca = request.headers.cookie;
                } else {
                    ca = document.cookie;
                }
                if(!ca) return null;
                ca = ca.split(';');
                for(var i=0; i<ca.length; i++) {
                    var c = ca[i];
                    while (c.charAt(0)==' ') c = c.substring(1);
                    if (c.indexOf(name) == 0) this.value = c.substring(name.length,c.length);
                }
            }
            return this.value;
        },
        set: function (res) {
            var d = new Date();
            d.setTime(d.getTime() + (this.expire*24*60*60*1000));
            var expires = "expires="+d.toUTCString();
            var str = this.name+'='+this.value+'; '+expires;
            if(this.path) str += "; path="+this.path;
            if (isNode) {
                //res['Set-Cookie'] = str;
                res.append('Set-Cookie', str);
                console.log('write cookie',str);
            } else {
                document.cookie = str;
            }
        },
        delete: function (res) {
            this.value = '';
            this.expire = 0;
            this.set(res);
        }
    });

    var safeTimeout = {
        running: false,
        interval: 100,
        syncInterval: 3000,
        current:0,
        last:0,
        startTime:0,
        waiting:{},
        start: function () {
            this.running = true;
            this.startTime = (new Date()).getTime();
            this.startTime -= this.startTime % this.interval;
            this.current = this.startTime;
            this.run();
        },
        run: function () {
            //console.log(this.running);
            if(this.running) {
                var diff = 0;
                if(this.current % this.syncInterval === 0) {
                    var current = (new Date()).getTime();
                    if(current >= this.last) this.stop();
                    while(this.current < current-this.interval)
                        this.current += this.interval;
                    diff = current-this.current;
                    //console.log(this.current,current,diff,this.interval-diff);
                }
                //console.log(this.current-(new Date()).getTime(),diff);
                setTimeout(function () {
                    safeTimeout.run()
                },this.interval-diff);
                this.current += this.interval;
                this.call();
            }
        },
        call: function () {
            if(this.waiting[this.current])
                while(this.waiting[this.current].length > 0)
                    this.waiting[this.current].pop()();
        },
        stop: function () {
            this.running = false;
        },
        /**
         * Add a new timeout event to the save timeout object
         * @memberOf Reflection.safeTimeout
         * @param {Function} fun  Function to be executed
         * @param {Number} time Milliseconds until fun is executed
         * @return {Object} hash Data that can be used to uniquely identify this timeout event
         */
        set: function (fun,time) {
            time = time || 0;
            if(typeof time === 'function' && typeof fun === 'number') {
                var temp = fun;
                fun = time;
                time = temp;
            }
            time = (new Date()).getTime()+time;
            time -= time % this.interval;

            if(time > this.last)
                this.last = time;

            if(!this.waiting[time])
                this.waiting[time] = new Array();
            this.waiting[time].push(fun);

            if(!this.running) this.start();

            return {time:time,i:this.waiting[time].length-1};
        },
        /**
         * Remove timeoutevent
         * @memberOf Reflection.safeTimeout
         * @param  {Object} hash Data returned from set used to uniquely identify the timeout event
         */
        remove: function (hash) {
            if(this.waiting[hash.time])
                this.waiting[hash.time].splice(hash.i,1);
        }
    };

    var rand = {
        len: 100,
        idLen:7,
        chars: 'abacdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890',
        /**
         * Generate string
         * @memberOf Reflection.rand
         * @param  {Number} len Length of string to generate
         * @return {String}     Random string
         */
        gen: function (len) {
            len = len || this.len;
            var str = this.chars.charAt(Math.floor(Math.random()*charlen-10));
            var charlen = this.chars.length;
            for(var i = len;i > 1;i--)
                str += this.chars.charAt(Math.floor(Math.random()*charlen));
            return str;
        },
        getId: function () {
            var str = '';
            var charlen = this.chars.indexOf('1')-1;
            for(var i = this.idLen;i > 0;i--)
                str += this.chars.charAt(Math.floor(Math.random()*charlen));
            if($('#'+str).length > 0)
                return this.getId();
            else
                return str;
        }
    };

    var Thread;
    if(!isNode)
    Thread = oopi.class({
        id:0,
        blob: null,
        worker: null,
        responseName: 'res',
        data: '{}',
        include: [],
        inprogress: false,
        autoDestroy: false,
        autoStart: false,
        isBusy: false,
        onmessage: function (e) {console.log(e);},
        construct: function (params) {
            if(typeof params !== 'object') params = {};
            this.addIncludes(params.include);
            this.setData(params.data);
            this.setRun(params.run);
            this.setCallback(params.callback);
            this.setAutoDestroy(params.autoDestroy);
            this.setAutoStart(params.autoStart);
            if(this.blob === null)
                this.setBlob(this.buildFunStr());
            if(this.autoStart) this.start();
        },
        setData: function (v) {
            if(typeof v !== 'undefined')
                this.data = JSON.stringify(v, function (key, val) {
                    if (typeof val === 'function') {
                        return val + ''; // implicitly `toString` it
                    }
                    return val;
                });
        },
        setAutoStart: function (v) {
            if(typeof v !== 'undefined')
                this.autoStart = v;
        },
        setAutoDestroy: function (v) {
            if(typeof v !== 'undefined')
                this.autoDestroy = v;
        },
        addIncludes:function (str) {
            if(typeof str !== 'undefined' && str instanceof Array) {
                for(var i = 0;i < str.length;i++)
                    this.addIncludes(str[i]);
            } else if(typeof str === 'string') {
                this.include.push(str);
            }
        },
        getBaseURL: function () {
            var url = document.location.href;
            var index = url.lastIndexOf('/');
            if (index != -1) {
                url = url.substring(0, index+1);
            }
            return url;
        },
        setCallback: function (v) {
            if(typeof v !== 'undefined')
                this.callback = v;
        },
        removeInclude: function (str) {
            var found = false;
            for(var i = 0;i < this.include.length;i++)
                if(this.include[i] === str)  {
                    this.include[i].unshift();
                    found = true;
                    break;
                }
            return found;
        },
        getIncludes: function () {
            
            if(this.include.length > 0) {
                var url = this.getBaseURL();
                return 'importScripts(\''+url+this.include.join('\',\''+url+'')+'\');';
            } else
                return 'importScripts();';
        },
        setBlob: function (str) {
            if(typeof str !== 'undefined') {
                try {
                    this.blob = window.URL.createObjectURL(new Blob([str],{type:"text/javascript"}));
                } catch (e) {
                    this.blob = window.webkitURL.createObjectURL(new Blob([str],{type:"text/javascript"}));
                }
            }
        },
        setRun: function (v) {
            if(typeof v != 'undefined') {
                this.run = v;
                this.setBlob(this.buildFunStr());
            }
        },
        setResponseName: function (v) {
            if(typeof v === 'string' && v.length > 0)
                this.responseName = v;
        },
        funToCodeStr: function (v) {
            var funstr = v.toString();
            var start = funstr.indexOf('{')+1;
            return funstr.substr(start,funstr.lastIndexOf('}')-start);
        },
        buildFunStr: function () {
            if(typeof this.run !== 'undefined') {
                var funstr = this.run.toString();
                this.setResponseName(funstr.substr(funstr.indexOf('(')+1,funstr.indexOf(')')-funstr.indexOf('(')-1));
                var start = funstr.indexOf('{')+1;
                //var prefix = 'var '+this.responseName+' = eval('+this.data+');'+this.getIncludes();
                var prefix = 'var exports = {};'+this.getIncludes()+'onmessage = function (e) {eval(e.data);};'+'var '+this.responseName+' = eval('+this.data+');';
                var suffix = 'postMessage("complete "+JSON.stringify('+this.responseName+',function (key,val) {if (typeof val === "function") return val+"";else if(typeof val === "string") val = encodeURIComponent(val);return val;}));';
                funstr = prefix+funstr.substr(start,funstr.lastIndexOf('}')-start)+suffix;
                start=null,prefix=null,suffix=null;
                return funstr;
            }
        },
        parseMessage: function (e) {
            var arr = new Array();
            if(typeof e.data === 'string')
                arr = e.data.split(' ',2);
            switch (arr[0]) {
                case 'complete': 
                    this.setResponse(arr[1]);
                    this.callCallback();
                    this.inprogress = false;
                    if(this.autoDestroy) this.destroy();
                    break;
                default: this.onmessage(e.data);break;
            }
        },
        setResponse: function (str) {
            if(typeof str !== 'undefined')
                this.response = JSON.parse(str, function (key,val) {
                    if(typeof val === 'string') val = decodeURIComponent(val);
                    return val;
                });
        },
        getResponse: function () {
            if(typeof this.response === 'undefined')
                return {};
            else
                return this.response;
        },
        callCallback: function () {
            if(typeof this.callback !== 'undefined') 
                this.callback(this.getResponse());
        },
        destroy: function () {
            this.worker.terminate();
            window.URL.revokeObjectURL(this.blob);
            delete this.blob,this.worker,this.callback,this.include;
        },
        start: function () {
            this.inprogress = true;
            this.worker = new Worker(this.blob);
            var self = this;
            this.worker.onmessage = function (e) {
                self.parseMessage(e);
            };
        },
        addTask: function (fun) {
            this.worker.postMessage(this.funToCodeStr(fun));
        },
        busy: function () {
            this.isBusy = true;
        },
        ready: function () {
            this.isBusy = false;
        }
    });

    var Component;
    if(!isNode)
    Component = (function () {
        //angular directive like behavior
        var Component = oopi.class({
            html:null,
            url:null,
            tagName:null,
            className:null,
            wrap: false,
            $elem:null,
            useThread:false,
            hurdle:null,
            template: null,
            construct: function (parentHurdle) {
                this.template = {};
                var component = this;
                if(parentHurdle && parentHurdle instanceof Hurdle) parentHurdle.set();
                this.hurdle = new Hurdle(function () {
                    component.applyTemplate();
                    if(parentHurdle && parentHurdle instanceof Hurdle) parentHurdle.complete();
                });
                this.hurdle.set();
                if(typeof this.tagName === 'string') this.$elem = $(this.tagName);
                else this.$elem = $('<div></div>');
                if(this.html) {
                    setTimeout(function () {
                        //make async
                        if(typeof component.init === 'function')
                            component.init(component.hurdle);
                        component.hurdle.complete();
                    },0);
                } else {
                    $.get(this.url).then(function (html) {
                        component.html = html;
                        if(typeof component.init === 'function')
                            component.init(component.hurdle);
                        component.hurdle.complete();
                    });
                }
            },
            applyTemplate: function () {
                //need async option
                try {
                    Mustache.parse(this.html);
                    var str = Mustache.render(this.html,this.template);
                    if(this.wrap) str = '<div class="'+((this.className)?this.className:"")+'">'+str+'</div>';
                    var $elem = $(str);
                    //console.log('rendered html',this.html,this.template,str,$elem);
                    if(this.$elem.replaceWith)
                        this.$elem.replaceWith($elem);
                    this.$elem = $elem;
                    if(typeof this.className === 'string') this.$elem.addClass(this.className);
                } catch (e) {
                    console.error('Could not render template with data.',e);
                    return false;
                }
                if(typeof this.ready === 'function') this.ready();
                return true;
            },
            init: function () {

            },
            add: function (component) {
                this.$elem.parent().append(component.$elem);
            }
        });
        if(typeof exports !== 'undefined') {
            exports.prototype = Component.prototype;
        }
        return Component;
    })();

    var Modal_Interface = oopi.interface({
        html: 'string',
        className: 'string'
    });

    var Modal = oopi.abstract({
        initilized: false,
        baseClass: 'modal',
        background: '<div></div>',
        header: '<div class="header"><h4 class="title"></h4><i class="fa fa-remove"></i></div>',
        $modal: null,
        $header: null,
        showHeader: true,
        title: '',
        construct: function () {

        },
        init: function () {
            var self = this;

            //modal
            this.$header = $(this.header);
            this.$header.find('.title').text(this.title);
            this.$elem = $('<div>'+this.html+'</div>');
            this.$elem.addClass('body');
            this.$modal = $('<div></div>');
            if(this.showHeader)
                this.$modal.append(this.$header);
            this.$modal.append(this.$elem);
            this.$modal.addClass(this.baseClass);
            this.$modal.addClass(this.className);

            $('body').append(this.$modal);

            //background
            this.$background = $(this.background);
            this.$background.addClass('modal-background');
            this.$background.click(function () {
                self.hide();
            });
            this.$header.children('.fa-remove').click(function () {
                self.hide();
            });
            $('body').append(this.$background);

            this.hide();
            this.initilized = true;
            //code to run after html is rendered
            if(typeof this.ready === 'function') this.ready();
        },
        show: function () {
            //lazy initilization
            if(!this.initilized) this.init();

            this.$background.fadeIn(100);
            this.$modal.fadeIn(100);
        },
        hide: function () {
            this.$background.hide();
            this.$modal.hide();
        },
        setTitle: function (title) {
            this.$header.find('.title').text(title);
        }
    }).implements(Modal_Interface);

    var api = (function () {

        var returns = {};
        var models = {};
        var modelsNum = new Array;
        var accessTables = {};

        var host = 'http://localhost';
        var secretKey = 'secretkey';
        var db;
        var User, Access;

        var port = 3500;
        var username = 'root';
        var password = 'root';
        var database = 'test';
        var dbhost = 'localhost';
        var clientToken = '';
        if(!isNode) clientToken = (new Cookie('trex_token')).get();

        var app,server,mongoose,Schema;
        var started = false;

        var Model_Interface = oopi.interface({
            table:'string',
            params:'object'
        });

        var Model = oopi.abstract({
            data:null,
            customGets:{},
            customPuts:{},
            customPosts:{},
            construct: function (options) {
                this.data = {};
                if(typeof options === 'string' && /{/.test(options)) options = JSON.parse(options);
                if(typeof options === 'object') {
                    for(var i in options)
                        this.data[i] = options[i];
                    if(isNode) this.model = new this.model(this.data);
                } else if(typeof options === 'string') {
                    this.data._id = options;
                }
            },
            find: function (data) {
                var hurdle = new Hurdle();
                var self = this;
                var params = {
                    path:'/find/'+this.table,
                    method:'GET',
                    data:data || this.data
                };

                hurdle.set();
                ajax(params).then(function (data) {
                    for(var i in data)
                        self.data[i] = data[i];

                    hurdle.complete(self.data);
                }).error(function (reason) {
                    hurdle.error(reason);
                });

                return hurdle;
            },
            list: function (filter) {
                var hurdle = new Hurdle();
                var self = this;
                var params = {
                    path:'/find/'+this.table+'/list',
                    method:'GET',
                    data:filter || {}
                };

                hurdle.set();
                ajax(params).then(function (data) {
                    hurdle.complete(data);
                });

                return hurdle;
            },
            get: function (options) {
                var hurdle = new Hurdle();
                var self = this;
                var params = {
                    path:'/'+this.table+'/'+this.data._id,
                    method:'GET'
                };

                hurdle.set();
                ajax(params).then(function (data) {
                    for(var i in data)
                        self.data[i] = data[i];

                    hurdle.complete(self.data);
                });

                return hurdle;
            },
            save: function (options) {
                var hurdle = new Hurdle();
                var self = this;
                var next,params = {};

                if(this.data._id) {
                    params.path = '/'+this.table+'/'+this.data._id;
                    params.method = 'PUT';
                    params.data = JSON.parse(JSON.stringify(this.data));
                } else {
                    params.path = '/'+this.table
                    params.method = 'POST';
                    params.data = JSON.parse(JSON.stringify(this.data));
                }

                hurdle.set();
                ajax(params).then(function (data) {
                    for(var i in data)
                        self.data[i] = data[i];
                    hurdle.complete(self.data);
                });

                return hurdle; 
            },
            'delete': function (options) {
                var hurdle = new Hurdle();
                var self = this;
                var params = {
                    path:'/'+this.table+'/'+this.data._id,
                    method:'DELETE'
                };

                hurdle.set();
                ajax(params).then(function (data) {
                    self.data._id = null;
                    hurdle.complete(self.data);
                });

                return hurdle;
            },
            onExtend: function (Schematic) {
                define(Schematic);
            }
        }).implements(Model_Interface);

        function ajax(options) {
            var xmlhttp = new XMLHttpRequest();
            var url = host+((port)?':'+port:'')+options.path;
            var hurdle = new Hurdle();
            hurdle.set();
            xmlhttp.onreadystatechange = function() {
                if (xmlhttp.readyState == 4) {
                    if(xmlhttp.status == 200) {
                        var data;
                        if(xmlhttp.responseText && /}/.test(xmlhttp.responseText)) {
                            try {
                                data = JSON.parse(xmlhttp.responseText);
                            } catch (e) {
                                data = xmlhttp.responseText;
                                console.log(e);
                            }
                        } else {
                           data = xmlhttp.responseText;
                        }
                        hurdle.complete(data);
                    } else {
                        hurdle.error(xmlhttp.responseText);
                    }
                }
            };
            if(options.data && options.method === 'GET') {
                url += '?';
                for(var i in options.data) {
                    url += encodeURIComponent(i)+'='+encodeURIComponent(options.data[i])+'&';
                }
            }
            xmlhttp.open(options.method, url, true);
            if(clientToken) xmlhttp.setRequestHeader('x-access-token',clientToken.value);
            xmlhttp.send(JSON.stringify(options.data || {}));
            return hurdle;
        }

        function defineBaseClasses() {
            User = Model.prototype.extend({
                table:'users',
                params: {
                    username:String,
                    password:String
                },
                access: {
                    everyone: '',
                    owner: 'crud'
                },
                customPuts: {
                    login:'c'
                },
                token:null,
                construct: function () {
                    var cookie = new Cookie('trex_token');
                    var token = cookie.get();
                    try {
                        clientToken = JSON.parse(token);
                    } catch (e) {
                        token = null;
                    }
                    this.token = clientToken;
                },
                create: function () {
                    var self = this;
                    this.data.password = CryptoJS.SHA256(this.data.password).toString();

                    return this.save();
                },
                login: function (req,res) {
                    var self = this;
                    if(isNode) {
                        var cookie,expires,data;
                        var token = {};
                        this.data = JSON.parse(req.body);
                        this.model.findOne({username:this.data.username}, function (err, data) {
                            if(err) {
                                res.status(500).send(err);
                            } else if(data && data.password !== self.data.password) {
                                res.status(403).send('Incorrect password');
                            } else if(data) {
                                data = JSON.parse(JSON.stringify(data));
                                delete data.password;
                                token.value = jwt.sign(data, secretKey, {
                                    expiresIn: '30 days'
                                });

                                expires = new Date();
                                expires.setDate(expires.getDate() + 30);
                                token.expires = expires;

                                res.json(token);
                            } else {
                                res.status(403).send("Username does not exist");
                            }
                        });
                        
                    } else {
                        var hurdle = new Hurdle();
                        var password = CryptoJS.SHA256(this.data.password).toString();
                        var params = {
                            path:'/users/login',
                            method:'PUT',
                            data: {username:this.data.username,password:password}
                        };

                        hurdle.set();
                        ajax(params).then(function (token) {
                            clientToken = token;
                            self.token = clientToken;
                            var cookie = new Cookie('trex_token');
                            cookie.value = JSON.stringify(token);
                            cookie.set();
                            hurdle.complete();
                        }).error(function (reason) {
                            hurdle.error(reason);
                        });

                        return hurdle;
                    }
                },
                logout: function () {
                    (new Cookie('trex_token')).delete();
                }
            });
            Access = Model.prototype.extend({
                table:'access',
                params: {
                    table:String,
                    id:String,
                    owner:String,
                    r:String,
                    d:String,
                    u:String,
                }
            });
        }

        function start() {
            if(!isNode || started) return;
            started = true;
            http = require('http');
            url = require('url');
            CryptoJS = require('crypto-js');
            express = require('express');
            bodyParser = require('body-parser');
            jwt = require('jsonwebtoken');
            mongoose = require('mongoose');
            Schema = mongoose.Schema;
            mongoose.connect('mongodb://'+dbhost+'/'+database);
            db = mongoose.connection;
            db.on('error', console.error.bind(console, 'connection error:'));
            db.once('open', function() {
                console.log('mongoose connection established');
            });

            app = express();
            server = http.createServer(app);
            server.listen(port, function () {
                var host = server.address().address;
                var port = server.address().port;

                console.log('trex api listening at http://%s:%s', host, port);
            });
            app.use(bodyParser.urlencoded({ extended: false }));
            app.use(bodyParser.text({ type: 'text/plain' }));
            app.use(bodyParser.json());

            //setup server for CORS
            app.use(function(req, res, next) {
                res.header('Access-Control-Allow-Origin', '*');
                res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
                res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, x-access-token');

                //intercepts OPTIONS method
                if ('OPTIONS' === req.method)
                    res.sendStatus(200);
                else
                    next();
            });

            //error handelers
            function errorHandler(err, req, res, next) {
                var code = err.code;
                var message = err.message;
                res.writeHead(code, message, {'content-type' : 'text/plain'});
                res.end(message);
            }
            app.use(errorHandler);

            defineBaseClasses();
        }

        function validateUser(options) {
            var hurdle = new Hurdle();
            hurdle.set();
            if(options.req.path === '/users/login' || options.req.user) hurdle.complete();

            // check header or url parameters or post parameters for token
            var token = options.req.headers['x-access-token'];
            if(token) {
                jwt.verify(token,secretKey,function(err,decodedToken){
                    if(err) {
                        var message = '';
                        if(err.name == 'TokenExpiredError') {
                            message = 'Failed to authenticate token: Token is expired';
                        } else {
                            message = "Failed to authenticate token";
                        }
                        hurdle.error(message);
                    }
                    else {
                        options.req.user = decodedToken;
                        hurdle.complete();
                    }
                });
            }
            else {
                hurdle.error('No token provided');
            }

            return hurdle;
        }

        function config(obj) {
            if(!obj) return;
            host = obj.host || host;

            port = obj.port || port;
            dbhost = obj.dbhost || dbhost;
            database = obj.database || database;
            secretKey = obj.secretKey || secretKey;
        }

        function access(options) {
            var hurdle = new Hurdle();
            
            if(!models[options.table].child.prototype.access) {
                models[options.table].child.prototype.access = {};
            }

            for(var i = 0;i < options.method.length;i++) (function (i) {
                hurdle.set();
                var method = options.method.charAt(i);
                if(models[options.table].child.prototype.access[method]) {
                    validateUser(options).then(function() {
                        if(accessTables[options.table+options.id]) {
                            if(accessTables[options.table+options.id].model[method].match('users')) {
                                hurdle.complete();
                            } else if(accessTables[options.table+options.id].model[method].match(options.req.user._id)) {
                                hurdle.complete();
                            } else {
                                hurdle.error('Forbidden');
                            }
                        } else {
                            var access = new Access();
                            access.model.findOne({id:options.id,table:options.table}, function (err, data) {
                                if(err) {
                                    hurdle.error(err);
                                } else {
                                    access.model = data;
                                    accessTables[options.table+options.id] = access;
                                    if(accessTables[options.table+options.id].model[method].match('users')) {
                                        hurdle.complete();
                                    } else if(accessTables[options.table+options.id].model[method].match(options.req.user._id)) {
                                        hurdle.complete();
                                    } else {
                                        hurdle.error('Forbidden');
                                    }
                                }
                            });
                        }
                    }).error(function (reason) {
                        hurdle.error(reason);
                    });
                } else {
                    //everyone can access
                    console.log('everyone can access',options.table,options.method,models[options.table].child.prototype.access);
                    hurdle.complete();
                }
            })(i);

            return hurdle;
        }

        function load(table,id) {
            var hurdle = new Hurdle();
            hurdle.set();
            if(typeof id === 'undefined') {

            } else if(models[table][id]) {
                hurdle.complete(models[table][id]);
            } else {
                models[table][id] = new models[table].child();
                modelsNum.unshift({table:table,id:id});
                models[table][id].model.findById(id, function (err, model) {
                    if(err) {
                        hurdle.error(err);
                    } else {
                        models[table][id].model = model;
                        models[table][id].data = JSON.parse(JSON.stringify(models[table][id].model));
                        hurdle.complete(models[table][id]);
                    }
                });
            }
            return hurdle;
        }

        function define(child) {
            if(!child) return;
            var options = child.prototype;
            models[options.table] = {child:child,queries:{},listQueries:{}};
            if(isNode) {
                start();
                options.params.owner = String;
                options.schema = new Schema(options.params);
                options.model = mongoose.model(options.table,options.schema);
                models[options.table].model = options.model;
                //custom
                for(var path in options.customGets) (function (path) {
                    if(typeof options[path] !== 'function') throw new Error(path+' in '+options.table+' is not a function.');
                    app.get('/'+options.table+'/'+path, function (req,res,next) {
                        access({
                            table:options.table,
                            req:req,
                            method:'r'
                        }).then(function () {
                            options[path](req,res,next);
                        }).error(function (reason) {
                            res.status(403).send(reason);
                        });
                    });
                })(path);
                for(var path in options.customPuts) (function (path) {
                    if(typeof options[path] !== 'function') throw new Error(path+' in '+options.table+' is not a function.');
                    app.put('/'+options.table+'/'+path, function (req,res,next) {
                        access({
                            table:options.table,
                            req:req,
                            method:'u'
                        }).then(function () {
                            options[path](req,res,next);
                        }).error(function (reason) {
                            res.status(403).send(reason);
                        });
                    });
                })(path);
                for(var path in options.customPosts) (function (path) {
                    if(typeof options[path] !== 'function') throw new Error(path+' in '+options.table+' is not a function.');
                    app.post('/'+options.table+'/'+path, function (req,res,next) {
                        access({
                            table:options.table,
                            req:req,
                            method:'c'
                        }).then(function () {
                            options[path](req,res,next);
                        }).error(function (reason) {
                            res.status(403).send(reason);
                        });
                    });
                })(path);
                //get
                app.get('/'+options.table+'/:id', function (req, res, next) {
                    access({
                        user:req.user,
                        id:req.params.id,
                        table:options.table,
                        req:req,
                        method:'r'
                    }).then(function () {
                        load(options.table,req.params.id).then(function (obj) {
                            res.json(obj.data);
                        }).error(function (reason) {
                            res.status(500).send(reason);
                        });
                    }).error(function (reason) {
                        res.status(403).send(reason);
                    });
                });
                //get list where
                app.get('/find/'+options.table+'/list', function (req, res, next) {
                    var hash = 'find'+JSON.stringify(req.query);
                    var modelsList = [];
                    var loadHurdle = new Hurdle();
                    var hurdle = new Hurdle();
                    loadHurdle.set();
                    if(models[options.table].listQueries[hash] === undefined) {
                        models[options.table].model.find(req.query, function (err, _models) {
                            if(err) {
                                res.status(500).send(err);
                            } else {
                                models[options.table].listQueries[hash] = [];
                                for(var i = 0;i < _models.length;i++) {
                                    models[options.table].listQueries[hash].push(_models[i]._id);
                                    models[options.table][_models[i]._id] = new models[options.table].child(_models[i]);
                                }
                                loadHurdle.complete();
                            }
                        });
                    } else {
                        loadHurdle.complete();
                    }

                    hurdle.set();
                    loadHurdle.then(function () {
                        models[options.table].listQueries[hash].forEach(function (id) {
                            hurdle.set();
                            access({
                                user:req.user,
                                id:id,
                                table:options.table,
                                req:req,
                                method:'r'
                            }).then(function () {
                                modelsList.push(models[options.table][id].data);
                                hurdle.complete();
                            }).error(function (reason) {
                                hurdle.error(reason);
                            });
                        });
                        hurdle.complete();
                    }).error(function (reason) {
                        hurdle.error(reason);
                    });

                    hurdle.then(function () {
                        res.json(modelsList);
                    }).error(function (reason) {
                        res.status(403).send(reason);
                    });
                });
                //get where
                app.get('/find/'+options.table, function (req, res, next) {
                    var hash = JSON.stringify(req.query);
                    if(models[options.table].queries[hash]) {
                        access({
                            user:req.user,
                            id:models[options.table][models[options.table].queries[hash]].data._id,
                            table:options.table,
                            req:req,
                            method:'r'
                        }).then(function () {
                            res.json(models[options.table][models[options.table].queries[hash]].data);
                        }).error(function (reason) {
                            res.status(403).send(reason);
                        });
                    } else {
                        models[options.table].model.findOne(req.query, function (err, model) {
                            if(err) {
                                res.status(500).send(err);
                            } else if(model) {
                                access({
                                    user:req.user,
                                    id:model._id,
                                    table:options.table,
                                    req:req,
                                    method:'r'
                                }).then(function () {
                                    models[options.table].queries[hash] = model._id;
                                    models[options.table][model._id] = new models[options.table].child(model);
                                    res.json(models[options.table][model._id].data);
                                }).error(function (reason) {
                                    res.status(403).send(reason);
                                });
                            } else {
                                res.sendStatus(404);
                            }
                        });
                    }
                });
                //put
                app.put('/'+options.table+'/:id', function (req, res, next) {
                    access({
                        user:req.user,
                        id:req.params.id,
                        table:options.table,
                        req:req,
                        method:'u'
                    }).then(function () {
                        load(options.table,req.params.id).then(function (obj) {
                            var data = {};
                            try {
                                data = JSON.parse(req.body);
                            } catch (e) {
                                data = req.body;
                            }

                            for(var i in data)
                                obj.data[i] = data[i];
                            for(var i in obj.data)
                                obj.model[i] = obj.data[i];

                            obj.model.save(function (err, data) {
                                if(err) next(err);
                                else {
                                    models[options.table].listQueries = null;
                                    models[options.table].listQueries = {};
                                    res.json(obj.data);
                                }
                            });
                        }).error(function (reason) {
                            res.status(500).send(reason);
                        });
                    }).error(function (reason) {
                        res.status(403).send(reason);
                    });
                });
                //delete
                app.delete('/'+options.table+'/:id', function (req, res, next) {
                    access({
                        user:req.user,
                        id:req.params.id,
                        table:options.table,
                        req:req,
                        method:'d'
                    }).then(function () {
                        load(options.table,req.params.id).then(function (obj) {
                            delete models[options.table][req.params.id];
                            obj.model.remove(function (err) {
                                if(err)
                                    res.status(500).send(err);
                                else {
                                    res.sendStatus(200);

                                    delete models[options.table][req.params.id];
                                    models[options.table].listQueries = null;
                                    models[options.table].listQueries = {};
                                    for(var i in models[options.table].queries)
                                        if(models[options.table].queries[i] === req.params.id)
                                            delete models[options.table].queries[i];
                                }
                            });
                        }).error(function (reason) {
                            res.status(500).send(reason);
                        });
                    }).error(function (reason) {
                        res.status(403).send(reason);
                    });
                });
                //post
                app.post('/'+options.table, function (req, res, next) {
                    access({
                        user:req.user,
                        table:options.table,
                        req:req,
                        method:'c'
                    }).then(function () {
                        var obj = new child(req.body);
                        validateUser({req:req}).then(function () {
                            obj.model.save(function (err, data) {
                                if(err) next(err);
                                else {
                                    var accessTable = new Access({
                                        id:data._id,
                                        table:options.table,
                                        owner:req.user._id,
                                        r:obj.access.r || '',
                                        u:obj.access.u || '',
                                        d:obj.access.d || ''
                                    });
                                    accessTable.model.r = accessTable.model.r.replace('owner',req.user._id);
                                    accessTable.model.u = accessTable.model.u.replace('owner',req.user._id);
                                    accessTable.model.d = accessTable.model.d.replace('owner',req.user._id);
                                    accessTable.model.save(function (err,accessData) {
                                        if(err) next(err);
                                        else {
                                            accessTables[options.table+options.id] = accessTable;
                                            models[options.table].listQueries = null;
                                            models[options.table].listQueries = {};
                                            for(var i in data)
                                                obj.data[i] = data[i];
                                            models[options.table][data._id] = obj;
                                            modelsNum.unshift({table:options.table,id:data._id});
                                            res.json(obj.data);
                                        }
                                    });
                                }
                            });
                        }).error(function (reason) {
                            obj.model.save(function (err, data) {
                                if(err) next(err);
                                else {
                                    var accessTable = new Access({
                                        id:data._id,
                                        table:options.table,
                                        owner:'none',
                                        r:'',
                                        u:'',
                                        d:''
                                    });
                                    accessTable.model.save(function (err, accessData) {
                                        if(err) next(err);
                                        else {
                                            accessTables[options.table+options.id] = accessTable;
                                            models[options.table].listQueries = null;
                                            models[options.table].listQueries = {};
                                            for(var i in data)
                                                obj.data[i] = data[i];
                                            models[options.table][data._id] = obj;
                                            modelsNum.unshift({table:options.table,id:data._id});
                                            res.json(obj.data);
                                        }
                                    });
                                }
                            });
                        });
                    }).error(function (reason) {
                        res.status(403).send(reason);
                    });
                });
            }
        }

        if(!isNode) defineBaseClasses();

        returns = {
            User:User,
            config:config,
            define:define,
            Model:Model,
            ajax:ajax
        };
        return returns;
    })();

    function titleOnEmpty($elem) {
        $elem.focus(function () {
            if($elem.val() === $elem.attr('title')) {
                if($elem.passwordType) $elem.attr('type','password');
                $elem.val('');
                $elem.removeClass('titleOnEmpty');
            }
        }).blur(function () {
            if($elem.val() === '') {
                if($elem.passwordType) $elem.attr('type','text');
                $elem.val($elem.attr('title'));
                $elem.addClass('titleOnEmpty');
            }
        });

        if($elem.attr('type') === 'password') {
            $elem.passwordType = true;
        }

        if($elem.val() === '') {
            if($elem.passwordType) $elem.attr('type','text');
            $elem.val($elem.attr('title'));
            $elem.addClass('titleOnEmpty');
        }
    }

    var nav = {
        init: function () {
            window.onhashchange = function() {
                nav.to(location.hash.substr(1));
            }
            nav.to(location.hash.substr(1));
        },
        default:null,
        paths: {},
        cache: {},
        cacheSubPages:true,
        current: '',
        destroyCache: function (path) {
            if(nav.cache[path]) delete nav.cache[path];
        },
        addPath: function (name,Component) {
            if(!nav.default) nav.default = name;
            this.paths[name] = Component;
        },
        error: function (reason) {
            console.error(reason);
        },
        to: function (path) {
            if(path && path.length > 1 && path.charAt(0) == '/') path = path.substr(1);
            $('body section').children().hide();
            var arr = path.split('/');
            if(nav.paths[arr[0]]) {
                $('body > .loading').show();
                var resumeHurdle;
                if(arr[1]) {
                    if(!nav.cacheSubPages && nav.cache[path]) nav.cache[path] = null; 
                    if(!nav.cache[path]) {
                        var hurdle = new trex.Hurdle(function () {
                            $('body > .loading').fadeOut();
                        });
                        hurdle.error(function (reason) {
                            nav.error(reason);
                        });
                        nav.cache[path] = new nav.paths[arr[0]](hurdle,arr[1],arr[2],arr[3],arr[4]);
                        $('body section').append(nav.cache[path].$elem);
                    } else if(typeof nav.cache[path].resume === 'function') {
                        if(typeof nav.cache[path].resume === 'function')
                        resumeHurdle = nav.cache[path].resume();
                        if(resumeHurdle) {
                            resumeHurdle.error(function (reason) {
                                nav.error(reason);
                            });
                            resumeHurdle.then(function () {
                                $('body > .loading').fadeOut();
                            });
                        } else {
                            $('body > .loading').fadeOut();
                        }
                    }
                } else if(!nav.cache[path]) {
                    var hurdle = new trex.Hurdle(function () {
                        $('body > .loading').fadeOut();
                    });
                    hurdle.error(function (reason) {
                        nav.error(reason);
                    });
                    nav.cache[path] = new nav.paths[arr[0]](hurdle);
                    $('body section').append(nav.cache[path].$elem);
                } else if(typeof nav.cache[path].resume === 'function') {
                    if(typeof nav.cache[path].resume === 'function')
                        resumeHurdle = nav.cache[path].resume();
                        if(resumeHurdle) {
                            resumeHurdle.error(function (reason) {
                                nav.error(reason);
                            });
                            resumeHurdle.then(function () {
                                $('body > .loading').hide();
                            });
                        } else {
                            $('body > .loading').fadeOut();
                        }
                } else {
                    $('body > .loading').fadeOut();
                }
                if(nav.current && nav.cache[nav.current] && typeof nav.cache[nav.current].pause === 'function')
                    nav.cache[nav.current].pause();
                nav.cache[path].$elem.show();
                nav.current = path;
            } else {
                location.hash = nav.default;
            }
        }
    }

    function getSafeStr (str) {
        var allowedFirst = "abacdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        var allowed = "abacdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        var safe = '';
        var j;
        for(var i = 0;i < str.length;i++) {
            if(safe.length === 0) {
                for(j = 0;j < allowedFirst.length;j++)
                    if(str.charAt(i) === allowedFirst.charAt(j))
                        break;
                    
                if(j < allowedFirst.length)
                    safe += str.charAt(i);
            } else {
                for(j = 0;j < allowed.length;j++)
                    if(str.charAt(i) === allowed.charAt(j))
                        break;

                if(j < allowed.length)
                    safe += str.charAt(i);
            }
        }
        if(safe.length < 1) safe = 'SafeName';
        return safe;
    }

    return {
        isNode:isNode,
        getSafeStr:getSafeStr,
        safeTimeout:safeTimeout,
        rand:rand,
        abstract:oopi.abstract,
        'class':oopi['class'],
        implement:oopi.implement,
        'interface':oopi['interface'],
        Hurdle:Hurdle,
        Thread:Thread,
        Component:Component,
        Cookie:Cookie,
        Modal:Modal,
        api:api,
        nav:nav,
        titleOnEmpty:titleOnEmpty
    }
})();

if(trex.isNode)
    module.exports = trex;