function UseHandCarousel() {
    window.animFrame = (function(){
      return  window.requestAnimationFrame       ||
              window.webkitRequestAnimationFrame ||
              window.mozRequestAnimationFrame    ||
              function( callback ){
                window.setTimeout(callback, 1000 / 60);
              };
    })();

    (function($){
        //The Action takes an action to perform
        //if any other action is added, it is overwritten.
        //This ensures that only one action per frame (the latest one)
        //is performed
        function Action(baseData) {
            this.nextAction = function(){};
            this.add = function(f) {
                this.nextAction = f;
            };
            
            this.call = function() {
                this.nextAction(baseData);
                this.nextAction = function(){};
            };
        };
        

        /** @class HandCarousel
        */
        function HandCarousel(elem, options) {
            try {
                if(!HANDJS) {
                    throw 'NHJS';
                }
            } catch (e) {
                console.error('Hand.js is required for HandCarousel to work!');
                return false;
            }
            

            
            var _this = this;
            var _options = $.extend({animationDurationMs: 650, on: {}}, options);
            

            //the main (parent) element
            this.el = elem.show(); //show the element to make dimensions readable
            //Callbacks to be triggered
            this.callbacks = $.extend({
                'resized': [],
                'afterGenerated': [],
                'afterDomBuilt': [],
                'slided': []
            }, _options.on);

            //Callback-trigger function
            var hcTriggerCallbacks = function(name, data) {for (var i in _this.callbacks[name]) {_this.callbacks[name][i](data);}};
            //Uuid Generator
            var newUuid = function() { return 'uuid_'+Math.floor(Math.random()*1000)+'_'+(Math.ceil(Math.random()*100)); };

            //Read or reset carouselId (wrapper/element dom-id)
            this.carouselId = this.el.attr('id') ? this.el.attr('id') : 'HandCarousel_'+newUuid();
            this.el.attr('id', this.carouselId);
            
            this.Locks = {
                _slidel: false,
                
                lock: function(typeName) {
                    this['_'+typeName+'l'] = true;
                },
                unlock: function(typeName) {
                    this['_'+typeName+'l'] = false;
                },            
                isLocked: function(typeName) {
                    return this['_'+typeName+'l'] === true;
                }
            };
            
            
            //Namespacing function to avoid collisions!
            //use as follows: this.nsp('resize') => returns 'resize.namespace'
            this.nsp = function(strToNamespace) {
                strToNamespace = strToNamespace.replace(/(\s\s)/g,' ').split(' ');
                for (var n in strToNamespace) {
                    strToNamespace[n] = strToNamespace[n] + '.'+this.carouselId;
                }
                return strToNamespace.join(' ');
            };
            
            
            
            
            
            
            
            //Dimension Safe to save ressources 
            this.lastDims = {width: null,height: null};        
            this.getLastDims = function() {
                this.lastDims = {
                    width: elem.width(),
                    height: elem.height(),
                    offset: elem.offset()
                };
            };
            this.getLastDims();
            
            //the original element clones! 
            this.slideableElementsRessource = [];
            this.slideableElementsVirtual   = [];
            this.perElementQueue            = {};
            //animation queues that avoid flickering
            this.processElementActions = function(frameCallback) {
                window.animFrame(function(){
                    for (var i in _this.slideableElementsVirtual) {
                        _this.slideableElementsVirtual[i].elemQueue().call();
                    }
                    
                    if (frameCallback) {
                        frameCallback();
                    }
                    
                });
            };
            

            //forAnySlide will forEach ANY of the generated slides and not only the "real" slides
            this.forAnySlide = function(eachFunc) {
                $(this.slideableElementsVirtual).each(eachFunc);
            };
            
            
            
            this.rebuildCarouselDom = function() {
                //doubling to make [1 2 3 | 1 2 3] out of [1 2 3] - just needed to make a fluid experience
                //creating complete clones
                if (this.slideableElementsVirtual.length > 0) {
                    console.warn('The DOM is rebuild although it was already build... Avoid this! Deleting old elements now!');
                    for (var i in this.slideableElementsVirtual) {
                        this.slideableElementsVirtual[i].remove();
                    }
                }
                this.slideableElementsVirtual = [];
                this.perElementQueue = {};
                
                var len = this.slideableElementsRessource.length;
                for (var i=0; i<len*2; i++) {
                    this.slideableElementsVirtual.push(this.slideableElementsRessource[i%len].clone(true));
                }
                
                //now we need to add a UUID to every element
                for (var i in this.slideableElementsVirtual) {
                    var _vuuid = newUuid();
                    this.el.append(this.slideableElementsVirtual[i].data('vuuid', _vuuid));
                    this.perElementQueue[_vuuid] = new Action(this.slideableElementsVirtual[i]);
                    $.extend(this.slideableElementsVirtual[i], {elemQueue: function(){
                        return _this.perElementQueue[this.data('vuuid')];
                    }});
                }
                
                hcTriggerCallbacks('afterDomBuilt', this);
            };
            
            this.correctifyCarouselDims = function(transitionTimeMs, slideType) {
                this.Locks.lock('slide');
                //TODO: dont forget to use will-change in the css!
                //set size and pos of virtual dom elements!
                
                //as we double the elements, we ALWAYS have elementsCount%2 = 0
                //the "first" (or moreover "active") element is then elements[elementsCount/2]
                //example: [1 2 3 __1__ 2 3] --> we need to MINUS margin 3 elements to the left
                //general: pull-left-count: (elementsCount/2)
                
                console.log('Correcting the dimension with the following last dim values', this.lastDims);
                
                var elementsCount       = this.slideableElementsVirtual.length;
                var halfElementsCount   = elementsCount/2;
                var pullLeftCount       = halfElementsCount;
                var iStartLeft          = -(pullLeftCount * this.lastDims.width);
                
                
                for (var i=0; i<elementsCount; i++) {
                    var isDirectNeighborOfActive = i-1==halfElementsCount || i+1==halfElementsCount || i==halfElementsCount;
                    if (slideType=='left') {
                        //goes from right to left, so right neighbour must be visible and left should not!
                        isDirectNeighborOfActive = isDirectNeighborOfActive &&  (i-1!=halfElementsCount);
                    } else if (slideType=='right') {
                        isDirectNeighborOfActive = isDirectNeighborOfActive &&  (i+1!=halfElementsCount);
                    }
                    
                    this.slideableElementsVirtual[i]
                    .css({
                        'width': this.lastDims.width+'px',
                        'height': this.lastDims.height+'px',
                        'display': isDirectNeighborOfActive ? 'block' : 'none',
                        'position': 'absolute',
                        'top': 0
                    })
                    .elemQueue().add((function(leftPx, elemsCountTotal){
                        return function(elem){
                            elem.data('lastX', leftPx);
                            
                            if (transitionTimeMs && transitionTimeMs > 0) {
                                console.log('yes');
                                elem.css({
                                    'transition': 'all',
                                    'transition-duration': transitionTimeMs+'ms'
                                });
                            } else {
                                elem.css('transition', 'none');
                            }
                            
                            if (leftPx==0) {
                                //new active one!
                                elem.css('z-index', elemsCountTotal*2);
                            } else {
                                elem.css('z-index','');
                            }
                            elem.css('transform', 'translate('+leftPx + 'px,0)');
                        };
                    }(iStartLeft + i*this.lastDims.width, this.slideableElementsVirtual.length)));
                }
                
                this.processElementActions(function(){
                    var waitMs = transitionTimeMs ? transitionTimeMs : 0;
                    setTimeout(function(){
                        _this.forAnySlide(function(){
                            //console.log($(this).css('transition'));
                            $(this).css('transition','none').css('display','block');
                        });
                        _this.Locks.unlock('slide');
                    }, transitionTimeMs ? transitionTimeMs : 0);
                });
            };
            this.rebuild = function() {
                this.rebuildCarouselDom();
                this.correctifyCarouselDims();
            };
            
            
            
            //first we prepare the wrapper
            this.el.css({
                'position': 'relative',
                'width': '100%',
                'overflow-x': 'hidden'
            });
            
            //now collect the children to be slideable
            this.el.children(':not(.hc--ignore)').each(function(){
                _this.slideableElementsRessource.push($(this).clone(true));
            });
            this.el.html('');
            this.rebuild();
            
            
            
            
            this.__onResize = function() {
                this.getLastDims();
                this.correctifyCarouselDims();
                hcTriggerCallbacks('resized', this);
            };
            
            this.getActiveSlide = function() {
                //the active slide is determined by arrayIndex=totalCount/2
                //this is because the amount was doubled in the beginning
                return this.slideableElementsVirtual[this.slideableElementsVirtual.length/2];
            };
            
            this.slide = function(type){
                if (this.Locks.isLocked('slide')) {
                    return false;
                }
                this.Locks.lock('slide');
                
                if (type=='left') {
                    var firstElem = this.slideableElementsVirtual.shift();
                    this.slideableElementsVirtual.push(firstElem);
                } else if (type=='right') {
                    var lastElem = this.slideableElementsVirtual.pop();
                    this.slideableElementsVirtual = [lastElem].concat(this.slideableElementsVirtual);
                } else {
                    //snap back, dont change order!
                }
                
                this.correctifyCarouselDims(_options.animationDurationMs, type);
                setTimeout(function(){
                    hcTriggerCallbacks('slided', _this.getActiveSlide());
                },_options.animationDurationMs);
            };
            
            this.slideLeft = function() {
                return this.slide('left');
            };
            
            this.slideRight = function() {
                return this.slide('right');
            };
            
            //Callback-Setters
            this.on = function(name, func) {
                if (!Array.isArray(this.callbacks[name])) {
                    throw '`'+name+'´ does not exist to be callback-implemented';
                } else {
                    this.callbacks[name].push(func);
                }
            };
            
            
            
            //NOW do the bindings
            
            
            var Pointer = {
                down: false,
            };
            
            var bodyNsp = this.nsp('pointerup pointermove pointerleave pointerdown');
            var windNsp = this.nsp('resize');
            $(window).on(windNsp, function(){
                _this.__onResize();
            });
            
            $('body').on(bodyNsp, '#'+this.carouselId, function(e){
                console.debug(e);

                if (_this.Locks.isLocked('slide')) {
                    return false;
                }
                
                var consume = function() {
                    e.stopPropagation();
                    e.preventDefault();
                };
                
                if (e.type=='pointerdown' && Pointer.down===false) {
                    consume();
                    Pointer.down = e;
                    Pointer.down.realRelativeOffsetX = event.clientX - _this.lastDims.offset.left;
                } else if (e.type=='pointermove' && Pointer.down!==false) {
                    consume();
                    var realRelativeOffsetX = (e.clientX - _this.lastDims.offset.left)-Pointer.down.realRelativeOffsetX;
                    _this.forAnySlide(function(ind){
                        _this.slideableElementsVirtual[ind].elemQueue().add((function(offsetX){
                            return function(elem){
                                //console.log('elem called in animation frame with ', offsetX);
                                elem.css('transform', 'translate('+(offsetX+elem.data('lastX'))+'px,0)');
                            };
                        }(realRelativeOffsetX)));
                    });
                    
                    _this.processElementActions();
                } else if ((e.type=='pointerup' || e.type=='pointerleave' || e.type=='pointerout') && Pointer.down!==false) {
                    consume();
                    
                    var endRelOffsetX = (e.clientX - _this.lastDims.offset.left)-Pointer.down.realRelativeOffsetX;
                    var absEndRelOffsetX = Math.abs(endRelOffsetX);
                    var bThresholdReached = absEndRelOffsetX > (0.145 * _this.lastDims.width);
                    
                    
                    if (bThresholdReached) {
                        if (endRelOffsetX < 0) {
                            _this.slideLeft();
                        } else {
                            _this.slideRight();
                        }
                    } else {
                        _this.slide();
                    }
                    
                    Pointer.down = false;
                }
            });
            
            this.destroy = function() {
                $('body').off(bodyNsp);
                $(window).off(windNsp);
                this.slideableElementsRessource = [];
                this.slideableElementsVirtual = [];
                this.el.html('');
                delete this.el[0].__handCarousel;
            };
        };
        
        $.fn.handCarousel = function(options) {
            if (!this[0].__handCarousel) {
                $.extend(this[0], {__handCarousel: new HandCarousel(this, options)});
            }
            
            return this[0].__handCarousel;
        };
        
        $.fn.isHandCarousel = function(){
            try {
                return !!this[0].__handCarousel;
            } catch (e) {
                return false;
            }
        };
    }(jQuery));

};
