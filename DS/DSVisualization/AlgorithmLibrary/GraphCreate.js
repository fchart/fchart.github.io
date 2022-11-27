// Copyright 2011 David Galles, University of San Francisco. All rights reserved.
//
// Redistribution and use in source and binary forms, with or without modification, are
// permitted provided that the following conditions are met:
//
// 1. Redistributions of source code must retain the above copyright notice, this list of
// conditions and the following disclaimer.
//
// 2. Redistributions in binary form must reproduce the above copyright notice, this list
// of conditions and the following disclaimer in the documentation and/or other materials
// provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY <COPYRIGHT HOLDER> ``AS IS'' AND ANY EXPRESS OR IMPLIED
// WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
// FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> OR
// CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
// SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
// ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
// NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
// ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
// The views and conclusions contained in the software and documentation are those of the
// authors and should not be interpreted as representing official policies, either expressed
// or implied, of the University of San Francisco
// 
// Copyright 2013 by ³¯·|¦w. All rights reserved.


var HIGHLIGHT_CIRCLE_COLOR = "#000000";
var GraphCreate_TREE_COLOR = "#0000FF";

function GraphCreate(am)
{
	this.init(am);	
}

GraphCreate.prototype = new Graph1();
GraphCreate.prototype.constructor = GraphCreate;
GraphCreate.superclass = Graph1.prototype;

GraphCreate.prototype.addControls =  function()
{		
	GraphCreate.superclass.addControls.call(this);	
}	


GraphCreate.prototype.init = function(am, w, h)
{
	showEdgeCosts = false;
	GraphCreate.superclass.init.call(this, am, w, h); // TODO:  add no edge label flag to this?
	// Setup called in base class constructor
}


GraphCreate.prototype.setup = function() 
{
	GraphCreate.superclass.setup.call(this);
	
}

GraphCreate.prototype.startCallback = function(event)
{
	
}



// NEED TO OVERRIDE IN PARENT
GraphCreate.prototype.reset = function()
{
	// Throw an error?
}


GraphCreate.prototype.enableUI = function(event)
{			
	GraphCreate.superclass.enableUI.call(this,event);
}
GraphCreate.prototype.disableUI = function(event)
{		
	GraphCreate.superclass.disableUI.call(this, event);
}


var currentAlg;

function init()
{
	var animManag = initCanvas();
	currentAlg = new GraphCreate(animManag, canvas.width, canvas.height);
}
