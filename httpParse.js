var utils = {
	getType: function(content) {
		return Object.prototype.toString.call(content).match(/\[object (.*)\]/)[1];
	},
	isType: function(content, type) {
		return this.getType(content).toLowerCase() === type.toLowerCase();
	}

};
function FSMTable(arg) {
	if (this instanceof FSMTable) {
		this.table = [];
		if (utils.isType(arg, 'Array')) {
			for(var i = 0 ;i < arg.length; i++) {
				this.table.push(new FSMItem(arg[i]));
			}
		}
		return this;
	}
	return new FSMTable(arg);
}

FSMTable.prototype = {
	append: function(arg) {
		this.table.push(arg);
	},
	getLenght: function() {
		return this.table.length;
	},
	getItem: function(index) {
		if (index >= this.getLenght()) {
			return null;
		}
		return this.table[index];
	},
	setItem: function(state, arg) {
		var len = this.getLenght();
		for (var i = 0; i < len; i++) {
			if (this.table[i]['state'] === state) {
				for (var k in arg) {
					if (arg.hasOwnProperty(k) && k !== 'state') {
						this.table[i][k] = arg[k];
					}
				}
				break;
			}
		}
	},
	delItem: function(state) {
		var len = this.getLenght();
		for (var i = 0; i < len; i++) {
			if (this.table[i]['state'] === state) {
				delete this.table[i];
				break;
			}
		}
	}
}
function FSMItem(arg) {
	this.state = arg.state;
	this.eventHandlers = arg.eventHandlers;
}




function Iterator(content, cfg) {
	this.content = content;
	this.length = 0;
	this.count = 0;
	this.position = 0;
	this.direction = (cfg && cfg.direction) || 0;
	this.init();
}
Iterator.prototype = {
	next: function() {
		if (!this.hasNext()) {
			return null;
		}
		this.count++;
		if (this.direction === 0) {
			return this.content[this.position++];
		} else {
			return this.content[this.position--];
		}
		
	},
	getData: function() {
		return this.content;
	},
	getPosition: function() {
		return this.position;
	},
	rewind: function(index) {
		if (index  <= this.length && index >= 0) {
			this.position = index;
			this.count = this.direction === 0 ? index : this.length - index;// - 1;
		}
	},
	hasNext: function() {
		return this.count < this.length;
	},
	init: function() {
		
		var type = utils.getType(this.content);
		switch(type) {
			case 'String': 
							this.content = this.content.split('');
							break;
			case 'Array': 
							this.content = this.content.concat();
							break;
			case 'Object': 
						var arr = [];
						var keys = Object.keys(this.content);
						for (var i = 0; i< keys.length; i++) {
							arr.push(this.content[keys[i]]);
						}
						this.content = arr;
						break;
		}
		
		this.length = this.content.length;
		this.position = this.direction === 0 ? 0 : this.length - 1;
	}
}

