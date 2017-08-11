function Keyboard(options){
	this.subs = [];
	this.octaves = 2;
	this.lowestKeyNum = 48;
	this.canvas = options.canvas || document.createElement("canvas");
	this.ctx = options.ctx || this.canvas.getContext("2d");
	this.keysDown = {};
	this.externalKeysDown = {};
	this.touches = {};
	this.whiteColor = "#FFFFFF";
	this.blackColor = "#222222";
	this.whitePressColor = "red";
	this.blackPressColor = "red";
	this.enableKeyboardInput = options.enableKeyboardInput;

	if(options.octave !== undefined) this.changeOctave(options.octave);
	if(options.listener) this.addListener(options.listener);
	if(options.container) options.container.appendChild(this.canvas);
	this.setupEventListeners();
	this.render();
}

Keyboard.prototype.changeOctave = function(d){
	this.lowestKeyNum += 12*d;
};

Keyboard.prototype.setLowestOctave = function(d){
	this.lowestKeyNum = 12 + 12*d;
};

Keyboard.prototype.setupEventListeners = function(){
	var self = this;

	if(this.enableKeyboardInput && ("onkeydown" in window)){
		window.addEventListener("keydown",function(e){
			if(!self.keysDown[e.keyCode]) self.pressKey(e.keyCode);
		});

		window.addEventListener("keyup",function(e){
			self.releaseKey(e.keyCode);
		});
	}

	if("ontouchstart" in window){
		this.canvas.addEventListener("touchstart",function(e){
			e.preventDefault();
			if(e.touches.length > 5) return;
			var num;
			for (var i = 0; i < e.changedTouches.length; i++) {
				num = self.inputEventToMidiNum(e.changedTouches[i]);
				if(num && !self.keysDown[num]){
					self.touches[e.changedTouches[i].identifier] = num;
					self.keysDown[num] = num;
					self.emit({
						num: num,
						type: "on"
					});
					self.render();
				}
			};
		});

		this.canvas.addEventListener("touchmove",function(e){
			e.preventDefault();
			if(e.touches.length > 5) return;
			var num;
			for (var i = 0; i < e.changedTouches.length; i++) {
				num = self.inputEventToMidiNum(e.changedTouches[i]);
				if(num && num !== self.touches[e.changedTouches[i].identifier]){
					delete self.keysDown[self.touches[e.changedTouches[i].identifier]];
					self.emit({
						num: self.touches[e.changedTouches[i].identifier],
						type: "off"
					});

					if(!self.keysDown[num]){
						self.keysDown[num] = num;
						self.touches[e.changedTouches[i].identifier] = num;
						self.emit({
							num: num,
							type: "on"
						});
					}
					self.render();
					
				}
			};
		});

		this.canvas.addEventListener("touchend",function(e){
			e.preventDefault();
			var num;
			for (var i = 0; i < e.changedTouches.length; i++) {
				num = self.touches[e.changedTouches[i].identifier];
				if(num){
					self.emit({
						num: num,
						type: "off"
					});
					delete self.touches[e.changedTouches[i].identifier];
					delete self.keysDown[num];
					self.render();
				}
			};
			var keyCount = 0;
			var id;
			for(id in self.keysDown){
				keyCount++;
			}
			if(e.touches.length === 0 && keyCount !== 0){
				for(id in self.keysDown){
					self.emit({
						num: id,
						type: "off"
					});
				}
				for(id in self.keysDown){
					delete self.keysDown[id];
					delete self.touches[id];
				}
			}
		});
	} else {
		this.canvas.addEventListener("mousedown",function(e){
			var num = self.inputEventToMidiNum(e);
			if(!self.keysDown[num] && num){
				self.touches["mouse"] = num;
				self.pressKey(num);
			}
		});
		
		this.canvas.addEventListener("mousemove",function(e){
			var num = self.inputEventToMidiNum(e);
			if(self.touches["mouse"] && num){
				if(self.keysDown[self.touches["mouse"]] && self.touches["mouse"] !== self.keysDown[num]){
					self.releaseKey(self.touches["mouse"]);
					self.touches["mouse"] = num;
					self.pressKey(num);
				}
			}
		});
		
		this.canvas.addEventListener("mouseup",function(e){
			var num = self.inputEventToMidiNum(e);
			if(self.keysDown[num]){
				delete self.touches["mouse"];
				self.releaseKey(parseInt(num));
			}
		});

		this.canvas.addEventListener("mouseleave",function(e){
			var num;
			delete self.touches["mouse"];
			for(num in self.keysDown){
				self.releaseKey(parseInt(num));
			}
		});
	}
};

Keyboard.prototype.pressKey = function(num){
	this.externalKeysDown[num] = num;
	this.render();
};

Keyboard.prototype.releaseKey = function(num){
	delete this.externalKeysDown[num];
	this.render();
};

Keyboard.prototype.emit = function(e){
	for(var i = 0; i < this.subs.length; i++){
		this.subs[i](e);
	}
};

Keyboard.prototype.addListener = function(f){
	this.subs.push(f);
};

Keyboard.prototype.midiToFrq = function(num){
	return Math.pow(2, (num-69)/12 )*440;
};

