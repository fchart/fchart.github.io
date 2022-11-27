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
// Copyright 2013 by 陳會安. All rights reserved.

var LINKED_LIST_START_X = 180;
var LINKED_LIST_START_Y = 100;
var LINKED_LIST_ELEM_WIDTH = 70;
var LINKED_LIST_ELEM_HEIGHT = 30;
//var LINKED_LIST_START_X = 100;
//var LINKED_LIST_START_Y = 200;
//var LINKED_LIST_ELEM_WIDTH = 70;
//var LINKED_LIST_ELEM_HEIGHT = 30;

var LINKED_LIST_INSERT_X = 250;
var LINKED_LIST_INSERT_Y = 50;

var LINKED_LIST_ELEMS_PER_LINE = 8;
var LINKED_LIST_ELEM_SPACING = 100;
var LINKED_LIST_LINE_SPACING = 100;

var HEAD_POS_X = 100;
//var HEAD_POS_X = 180;
var HEAD_POS_Y = 100;
var HEAD_LABEL_X = 50;
//var HEAD_LABEL_X = 130;
var HEAD_LABEL_Y =  100;

var HEAD_ELEM_WIDTH = 30;
var HEAD_ELEM_HEIGHT = 30;

var NODE_LABEL_X = 50;
var NODE_LABEL_Y = 30;
var NODE_ELEMENT_X = 120;
var NODE_ELEMENT_Y = 30;

var SIZE = 32;

function TraverseLL(am, w, h)
{
	this.init(am, w, h);
	
}

TraverseLL.prototype = new Algorithm();
TraverseLL.prototype.constructor = TraverseLL;
TraverseLL.superclass = Algorithm.prototype;


TraverseLL.prototype.init = function(am, w, h)
{
	TraverseLL.superclass.init.call(this, am, w, h);
	this.addControls();
	this.nextIndex = 0;
	this.commands = [];
	this.setup();
	this.initialIndex = this.nextIndex;
}


TraverseLL.prototype.addControls =  function()
{
	this.controls = [];
	this.nextButton = addControlToAlgorithmBar("Button", "下一個節點");
	this.nextButton.onclick = this.nextCallback.bind(this);
	this.controls.push(this.nextButton);
	this.clearButton = addControlToAlgorithmBar("Button", "重設指標 ptr");
	this.clearButton.onclick = this.clearCallback.bind(this);
	this.controls.push(this.clearButton);
}

TraverseLL.prototype.enableUI = function(event)
{
	for (var i = 0; i < this.controls.length; i++)
	{
		this.controls[i].disabled = false;
	}	
}
TraverseLL.prototype.disableUI = function(event)
{
	for (var i = 0; i < this.controls.length; i++)
	{
		this.controls[i].disabled = true;
	}
}