function FSM(table,initState,endState,content,cfg) {
	this.iterator = new Iterator(content, cfg);
	this.table = table;
	this.currentState = initState;
	this.endState = endState;
	this.result = [];
	this.currentResult = '';
	this.hooks = (cfg && cfg.hooks) || null;
}
FSM.prototype = {
	getCurrentState: function() {
		return this.currentState;
	},
	setCurrentState: function(state) {
		return this.currentState = state;
	},
	getCurrentResult: function() {
		return this.currentResult;
	},
	setCurrentResult: function(val, mode) {
		mode = mode || 'a';
		switch(mode) {
			case 'a' : this.currentResult += val; break;
			case 'w' : this.currentResult = val; break;
		}
	},
	// 获取状态机生成的结果
	getRawResult: function() {
		return this.result;
	},
	// 利用用户钩子生成的结果
	getResult: function() {
		if (this.hooks.resulSetter) {
			return this.hooks.resulSetter.call(this,this.result);
		}
		return this.getRawResult();
	},
	setResult: function(val, mode) {
		mode = mode || 'a';
		switch(mode) {
			case 'a' : this.result.push(val); break;
			case 'w' : this.result = val; break;
		}
		
	},
	setHook: function(hookName, hookValue) {
		this.hooks[hookName] = hookValue;
	},
	stateHandler: function() {
		var content = this.getContent();
		var event = this.getEvent(content);
		var tableLength = this.table.getLenght();
		for (var index = 0; index < tableLength; index++) {
			var item = this.table.getItem(index);
			if (item.state === this.currentState && item.eventHandlers[event] && utils.isType(item.eventHandlers[event], 'function')) {
				if (item.eventHandlers[event].call(this,content) === false) {
					return false;
				} 
				break;
			}
		}
		return true;
	},
	getRest: function() {
		var position = this.iterator.getPosition();
		var data = this.iterator.getData();
		this.iterator.rewind(data.length);
		return data.slice(position,data.length).join('');
	},
	handleResult: function() {
		this.setResult(this.getCurrentResult(),'a');
		this.setCurrentResult('','w');
	},
	// 获取状态机的触发事件，由用户钩子实现
	getEvent: function(content) {
		return this.hooks.eventGetter.call(this,content);
	},
	getContent: function() {
		var content = null;
		if (this.iterator.hasNext()) {
			content = this.iterator.next();
		} 
		return content;
	},
	run: function() {
		var flag;
		do {
			flag = this.stateHandler();
		} while (!!flag);
	}
}


	// 分开回车和换行两种状态是为了处理linux/win/mac系统中，换行的兼容问题
	var STATE = {
		START:0,
		// \n对应的状态
		INLF: 1,
		// \r对应的状态
		INCR: 2,
		// 解析http头时的状态
		INHTTPHEADER: 3,
		// 解析http头对应的值时的状态
		INHTTPHEADERVALUE: 4,
		END:5
	}
	var EVENT = {
		// 获取到一个\r时触发该事件
		GETACR: 0,
		// 获取到一个\n时触发该事件
		GETALF:1,
		// 获取到一个:时触发该事件
		GETACOLON: 2,
		// 获取到一个非以上字符时触发该事件
		GETACHAR: 3,
		END: 4
	};
	// 解析http头时调用
	function httpHeaderHandler(char) {
		this.setCurrentState(STATE.INHTTPHEADER);
		this.setCurrentResult(char,'a');	
	}
	var table = new FSMTable([{
		state:STATE.START,
		eventHandlers: {[EVENT.GETACHAR]: httpHeaderHandler}
	},{
		state:STATE.INHTTPHEADER,
		eventHandlers: {[EVENT.GETACHAR]: httpHeaderHandler, [EVENT.GETACOLON]: function(char) {
			// http请求行的url中可能含有:，这里需要特殊处理
			if (this.getRawResult().length === 0) {
				this.setCurrentResult(char,'a');
				return;
			} 
			// 在解析http头时遇到:则进入解析http头对应的值状态
			this.setCurrentState(STATE.INHTTPHEADERVALUE);
			this.handleResult();
		},[EVENT.GETACR]: function(char) {
			// 这里主有在解析http请求行/响应行时会调用
			this.setCurrentState(STATE.INCR);
			this.handleResult();
		},[EVENT.GETALF]: function(char) {
			// 这里主有在解析http请求行/响应行时会调用
			this.setCurrentState(STATE.INLF);
			this.handleResult();
		}}
	},{
		state:STATE.INHTTPHEADERVALUE,
		eventHandlers: {[EVENT.GETACHAR]: function(char) {
			this.setCurrentResult(char,'a');
		},[EVENT.GETACOLON]: function(char) {
			// http头对应的值中可以含有:，比如cookie中的值，这里需要特殊处理
			this.setCurrentResult(char,'a');
		},[EVENT.GETACR]: function(char) {
			// 遇到回车或换行说明这一行http信息结束
			this.setCurrentState(STATE.INCR);
			this.handleResult();
		},[EVENT.GETALF]: function(char) {
			this.setCurrentState(STATE.INLF);
			this.handleResult();
		}}
	},{
		state:STATE.INCR,
		eventHandlers: {[EVENT.GETACHAR]: httpHeaderHandler, [EVENT.GETACR]: function() {
			// 如果状态机处于INCR状态，又遇到了一个CR，说明接下来是body部分
			this.Body = this.getRest().replace(/^\s/,'');
		}}
	},{
		state:STATE.INLF,
		eventHandlers: {[EVENT.GETACHAR]: httpHeaderHandler, [EVENT.INLF]: function() {
			this.Body = this.getRest().replace(/^\s/,'')	;
		}}
	},{
		state:STATE.END,
		eventHandlers: {[EVENT.END]: function() {
			// 防止http最后没有两个换行符，或者只有一个，基本不会发生
			if (this.Body === undefined){
				if (this.getRawResult().length % 2 === 0)
					this.setResult(this.getCurrentResult(),'a');
				this.Body = '';
			} 
			return false;
		}}
	}]);
	// 钩子，用于用户自定义处理
	var hooks = {
		eventGetter:function(content) {
			var event = null;
			if (content === null) {
				event = EVENT.END;
				this.setCurrentState(this.endState);

			}else if(content === ':') {
				event = EVENT.GETACOLON;
			}else if (content === '\n'){
				event = EVENT.GETALF;
			} else if (content === '\r'){
				event = EVENT.GETACR;
			} else {
				event = EVENT.GETACHAR;
			}
			
			return event;
		},
		resulSetter: function(result) {
			result = result.concat();
			var resultLen = result.length;
			// 整个解析结果由请求行/响应行、http头和值、body组成，所有有body的话说明是偶数。否则是奇数
			// if (this.Body !== undefined){
			// 	if (resultLen % 2 !== 0) {
			// 		throw new Error('parse error');
			// 		return;
			// 	}
			// 	body['body'] = result.pop();
			// } else {
			// 	if (resultLen % 2 === 0) {
			// 		throw new Error('parse error');
			// 		return;
			// 	}
			// }
			var res = [];
			var tmpObj;
			var reqOrResLine = {};
			var body = {};
			body['body'] = this.Body;
			reqOrResLine['reqOrResLine'] = result.shift();
			// 请求行放到数组的第一位
			res.push(reqOrResLine);
			// 处理http头
			for (var i = 0; i < result.length; i = i+2) {
				tmpObj = {key:null,val:null};
				tmpObj['key'] = result[i].replace(/\s*$/,'').replace(/^\s*/,'');
				tmpObj['val'] = result[i+1].replace(/\s*$/,'').replace(/^\s*/,'');
				res.push(tmpObj);
			}
			// body放到数组最后
			res.push(body)
			return res;
		}
	};
	function parseBody(content) {
		this.result = content;
	}
	parseBody.prototype = {
		
	}
	function parseRequestHeader(content) {
		var result = {};
		var arr = content.split(' ');
		result['method'] = arr[0];
		result['url'] = arr[1];
		result['httpVersion'] = arr[2];
		return result;
	}
	function parseResponseHeader(content) {
		var result = {};
		var arr = content.split(' ');
		result['httpVersion'] = arr[0];
		result['statusCode'] = arr[1];
		result['statusText'] = arr[2];
		return result;
	}
	var fs = require('fs');
	var str = fs.readFile('http.js',(err,data)=> {
		data = data.toString();//.replace(/\n/,'').replace(/\r/,'');
		var fsm = new FSM(table,STATE.START,STATE.END,data, {direction: 0, hooks: hooks});
		fsm.run();
		console.log(fsm.getResult()) 
	})