Keyboard.prototype.resize = function(w,h){
	this.canvas.width = w;
	this.canvas.height = h;
	this.render();
};
//w b w b w w b w b w b w
//  0   1     2   3   4 
//0   1   2 3   4   5   6
//0 1 2 3 4 5 6 7 8 9 A B
Keyboard.prototype.render = function(){
	this.canvas.width = this.canvas.width;
	var whiteKeyCount = this.octaves*7;
	var octaveOffset = 0;
	var isDown;
	var isExternal;

	for(var i = 0; i < whiteKeyCount; i++){
		isDown = this.isWhiteKeyDown(this.keysDown,i);
		isExternal = this.isWhiteKeyDown(this.externalKeysDown,i);
		this.ctx.fillStyle = isDown || isExternal ? this.whitePressColor : this.whiteColor;
		this.ctx.fillRect(i*this.getWhiteKeyWidth(),0,this.getWhiteKeyWidth(),this.getWhiteKeyHeight())
		this.ctx.beginPath();
		this.ctx.rect(i*this.getWhiteKeyWidth(),0,this.getWhiteKeyWidth(),this.getWhiteKeyHeight());
		this.ctx.stroke();
	}

	for(var i = 0; i < this.octaves; i++){
		octaveOffset = (i/this.octaves)*this.canvas.width;
		for(var j = 0; j < 5;j++){
			isDown = this.isBlackKeyDown(this.keysDown,j,i);
			isExternal = this.isBlackKeyDown(this.externalKeysDown,j,i);
			this.ctx.fillStyle = isDown || isExternal? this.blackPressColor : this.blackColor;
			this.ctx.fillRect(octaveOffset+this.getBlackKeyX(j),0,this.getBlackKeyWidth(),this.getBlackKeyHeight());
		}
	}
};

Keyboard.prototype.isWhiteKeyDown = function(keys,ind){
	var oct = Math.floor(ind/7);
	var whiteIndex = ind%7;
	var index = this.lowestKeyNum + oct*12 + this.whiteIndexToNum[whiteIndex];

	return (index+"" in keys);
};

Keyboard.prototype.isBlackKeyDown = function(keys,ind,oct){
	var index = this.lowestKeyNum + oct*12 + this.blackIndexToNum[ind];
	return (index+"" in keys);
};

Keyboard.prototype.pointInRect = function(pX,pY,rX,rY,rW,rH){
	return (pX > rX && pX < rX + rW && pY > rY && pY < rY + rH);
};

Keyboard.prototype.getBlackKeyX = function(i,actual){
	if(i === 0){
		return this.getWhiteKeyWidth(actual) - 0.5*this.getBlackKeyWidth(actual);
	} else if(i === 1){
		return 2*this.getWhiteKeyWidth(actual) - 0.5*this.getBlackKeyWidth(actual);
	} else if(i === 2){
		return 4*this.getWhiteKeyWidth(actual) - 0.5*this.getBlackKeyWidth(actual);
	} else if(i === 3){
		return 5*this.getWhiteKeyWidth(actual) - 0.5*this.getBlackKeyWidth(actual);
	} else if(i === 4){
		return 6*this.getWhiteKeyWidth(actual) - 0.5*this.getBlackKeyWidth(actual);
	}
};

Keyboard.prototype.pressKey = function(num){
	this.keysDown[num] = num;
	this.emit({
		num: num,
		type: "on"
	});
	this.render();
};

Keyboard.prototype.releaseKey = function(num){
	delete this.keysDown[num];
	this.emit({
		num: num,
		type: "off"
	});
	this.render();
};

Keyboard.prototype.getWhiteKeyX = function(i,actual){
	return i*this.getWhiteKeyWidth(actual);
};

Keyboard.prototype.getWhiteKeyWidth = function(actual){
	return this.canvas[actual? "offsetWidth":"width"]/(this.octaves*7);
}

Keyboard.prototype.getWhiteKeyHeight = function(actual){
	return this.canvas[actual? "offsetHeight":"height"];
}

Keyboard.prototype.getBlackKeyWidth = function(actual){
	return 0.8*this.getWhiteKeyWidth(actual);
}

Keyboard.prototype.getBlackKeyHeight = function(actual){
	return 0.5*this.canvas[actual? "offsetHeight":"height"];
}

Keyboard.prototype.XYToMidiNum = function(x,y){
	var octaveOffset;
	
	var isKey = false;//default to lowest C
	for(var i = 0; i < this.octaves; i++){
		octaveOffset = (i/this.octaves)*this.canvas.offsetWidth;
		for(var j = 0; j < 5; j++){//test against all black keys in this octave
			if(this.pointInRect(x,y,octaveOffset + this.getBlackKeyX(j,true),0,this.getBlackKeyWidth(true),this.getBlackKeyHeight(true))){
				return this.blackIndexToNum[j]+i*12+this.lowestKeyNum;
			}
		}
		for(var j = 0; j < 7; j++){//test against all white keys in this octave
			if(this.pointInRect(x,y,octaveOffset + this.getWhiteKeyX(j,true),0,this.getWhiteKeyWidth(true),this.getWhiteKeyHeight(true))){
				return this.whiteIndexToNum[j]+i*12+this.lowestKeyNum;
			}
		}
	}
};

Keyboard.prototype.blackIndexToNum = [1,3,6,8,10];
Keyboard.prototype.whiteIndexToNum = [0,2,4,5,7,9,11];

Keyboard.prototype.inputEventToMidiNum = function(e){
	var pos = this.getCanvasPosition();
	return this.XYToMidiNum(e.pageX-pos.x,e.pageY-pos.y);
}

// helper function to get an element's exact position
Keyboard.prototype.getCanvasPosition = function () {
    var rect = this.canvas.getBoundingClientRect();
    return {
    	x: rect.left,
    	y: rect.top+window.scrollY
    };
}