TraverseLL.prototype.setup = function()
{
	
	this.linkedListElemID = new Array(SIZE);
	for (var i = 0; i < SIZE; i++)
	{
		
		this.linkedListElemID[i]= this.nextIndex++;
	}
	this.headID = this.nextIndex++;
	this.headLabelID = this.nextIndex++;
    this.ptrLabelID = this.nextIndex++;
	this.ptrID = this.nextIndex++;
	this.top = 1;

	this.arrayData = new Array(SIZE);
	this.head = 0;
	this.leftoverLabelID = this.nextIndex++;
	
	this.cmd("CreateLabel", this.headLabelID, "head", HEAD_LABEL_X, HEAD_LABEL_Y);
	this.cmd("CreateRectangle", this.headID, "", HEAD_ELEM_WIDTH, HEAD_ELEM_HEIGHT, HEAD_POS_X, HEAD_POS_Y);
	this.cmd("SetNull", this.headID, 1);
	this.cmd("CreateLabel", this.ptrLabelID, "ptr", LINKED_LIST_START_X - 50, LINKED_LIST_START_Y - 50);
    this.cmd("CreateRectangle", this.ptrID, "", HEAD_ELEM_WIDTH, HEAD_ELEM_HEIGHT, LINKED_LIST_START_X, LINKED_LIST_START_Y - 50);
	
	this.cmd("CreateLabel", this.leftoverLabelID, "", 5, NODE_LABEL_Y,0);
	
	for (var elemToInsert  = 1; elemToInsert <= 6; elemToInsert++)
	{
	    //this.commands = new Array();
		this.arrayData[this.head] = elemToInsert;
		this.cmd("SetText", this.leftoverLabelID, "");
		for (var i  = this.head; i > 0; i--)
	    {
		    this.arrayData[i] = this.arrayData[i-1];
		    this.linkedListElemID[i] =this.linkedListElemID[i-1];
	    }
	    this.arrayData[0] = elemToInsert;
	    this.linkedListElemID[0] = this.nextIndex++;
	 	var labInsertID = this.nextIndex++;
	    var labInsertValID = this.nextIndex++;
	    this.cmd("CreateLinkedList",this.linkedListElemID[0], "" ,LINKED_LIST_ELEM_WIDTH, LINKED_LIST_ELEM_HEIGHT, 
		    LINKED_LIST_INSERT_X, LINKED_LIST_INSERT_Y, 0.25, 0, 1, 1);
		this.cmd("SetNull", this.linkedListElemID[0], 1); 
	    this.cmd("CreateLabel", labInsertID, "存入值: ", NODE_LABEL_X, NODE_LABEL_Y);
	    this.cmd("CreateLabel", labInsertValID,elemToInsert, NODE_ELEMENT_X, NODE_ELEMENT_Y);
		this.cmd("Step");
		this.cmd("Move", labInsertValID, LINKED_LIST_INSERT_X, LINKED_LIST_INSERT_Y);
		this.cmd("Step");
	    this.cmd("SetText", this.linkedListElemID[0], elemToInsert);
	    this.cmd("Delete", labInsertValID);
		if (this.head == 0)
	    {
		    this.cmd("SetNull", this.headID, 0);
		    this.cmd("connect", this.headID, this.linkedListElemID[this.head]);
    	}
    	else
	    {
		    this.cmd("SetNull", this.linkedListElemID[1], 0);
		    this.cmd("Connect",  this.linkedListElemID[1], this.linkedListElemID[0]);
		    this.cmd("Step");
	    }
    	this.cmd("Step");
	    this.head = this.head + 1;
	    this.resetLinkedListPositions();
	    this.cmd("Delete", labInsertID);
	    this.cmd("Step");
	}
	this.head = 5;
	this.cmd("connect", this.ptrID, this.linkedListElemID[this.head]);
	this.animationManager.StartNewAnimation(this.commands);
	this.animationManager.skipForward();
	this.animationManager.clearHistory();		
}

TraverseLL.prototype.resetLinkedListPositions = function()
{
	for (var i = this.head - 1; i >= 0; i--)
	{
		var nextX = (this.head - 1 - i) % LINKED_LIST_ELEMS_PER_LINE * LINKED_LIST_ELEM_SPACING + LINKED_LIST_START_X;
		var nextY = Math.floor((this.head - 1 - i) / LINKED_LIST_ELEMS_PER_LINE) * LINKED_LIST_LINE_SPACING + LINKED_LIST_START_Y;
		this.cmd("Move", this.linkedListElemID[i], nextX, nextY);				
	}
	
}

TraverseLL.prototype.reset = function()
{
	this.head = 0;
	this.nextIndex = this.initialIndex;

}
		
		
TraverseLL.prototype.nextCallback = function(event)
{
    this.implementAction(this.traverseNode.bind(this), "");
}

TraverseLL.prototype.clearCallback = function(event)
{
	this.implementAction(this.clearData.bind(this), "");
}

TraverseLL.prototype.traverseNode = function()
{
	this.commands = new Array();
	if ( this.top < 6 ) {
　　　　this.cmd("Disconnect", this.ptrID, this.linkedListElemID[this.head]);
　　　　this.head = this.head - 1;	
	    this.cmd("Move", this.ptrLabelID, (LINKED_LIST_START_X - 50) + (this.top * 100), LINKED_LIST_START_Y - 50);	
		this.cmd("Move", this.ptrID, LINKED_LIST_START_X + (this.top * 100), LINKED_LIST_START_Y - 50);
        this.cmd("connect", this.ptrID, this.linkedListElemID[this.head]);	
        this.top++;		
	}
	else {
	    this.cmd("Disconnect", this.ptrID, this.linkedListElemID[this.head]);
		this.cmd("SetNull", this.ptrID, 1);
	}	
	return this.commands;
}	

TraverseLL.prototype.clearData = function()
{
	this.commands = new Array();
	this.top = 1;
	this.cmd("Disconnect", this.ptrID, this.linkedListElemID[this.head]);
	this.head = 5
	this.cmd("Move", this.ptrID, LINKED_LIST_START_X, LINKED_LIST_START_Y - 50);
	this.cmd("Move", this.ptrLabelID, LINKED_LIST_START_X - 50, LINKED_LIST_START_Y - 50);
	this.cmd("connect", this.ptrID, this.linkedListElemID[this.head]);
	this.cmd("SetNull", this.ptrID, 0);
	return this.commands;
	
}	
var currentAlg;

function init()
{
	var animManag = initCanvas();
	currentAlg = new TraverseLL(animManag, canvas.width, canvas.height);
}

