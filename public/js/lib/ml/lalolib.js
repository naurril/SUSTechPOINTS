/////////////////////////////////////
/// Stand alone lalolib base functions
////////////////////////////////////
var printPrecision = 3; // number of digits to print

var LALOLibPlotsIndex = 0;
var LALOLibPlots = new Array();
var LALOLABPLOTMOVING = false;

//////////////////////////
//// Cross-browser compatibility
///////////////////////////

if( typeof(console) == "undefined" ) {
	// for Safari
	var console = {log: function ( ) { } };
}

if( typeof(Math.sign) == "undefined" ) {
	// for IE, Safari
	Math.sign = function ( x ) { return ( x>=0 ? (x==0 ? 0 : 1) : -1 ) ;}
}

//////////////////////////
//// printing
///////////////////////////

function laloprint( x , htmlId, append ) {
	/*
		use print(x) to print to the standard LALOLabOutput

		use print(x, id) to print to another html entity
		
		use str = print(x, true) to get the resulting string
	*/
	
	if ( typeof(htmlId) == "undefined" )
		var htmlId = "LALOLibOutput"; 
	if ( typeof(append) == "undefined" )
		var append = true; 
				
	return printMat(x, size(x), htmlId, append ) ;
}

function printMat(A, size, htmlId, append) {
	if (typeof(append) === "undefined")
		var append = false;
	if ( typeof(htmlId) == "undefined" || htmlId === true ) {
		// return a string as [ [ .. , .. ] , [.. , ..] ]
		if ( type(A) == "matrix" ) {
			var str = "[";
			var i;
			var j;
			var m = size[0];
			var n = size[1];

			for (i=0;i<m; i++) {
				str += "[";
				for ( j=0; j< n-1; j++)
					str += printNumber(A.val[i*A.n+j]) + ",";
				if ( i < m-1)
					str += printNumber(A.val[i*A.n+j]) + "]; ";
				else
					str += printNumber(A.val[i*A.n+j]) + "]";
			}			
			str += "]";
			return str;
		}
		else if (type(A) == "vector" ) {
			var n = A.length;
			var str = "";
			// Vector (one column)
			for (var i=0;i<n; i++) {
				str += "[ " + printNumber(A[i]) + " ]<br>";
			}
			console.log(str);
			return str;
		}
	}
	else {
		// Produce HTML code and load it in htmlId
		
		var html = "";
		var i;
		var j;
		
		/*if (domathjax) {
			html = tex ( A ) ;
		}
		else {*/
			if ( isScalar(A) ) {
				html +=  A + "<br>" ;
			}
			else if (type(A) == "vector" ) {
				var n = size[0];

				// Vector (one column)
				for (i=0;i<n; i++) {
					html += "[ " + printNumber(A[i]) + " ]<br>";
				}
			}
			else {
				// Matrix
				var m = size[0];
				var n = size[1];

				for (i=0;i<m; i++) {
					html += "[ ";
					for(j=0;j < n - 1; j++) {
						html += printNumber(A.val[i*A.n+j]) + ", ";
					}
					html += printNumber(A.val[i*A.n+j]) + " ]<br>";
				}
			}
		//}
		if (append)
			document.getElementById(htmlId).innerHTML += html;
		else
			document.getElementById(htmlId).innerHTML = html;
		/*
		if ( domathjax) 
			MathJax.Hub.Queue(["Typeset",MathJax.Hub,"output"]);			
			*/
	}
}

function printNumber ( x ) {
	switch ( typeof(x) ) {
		case "undefined":
			return "" + 0;// for sparse matrices
			break;
		case "string":
			/*if ( domathjax ) 
				return "\\verb&" + x + "&";
			else*/
				return x;
			break;
		case "boolean":
			return x;
			break;
		default:	
			if ( x == Infinity )
				return "Inf";
			if ( x == -Infinity )
				return "-Inf";
			var x_int = Math.floor(x);
			if ( Math.abs( x - x_int ) < 2.23e-16 ) {
				return "" + x_int;
			} 
			else
				return x.toFixed( printPrecision );
				
			break;
	}
}

//// Error handling

function error( msg ) {
	throw new Error ( msg ) ;	
//	postMessage( {"error": msg} );
}


/////////// 
// Plots
//////////
function plot(multiargs) {
	// plot(x,y,"style", x2,y2,"style",y3,"style",... )
	
	// Part copied from lalolabworker.js
	
	var data = new Array();
	var styles = new Array();	
	var legends = new Array();		
	var minX = Infinity;
	var maxX = -Infinity;
	var minY = Infinity;
	var maxY = -Infinity;
	
	var p=0; // argument pointer
	var x;
	var y;
	var style;
	var i;
	var n;
	var c = 0; // index of current curve
	while ( p < arguments.length)  {
	
		if ( type( arguments[p] ) == "vector" ) {

			if ( p + 1 < arguments.length && type ( arguments[p+1] ) == "vector" ) {
				// classic (x,y) arguments
				x = arguments[p];
				y = arguments[p+1];
			
				p++;
			}
			else {
				// only y provided => x = 0:n
				y = arguments[p];
				x = range(y.length);
			}
		}
		else if ( type( arguments[p] ) == "matrix" ) {
			// argument = [x, y]
			if ( arguments[p].n == 1 ) {
				y = arguments[p].val;
				x = range(y.length);
			}
			else if (arguments[p].m == 1 ) {
				y = arguments[p].val;
				x = range(y.length);
			}
			else if ( arguments[p].n == 2 ) {
				// 2 columns => [x,y]
				x = getCols(arguments[p], [0]);
				y = getCols(arguments[p], [1]);
			}			
			else {
				// more columns => trajectories as rows
				x = range(arguments[p].n);
				for ( var row = 0; row < arguments[p].m; row++) {
					y = arguments[p].row(row);
					data[c] = [new Array(x.length), new Array(x.length)];
					for ( i=0; i < x.length; i++) {
						data[c][0][i] = x[i];
						data[c][1][i] = y[i]; 
						if ( x[i] < minX )
							minX = x[i];
						if(x[i] > maxX ) 
							maxX = x[i];
						if ( y[i] > maxY ) 
							maxY = y[i];
						if ( y[i] < minY ) 
							minY = y[i];

					}
		
					styles[c] = undefined;
					legends[c] = "";
		
					// Next curve
					c++; 
				}
				p++;
				continue;
			}
		}
		else {
			return "undefined";
		}
				
		//Style
		style = undefined;
		if ( p + 1 < arguments.length && type ( arguments[p+1] ) == "string" ) {
			style = arguments[p+1];
			p++;
		}			
		legend = "";	
		if ( p + 1 < arguments.length && type ( arguments[p+1] ) == "string" ) {
			legend = arguments[p+1];
			p++;
		}	

		// Add the curve (x,y, style) to plot		
		data[c] = [new Array(x.length), new Array(x.length)];		
		for ( i=0; i < x.length; i++) {
			data[c][0][i] = x[i];
			data[c][1][i] = y[i]; 
			if ( x[i] < minX )
				minX = x[i];
			if(x[i] > maxX ) 
				maxX = x[i];
			if ( y[i] > maxY ) 
				maxY = y[i];
			if ( y[i] < minY ) 
				minY = y[i];

		}
		styles[c] = style;
		legends[c] = legend;
		
		// Next curve
		c++; 
		p++; // from next argument	
	}	
		
	var widthX = maxX-minX;
	var widthY = Math.max( maxY-minY, 1);

	maxX += 0.1*widthX;
	minX -= 0.1*widthX;
	maxY += 0.1*widthY;
	minY -= 0.1*widthY;
	
	if ( minY > 0 ) 
		minY = -0.1*maxY;
	
	if ( maxY < 0 ) 
		maxY = -0.1*minY;
	
	var scaleY = 0.9 * (maxX-minX) / (2*maxY);

	var plotinfo = {"data" : data, "minX" : minX, "maxX" : maxX, "minY" : minY, "maxY": maxY, "styles" : styles, "legend": legends };

	//////// Part from laloplots.html //////////
	
	var plotid = "LALOLibPlot" + LALOLibPlotsIndex;
	var legendwidth = 50;
	
	LALOLibOutput.innerHTML += "<br><div style='position:relative;left:0px;top:0px;text-align:left;'> <div><a onmousemove='mouseposition(event," + LALOLibPlotsIndex + ");' onmousedown='mousestartmove(event," + LALOLibPlotsIndex + ");' onmouseup='mousestopmove(event);' onmouseleave='mousestopmove(event);' ondblclick='zoomoriginal(" + LALOLibPlotsIndex + ");'><canvas id='" +plotid + "'  width='500' height='500' style='border: 1px solid black;'></canvas></a></div> <label id='lblposition" + LALOLibPlotsIndex + "'></label> <div style='position: absolute;left: 550px;top: -1em;'> <canvas id='legend" + LALOLibPlotsIndex + "' width='" + legendwidth + "' height='500'></canvas></div> <div id='legendtxt" + LALOLibPlotsIndex + "' style='position: absolute;left: 610px;top: 0;'></div> </div>";

	// prepare legend
	var ylegend = 20;
	
	// do plot

	LALOLibPlots[LALOLibPlotsIndex] = new Plot(plotid) ;
		
	LALOLibPlots[LALOLibPlotsIndex].setScalePlot(plotinfo.minX, plotinfo.maxX, 200, plotinfo.scaleY); 
	if ( plotinfo.minY && plotinfo.maxY ) {
		LALOLibPlots[LALOLibPlotsIndex].view(plotinfo.minX, plotinfo.maxX, plotinfo.minY, plotinfo.maxY); 
	}
	
	var colors = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,0];
	
	var p;
	var color;
	for (p = 0; p<plotinfo.data.length; p++) {
		
		var linestyle = true;
		var pointstyle = true;
		if ( typeof(plotinfo.styles[p]) == "string" ) {
			if ( plotinfo.styles[p].indexOf(".") >= 0 ) {
				linestyle = false;
				plotinfo.styles[p] = plotinfo.styles[p].replace(".","");
			}
			if ( plotinfo.styles[p].indexOf("_") >= 0 ) {
				pointstyle = false;
				plotinfo.styles[p] = plotinfo.styles[p].replace("_","");
			}
			color = parseColor(plotinfo.styles[p]);
		
			if ( color < 0 )
				color = colors.splice(0,1)[0];		// pick next unused color
			else
				colors.splice(colors.indexOf(color),1); // remove this color
		}
		else 
			color = color = colors.splice(0,1)[0];	// pick next unused color
		
		if ( typeof(color) == "undefined")	// pick black if no next unused color
			color = 0;
	
		for ( i=0; i < plotinfo.data[p][0].length; i++) {
			if ( pointstyle )
				LALOLibPlots[LALOLibPlotsIndex].addPoint(plotinfo.data[p][0][i],plotinfo.data[p][1][i], color);	
			if ( linestyle && i < plotinfo.data[p][0].length-1 ) 
				LALOLibPlots[LALOLibPlotsIndex].plot_line(plotinfo.data[p][0][i],plotinfo.data[p][1][i], plotinfo.data[p][0][i+1],plotinfo.data[p][1][i+1], color);				
		}
		
		
		// Legend
		if ( plotinfo.legend[p] != "" ) {		
			var ctx = document.getElementById("legend" +LALOLibPlotsIndex).getContext("2d");
			setcolor(ctx, color);
			ctx.lineWidth = "3";
			if ( pointstyle ) {
				ctx.beginPath();
				ctx.arc( legendwidth/2 , ylegend, 5, 0, 2 * Math.PI , true);
				ctx.closePath();
				ctx.fill();
			}
			if( linestyle) {
				ctx.beginPath();
				ctx.moveTo ( 0,ylegend);
				ctx.lineTo (legendwidth, ylegend);
				ctx.stroke();
			}
			ylegend += 20;
			
			document.getElementById("legendtxt" +LALOLibPlotsIndex).innerHTML += plotinfo.legend[p] + "<br>";						
		}
	}
	for ( var pi=0; pi <= LALOLibPlotsIndex; pi++)
		LALOLibPlots[pi].replot();
	
	// ZOOM	
	if(window.addEventListener)
        document.getElementById(plotid).addEventListener('DOMMouseScroll', this.mousezoom, false);//firefox
 
    //for IE/OPERA etc
    document.getElementById(plotid).onmousewheel = this.mousezoom;
	
	LALOLibPlotsIndex++;
}

// Color plot
function colorplot(multiargs) {
	// colorplot(x,y,z) or colorplot(X) or colorplot(..., "cmapname" )

	// Part copied from lalolabworker.js
	
	var minX = Infinity;
	var maxX = -Infinity;
	var minY = Infinity;
	var maxY = -Infinity;
	var minZ = Infinity;
	var maxZ = -Infinity;
	
	var x;
	var y;
	var z;
	var i;

	var t0 =  type( arguments[0] );
	if ( t0 == "matrix" && arguments[0].n == 3 ) {
		x = getCols(arguments[0], [0]);
		y = getCols(arguments[0], [1]);
		z = getCols(arguments[0], [2]);
	}
	else if ( t0 == "matrix" && arguments[0].n == 2 && type(arguments[1]) == "vector" ) {
		x = getCols(arguments[0], [0]);
		y = getCols(arguments[0], [1]);
		z = arguments[1];
	}
	else if (t0 == "vector" && type(arguments[1]) == "vector" && type(arguments[2]) == "vector") {
		x = arguments[0];
		y = arguments[1];
		z = arguments[2];
	}
	else {
		return "undefined";
	}
	
	var minX = min(x);
	var maxX = max(x);
	var minY = min(y);
	var maxY = max(y);
	var minZ = min(z);
	var maxZ = max(z);
	
	var widthX = maxX-minX;
	var widthY = Math.max( maxY-minY, 1);

	maxX += 0.1*widthX;
	minX -= 0.1*widthX;
	maxY += 0.1*widthY;
	minY -= 0.1*widthY;
	
	if ( minY > 0 ) 
		minY = -0.1*maxY;
	
	if ( maxY < 0 ) 
		maxY = -0.1*minY;

	var plotinfo = {"x" : x, "y": y, "z": z, "minX" : minX, "maxX" : maxX, "minY" : minY, "maxY": maxY,  "minZ" : minZ, "maxZ" : maxZ };

	//////// Part from laloplots.html //////////
		
	var plotid = "LALOLibPlot" + LALOLibPlotsIndex;
	var legendwidth = 50;
	
	
	LALOLibOutput.innerHTML += "<br><div style='position:relative;left:0px;top:0px;text-align:left;'> <div><a onmousemove='mouseposition(event," + LALOLibPlotsIndex + ");' onmousedown='mousestartmove(event," + LALOLibPlotsIndex + ");' onmouseup='mousestopmove(event);' onmouseleave='mousestopmove(event);' ondblclick='zoomoriginal(" + LALOLibPlotsIndex + ");'><canvas id='" +plotid + "'  width='500' height='500' style='border: 1px solid black;'></canvas></a></div> <label id='lblposition" + LALOLibPlotsIndex + "'></label> <div style='position: absolute;left: 550px;top: -1em;'><label id='legendmaxZ" + LALOLibPlotsIndex + "' style='font-family:verdana;font-size:80%;'></label><br>  <canvas id='legend" + LALOLibPlotsIndex + "' width='" + legendwidth + "' height='500'></canvas><br><label id='legendminZ" + LALOLibPlotsIndex + "' style='font-family:verdana;font-size:80%;'></label></div> <div id='legendtxt" + LALOLibPlotsIndex + "' style='position: absolute;left: 610px;top: 0;'></div> </div>";
	
	LALOLibPlots[LALOLibPlotsIndex] = new ColorPlot(plotid) ;
	LALOLibPlots[LALOLibPlotsIndex].setScale(plotinfo.minX, plotinfo.maxX, plotinfo.minY, plotinfo.maxY,plotinfo.minZ, plotinfo.maxZ); 
	LALOLibPlots[LALOLibPlotsIndex].view(plotinfo.minX, plotinfo.maxX, plotinfo.minY, plotinfo.maxY); 	
	
	for (var i=0; i < plotinfo.x.length; i++)
		LALOLibPlots[LALOLibPlotsIndex].addPoint(plotinfo.x[i],plotinfo.y[i],plotinfo.z[i]);
	
	LALOLibPlots[LALOLibPlotsIndex].replot();
	
	var legendwidth = 50;
//	plotlegend.innerHTML += plotinfo.maxZ.toFixed(3) + "<br><canvas id='legend'  width='" + legendwidth + "' height='500'></canvas><br>" + plotinfo.minZ.toFixed(3);
	var ctx = document.getElementById("legend" +LALOLibPlotsIndex).getContext("2d");

	var legendcanvas = document.getElementById("legend"+LALOLibPlotsIndex);
	if ( legendcanvas )
		var legendheight = legendcanvas.height;
	else
		var legendheight = 500;

	var y;
	for (var i=0; i< LALOLibPlots[LALOLibPlotsIndex].cmap.length;i++) {
		y = Math.floor(i * legendheight / LALOLibPlots[LALOLibPlotsIndex].cmap.length);
		ctx.fillStyle = "rgb(" + LALOLibPlots[LALOLibPlotsIndex].cmap[i][0] + "," + LALOLibPlots[LALOLibPlotsIndex].cmap[i][1] + "," + LALOLibPlots[LALOLibPlotsIndex].cmap[i][2] + ")";
		ctx.fillRect( 0, legendheight-y, legendwidth , (legendheight / LALOLibPlots[LALOLibPlotsIndex].cmap.length) + 1) ;
	}	
	
	document.getElementById("legendmaxZ" + LALOLibPlotsIndex).innerHTML = plotinfo.maxZ.toPrecision(3);
	document.getElementById("legendminZ" + LALOLibPlotsIndex).innerHTML = plotinfo.minZ.toPrecision(3);
		
	if(window.addEventListener)
        document.getElementById(plotid).addEventListener('DOMMouseScroll', this.mousezoom, false);//firefox
 
    //for IE/OPERA etc
    document.getElementById(plotid).onmousewheel = this.mousezoom;
	
	LALOLibPlotsIndex++;
}

// 3D plot
function plot3(multiargs) {
	// plot3(x,y,z,"style", x2,y2,z2,"style",... )
	
	var data = new Array();
	var styles = new Array();	
	var legends = new Array();		
	
	var p=0; // argument pointer
	var x;
	var y;
	var z;
	var style;
	var i;
	var n;
	var c = 0; // index of current curve
	while ( p < arguments.length)  {
	
		if ( type( arguments[p] ) == "vector" ) {

			if ( p + 2 < arguments.length && type ( arguments[p+1] ) == "vector" && type ( arguments[p+2] ) == "vector" ) {
				// classic (x,y,z) arguments
				x = arguments[p];
				y = arguments[p+1];
				z = arguments[p+2];				
				
				p += 2;
			}
			else {
				return "undefined";
			}
		}
		else if ( type( arguments[p] ) == "matrix" ) {
			// argument = [x, y, z]
			n = arguments[p].length;
			x = new Array(n);
			y = new Array(n);
			z = new Array(n);
			for ( i=0; i < n; i++) {
				x[i] = get(arguments[p], i, 0); 
				y[i] = get(arguments[p], i, 1);				
				z[i] = get(arguments[p], i, 2);					
			}
		}
		else {
			return "undefined";
		}
				
		//Style
		style = undefined;
		if ( p + 1 < arguments.length && type ( arguments[p+1] ) == "string" ) {
			style = arguments[p+1];
			p++;
		}			
		legend = "";	
		if ( p + 1 < arguments.length && type ( arguments[p+1] ) == "string" ) {
			legend = arguments[p+1];
			p++;
		}	

		// Add the curve (x,y,z, style) to plot
		data[c] = new Array();
		for ( i=0; i < x.length; i++) {
			data[c][i] = [x[i], y[i], z[i]]; 			
		}
		styles[c] = style;
		legends[c] = legend;
		
		// Next curve
		c++; 
		p++; // from next argument	
				
	}	
			

	var plotinfo =  { "data" : data, "styles" : styles, "legend": legends };
	
	//////// Part from laloplots.html //////////
	
	var plotid = "LALOLibPlot" + LALOLibPlotsIndex;
	var legendwidth = 50;
	
	LALOLibOutput.innerHTML += '<br><div style="position:relative;left:0px;top:0px;text-align:left;"> <div><a onmousedown="LALOLibPlots[' + LALOLibPlotsIndex + '].mousedown(event);" onmouseup="LALOLibPlots[' + LALOLibPlotsIndex + '].mouseup(event);" onmousemove="LALOLibPlots[' + LALOLibPlotsIndex + '].mouserotation(event);"><canvas id="' + plotid + '" width="500" height="500" style="border: 1px solid black;" title="Hold down the mouse button to change the view and use the mousewheel to zoom in or out." ></canvas></a></div><label id="lblposition' + LALOLibPlotsIndex + '"></label> <div style="position: absolute;left: 550px;top: -1em;"> <canvas id="legend' + LALOLibPlotsIndex + '" width="' + legendwidth + '" height="500"></canvas></div> <div id="legendtxt' + LALOLibPlotsIndex + '" style="position: absolute;left: 610px;top: 0;"></div> </div>';
	
	var ylegend = 20;
	
	// do plot

	LALOLibPlots[LALOLibPlotsIndex] = new Plot3D(plotid) ;
	
	LALOLibPlots[LALOLibPlotsIndex].cameraDistance = 30; 
	LALOLibPlots[LALOLibPlotsIndex].angleX = Math.PI/10;	
	LALOLibPlots[LALOLibPlotsIndex].angleZ = Math.PI/10;
	
	LALOLibPlots[LALOLibPlotsIndex].axisNameX1 = "x";
	LALOLibPlots[LALOLibPlotsIndex].axisNameX2 = "y";		
	LALOLibPlots[LALOLibPlotsIndex].axisNameX3 = "z";		
		
	
	var colors = [1,2,3,4,5,0];
	
	var p;
	var color;

	for (p = 0; p<plotinfo.data.length; p++) {
		
		var linestyle = false;
		var pointstyle = true;
		if ( typeof(plotinfo.styles[p]) == "string" ) {
			if ( plotinfo.styles[p].indexOf(".") >= 0 ) {
				linestyle = false;
				plotinfo.styles[p] = plotinfo.styles[p].replace(".","");
			}
			if ( plotinfo.styles[p].indexOf("_") >= 0 ) {
				pointstyle = false;
				plotinfo.styles[p] = plotinfo.styles[p].replace("_","");
			}
			color = parseColor(plotinfo.styles[p]);
		
			if ( color < 0 )
				color = colors.splice(0,1)[0];		// pick next unused color
			else
				colors.splice(colors.indexOf(color),1); // remove this color
		}
		else 
			color = color = colors.splice(0,1)[0];	// pick next unused color
		
		if ( typeof(color) == "undefined")	// pick black if no next unused color
			color = 0;
	
		for ( i=0; i < plotinfo.data[p].length; i++) {
			if ( pointstyle ) {
				LALOLibPlots[LALOLibPlotsIndex].X.push( plotinfo.data[p][i] );
				LALOLibPlots[LALOLibPlotsIndex].Y.push( color );	
			}
			if ( linestyle && i < plotinfo.data[p].length-1 ) 
				LALOLibPlots[LALOLibPlotsIndex].plot_line(plotinfo.data[p][i], plotinfo.data[p][i+1], "", color);
		}
		
		// Legend
		if ( plotinfo.legend[p] != "" ) {		
			var ctx = document.getElementById("legend" +LALOLibPlotsIndex).getContext("2d");
			setcolor(ctx, color);
			ctx.lineWidth = "3";
			if ( pointstyle ) {
				ctx.beginPath();
				ctx.arc( legendwidth/2 , ylegend, 5, 0, 2 * Math.PI , true);
				ctx.closePath();
				ctx.fill();
			}
			if( linestyle) {
				ctx.beginPath();
				ctx.moveTo ( 0,ylegend);
				ctx.lineTo (legendwidth, ylegend);
				ctx.stroke();
			}
			ylegend += 20;
			
			document.getElementById("legendtxt" +LALOLibPlotsIndex).innerHTML += plotinfo.legend[p] + "<br>";						
		}
	}
	LALOLibPlots[LALOLibPlotsIndex].computeRanges();
	LALOLibPlots[LALOLibPlotsIndex].replot();

	LALOLibPlotsIndex++;
}

// image
function image(X, title) {
	if (type(X) == "vector")  {
		X = mat([X]);
	}
		
	var style;
	var minX = min(X);
	var maxX = max(X);
	var m = X.length;	
	var n = X.n;
	var scale = (maxX - minX) ; 
	
	var i;
	var j;
	var k = 0;
	var data = new Array();
	for ( i=0; i < m; i++) {
		var Xi = X.row(i);
		for ( j=0; j < n; j++) {	// could do for j in X[i] if colormap for 0 is white...
			color =   mul( ( Xi[j] - minX) / scale, ones(3) ) ;
			data[k] = [i/m, j/n, color];
			k++;
		}
	}
	style  = [m,n,minX,maxX];

	var imagedata =  { "data" : data, "style" : style, "title": title };

	////// Part from laloplots.html	
	
	
	var plotid = "LALOLibPlot" + LALOLibPlotsIndex;
	var legendwidth = 50;
	var pixWidth ;
	var pixHeight ;

		// prepare legend
	var ylegend = 20;
	
	// do plot

	
	var i;

	var width = 500; 
	var height = 500; 	

	var title = imagedata.title;
	if(title) {
		LALOLibOutput.innerHTML += "<h3>"+title+"</h3>" + "  ( " + imagedata.style[0] + " by " + imagedata.style[1] + " matrix )";
	}
	
	if ( imagedata.style[1] > width ) {
		width = imagedata.style[1]; 
		plotlegend.style.left = (width+60) +"px";
	}
	if ( imagedata.style[0] > height )
	 	height = imagedata.style[0];
		
	pixWidth = width / imagedata.style[1];
	pixHeight = height / imagedata.style[0];
	
	var legendwidth = 50;
	
	LALOLibOutput.innerHTML += '<div style="position:relative;left:0px;top:0px;text-align:left;"> <div><a onmousemove="mouseimageposition(event,' + LALOLibPlotsIndex + ');"><canvas id="' +plotid + '"  width="' + width + '" height="' + height + '" style="border: 1px solid black;"></canvas></a></div><label id="lblposition' + LALOLibPlotsIndex + '"></label> <div style="position: absolute;left: 550px;top: -1em;">' + imagedata.style[2].toFixed(3) + '<br> <canvas id="legend' + LALOLibPlotsIndex + '" width="' + legendwidth + '" height="500"></canvas> <br>' + imagedata.style[3].toFixed(3) + ' </div>  </div>';

	var x;
	var y;
	var color;
	
	LALOLibPlots[LALOLibPlotsIndex] = imagedata;
	LALOLibPlots[LALOLibPlotsIndex].canvasId = plotid; 
	var canvas = document.getElementById(plotid);
	
  	if (canvas.getContext) {
		var ctx = canvas.getContext("2d");

		for ( i=0; i < imagedata.data.length ; i++) {
			x = canvas.width * LALOLibPlots[LALOLibPlotsIndex].data[i][1];
			y =  canvas.height * LALOLibPlots[LALOLibPlotsIndex].data[i][0] ;
			color = LALOLibPlots[LALOLibPlotsIndex].data[i][2];
		
			ctx.fillStyle = "rgb(" + Math.floor(255*(1-color[0])) + "," + Math.floor(255*(1-color[1])) + "," + Math.floor(255*(1-color[2])) + ")";
			ctx.fillRect( x , y, pixWidth +1,  pixHeight +1); // +1 to avoid blank lines between pixels

		}
	}
	
	// add legend / colormap

	var legend = document.getElementById("legend" +LALOLibPlotsIndex);
	var ctx = legend.getContext("2d");

	for ( i=0; i< 255;i++) {
		y = Math.floor(i * legend.height / 255);
		ctx.fillStyle = "rgb(" + (255-i) + "," + (255-i) + "," + (255-i) + ")";
		ctx.fillRect( 0, y, legendwidth , (legend.height / 255) + 1) ;
	}	
	
	// Prepare mouseposition info
	LALOLibPlots[LALOLibPlotsIndex].pixelWidth = pixWidth; 
	LALOLibPlots[LALOLibPlotsIndex].pixelHeight = pixHeight;
	LALOLibPlotsIndex++;
}



function parseColor( str ) {
	if ( typeof(str) == "undefined") 
		return -1;
		
	var color;
	switch( str ) {
	case "k":
	case "black":
		color = 0;
		break;
	case "blue":
	case "b":
		color = 1;
		break;
	case "r":
	case "red":
		color = 2;
		break;
	case "g":
	case "green":
		color = 3;
		break;
	case "m":
	case "magenta":
		color = 4;
		break;
	case "y":
	case "yellow":
		color = 5;
		break;
	
	default:
		color = -1;
		break;
	}
	return color;
}

function mousezoom ( e, delta , plotidx) {
	if (!e) 
    	e = window.event;
 	
 	e.preventDefault();
	
	if ( typeof(plotidx) == "undefined")
		var plotidx = 0;
	
	if ( typeof(delta) == "undefined") {
		var delta = 0;
		
		// normalize the delta
		if (e.wheelDelta) {
		     // IE and Opera
		    delta = e.wheelDelta / 30;
		} 
		else if (e.detail) { 
		    delta = -e.detail ;
		}
	} 
	else {
		if (e.button != 0 )
			delta *= -1;
	}
		
	var plotcanvas = document.getElementById(LALOLibPlots[plotidx].canvasId);
	var rect = plotcanvas.getBoundingClientRect();
	var x = e.clientX - rect.left;	// mouse coordinates relative to plot
	var y = e.clientY - rect.top;
	LALOLibPlots[plotidx].zoom(1+delta/30,1+delta/30, x, y);	
}
function zoomoriginal(plotidx) {
	LALOLibPlots[plotidx].resetzoom(); 
}
function mouseposition( e , plotidx) {
	var plotcanvas = document.getElementById(LALOLibPlots[plotidx].canvasId);
	var rect = plotcanvas.getBoundingClientRect();

	var xmouse = e.clientX - rect.left;	// mouse coordinates relative to plot
	var ymouse = e.clientY - rect.top;

	if ( LALOLABPLOTMOVING ) {	
		var dx = xmouse - LALOLABPLOTxprev ;
		var dy = ymouse - LALOLABPLOTyprev;
		if ( Math.abs( dx ) > 1 || Math.abs( dy ) > 1 ) {			
			LALOLibPlots[plotidx].translate(dx, dy);
		}
		LALOLABPLOTxprev = xmouse;
		LALOLABPLOTyprev = ymouse;		
	}
	else {		
		var x = xmouse / LALOLibPlots[plotidx].scaleX + LALOLibPlots[plotidx].minX;
		var y = (plotcanvas.height - ymouse ) / LALOLibPlots[plotidx].scaleY + LALOLibPlots[plotidx].minY;
	
		document.getElementById("lblposition" + plotidx).innerHTML = "x = " + x.toFixed(3) + ", y = " + y.toFixed(3);	
	}
}

function mousestartmove( e , plotidx) {
	if ( e.button == 0 ) {
		LALOLABPLOTMOVING = true;
		var plotcanvas = document.getElementById(LALOLibPlots[plotidx].canvasId);
		var rect = plotcanvas.getBoundingClientRect();
		LALOLABPLOTxprev = e.clientX - rect.left;	// mouse coordinates relative to plot
		LALOLABPLOTyprev = e.clientY - rect.top;
	}
	else {
		LALOLABPLOTMOVING = false;
	}
}
function mousestopmove( e ) {
	LALOLABPLOTMOVING = false;
}

function mouseimageposition( e, plotidx ) {
	var plotcanvas = document.getElementById(LALOLibPlots[plotidx].canvasId);
	var rect = plotcanvas.getBoundingClientRect();

	var xmouse = e.clientX - rect.left;	// mouse coordinates relative to plot
	var ymouse = e.clientY - rect.top;

	var n = LALOLibPlots[plotidx].style[1];
	var minX = LALOLibPlots[plotidx].style[2];	
	var maxX = LALOLibPlots[plotidx].style[3];	
	var i = Math.floor(ymouse / LALOLibPlots[plotidx].pixelHeight);
	var j = Math.floor(xmouse / LALOLibPlots[plotidx].pixelWidth );
	if ( j < n ) {
		var val = LALOLibPlots[plotidx].data[i*n + j][2][0]*(maxX - minX) + minX;
	
		document.getElementById("lblposition" + plotidx).innerHTML = "Matrix[ " + i + " ][ " + j + " ] = " + val.toFixed(3);
	}
}
/////////////////////////////////
//// Parser
////////////////////////////////

function lalo( Command ) {
	// Parse command line and execute in current scopes	
	var cmd = laloparse( Command );
	var res = self.eval(cmd); 
	return res; 
}
function laloparse( WorkerCommand ) {
	// Parse Commands
	var WorkerCommandList = WorkerCommand.split("\n");
	var k;
	var cmd = "";
	for (k = 0; k<WorkerCommandList.length; k++) {
		if( WorkerCommandList[k].length > 0 ) {
		  	if ( WorkerCommandList[k].indexOf("{") >= 0 || WorkerCommandList[k].indexOf("}") >= 0) {
		  		// this line includes braces => plain javascript: do not parse it!
		  		cmd += WorkerCommandList[k];
		  		if ( WorkerCommandList[k].indexOf("}") >= 0 ) {
		  			// braces closed, we can end the line
			  		cmd += " ;\n"; 
			  	}				  	
		  	}
		  	else {
		  		// standard lalolab line
		  		cmd += parseCommand(WorkerCommandList[k]) + " ;\n"; 
		  	}
		}
	}
	return cmd; 
}
function parseSplittedCommand( cmd ) {
	//console.log("parsing : " + cmd);
	// !!! XXX should parse unary ops before all the others !!! 
	
	var ops = ["==", "!=", ">=" ,"<=", ">", "<" , "\\" ,":", "+", "-",  ".*", "*", "./" ,  "^", "'"]; // from lowest priority to highest
	var opsFcts = ["isEqual" , "isNotEqual", "isGreaterOrEqual", "isLowerOrEqual", "isGreater" , "isLower", "solve","range", "add", "sub", "entrywisemul", "mul" , "entrywisediv",  "pow", "undefined" ];
	var unaryOpsFcts = ["", "", "", "", "","", "","range","", "minus", "", "" , "",  "", "transpose" ];
	
	var o;
	var i ;
	var k;
	var operandA;
	var operandB;

	for ( o = 0; o < ops.length; o++) {
		
		var splitted_wrt_op = cmd.split(ops[o]);
		
		if ( splitted_wrt_op.length > 1) {			
			if ( removeSpaces(splitted_wrt_op[0]) != "" ) {				
				// there is actually a left-hand side operand
				if( removeSpaces(splitted_wrt_op[1]) != "" ) {
					// and a right-hand side operand
					operandA = parseSplittedCommand(splitted_wrt_op[0]);

					for ( k = 1; k< splitted_wrt_op.length ; k++) {
						operandB = splitted_wrt_op[k];
						operandA =  opsFcts[o] + "(" + operandA +  "," + parseSplittedCommand(operandB) + ")";
					}
					cmd = operandA; 
				}
				else {
					// no right-hand side: like transpose operator
					cmd = unaryOpsFcts[o] + "(" + parseSplittedCommand(splitted_wrt_op[0]) + ")";
				}
			}
			else {
				// no left operand: like minus something...
				
				// Apply unary operator
				operandA = unaryOpsFcts[o] + "(" + parseSplittedCommand(splitted_wrt_op[1]) + ")";
				
				// and then binary operator for the remaining occurences
				for ( k = 2; k< splitted_wrt_op.length ; k++) {
					operandB = splitted_wrt_op[k];
					operandA =  opsFcts[o] + "(" + operandA +  "," + parseSplittedCommand(operandB) + ")";
				}
				cmd = operandA; 
			}
		}
	}
	
	return cmd;
	
}

function parseAssignment ( assignmentStr ) {
	if ( assignmentStr.indexOf("[") < 0 ) {
		// straightforward assignment 
		return assignmentStr; 
	}
	else {
		var assign = removeSpaces(assignmentStr).replace("=","").replace(",","][");
		var middle = assign.indexOf("][");
		var start = assign.indexOf("[");
		var varname = assign.substr(0,start);
		if ( middle >= 0 ) {
			// submatrix assignment
			var rowsrange = assign.substr( start + 1, middle-start-1); 

			// find last "]";
			var end = middle+1;
			while ( assign.indexOf("]",end+1) >= 0)
				end = assign.indexOf("]",end+1);
			
			var colsrange = assign.substr(middle+2, end - (middle+2)); // everything after "]["	and before last "]"	

			// Parse colon ranges
			var rowssplit = rowsrange.split(":");
			if (rowssplit.length == 2 ){
				if ( rowssplit[0] =="" && rowssplit[1] =="" )
					rowsrange = "[]";
				else
					rowsrange = "range(" + rowssplit[0] + "," + rowssplit[1] + ")";
			}
			else if ( rowssplit.length == 3)
				rowsrange = "range(" + rowssplit[0] + "," + rowssplit[2] + "," + rowssplit[1] + ")";
			
			var colssplit = colsrange.split(":");
			if (colssplit.length == 2 ) {
				if ( colssplit[0] =="" && colssplit[1] =="" )
					colsrange = "[]";
				else
					colsrange = "range(" + colssplit[0] + "," + colssplit[1] + ")";
			}
			else if ( colssplit.length == 3)
				colsrange = "range(" + colssplit[0] + "," + colssplit[2] + "," + colssplit[1] + ")";

			return "set( " + varname + "," + rowsrange + "," + colsrange + ", ";
		}
		else {
			// subvector assignment
			
			// find last "]";
			var end = start;
			while ( assign.indexOf("]",end+1) >= 0)
				end = assign.indexOf("]",end+1);
			
			var rowsrange = assign.substr( start + 1, end-start-1); 
			
			// Parse colon ranges
			var rowssplit = rowsrange.split(":");
			if (rowssplit.length == 2 ){
				if ( rowssplit[0] =="" && rowssplit[1] =="" )
					rowsrange = "[]";
				else
					rowsrange = "range(" + rowssplit[0] + "," + rowssplit[1] + ")";
			}
			else if ( rowssplit.length == 3)
				rowsrange = "range(" + rowssplit[0] + "," + rowssplit[2] + "," + rowssplit[1] + ")";

			return "set( " + varname + "," + rowsrange + ", ";
		}
	}
}

function parseBrackets( cmdString ) {
	// Parse brackets => get matrix entries
	
	var delimiters = ["[", "(",",",";",")", "\\", "+", "-", "*", "/", ":", "^", "'", "=", ">", "<", "!"];
	
	cmdString = cmdString.split("][").join(","); // replace ][ by , and ] by )
	
	var cmd = cmdString.split("");	// string to array of char
	
	var i; 
	var j;
	var k;
	var l;
	var lhs;
	
	// For the entire string:	
	i = cmd.length - 1;
	while ( i >= 0 ) {
		// Search for the right-most opening bracket:
		while ( i >= 0 && cmd[i] != "[" ) 
			i--;
		
		if ( i >= 0 ) {
			// found a bracket,  find its corresponding closing bracket
			j = i+1;
			while ( j < cmd.length && cmd[j] != "]" ) 
				j++;

			if ( j < cmd.length ) {		

				// then determine its left-hand side operand:
				l = 0;
				k = 0;
				while ( k < i ) {
					if ( delimiters.indexOf(cmd[k]) >= 0)
						l = k+1;
					k++;
				}
				lhs = cmd.slice(l,i).join(""); // should be LHS as string or "" if l >= i

				if ( removeSpaces(lhs) == "" ) {
					// if the LHS operand is empty, leave the brackets untouched 
					cmd[i] = "#"; // (replace by # and $ re-replace at the end by a matrix creation)
					
					// look for semicolon within brackets: 
					k = i+1; 
					var rowwise = false; 
					var colwise = false; 
					while (  k < j ) {
						if( cmd[k] == "," ) {
							//colwise = true;
						}
						
						if ( cmd[k] == ";" ) {
							rowwise = true; // mark for rowwise mat
							
							if ( colwise ) {
								cmd.splice(k,1, ["@", ","] ); // end previous row vector, replace by comma  
								colwise = false;
							}
							else {
								cmd[k] = ","; // simply replace by comma
							}
						}
						
						
						k++; 
					} 
					
					if ( rowwise ) 
						cmd[j] = "$";
					else
						cmd[j] = "@";
					
				}
				else {						
					// if not empty, implement a GET
					cmd[l]="get(" + lhs ;
					for ( k = l+1; k < i; k++)
						cmd[k] = "";
					cmd[i] = ",";
					cmd[j] = ")";					
				}
			}
			else {
				return undefined; // error no ending bracket;
			}
		}
		i--;
	}
		
	var cmdparsed = cmd.join("").split("#").join("mat([").split("$").join("], true)").split("@").join("])");
	//console.log(cmdparsed);
	return cmdparsed;
}

function parseCommand( cmdString ) {

	// Remove comments at the end of the line
	var idxComments = cmdString.indexOf("//");
	if ( idxComments >= 0 )
		cmdString = cmdString.substr(0,idxComments);
	

	// Parse "=" sign to divide between assignement String and computeString
	var idxEqual = cmdString.split("==")[0].split("!=")[0].split(">=")[0].split("<=")[0].indexOf("=");
	if ( idxEqual > 0 )  {
		var assignmentStr = parseAssignment( cmdString.substr(0,idxEqual + 1) );
		var computeStr = cmdString.substr(idxEqual+1);
		
		// Check for simple assignments like A = B to force copy
		if ( assignmentStr.indexOf("set(") < 0 && typeof(self[removeSpaces(computeStr)]) != "undefined" ) { //self.hasOwnProperty( removeSpaces(computeStr) ) ) { // self.hasOwnProperty does not work in Safari workers....
		
			// computeStr is a varaible name
			if ( !isScalar(self[ removeSpaces(computeStr) ] ) ) { 
				// the variable is a vector or matrix
				var FinalCommand = assignmentStr + "matrixCopy(" + computeStr + ")";
				console.log(FinalCommand);
				return FinalCommand;
			}
		}		
	}
	else {
		var assignmentStr = "";		
		var computeStr = cmdString;
	}
	
	// parse brackets:
	var cmd =  parseBrackets( computeStr ).split(""); // and convert string to Array

	// Parse delimiters 
	var startdelimiters = ["(","[",",",";"];
	var enddelimiters = [")","]",",",";"];
	var i;
	var j;
	var k;
	var parsedContent = "";
	var parsedCommand = new Array(cmd.length);

	var map = new Array(cmd.length ) ;
	for ( k=0;k<cmd.length;k++) {
		map[k] = k;
		parsedCommand[k] = cmd[k];
	}
	
	i = cmd.length - 1; 
	while ( i >= 0 ) {
		// Find the most right starting delimiter
		while ( i >= 0 && startdelimiters.indexOf(cmd[i]) < 0 )
			i--;
		if ( i >= 0 ) {
			// found a delimiter, search for the closest ending delimiter
			j = i+1;
			while ( j < cmd.length && enddelimiters.indexOf(cmd[j] ) < 0 ) {				
				j++;
			}
			if ( j < cmd.length ) {			
				// starting delimiter is at cmd[i] and ending one at cmd[j]
				
				// parse content within delimiters
				parsedContent = parseSplittedCommand( parsedCommand.slice(map[i]+1,map[j]).join("") ) ;
				// and replace the corresponding content in the parsed command
				parsedCommand.splice (map[i]+1, map[j]-map[i]-1, parsedContent ) ;
				
				// remove delimiters from string to be parsed 
				if ( cmd[i] != "," ) 
					cmd[i] = " ";	// except for commas that serve twice (once as start once as end)
				cmd[j] = " ";
								
				// map position in the original cmd to positions in the parsedCommand to track brackets
				for ( k=i+1; k < j;k++)
					map[k] = map[i]+1;
				var deltamap = map[j] - map[i] - 1;
				for ( k=j; k < cmd.length;k++)
					map[k] += 1 - deltamap; 
					
				/*console.log(parsedCommand);
				console.log(cmd.join(""));
				console.log(map);
				console.log(i + " : " + j);*/
			}
			else {
				return "undefined";
			}				
		}
		i--;
	}
	var FinalCommand = assignmentStr + parseSplittedCommand(parsedCommand.join(""));
	
	// Parse brackets => get matrix entries
	//cmdString = cmdString.split("][").join(",").split("]").join(")");	// replace ][ by , and ] by )
	// consider [ as a left-hand unary operator 
//	cmd = "get(" + parseSplittedCommand(splitted_wrt_op[0]) + ")";

	
	
	if ( assignmentStr.substr(0,4) == "set(" ) 
		FinalCommand  += " )";

	FinalCommand = parseRangeRange(	FinalCommand );

	console.log(FinalCommand);
	return FinalCommand;
}

function parseRangeRange( cmd ) {
	// parse complex ranges like 0:0.1:4
	var elems = cmd.split("range(range(");
	var i;
	var j;
	var tmp;
	var args;
	var incargs;
	var endargs;
	for ( i = 0; i< elems.length - 1 ; i++) {
	
//		elems[i+1] = elems[i+1].replace(")","");	
		
		// ivert second and third arguments to get range(start, end, inc) from start:inc:end
		args = 	elems[i+1].split(",");
		tmp = args[2].split(")"); // keep only the content of the range and not the remaining commands
		endargs = tmp[0];
		j = 0;	// deal with cases like end="minus(4)" where the first closing bracket is not at the complete end
		while ( tmp[j].indexOf("(") >= 0 ) {
			endargs = endargs + ")" + tmp[j+1]; 
			j++;
		}
			
		incargs = args[1].substr(0,args[1].length-1); // remove ")" 
		args[1] = endargs;
		//endargs[0] = incargs;
		args[2] = incargs + ")" + tmp.slice(j+1).join(")");
		elems[i+1] = args.join(",");
	}
	return elems.join("range(");//replace range(range( by range(
}

function removeSpaces( str ) {
	return str.split(" ").join("");
}

////////////////////////////
/// Lab 
////////////////////////////
function MLlab ( id , path ) {
	var that = new Lalolab ( id, true, path);	
	return that;
}
function Lalolab ( id, mllab , path ) {
	// constructor for a Lab with independent scope running in a worker
	this.id = id;
	
	this.callbacks = new Array(); 	
	
	// Create worker with a Blob  to avoid distributing lalolibworker.js 
	// => does not work due to importScripts with relative path to the Blob unresolved (or cross-origin)
	
	if ( typeof(path) == "undefined" )
		var path = "http://mlweb.loria.fr/";
	else {
		if (path.length > 0 && path[path.length-1] != "/" )
			path = [path,"/"].join("");
	}
		
	if ( typeof(mllab) != "undefined" && mllab ) {
		this.worker = new Worker(path+"mlworker.js"); // need mlworker.js in same directory as web page
		this.labtype = "ml";
		/* Using a Blob to avoid distributing mlworker.js: 
		 	does not work because of importScripts from cross origin...
		var workerscript = "importScripts(\"ml.js\");\n onmessage = function ( WorkerEvent ) {\n	var WorkerCommand = WorkerEvent.data.cmd;var mustparse = WorkerEvent.data.parse; \n if ( mustparse )\n	var res = lalo(WorkerCommand);\n 	else {\n	if ( WorkerCommand == \"load_mat\" ) {\n	if ( type(WorkerEvent.data.data) == \"matrix\" )\n var res = new Matrix(WorkerEvent.data.data.m,WorkerEvent.data.data.n,WorkerEvent.data.data.val, true);\nelse\n 	var res = mat(WorkerEvent.data.data, true);\n	eval(WorkerEvent.data.varname + \"=res\");\n}\n else\n var res = self.eval( WorkerCommand ) ;\n}\n try {\n	postMessage( { \"cmd\" : WorkerCommand, \"output\" : res } );\n} catch ( e ) {\n try {\n postMessage( { \"cmd\" : WorkerCommand, \"output\" : res.info() } );\n	} catch(e2) { \n postMessage( { \"cmd\" : WorkerCommand, \"output\" : undefined } );\n}\n}\n}";
		var blob = new Blob([workerscript], { "type" : "text/javascript" });
		var blobURL = window.URL.createObjectURL(blob);
		console.log(blobURL);
		this.worker = new Worker(blobURL);*/
	}
	else {
		this.worker = new Worker(path+"lalolibworker.js"); // need lalolibworker.js in same directory as web page
		this.labtype = "lalo";
	}
	this.worker.onmessage = this.onresult; 
	this.worker.parent = this;
}
Lalolab.prototype.close = function ( ) {
	this.worker.terminate();
	this.worker.parent = null;// delete circular reference
}
Lalolab.prototype.onprogress = function ( ratio ) {
	// do nothing by default; 
	// user must set lab.onprogress = function (ratio) { ... } to do something
}
Lalolab.prototype.onresult = function ( WorkerEvent ) {
//	console.log(WorkerEvent, ""+ this.parent.callbacks);
	if ( typeof(WorkerEvent.data.progress) != "undefined" ) {
		this.parent.onprogress( WorkerEvent.data.progress ) ;
	}
	else {
		var cb =  this.parent.callbacks.splice(0,1)[0] ; // take first callback from the list
		if ( typeof(cb) == "function" ) {
			var WorkerCommand = WorkerEvent.data.cmd;
			var WorkerResult = WorkerEvent.data.output;
			cb(	WorkerResult, WorkerCommand, this.parent.id ); // call the callback if present
		}
	}
}
Lalolab.prototype.do = function ( cmd , callback ) {
	// prepare callback, parse cmd and execute in worker
	this.callbacks.push(  callback  ) ;	
	this.worker.postMessage( {cmd: cmd, parse: true} );	 
}
Lalolab.prototype.exec = function ( cmd , callback ) {
	// prepare callback, and execute cmd in worker
	this.callbacks.push( callback ); 
	this.worker.postMessage( {cmd: cmd, parse: false} );	
}
Lalolab.prototype.parse = function ( cmd , callback ) {
	// prepare callback, parse cmd and execute in worker
	this.callbacks.push( callback ); 
	this.worker.postMessage( {cmd: cmd, parse: false} );	 
}
Lalolab.prototype.load = function ( data , varname, callback ) {
	// load data in varname
	this.callbacks.push(  callback  ) ;	
	if ( typeof(data) == "string" ){
		this.worker.postMessage( {"cmd" : varname + "= load_data (\"" + data + "\")", parse: false} );
	}
	else {
		this.worker.postMessage( {"cmd" : "load_mat", data: data, varname: varname, parse: false} );
	}			
}
Lalolab.prototype.import = function ( script, callback ) {
	// load a script in lalolib language
	this.do('importLaloScript("' + script + '")', callback);	
}
function importLaloScript ( script ) {
	// load a script in lalolib language in the current Lab worker
	var xhr = new XMLHttpRequest();
	xhr.open('GET', script, false);
	xhr.send();
	var cmd = xhr.responseText;
 	return lalo(cmd); 
}
Lalolab.prototype.importjs = function ( script, callback ) {
	// load a script in javascript
	this.exec("importScripts('" + script + "');", callback); 
}
Lalolab.prototype.getObject = function ( varname, callback ) {
	this.exec("getObjectWithoutFunc(" + varname +")", function (res) {callback(renewObject(res));} );
}

function getObjectWithoutFunc( obj ) {
	// Functions and Objects with function members cannot be sent 
	// from one worker to another...
	
	if ( typeof(obj) != "object" ) 
		return obj;
	else {
		var res = {};

		for (var p in obj ) {
			switch( type(obj[p]) ) {
			case "vector": 
				res[p] = {type: "vector", data: [].slice.call(obj[p])};
				break;
			case "matrix":
				res[p] = obj[p];
				res[p].val = [].slice.call(obj[p].val);
				break;
			case "spvector":
				res[p] = obj[p];
				res[p].val = [].slice.call(obj[p].val);
				res[p].ind = [].slice.call(obj[p].ind);
				break;
			case "spmatrix":
				res[p] = obj[p];
				res[p].val = [].slice.call(obj[p].val);
				res[p].cols = [].slice.call(obj[p].cols);
				res[p].rows = [].slice.call(obj[p].rows);
				break;
			case "undefined":
				res[p] = obj[p];
				break;
			case "function":
				break;
			case "Array":
				res[p] = getObjectWithoutFunc( obj[p] );
				res[p].type = "Array";
				res[p].length = obj[p].length;
				break;
			default:
				res[p] = getObjectWithoutFunc( obj[p] );
				break;			
			}	
		}
		return res;
	}
}
function renewObject( obj ) {
	// Recreate full object with member functions 
	// from an object created by getObjectWithoutFunc()

	var to = type(obj);
	switch( to ) {
		case "number":
		case "boolean":
		case "string":
		case "undefined":
			return obj;
			break;
		case "vector":
			return new Float64Array(obj.data);
			break;
		case "matrix":
			return new Matrix(obj.m, obj.n, obj.val);
			break;
		case "spvector":
			return new spVector(obj.length,obj.val,obj.ind);
			break;
		case "spmatrix":
			return new spMatrix(obj.m, obj.n, obj.val, obj.cols, obj.rows);
			break;
		case "object":
			// Object without type property and thus without Class		
			var newobj = {}; 
			for ( var p in obj ) 
				newobj[p] = renewObject(obj[p]);
			return newobj;
			break;
		case "Array":
			var newobj = new Array(obj.length);
			for ( var p in obj ) 
				newobj[p] = renewObject(obj[p]);
			return newobj;
		default:
			// Structured Object like Classifier etc... 
			// type = Class:subclass
			var typearray = obj.type.split(":");
			var Class = eval(typearray[0]);
			if ( typearray.length == 1 ) 
				var newobj = new Class(); 
			else 
				var newobj = new Class(typearray[1]);
			for ( var p in obj ) 
				newobj[p] = renewObject(obj[p]);
				
			// deal with particular cases: 
			// Rebuild kernelFunc 
			if (typearray[1] == "SVM" || typearray[1] == "SVR" ) {				
				newobj["kernelFunc"] = kernelFunction(newobj["kernel"], newobj["kernelpar"], type(newobj["SV"]) == "spmatrix"?"spvector":"vector");
			}
			if (typearray[1] == "KernelRidgeRegression" ) {
				newobj["kernelFunc"] = kernelFunction(newobj["kernel"], newobj["kernelpar"], type(newobj["X"]) == "spmatrix"?"spvector":"vector");
			}
			
			return newobj;
			break;
	}
}

function load_data ( datastring ) {

	// convert a string into a matrix data 
	var i;
	var cmd = "mat( [ "; 
	var row;
	var rows = datastring.split("\n");
	var ri ;
	for ( i=0; i< rows.length - 1; i++) {
		ri = removeFirstSpaces(rows[i]);
		if ( ri != "" ) {
			row = ri.replace(/,/g," ").replace(/ +/g,",");
			cmd += "new Float64Array([" + row + "]) ,";
		}
	}
	ri = removeFirstSpaces(rows[rows.length-1]);
	if ( ri != "" ) {
		row = ri.replace(/,/g," ").replace(/ +/g,",");
		cmd += "new Float64Array([" + row + "]) ] , true) ";
	}
	else {
		cmd = cmd.substr(0,cmd.length-1); // remove last comma
		cmd += "] , true) ";
	}
		
	return eval(cmd);
	
}

function removeFirstSpaces( str ) {
	//remove spaces at begining of string
	var i = 0;
	while ( i < str.length && str[i] == " " )
		i++;
	if ( i<str.length ) {
		// first non-space char at i
		return str.slice(i);	
	}
	else 
		return "";
}

//// progress /////////////////////
function notifyProgress( ratio ) {
	postMessage( { "progress" : ratio } );
	console.log("progress: " + ratio);
}



//////////////////////////
//// CONSTANTS and general tools
///////////////////////////
var LALOLIB_ERROR = ""; 

const EPS = 2.2205e-16;

function isZero(x) {
	return (Math.abs(x) < EPS ) ;
}
function isInteger(x) {
	return (Math.floor(x) == x ) ;
}

function tic( T ) {
	if ( typeof(TICTOCstartTime) == "undefined" )
		TICTOCstartTime = new Array();
	if (typeof(T) == "undefined")
		var T = 0;
	TICTOCstartTime[T] = new Date();
}
function toc ( T ) {
	if ( typeof(T) == "undefined" )
		var T = 0;
	if ( typeof(TICTOCstartTime) != "undefined" && typeof(TICTOCstartTime[T]) != "undefined" ) {		
		// Computing time
		var startTime = TICTOCstartTime[T];
		var endTime = new Date();
		var time = ( endTime - startTime) / 1000;  // in seconds
		return time;
	}
	else
		return undefined;
}
/**
 * @return {string} 
 */
function type( X ) {
	if ( X == null )
		return "undefined";
	else if ( X.type )
 		return X.type;	 			 	
 	else {
	 	var t = typeof( X );
		if ( t == "object") {
			if ( Array.isArray(X) ) {
				if ( isArrayOfNumbers(X) )
			 		return "vector";	// for array vectors created by hand
			 	else 
			 		return "Array";
			}
			else if ( X.buffer ) 
		 		return "vector"; // Float64Array vector
		 	else 
		 		return t;
		}
		else 
			return t;		 
	}
}
/**
 * @param {Array}
 * @return {boolean} 
 */
function isArrayOfNumbers( A ) {
	for (var i=0; i < A.length; i++)
		if ( typeof(A[i]) != "number" )
			return false;
	return true;
}
function isScalar( x ) {
	switch( typeof( x ) ) {
		case "string":
		case "number":
		case "boolean":
			return true;
			break;		
		default:
			if (type(x) == "Complex")
				return true;
			else
				return false;
			break;
	}
}

/**
 * @param {Float64Array}
 * @return {string} 
 */
function printVector( x ) {
	const n = x.length;
	var str = "[ ";
	var i = 0;
	while ( i < n-1 && i < 5 ) {
		str += (isInteger( x[i] ) ? x[i] : x[i].toFixed(3) ) + "; ";
		i++;
	}
	if ( i == n-1 )
		str += (isInteger( x[i] ) ? x[i] : x[i].toFixed(3) ) + " ]" ;
	else 
		str += "... ] (length = " + n + ")";

	return str;	
}


//////////////////////////////
// Matrix/vector creation
//////////////////////////////
/**
 * @constructor
 * @struct
 */
function Matrix(m,n, values) {
	
	/** @const */ this.length = m;
	/** @const */ this.m = m;
	/** @const */ this.n = n;
	/** @const */ this.size = [m,n];
	/** @const */ this.type = "matrix";
	
	if ( arguments.length == 2)
		this.val = new Float64Array( m * n ); // simple m x n zeros
	else if (arguments.length == 3)
		this.val = new Float64Array( values ); // m x n filled with values with copy
	else if (arguments.length == 4)
		this.val =  values ; // m x n filled with values without copy
}

Matrix.prototype.get = function ( i,j) {
	return this.val[i*this.n + j]; 
}
Matrix.prototype.set = function ( i,j, v) {
	this.val[i*this.n + j] = v; 
}
/**
 * return a pointer-like object on a row in a matrix, not a copy!
 * @param {number}
 * @return {Float64Array} 
 */
Matrix.prototype.row = function ( i ) {
	return this.val.subarray(i*this.n, (i+1)*this.n);
}

/**
 * return a copy of the matrix as an Array of Arrays
 * (do not do this with too many rows...)
 * @return {Array} 
 */
Matrix.prototype.toArray = function ( ) {
	var A = new Array(this.m);
	var ri = 0;
	for ( var i=0; i < this.m; i++) {
		A[i] = new Array(this.n);
		for ( var j=0; j < this.n; j++)
			A[i][j] = this.val[ri + j];
		ri += this.n;
	}	
	return A;
}
/**
 * return a view (not a copy) on the matrix as an Array of Float64Array 
 * (do not do this with too many rows...)
 * @return {Array} 
 */
Matrix.prototype.toArrayOfFloat64Array = function ( ) {
	var A = new Array(this.m);
	for ( var i=0; i < this.m; i++)
		A[i] = this.val.subarray(i*this.n, (i+1)*this.n);
		
	return A;
}

function array2mat( A ) {
	return mat(A, true);
}
function array2vec( a ) {
	return vectorCopy(a);
}
function vec2array( a ) {
	return Array.apply([], a);
}


function size( A, sizealongdimension ) {
	var s;
	switch( type(A) ) {
	case "string":
	case "boolean":
	case "number":
	case "Complex":
		s = [1,1];
		break;
	case "vector":
	case "spvector":
	case "ComplexVector":
		s = [A.length, 1];
		break;
	case "matrix":
	case "spmatrix":
	case "ComplexMatrix":	
		s = A.size; 
		break;
	case "object":
		s = [1,1];
		break;
	default: 
		s = [1,1]; 
		//error( "Cannot determine size of object" );
		break;
	}
	
	if ( typeof(sizealongdimension) == "undefined" ) 
		return s;
	else
		return s[sizealongdimension-1];	

}

function ones(rows, cols) {
	// Create a matrix or vector full of ONES 
	if ( arguments.length == 1 || cols == 1 ) {
		var v = new Float64Array(rows);
		for (var i = 0; i< rows; i++) 
			v[i] = 1;
		return v;
	} 
	else {
		var M = new Matrix(rows, cols); 
		const mn = rows*cols; 
		for (var i = 0; i< mn; i++) {
			M.val[i] = 1;
		}
		return M;
	}
}
// Use zeros( m, n) 
function zeros(rows, cols) {
	// Create a matrix or vector of ZERO 
	if ( arguments.length == 1 || cols == 1 ) { 
		return new Float64Array(rows);
	} 
	else {
		return new Matrix(rows, cols); 
	}	
}

function eye(m,n) {
	if ( typeof(n) == "undefined") 
		var n = m;
	if ( m == 1 && n == 1)
		return 1;
		
	var I = zeros(m,n);
	const e = (m<n)?m:n;
	for ( var i = 0; i< e; i ++) {
		I.val[i*(n+1)] = 1;
	}
	
	return I;
}

function diag( A ) {
	var i;
	var typeA = type(A);
	if (typeA == "vector" ) {
		var M = zeros(A.length,A.length);
		var j = 0;
		const stride = A.length+1;
		for ( i=0; i < A.length; i++) {
				M.val[j] = A[i];
				j += stride;
		}
		return M;
	}
	else if ( typeA =="matrix") {
		var n = Math.min(A.m, A.n);
		var v = new Float64Array(n);
		var j = 0;
		const stride2 = A.n+1;
		for ( i =0; i< n;i++) {
			v[i] = A.val[j];	
			j+=stride2;
		}
		return v;
	}
	else if (typeA == "ComplexVector" ) {
		var M = new ComplexMatrix(A.length,A.length);
		var j = 0;
		const stride = A.length+1;
		for ( i=0; i < A.length; i++) {
				M.re[j] = A.re[i];
				M.im[j] = A.im[i];
				j += stride;
		}
		return M;
	}
	else if ( typeA == "ComplexMatrix") {
		var n = Math.min(A.m, A.n);
		var v = new ComplexVector(n);
		var j = 0;
		const stride2 = A.n+1;
		for ( i =0; i< n;i++) {
			v.re[i] = A.re[j];	
			v.im[i] = A.im[j];
			j+=stride2;
		}
		return v;
	}
}

/**
 * @param {Matrix}
 * @return {Float64Array} 
 */
function vec( A ) {
	return new Float64Array(A.val); 
}

function matrixCopy( A ) {
	var t = type(A) ;
	switch(t) {
	case "vector":
		return vectorCopy(A);
		break;
	case "ComplexVector":
		return new ComplexVector(A);
		break;
	case "matrix":
		return new Matrix(A.m, A.n, A.val);
		break;
	case "ComplexMatrix":
		return new ComplexMatrix(A);
		break;
	case "Array":
		return arrayCopy ( A ) ;
		break;
	case "spvector":
	case "spmatrix":
		return A.copy();
		break;
	default:
		error("Error in matrixCopy(A): A is not a matrix nor a vector.");
		return undefined;
		break;
	}
}
/**
 * @param {Float64Array}
 * @return {Float64Array} 
 */
function vectorCopy( a ) {
	return new Float64Array( a );
}
/** Vector copy into another existing vector ( y = x )
 * (saves memory allocation)
 * @param {Float64Array}
 * @param {Float64Array}
 */
function vectorCopyInto (x, y) {
	y.set(x); 
}

/**
 * @param {Array}
 * @return {Array} 
 */
function arrayCopy( A ) {
	var res = new Array(A.length); 
	for ( var i = 0; i < A.length; i++ )
		if ( isScalar(A[i]) )
			res[i] = A[i];	//does not copy 2D Arrays... 
		else
			res[i] = matrixCopy( A[i] ) ;
	return res;
}

/**
 * Return enlarged matrix with one more row of zeros
 * NOTE: both matrices share the same storage and should not be used independently
 * so better use: A = appendRow(A); or just appendRow(A);
 * @param{Matrix}
 * @return{Matrix}
 */
function appendRow ( A ) {
	var Aa = zeros(A.m+1,A.n);
	Aa.val.set(A.val);
	return Aa;
}

/**
 * Reshape the dimensions of a vector/matrix
 * @param{{Float64Array|Matrix}}
 * @param{number}
 * @param{number}
 * @return{{Float64Array|Matrix}}
 */
function reshape ( A, m, n ) {
	var R = undefined;
	var tA = type( A );
	if ( tA == "vector" ) {
		if ( m*n != A.length ) {
			error("Error in reshape(a,m,n): a.length = " + A.length + " != m*n");
		}
		else {
			R = new Matrix(m,n,A);
		}
	}
	else if ( tA == "matrix" ) {
		if ( m*n != A.m*A.n ) {
			error("Error in reshape(A,m,n): A.m * A.n = " + A.m*A.n + " != m*n");
		}
		else {
			if ( n == 1 )
				R = vectorCopy(A.val);
			else
				R = new Matrix(m,n,A.val);			
		}
	}
	else
		error("Error in reshape(A): A is neither a vector nor a matrix.");
	return R;
}



////////////////////////
// slicing functions
////////////////////////

/*
	GET function : returns a copy of a subset of entries
	
	For MATRICES:

	get ( M, rows, cols ) => submatrix of M 
	get ( M, rows ) 	  => subset of rows from M (equiv to rows(M,rows) )
	get ( M, [], cols )   => subset of cols (equiv to cols(M, cols) )
	get ( M, i, j)		  => M[i][j] converted to dense format (0 instead of undefined)
	get ( M ) 			  => M in dense format  (with 0 instead of undefined)
	
	For VECTORS:

	get ( v, rows ) 	  => subvector from v (equiv to rows(v,rows) )
	get ( v, i )		  => v[i] converted to dense format (0 instead of undefined)
	get ( v ) 			  => v in dense format  (with 0 instead of undefined)	

*/
function get ( A , rowsrange, colsrange) {

	var typerows = typeof(rowsrange);
	var typecols = typeof(colsrange);
	
	if (arguments.length == 1 ) 
		return matrixCopy(A);
	
	var typeA = type ( A );
	if ( typeA == "vector" ) {
			
		if ( typerows == "number" ) {
			if (rowsrange >= 0 && rowsrange < A.length)
				return A[rowsrange];	// get v[i]			
			else {
				error("Error in a[i] = get(a,i): Index i="+rowsrange+" out of bounds [0,"+(A.length-1)+"]");
				return undefined;
			}
		}
		else {
			return getSubVector(A, rowsrange);
		}	
	}
	else if ( typeA == "matrix") {		
		
		if ( typerows == "number" )
			rowsrange = [rowsrange];

		if ( typecols == "number" )
			colsrange = [colsrange];

		if ( rowsrange.length == 1 && colsrange.length == 1 ) 
			return A.val[rowsrange[0] * A.n + colsrange[0]];	// get ( A, i, j)			

		if ( rowsrange.length == 0 ) 				
			return getCols(A,colsrange);// get(A,[],4) <=> cols(A,4)
		
		if (colsrange.length == 0 ) 			
			return getRows(A, rowsrange);// get(A,3,[]) <=> rows(A,3)
			
		// otherwise:
		return getSubMatrix(A, rowsrange, colsrange);
		
	}
	else if ( typeA == "Array" ) {
		if ( typerows == "number" )
			return A[rowsrange]; 
		else
			return getSubArray(A, rowsrange);
	}
	else if ( typeA == "spmatrix") {		
		
		if ( typerows == "number" )
			rowsrange = [rowsrange];

		if ( typecols == "number" )
			colsrange = [colsrange];

		if ( rowsrange.length == 1 && colsrange.length == 1 ) 
			return A.get(rowsrange[0], colsrange[0]);   // get ( A, i, j)			

		if ( rowsrange.length == 1 && A.rowmajor )
			return A.row(rowsrange[0]);
		if ( colsrange.length == 1 && !A.rowmajor )
			return A.col(colsrange[0]);
		
		if (colsrange.length == 0 ) 			
			return spgetRows(A, rowsrange);
		if ( rowsrange.length == 0 ) 				
			return spgetCols(A,colsrange);
		
		// TODO
	}
	else if ( typeA == "spvector" ) {
			
		if ( typerows == "number" ) 
			return A.get( rowsrange );	// get v[i]					
		else 
			return getSubspVector(A, rowsrange);//TODO		
	}
	else if ( typeA == "ComplexVector") {
		if ( typerows == "number" ) 
			return A.get( rowsrange );	// get v[i]	
		else
			return A.getSubVector(rowsrange);
	}	
	else if ( typeA == "ComplexMatrix") {		
		
		if ( typerows == "number" )
			rowsrange = [rowsrange];

		if ( typecols == "number" )
			colsrange = [colsrange];
		
		if ( rowsrange.length == 1 && colsrange.length == 1 ) 
			return A.get(i,j);

		if ( rowsrange.length == 0 ) 				
			return A.getCols(colsrange);// get(A,[],4) <=> cols(A,4)
		
		if (colsrange.length == 0 ) 			
			return A.getRows(rowsrange);// get(A,3,[]) <=> rows(A,3)
			
		// otherwise:
		return A.getSubMatrix(rowsrange, colsrange);
	}
	return undefined;
}
function getSubMatrix(A, rowsrange, colsrange) {
	var n = colsrange.length;
	var i;
	var j;
	var res;
	if ( n == 1 ) {
		 res = new Float64Array(rowsrange.length);
		 for (i= 0; i< rowsrange.length ; i++) {
		 	res[i] = A.val[rowsrange[i] * A.n + colsrange[0]];
		 }
	}
	else {
		res = new Matrix(rowsrange.length, n);
		var r = 0;
		
		for (i= 0; i< rowsrange.length ; i++) {			
			var rA = rowsrange[i]*A.n;
			for ( j=0; j < n; j++) {
				res.val[r+j] = A.val[rA + colsrange[j]];
			}
			r += n;
		}
	}
	return res;
}

function getRows(A, rowsrange) {
	var n = rowsrange.length;
	if ( n > 1 ) {
		var res = new Matrix(n, A.n);
		var r=0;
		for ( var i = 0; i < n; i++) {
			for (var j=0; j < A.n; j++)
				res.val[r + j] = A.val[rowsrange[i]*A.n + j]; 
			r += A.n;
		}
		return res;
	}
	else
		return vectorCopy(A.val.subarray( rowsrange[0]*A.n, rowsrange[0]*A.n + A.n));
}
function getCols(A, colsrange) {
	var m = A.m;
	var n = colsrange.length;
	if( n > 1 ) {
		var res = new Matrix(m, n);
		var r = 0;
		var rA = 0;
		for ( var i = 0; i < m; i++) {
			for ( var j = 0; j < n; j++) 
				res.val[r + j] = A.val[rA + colsrange[j]];
				
			r += n;
			rA += A.n;
		}
		return res;
	}
	else {
		var res = new Float64Array(m);
		var r = 0;
		for ( var i = 0; i < m; i++) {
			res[i] = A.val[r + colsrange[0]];
			r += A.n;
		}
		return res;
	}
}
/**
 * @param {Float64Array}
 * @param {Array}
 * @return {Float64Array} 
 */
function getSubVector(a, rowsrange) {
	const n = rowsrange.length;
	var res= new Float64Array( n );
	for (var i = 0; i< n; i++) {
		res[i] = a[rowsrange[i]];
	}
	return res;
}

/**
 * @param {Array}
 * @param {Array}
 * @return {Array} 
 */
function getSubArray(a, rowsrange) {
	const n = rowsrange.length;
	var res= new Array( n );
	for (var i = 0; i< n; i++) {
		res[i] = a[rowsrange[i]];
	}
	return res;
}


function getrowref(A, i) {
	// return a pointer-like object on a row in a matrix, not a copy!
	return A.val.subarray(i*A.n, (i+1)*A.n);
}

/*
	SET function : set values in a subset of entries of a matrix or vector
	
	For MATRICES:

	set ( M, rows, cols, A ) => submatrix of M = A 
	set ( M, rows, A ) 	     => subset of rows from M = A
	set ( M, [], cols, A )   => subset of cols from M = A
	set ( M, i, [], A )   	 => fill row M[i] with vector A (transposed) 
	set ( M, i, j, A)	     => M[i][j] = A
	
	For VECTORS:

	set ( v, rows, a ) 	  => subvector from v = a
	set ( v, i , a)		  => v[i] = a

*/
function set ( A , rowsrange, colsrange, B) {
	var i;
	var j;
	var k;
	var l;
	var n;

	var typerows = typeof(rowsrange);
	var typecols = typeof(colsrange);
	
	if (arguments.length == 1 ) 
		return undefined;
	
	var typeA = type ( A );
	if ( typeA == "vector" ) {
		B = colsrange;
		if ( typerows == "number" ) {
			A[rowsrange] = B;
			return B;
		}
		else if ( rowsrange.length == 0 ) 
			rowsrange = range(A.length);
				
		if ( size(B,1) == 1 ) {
			setVectorScalar (A, rowsrange, B);
		}
		else {
			setVectorVector (A, rowsrange, B);
		}
		return B;
	}
	else if ( typeA == "matrix") {				
	
		if ( typerows == "number" )
			rowsrange = [rowsrange];
		if ( typecols == "number" )
			colsrange = [colsrange];
		
		if ( rowsrange.length == 1 && colsrange.length == 1 ) {
			A.val[rowsrange[0]*A.n + colsrange[0]] = B;	
			return B;
		}
		
		if ( rowsrange.length == 0 ) {
			setCols(A, colsrange, B); 
			return B;
		}
		
		if (colsrange.length == 0 ) {
			setRows( A, rowsrange, B); 
			return B;
		}
		
		// Set a submatrix
		var sB = size(B);
		var tB = type(B);
		if ( sB[0] == 1 && sB[1] == 1 ) {
			if ( tB == "number" )
				setMatrixScalar(A, rowsrange, colsrange, B);
			else if ( tB == "vector" )			
				setMatrixScalar(A, rowsrange, colsrange, B[0]);			
			else
				setMatrixScalar(A, rowsrange, colsrange, B.val[0]);			
		}
		else {
			if ( colsrange.length == 1 )
				setMatrixColVector(A, rowsrange, colsrange[0], B);				
			else if ( rowsrange.length == 1 ) {
				if ( tB == "vector" ) 
					setMatrixRowVector(A, rowsrange[0], colsrange, B);
				else
					setMatrixRowVector(A, rowsrange[0], colsrange, B.val);
			}
			else
				setMatrixMatrix(A, rowsrange, colsrange, B);
		}
		return B;		
	}
	else if ( typeA == "ComplexVector" ) {
		B = colsrange;
		if ( typerows == "number" ) {
			A.set(rowsrange, B);
			return B;
		}
		else if ( rowsrange.length == 0 ) 
			rowsrange = range(A.length);
				
		if ( size(B,1) == 1 ) {
			A.setVectorScalar (rowsrange, B);
		}
		else {
			A.setVectorVector (rowsrange, B);
		}
		return B;
	}
}
		
function setVectorScalar(A, rowsrange, B) {
	var i;
	for (i = 0; i< rowsrange.length; i++) 
		A[rowsrange[i]] = B;
}
function setVectorVector(A, rowsrange, B) {
	var i;
	for (i = 0; i< rowsrange.length; i++) 
		A[rowsrange[i]] = B[i];
}

function setMatrixScalar(A, rowsrange, colsrange, B) {
	var i;
	var j;
	var m = rowsrange.length;
	var n = colsrange.length;
	for (i = 0; i< m; i++) 
		for(j=0; j < n; j++)
			A.val[rowsrange[i]*A.n + colsrange[j]] = B;
}
function setMatrixMatrix(A, rowsrange, colsrange, B) {
	var i;
	var j;
	var m = rowsrange.length;
	var n = colsrange.length;
	for (i = 0; i< m; i++) 
		for(j=0; j < n; j++)
			A.val[rowsrange[i]*A.n + colsrange[j]] = B.val[i*B.n +j];
}
function setMatrixColVector(A, rowsrange, col, B) {
	var i;
	var m = rowsrange.length;
	for (i = 0; i< m; i++) 
		A.val[rowsrange[i]*A.n + col] = B[i];
}
function setMatrixRowVector(A, row, colsrange, B) {
	var j;
	var n = colsrange.length;
	for(j=0; j < n; j++)
		A.val[row*A.n + colsrange[j]] = B[j];
}
function setRows(A, rowsrange, B ) {
	var i;
	var j;
	var m = rowsrange.length;
	var rA;
	switch( type(B) ) {
	case "vector":
		for ( i=0; i<m; i++) {
			rA = rowsrange[i]*A.n;		
			for ( j=0; j<B.length; j++)
				A.val[rA + j] = B[j];
		}
		break;
	case "matrix":		
		var rB = 0;
		for ( i=0; i<m; i++) {
			rA = rowsrange[i]*A.n;
			for ( j=0; j < B.n; j++)
				A.val[rA + j] = B.val[rB + j];		
			rB += B.n;
		}
		break;
	default:
		for ( i=0; i<m; i++) {
			rA = rowsrange[i] * A.n;
			for(j=0; j < A.n; j++)
				A.val[rA + j] = B;
		}
		break;
	}
}
function setCols(A, colsrange, B ) {
	var i;
	var m = A.m;
	var n = colsrange.length;
	var r = 0;
	switch( type(B) ) {
	case "vector":
		for ( i=0; i<m; i++) {
			for (j=0; j < n; j++)
				A.val[r + colsrange[j]] = B[i]; 
			r += A.n;
		}
		break;
	case "matrix":
		for ( i=0; i<m; i++) {
			for (j=0; j < n; j++)
				A.val[r + colsrange[j]] = B.val[i* B.n + j]; 
			r += A.n;
		}			
		break;
	default:		
		for ( i=0; i<m; i++) {
			for(j=0; j < n; j++)
				A.val[r + colsrange[j]] = B;
			r += A.n;
		}
		break;
	}
}

function dense ( A ) {
	return A;
}

// Support
function supp( x ) {
	const tx = type (x);
	if ( tx == "vector" ) {
		var indexes = [];
		var i;
		for ( i = 0; i < x.length;  i++ ) {
			if ( !isZero(x[i]) ) 
				indexes.push(i);
		}
		
		return indexes; 
	}
	else if (tx == "spvector" ) {
		return new Float64Array(x.ind);
	}
	else
		return undefined;
}

// Range
function range(start, end, inc) {
	// python-like range function 
	// returns [0,... , end-1]
	if ( typeof(start) == "undefined" ) 
		return [];
		
	if ( typeof(inc) == "undefined" ) 
		var inc = 1;
	if ( typeof(end) == "undefined" ) {
		var end = start;
		start = 0;
	}		
	
	if ( start == end-inc) {
		return start;
	}
	else if ( start == end) {
		return [];
	}
	else if ( start > end ) {
		if ( inc > 0) 
			inc *= -1;
		var r = new Array( Math.floor ( ( start - end ) / Math.abs(inc) ) );
		var k = 0;
		for ( var i = start; i> end; i+=inc) {
			r[k] = i;
			k++;
		}	
	}
	else {		
		var r = new Array( Math.floor ( ( end - start ) / inc ) );
		var k = 0;
		for ( var i = start; i< end; i+=inc) {
			r[k] = i;
			k++;
		}	
	}
	return r;
}

// Swaping 
/**
 * @param {Matrix}
 */
function swaprows ( A , i, j ) {
	if ( i != j ) {
		var ri = i*A.n;
		var rj = j*A.n;
		var tmp = vectorCopy(A.val.subarray(ri, ri+A.n));
		A.val.set(vectorCopy(A.val.subarray(rj, rj+A.n)), ri);
		A.val.set(tmp, rj);
	}
}
/**
 * @param {Matrix}
 */
function swapcols ( A , j, k ) {
	if ( j != k ) {
		var tmp = getCols ( A, [j]);
		setCols ( A, [j] , getCols ( A, [k]) );
		setCols ( A, [k], tmp);
	}
}

//////////////////////////
// Random numbers
////////////////////////////

// Gaussian random number (mean = 0, variance = 1;
//	Gaussian noise with the polar form of the Box-Muller transformation 
function randnScalar() {

    var x1;
    var x2;
    var w;
    var y1;
    var y2;
 	do {
	     x1 = 2.0 * Math.random() - 1.0;
	     x2 = 2.0 * Math.random() - 1.0;
	     w = x1 * x1 + x2 * x2;
	 } while ( w >= 1.0 );

	 w = Math.sqrt( (-2.0 * Math.log( w ) ) / w );
	 y1 = x1 * w;
	 y2 = x2 * w;
	 
	 return y1;
}
function randn( dim1, dim2 ) {
    var res;

	if ( typeof ( dim1 ) == "undefined" || (dim1 == 1 && typeof(dim2)=="undefined") || (dim1 == 1 && dim2==1)) {
		return randnScalar();		
	} 
	else if (typeof(dim2) == "undefined" || dim2 == 1 ) {
		res = new Float64Array(dim1);
		for (var i=0; i< dim1; i++) 			
			res[i] = randnScalar();
		
		return res;
	}
	else  {
		res = zeros(dim1, dim2);
		for (var i=0; i< dim1*dim2; i++) {
			res.val[i] = randnScalar();
		}
		return res;
	}
}

// Uniform random numbers
/*
 * @param{number}
 * @return{Float64Array}
 */
function randVector(dim1) {
	var res = new Float64Array(dim1);
	for (var i=0; i< dim1; i++) {			
		res[i] = Math.random();
	}
	return res;
}
/*
 * @param{number}
 * @param{number} 
 * @return{Matrix}
 */
function randMatrix(dim1,dim2) {
	const n = dim1*dim2;	
	var res = new Float64Array(n);
	for (var i=0; i< n; i++) {			
		res[i] = Math.random();
	}
	return new Matrix(dim1,dim2,res,true);
}
function rand( dim1, dim2 ) {
	var res;
	if ( typeof ( dim1 ) == "undefined" || (dim1 == 1 && typeof(dim2)=="undefined") || (dim1 == 1 && dim2==1)) {
		 return Math.random();
	} 
	else if (typeof(dim2) == "undefined" || dim2 == 1) {
		return randVector(dim1);
	}
	else  {
		return randMatrix(dim1,dim2);	
	}
}

function randnsparse(NZratio, dim1, dim2) {
	// Generates a sparse random matrix with NZratio * dim1*dim2 (or NZ if NZratio > 1 ) nonzeros
	var NZ;
	if ( NZratio > 1 )
		NZ = NZratio;
	else 
		NZ = Math.floor(NZratio *dim1*dim2);
		
	var indexes; 
	var i;
	var j;
	var k;
	var res;
	
	if ( typeof ( dim1 ) == "undefined" ) {
		return randn();
	} 
	else if (typeof(dim2) == "undefined" || dim2 == 1) {
	
		indexes = randperm( dim1 );
	
		res = zeros(dim1);
		for (i=0; i< NZ; i++) {
			res[indexes[i]] = randn();
		}
		return res;
	}
	else  {
		res = zeros(dim1, dim2);
		indexes = randperm( dim1*dim2 );
		for (k=0; k< NZ; k++) {
			i = Math.floor(indexes[k] / dim2);
			j = indexes[k] - i * dim2;
			res.val[i*dim2+j] = randn();		
		}
		return res;
	}
}
function randsparse(NZratio, dim1, dim2) {
	// Generates a sparse random matrix with NZratio * dim1*dim2 (or NZ if NZratio > 1 ) nonzeros
	if (typeof(dim2) == "undefined")
		var dim2 = 1;
	
	var NZ;
	if ( NZratio > 1 )
		NZ = NZratio;
	else 
		NZ = Math.floor(NZratio *dim1*dim2);
		
	var indexes; 
	var i;
	var j;
	var k;
	var res;
	
	if ( typeof ( dim1 ) == "undefined" ) {
		return randn();
	} 
	else if (dim2 == 1) {
	
		indexes = randperm( dim1 );
	
		res = zeros(dim1);
		for (i=0; i< NZ; i++) {
			res[indexes[i]] = Math.random();
		}
		return res;
	}
	else  {
		res = zeros(dim1, dim2);
		indexes = randperm( dim1*dim2 );

		for (k=0; k< NZ; k++) {
			i = Math.floor(indexes[k] / dim2);
			j = indexes[k] - i * dim2;
			res.val[i*dim2+j] = Math.random();			
		}
		return res;
	}
}

function randperm( x ) {
	// return a random permutation of x (or of range(x) if x is a number)

	if ( typeof( x ) == "number" ) {
		var perm = range(x); 
	}
	else {		
		var perm = new Float64Array(x);
	}
	var i;
	var j;
	var k;

	// shuffle	
	for(i=perm.length - 1 ; i > 1; i--) {
		j = Math.floor(Math.random() * i);
		k = perm[j];		
		perm[j] = perm[i];
		perm[i] = k;
	}
	return perm;
}
///////////////////////////////
/// Basic Math function: give access to Math.* JS functions 
///  and vectorize them 
///////////////////////////////


// automatically generate (vectorized) wrappers for Math functions
var MathFunctions = Object.getOwnPropertyNames(Math);
for ( var mf in MathFunctions ) {	
	if ( eval( "typeof(Math." + MathFunctions[mf] + ")") == "function") {
		if ( eval( "Math." + MathFunctions[mf] + ".length") == 1 ) {
			// this is a function of a scalar
			// make generic function:
			eval( MathFunctions[mf] + " = function (x) { return apply(Math."+ MathFunctions[mf] + " , x );};");
			// make vectorized version:
			eval( MathFunctions[mf] + "Vector = function (x) { return applyVector(Math."+ MathFunctions[mf] + " , x );};");
			// make matrixized version:
			eval( MathFunctions[mf] + "Matrix = function (x) { return applyMatrix(Math."+ MathFunctions[mf] + " , x );};");			
		}
	}
	else if (  eval( "typeof(Math." + MathFunctions[mf] + ")") == "number") {
		// Math constant: 
		eval( MathFunctions[mf] + " = Math."+ MathFunctions[mf] ) ;
	}
}

function apply( f, x ) {
	// Generic wrapper to apply scalar functions 
	// element-wise to vectors and matrices
	if ( typeof(f) != "function")
		return undefined;
	switch ( type( x ) ) {
	case "number":
		return f(x);
		break;
	case "Complex":
		var ComplexFunctions = ["exp", "abs"];
		var fc = ComplexFunctions.indexOf(f.name);
		if ( fc >= 0 )
			return eval(ComplexFunctions[fc] + "Complex(x);");
		else {
			error("This function has no Complex counterpart (yet).");
			return undefined;
		}
		break;
	case "vector":
		return applyVector(f, x);
		break;
	case "spvector":
		return applyspVector(f, x);
		break;
	case "ComplexVector":
		if ( f.name == "abs" )
			return absComplex(x);
		else
			return applyComplexVector(f, x);
		break;
	case "matrix":
		return applyMatrix(f, x);
		break;
	case "spmatrix":
		return applyspMatrix(f, x);
		break;
	case "ComplexMatrix":
		if ( f.name == "abs" )
			return absComplex(x);
		else
			return applyComplexMatrix(f, x);
		break;
	default: 
		return "undefined";
	}
}
function applyVector( f, x ) {
	const nv = x.length;
	var res = new Float64Array(nv);
	for (var i=0; i< nv; i++) 
		res[i] = f(x[i]);	
	return res;
}
function applyComplexVector( f, x ) {
	const nv = x.length;
	var res = new ComplexVector(nv);
	for (var i=0; i< nv; i++) 
		res.set(i, f(x.get(i) ) );	
	return res;
}
function applyComplexMatrix( f, x ) {
	const m = x.m;
	const n = x.n;
	var res = new ComplexMatrix(m, n);
	for (var i=0; i< m; i++) 
		for ( var j =0; j < n; j++)
			res.set(i, j, f(x.get(i,j) ) );
	return res;
}
function applyMatrix(f, x) {
	return new Matrix(x.m, x.n, applyVector(f, x.val), true);
}
///////////////////////////////
/// Operators
///////////////////////////////

function mul(a,b) {
	var sa = size(a);
	var sb = size(b); 
	if ( !isScalar(a) && sa[0] == 1 && sa[1] == 1 ) 
		a = get(a, 0, 0);
	if ( !isScalar(b) && sb[0] == 1 && sb[1] == 1 ) 
		b = get(b, 0, 0);

	switch( type(a) ) {
	case "number":
		switch( type(b) ) {
		case "number":
			return a*b;
			break;
		case "Complex":
			return mulComplexReal(b,a);
			break;
		case "vector":			
			return mulScalarVector(a,b);
			break;
		case "spvector":
			return mulScalarspVector(a,b);
			break;
		case "ComplexVector":			
			return mulScalarComplexVector(a,b);
			break;
		case "matrix":
			return mulScalarMatrix(a,b);
			break;
		case "spmatrix":
			return mulScalarspMatrix(a,b);
			break;
		case "ComplexMatrix":
			return mulScalarComplexMatrix(a,b);
			break;
		default:
			return undefined;
			break;
		}
		break;
	case "Complex":
		switch( type(b) ) {
		case "number":
			return mulComplexReal(a,b);
			break;
		case "Complex":
			return mulComplex(a,b);
			break;
		case "vector":			
			return mulComplexVector(a,b);
			break;
		case "ComplexVector":			
			return mulComplexComplexVector(a,b);
			break;
		case "spvector":
			return mulComplexspVector(a,b);
			break;
		case "matrix":
			return mulComplexMatrix(a,b);
			break;
		case "ComplexMatrix":
			return mulComplexComplexMatrix(a,b);
			break;
		case "spmatrix":
			return mulComplexspMatrix(a,b);
			break;
		default:
			return undefined;
			break;
		}
		break;		
	case "vector":
		switch( type(b) ) {
		case "number":
			return mulScalarVector(b,a);
			break;
		case "Complex":			
			return mulComplexVector(b,a);
			break;
		case "vector":
			if ( a.length != b.length ) {
				error("Error in mul(a,b) (dot product): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined; 
			}	
			return dot(a,b);
			break;
		case "spvector":
			if ( a.length != b.length ) {
				error("Error in mul(a,b) (dot product): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined; 
			}	
			return dotspVectorVector(b,a);
			break;
		case "ComplexVector":
			if ( a.length != b.length ) {
				error("Error in mul(a,b) (dot product): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined; 
			}	
			return dotComplexVectorVector(b,a);
			break;		
		case "matrix":
			if ( b.m == 1) 
				return outerprodVectors(a , b.val );
			else {
				error("Inconsistent dimensions in mul(a,B): size(a) = [" + sa[0] + "," + sa[1] + "], size(B) = [" + sb[0] + "," + sb[1] + "]");
				return undefined;
			}
			break;
		case "spmatrix":
			if ( b.m == 1) 
				return outerprodVectors(a , fullMatrix(b).val );
			else {
				error("Inconsistent dimensions in mul(a,B): size(a) = [" + sa[0] + "," + sa[1] + "], size(B) = [" + sb[0] + "," + sb[1] + "]");
				return undefined;
			}
			break;
		case "ComplexMatrix":
			if ( b.m == 1) 
				return transpose(outerprodComplexVectorVector(new ComplexVector(b.re,b.im,true), a , b.val ));
			else {
				error("Inconsistent dimensions in mul(a,B): size(a) = [" + sa[0] + "," + sa[1] + "], size(B) = [" + sb[0] + "," + sb[1] + "]");
				return undefined;
			}
			break;
		default:
			return undefined;
			break;
		}
		break;
	case "spvector":
		switch( type(b) ) {
		case "number":
			return mulScalarspVector(b,a);
			break;
		case "vector":
			if ( a.length != b.length ) {
				error("Error in mul(a,b) (dot product): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined; 
			}	
			return dotspVectorVector(a,b);
			break;
		case "spvector":
			if ( a.length != b.length ) {
				error("Error in mul(a,b) (dot product): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined; 
			}	
			return spdot(b,a);
			break;
		case "matrix":
			if ( b.m == 1) 
				return outerprodspVectorVector(a , b.val );
			else {
				error("Inconsistent dimensions in mul(a,B): size(a) = [" + sa[0] + "," + sa[1] + "], size(B) = [" + sb[0] + "," + sb[1] + "]");
				return undefined;
			}
			break;
		case "spmatrix":
			if ( b.m == 1) 
				return outerprodspVectorVector(a, fullMatrix(b).val);
			else {
				error("Inconsistent dimensions in mul(a,B): size(a) = [" + sa[0] + "," + sa[1] + "], size(B) = [" + sb[0] + "," + sb[1] + "]");
				return undefined;
			}
			break;
		default:
			return undefined;
			break;
		}
		break;
	case "ComplexVector":
		switch( type(b) ) {
		case "number":
			return mulScalarComplexVector(b,a);
			break;
		case "Complex":
			return mulComplexComplexVector(b,a);
			break;
		case "vector":
			if ( a.length != b.length ) {
				error("Error in mul(a,b) (dot product): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined; 
			}	
			return dotComplexVectorVector(a,b);
			break;
		case "spvector":
			if ( a.length != b.length ) {
				error("Error in mul(a,b) (dot product): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined; 
			}	
			return dotComplexVectorspVector(a,b);
			break;
		case "matrix":
			if ( b.m == 1) 
				return outerprodComplexVectorVector(a , b.val );
			else {
				error("Inconsistent dimensions in mul(a,B): size(a) = [" + sa[0] + "," + sa[1] + "], size(B) = [" + sb[0] + "," + sb[1] + "]");
				return undefined;
			}
			break;
		case "spmatrix":
			if ( b.m == 1) 
				return outerprodComplexVectorVector(a , fullMatrix(b).val );
			else {
				error("Inconsistent dimensions in mul(a,B): size(a) = [" + sa[0] + "," + sa[1] + "], size(B) = [" + sb[0] + "," + sb[1] + "]");
				return undefined;
			}
			break;
		case "ComplexMatrix":
			if ( b.m == 1) 
				return outerprodComplexVectors(a , new ComplexVector(b.re,b.im, true) );
			else {
				error("Inconsistent dimensions in mul(a,B): size(a) = [" + sa[0] + "," + sa[1] + "], size(B) = [" + sb[0] + "," + sb[1] + "]");
				return undefined;
			}
			break;
		default:
			return undefined;
			break;
		}
		break;
		
	case "matrix":
		switch( type(b) ) {
		case "number":
			return mulScalarMatrix(b,a);
			break;
		case "Complex":
			return mulComplexMatrix(b,a);
			break;
		case "vector":
			if ( a.m == 1 ) {
				// dot product with explicit transpose
				if ( a.val.length != b.length ) {
					error("Error in mul(a',b): a.length = " + a.val.length + " != " + b.length + " =  b.length.");
					return undefined; 
				}
				return dot(a.val, b);
			}
			else {			
				if ( a.n != b.length ) {
					error("Error in mul(A,b): A.n = " + a.n + " != " + b.length + " = b.length.");
					return undefined; 
				}
				return mulMatrixVector(a,b);
			}
			break;
		case "spvector":
			if ( a.m == 1 ) {
				// dot product with explicit transpose
				if ( a.val.length != b.length ) {
					error("Error in mul(a',b): a.length = " + a.val.length + " != " + b.length + " =  b.length.");
					return undefined; 
				}
				return dotspVectorVector(b, a.val);
			}
			else {			
				if ( a.n != b.length ) {
					error("Error in mul(A,b): A.n = " + a.n + " != " + b.length + " = b.length.");
					return undefined; 
				}
				return mulMatrixspVector(a,b);
			}
			break;
		case "ComplexVector":
			if ( a.m == 1 ) {
				// dot product with explicit transpose
				if ( a.val.length != b.length ) {
					error("Error in mul(a',b): a.length = " + a.val.length + " != " + b.length + " =  b.length.");
					return undefined; 
				}
				return dotComplexVectorVector(b, a.val);
			}
			else {			
				if ( a.n != b.length ) {
					error("Error in mul(A,b): A.n = " + a.n + " != " + b.length + " = b.length.");
					return undefined; 
				}
				return mulMatrixComplexVector(a,b);
			}
			break;
		case "matrix":
			if ( a.n != b.m ) {
				error("Error in mul(A,B): A.n = " + a.n + " != " + b.m + " = B.m.");
				return undefined; 
			}
			return mulMatrixMatrix(a,b);
			break;
		case "spmatrix":
			if ( a.n != b.m ) {
				error("Error in mul(A,B): A.n = " + a.n + " != " + b.m + " = B.m.");
				return undefined; 
			}
			return mulMatrixspMatrix(a,b);
			break;
		case "ComplexMatrix":
			if ( a.n != b.m ) {
				error("Error in mul(A,B): A.n = " + a.n + " != " + b.m + " = B.m.");
				return undefined; 
			}
			return transpose(mulComplexMatrixMatrix(transpose(b),transpose(a)));
			break;
		default:
			return undefined;
			break;
		}
		break;
	case "spmatrix":
		switch( type(b) ) {
		case "number":
			return mulScalarspMatrix(b,a);
			break;
		case "vector":
			if ( a.m == 1 ) {
				// dot product with explicit transpose
				if ( a.n != b.length ) {
					error("Error in mul(a',b): a.length = " + a.val.length + " != " + b.length + " =  b.length.");
					return undefined; 
				}
				return dot(fullMatrix(a).val, b);
			}
			else {			
				if ( a.n != b.length ) {
					error("Error in mul(A,b): A.n = " + a.n + " != " + b.length + " = b.length.");
					return undefined; 
				}
				return mulspMatrixVector(a,b);
			}
			break;
		case "spvector":
			if ( a.m == 1 ) {
				// dot product with explicit transpose
				if ( a.n != b.length ) {
					error("Error in mul(a',b): a.length = " + a.val.length + " != " + b.length + " =  b.length.");
					return undefined; 
				}
				return dotspVectorVector(b, fullMatrix(a).val);
			}
			else {			
				if ( a.n != b.length ) {
					error("Error in mul(A,b): A.n = " + a.n + " != " + b.length + " = b.length.");
					return undefined; 
				}
				return mulspMatrixspVector(a,b);
			}
			break;
		case "matrix":
			if ( a.n != b.m ) {
				error("Error in mul(A,B): A.n = " + a.n + " != " + b.m + " = B.m.");
				return undefined; 
			}
			return mulspMatrixMatrix(a,b);
			break;
		case "spmatrix":
			if ( a.n != b.m ) {
				error("Error in mul(A,B): A.n = " + a.n + " != " + b.m + " = B.m.");
				return undefined; 
			}
			return mulspMatrixspMatrix(a,b);
			break;
		default:
			return undefined;
			break;
		}
		break;
	case "ComplexMatrix":
		switch( type(b) ) {
		case "number":
			return mulScalarComplexMatrix(b,a);
			break;
		case "Complex":
			return mulComplexComplexMatrix(b,a);
			break;
		case "vector":
			if ( a.m == 1 ) {
				// dot product with explicit transpose
				if ( a.val.length != b.length ) {
					error("Error in mul(a',b): a.length = " + a.val.length + " != " + b.length + " =  b.length.");
					return undefined; 
				}
				return dotComplexVectorVector(new ComplexVector(a.re,a.im,true), b);
			}
			else {			
				if ( a.n != b.length ) {
					error("Error in mul(A,b): A.n = " + a.n + " != " + b.length + " = b.length.");
					return undefined; 
				}
				return mulComplexMatrixVector(a,b);
			}
			break;
		case "spvector":
			if ( a.m == 1 ) {
				// dot product with explicit transpose
				if ( a.val.length != b.length ) {
					error("Error in mul(a',b): a.length = " + a.val.length + " != " + b.length + " =  b.length.");
					return undefined; 
				}
				return dotComplexVectorspVector(new ComplexVector(a.re,a.im,true), b);
			}
			else {			
				if ( a.n != b.length ) {
					error("Error in mul(A,b): A.n = " + a.n + " != " + b.length + " = b.length.");
					return undefined; 
				}
				return mulComplexMatrixspVector(a,b);
			}
			break;
		case "ComplexVector":
			if ( a.m == 1 ) {
				// dot product with explicit transpose
				if ( a.val.length != b.length ) {
					error("Error in mul(a',b): a.length = " + a.val.length + " != " + b.length + " =  b.length.");
					return undefined; 
				}
				return dotComplexVectors(new ComplexVector(a.re,a.im,true), b);
			}
			else {			
				if ( a.n != b.length ) {
					error("Error in mul(A,b): A.n = " + a.n + " != " + b.length + " = b.length.");
					return undefined; 
				}
				return mulComplexMatrixComplexVector(a,b);
			}
			break;
		case "matrix":
			if ( a.n != b.m ) {
				error("Error in mul(A,B): A.n = " + a.n + " != " + b.m + " = B.m.");
				return undefined; 
			}
			return mulComplexMatrixMatrix(a,b);
			break;
		case "spmatrix":
			if ( a.n != b.m ) {
				error("Error in mul(A,B): A.n = " + a.n + " != " + b.m + " = B.m.");
				return undefined; 
			}
			return mulComplexMatrixspMatrix(a,b);
			break;
		case "ComplexMatrix":
			if ( a.n != b.m ) {
				error("Error in mul(A,B): A.n = " + a.n + " != " + b.m + " = B.m.");
				return undefined; 
			}
			return mulComplexMatrices(a,b);
			break;
		default:
			return undefined;
			break;
		}
		break;
	default:
		return undefined;
		break;
	}
}

/**
 * @param {number}
 * @param {Float64Array}
 * @return {Float64Array} 
 */
function mulScalarVector( scalar, vec ) {
	var i;
	const n = vec.length;
	var res = new Float64Array(vec);
	for ( i=0; i < n; i++)
		res[i] *= scalar ;
	return res;
}
/**
 * @param {number}
 * @param {Matrix}
 * @return {Matrix} 
 */
function mulScalarMatrix( scalar, A ) {
	var res = new Matrix(A.m,A.n, mulScalarVector(scalar, A.val), true );

	return res;	
}

/**
 * @param {Float64Array}
 * @param {Float64Array}
 * @return {number} 
 */
function dot(a, b) {
	const n = a.length;
	var i;
	var res = 0;
	for ( i=0; i< n; i++) 
		res += a[i]*b[i];
	return res;
}

/**
 * @param {Matrix}
 * @param {Float64Array}
 * @return {Float64Array} 
 */
function mulMatrixVector( A, b ) {
	const m = A.length;
	var c = new Float64Array(m); 	
	var r = 0;
	for (var i=0; i < m; i++) {
		c[i] = dot(A.val.subarray(r, r+A.n), b);
		r += A.n;
	}
	
	return c;
}
/**
 * @param {Matrix}
 * @param {Float64Array}
 * @return {Float64Array} 
 */
function mulMatrixTransVector( A, b ) {
	const m = A.length;
	const n = A.n;
	var c = new Float64Array(n); 	
	var rj = 0;
	for (var j=0; j < m; j++) {
		var bj = b[j];
		for (var i=0; i < n; i++) {
			c[i] += A.val[rj + i] * bj;			
		}
		rj += A.n;
	}
	return c;
}
/**
 * @param {Matrix}
 * @param {Matrix}
 * @return {Matrix} 
 */
function mulMatrixMatrix(A, B) {
	const m = A.length;
	const n = B.n;
	const n2 = B.length;
	
	var Av = A.val; 
	var Bv = B.val;
	
	var C = new Float64Array(m*n);
	var aik;
	var Aik = 0;
	var Ci = 0;
	for (var i=0;i < m ; i++) {		
		var bj = 0;
		for (var k=0; k < n2; k++ ) {
			aik = Av[Aik];
			for (var j =0; j < n; j++) {
				C[Ci + j] += aik * Bv[bj];
				bj++;
			}	
			Aik++;					
		}
		Ci += n;
	}
	return  new Matrix(m,n,C, true);	
}
/**
 * @param {Float64Array}
 * @param {Float64Array}
 * @return {Float64Array} 
 */
function entrywisemulVector( a, b) {
	var i;
	const n = a.length;
	var res = new Float64Array(n);
	for ( i=0; i < n; i++)
		res[i] = a[i] * b[i];
	return res;
}
/**
 * @param {Matrix}
 * @param {Matrix}
 * @return {Matrix} 
 */
function entrywisemulMatrix( A, B) {
	var res = new Matrix(A.m,A.n, entrywisemulVector(A.val, B.val), true );	
	return res;
}


function entrywisemul(a,b) {
	var sa = size(a);
	var sb = size(b); 
	if (typeof(a) != "number" && sa[0] == 1 && sa[1] == 1 ) 
		a = get(a, 0, 0);
	if (typeof(b) != "number" && sb[0] == 1 && sb[1] == 1 ) 
		b = get(b, 0, 0);

	switch( type(a) ) {
	case "number":
		switch( type(b) ) {
		case "number":
			return a*b;
			break;
		case "Complex":
			return mulComplexReal(b,a);
			break;
		case "vector":			
			return mulScalarVector(a,b);
			break;
		case "spvector":
			return mulScalarspVector(a,b);
			break;
		case "ComplexVector":
			return mulScalarComplexVector(b,a);
			break;
		case "matrix":
			return mulScalarMatrix(a,b);
			break;
		case "spmatrix":
			return mulScalarspMatrix(a,b);
			break;
		case "ComplexMatrix":
			return mulScalarComplexMatrix(b,a);
			break;
		default:
			return undefined;
			break;
		}
		break;
	case "vector":
		switch( type(b) ) {
		case "number":
			return mulScalarVector(b,a);
			break;
		case "Complex":
			return mulComplexVector(b,a);
			break;
		case "vector":
			if ( a.length != b.length ) {
				error("Error in entrywisemul(a,b): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined; 
			}	
			return entrywisemulVector(a,b);
			break;
		case "ComplexVector":
			if ( a.length != b.length ) {
				error("Error in entrywisemul(a,b): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined; 
			}	
			return entrywisemulComplexVectorVector(b,a);
			break;
		case "spvector":
			if ( a.length != b.length ) {
				error("Error in entrywisemul(a,b): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined; 
			}	
			return entrywisemulspVectorVector(b,a);
			break;
		case "matrix":
		case "spmatrix":
		case "ComplexMatrix":
			error("Error in entrywisemul(a,B): a is a vector and B is a matrix.");
			return undefined;			
			break;
		default:
			return undefined;
			break;
		}
		break;
	case "spvector":
		switch( type(b) ) {
		case "number":
			return mulScalarspVector(b,a);
			break;
		case "vector":
			if ( a.length != b.length ) {
				error("Error in entrywisemul(a,b): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined; 
			}	
			return entrywisemulspVectorVector(a,b);
			break;
		case "spvector":
			if ( a.length != b.length ) {
				error("Error in entrywisemul(a,b): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined; 
			}	
			return entrywisemulspVectors(a,b);
			break;
		case "matrix":
			error("Error in entrywisemul(a,B): a is a vector and B is a Matrix.");
			return undefined;		
			break;
		case "spmatrix":
			error("Error in entrywisemul(a,B): a is a vector and B is a Matrix.");
			return undefined;		
			break;
		default:
			return undefined;
			break;
		}
		break;
	case "matrix":
		switch( type(b) ) {
		case "number":
			return mulScalarMatrix(b,a);
			break;
		case "Complex":
			return mulComplexMatrix(b,a);
			break;
		case "vector":
		case "spvector":
		case "ComplexVector":
			error("Error in entrywisemul(A,b): A is a Matrix and b is a vector.");
			return undefined;
			break;
		case "matrix":
			if ( a.m != b.m || a.n != b.n ) {
				error("Error in entrywisemul(A,B): size(A) = [" + a.m + "," + a.n + "] != [" + b.m + "," + b.n + "] = size(B).");
				return undefined;
			}
			return entrywisemulMatrix(a,b);
			break;
		case "spmatrix":
			if ( a.m != b.m || a.n != b.n ) {
				error("Error in entrywisemul(A,B): size(A) = [" + a.m + "," + a.n + "] != [" + b.m + "," + b.n + "] = size(B).");
				return undefined;
			}
			return entrywisemulspMatrixMatrix(b,a);
			break;
		case "ComplexMatrix":
			if ( a.m != b.m || a.n != b.n ) {
				error("Error in entrywisemul(A,B): size(A) = [" + a.m + "," + a.n + "] != [" + b.m + "," + b.n + "] = size(B).");
				return undefined;
			}
			return entrywisemulComplexMatrixMatrix(b,a);
			break;
		default:
			return undefined;
			break;
		}
		break;
	case "spmatrix":
		switch( type(b) ) {
		case "number":
			return mulScalarspMatrix(b,a);
			break;
		case "vector":
			error("Error in entrywisemul(A,b): A is a Matrix and b is a vector.");
			return undefined;
			break;
		case "spvector":
			error("Error in entrywisemul(A,b): A is a Matrix and b is a vector.");
			return undefined;
			break;
		case "matrix":
			if ( a.m != b.m || a.n != b.n ) {
				error("Error in entrywisemul(A,B): size(A) = [" + a.m + "," + a.n + "] != [" + b.m + "," + b.n + "] = size(B).");
				return undefined;
			}
			return entrywisemulspMatrixMatrix(a,b);
			break;
		case "spmatrix":
			if ( a.m != b.m || a.n != b.n ) {
				error("Error in entrywisemul(A,B): size(A) = [" + a.m + "," + a.n + "] != [" + b.m + "," + b.n + "] = size(B).");
				return undefined;
			}
			return entrywisemulspMatrices(a,b);
			break;
		default:
			return undefined;
			break;
		}
		break;
	case "ComplexVector":
		switch( type(b) ) {
		case "number":
			return mulScalarComplexVector(b,a);
			break;
		case "Complex":
			return mulComplexComplexVector(b,a);
			break;
		case "vector":
			if ( a.length != b.length ) {
				error("Error in entrywisemul(a,b): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined; 
			}	
			return entrywisemulComplexVectorVector(a,b);
			break;
		case "ComplexVector":
			if ( a.length != b.length ) {
				error("Error in entrywisemul(a,b): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined; 
			}	
			return entrywisemulComplexVectors(a,b);
			break;
		case "spvector":
			if ( a.length != b.length ) {
				error("Error in entrywisemul(a,b): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined; 
			}	
			return entrywisemulComplexVectorspVector(a,b);
			break;
		case "matrix":
		case "spmatrix":
		case "ComplexMatrix":
			error("Error in entrywisemul(a,B): a is a vector and B is a matrix.");
			return undefined;			
			break;
		default:
			return undefined;
			break;
		}
		break;
	case "ComplexMatrix":
		switch( type(b) ) {
		case "number":
			return mulScalarComplexMatrix(b,a);
			break;
		case "Complex":
			return mulComplexComplexMatrix(b,a);
			break;
		case "vector":
		case "spvector":
		case "ComplexVector":
			error("Error in entrywisemul(A,b): A is a Matrix and b is a vector.");
			return undefined;
			break;
		case "matrix":
			if ( a.m != b.m || a.n != b.n ) {
				error("Error in entrywisemul(A,B): size(A) = [" + a.m + "," + a.n + "] != [" + b.m + "," + b.n + "] = size(B).");
				return undefined;
			}
			return entrywisemulComplexMatrixMatrix(a,b);
			break;
		case "spmatrix":
			if ( a.m != b.m || a.n != b.n ) {
				error("Error in entrywisemul(A,B): size(A) = [" + a.m + "," + a.n + "] != [" + b.m + "," + b.n + "] = size(B).");
				return undefined;
			}
			return entrywisemulComplexMatrixspMatrix(a,b);
			break;
		case "ComplexMatrix":
			if ( a.m != b.m || a.n != b.n ) {
				error("Error in entrywisemul(A,B): size(A) = [" + a.m + "," + a.n + "] != [" + b.m + "," + b.n + "] = size(B).");
				return undefined;
			}
			return entrywisemulComplexMatrices(a,b);
			break;
		default:
			return undefined;
			break;
		}
		break;
	default:
		return undefined;
		break;
	}
}


/** SAXPY : y = y + ax
 * @param {number}
 * @param {Float64Array}
 * @param {Float64Array}
 */
function saxpy ( a, x, y) {
	const n = y.length;
	for ( var i=0; i < n; i++) 
		y[i] += a*x[i];
}
/** GAXPY : y = y + Ax
 * @param {Matrix}
 * @param {Float64Array}
 * @param {Float64Array}
 */
function gaxpy ( A, x, y) {
	const m = A.m;
	const n = A.n;
	var r = 0;
	for ( var i=0; i < m; i++) {
		y[i] += dot(A.val.subarray(r, r + n),x);
		r += n;
	}
}

/**
 * @param {Float64Array}
 * @param {number}
 * @return {Float64Array} 
 */
function divVectorScalar( a, b) {
	var i;
	const n = a.length;
	var res = new Float64Array(a);
	for ( i=0; i < n; i++)
		res[i] /= b;
	return res;
}
/**
 * @param {number}
 * @param {Float64Array}
 * @return {Float64Array} 
 */
function divScalarVector ( a, b) {
	var i;
	const n = b.length;
	var res = new Float64Array(n);
	for ( i=0; i < n; i++)
		res[i] = a / b[i];
	return res;
}
/**
 * @param {Float64Array}
 * @param {Float64Array}
 * @return {Float64Array} 
 */
function divVectors( a, b) {
	var i;
	const n = a.length;
	var res = new Float64Array(a);
	for ( i=0; i < n; i++)
		res[i] /= b[i];
	return res;
}
/**
 * @param {Matrix}
 * @param {number}
 * @return {Matrix} 
 */
function divMatrixScalar( A, b) {
	var res = new Matrix(A.m, A.n, divVectorScalar(A.val , b ), true);
	return res;
}
/**
 * @param {number}
 * @param {Matrix}
 * @return {Matrix} 
 */
function divScalarMatrix( a, B) {
	var res = new Matrix(B.m, B.n, divScalarVector(a, B.val ), true);
	return res;
}
/**
 * @param {Matrix}
 * @param {Matrix}
 * @return {Matrix} 
 */
function divMatrices( A, B) {
	var res = new Matrix(A.m, A.n, divVectors(A.val, B.val ), true);
	return res;
}

function entrywisediv(a,b) {
	var ta = type(a);
	var tb = type(b); 

	switch(ta) {
		case "number": 
			switch(tb) {
			case "number":
				return a/b;
				break;
			case "vector":
				return divScalarVector(a,b);
				break;
			case "matrix":
				return divScalarMatrix(a,b);
				break;
			case "spvector":
				return divScalarspVector(a,b);
				break;
			case "spmatrix":
				return divScalarspMatrix(a,b);
				break;
			default:
				error("Error in entrywisediv(a,b): b must be a number, a vector or a matrix.");
				return undefined;
			}
			break;
		case "vector": 
			switch(tb) {
			case "number":
				return divVectorScalar(a,b);
				break;
			case "vector":
				if ( a.length != b.length ) {
					error("Error in entrywisediv(a,b): a.length = " + a.length + " != " + b.length + " = b.length.");
					return undefined;
				}
				return divVectors(a,b);
				break;
			case "spvector":
				error("Error in entrywisediv(a,b): b is a sparse vector with zeros.");
				break;
			default:
				error("Error in entrywisediv(a,B): a is a vector and B is a " + tb + ".");
				return undefined;
			}
			break;
		case "spvector": 
			switch(tb) {
			case "number":
				return mulScalarspVector(1/b, a);
				break;
			case "vector":
				if ( a.length != b.length ) {
					error("Error in entrywisediv(a,b): a.length = " + a.length + " != " + b.length + " = b.length.");
					return undefined;
				}
				return divVectorspVector(a,b);
				break;
			case "spvector":
				error("Error in entrywisediv(a,b): b is a sparse vector with zeros.");
				return undefined;
				break;
			default:
				error("Error in entrywisediv(a,B): a is a vector and B is a " + tb + ".");
				return undefined;
			}
			break;
		case "matrix": 
			switch(tb) {
			case "number":
				return divMatrixScalar(a,b);
				break;
			case "matrix":
				if ( a.m != b.m || a.n != b.n ) {
					error("Error in entrywisediv(A,B): size(A) = [" + a.m + "," + a.n + "] != [" + b.m + "," + b.n + "] = size(B).");
					return undefined;
				}
				return divMatrices(a,b);
				break;
			case "spmatrix":
				error("Error in entrywisediv(A,B): B is a sparse matrix with zeros.");
				return undefined;
				break;
			default:
				error("Error in entrywisediv(A,b): a is a matrix and B is a " + tb + ".");
				return undefined;
			}
		case "spmatrix": 
			switch(tb) {
			case "number":
				return mulScalarspMatrix(1/b,a);
				break;
			case "matrix":
				if ( a.m != b.m || a.n != b.n ) {
					error("Error in entrywisediv(A,B): size(A) = [" + a.m + "," + a.n + "] != [" + b.m + "," + b.n + "] = size(B).");
					return undefined;
				}
				return divMatrixspMatrix(a,b);
				break;
			case "spmatrix":
				error("Error in entrywisediv(A,B): B is a sparse matrix with zeros.");
				return undefined;
				break;
			default:
				error("Error in entrywisediv(A,b): a is a matrix and B is a " + tb + ".");
				return undefined;
			}
			break;
		default:
			error("Error in entrywisediv(a,b): a must be a number, a vector or a matrix.");
			return undefined;
			break;
	}
}

function outerprodVectors(a, b, scalar) {
	var i;
	var j;
	var ui;
	const m = a.length;
	const n = b.length;
	var res = new Matrix(m,n);
	if( arguments.length == 3 ) {
		for (i=0; i< m; i++) 
			res.val.set( mulScalarVector(scalar*a[i], b), i*n);	
	}
	else {
		for (i=0; i< m; i++) 
			res.val.set( mulScalarVector(a[i], b), i*n);	
	}
	return res;
}
function outerprod( u , v, scalar ) {
	// outer product of two vectors : res = scalar * u * v^T

	if (typeof(u) == "number" ) {
		if ( typeof(v) == "number" ) {
			if ( arguments.length == 2 )
				return u*v;
			else
				return u*v*scalar;
		}
		else {
			if ( arguments.length == 2 )
				return new Matrix(1,v.length, mulScalarVector(u, v), true );
			else
				return new Matrix(1,v.length, mulScalarVector(u*scalar, v), true ); 
		}
	}
	if ( u.length == 1 ) {
		if ( typeof(v) == "number" ) {
			if ( arguments.length == 2 )
				return u[0]*v;
			else
				return u[0]*v*scalar;
		}
		else  {
			if ( arguments.length == 2 )
				return new Matrix(1,v.length, mulScalarVector(u[0], v) , true);
			else
				return new Matrix(1,v.length, mulScalarVector(u[0]*scalar, v), true ); 
		}
	}
	if (typeof(v) == "number" ) {
		if (arguments.length == 2 ) 
			return mulScalarVector(v, u);
		else
			return mulScalarVector( scalar * v , u);
	}
	if ( v.length == 1) {
		if ( arguments.length == 2 )
			return mulScalarVector(v[0], u);
		else
			return mulScalarVector( scalar * v[0] , u);
	}
	
	if ( arguments.length == 2 )
		return outerprodVectors(u,v);
	else
		return outerprodVectors(u,v, scalar);
}
/**
 * @param {number}
 * @param {Float64Array}
 * @return {Float64Array} 
 */
function addScalarVector ( scalar, vec ) {
	const n = vec.length;
	var res = new Float64Array(vec);
	for (var i = 0 ; i< n; i++) 
		res[i] += scalar ;
	
	return res;
}
/**
 * @param {number}
 * @param {Matrix}
 * @return {Matrix} 
 */
function addScalarMatrix(a, B ) {
	return new Matrix(B.m, B.n, addScalarVector(a, B.val), true );
}
/**
 * @param {Float64Array}
 * @param {Float64Array}
 * @return {Float64Array} 
 */
function addVectors(a,b) {
	const n = a.length;
	var c = new Float64Array(a);
	for (var i=0; i < n; i++)
		c[i] += b[i];
	return c;
}
/**
 * @param {Matrix}
 * @param {Matrix}
 * @return {Matrix} 
 */
function addMatrices(A,B) {
	return new Matrix(A.m, A.n, addVectors(A.val, B.val) , true);
}
function add(a,b) {
	
	const ta = type(a);
	const tb = type(b);
	if ( ta == "number" && tb == "number" || ta == "string" || tb == "string")
		return a + b;
	else if ( ta == "number") {
		switch(tb) {
		case "Complex":
			return addComplexReal(b,a);
			break;
		case "vector":
			return addScalarVector(a,b); 
			break;
		case "matrix":
			return addScalarMatrix(a,b);
			break;
		case "spvector":
			return addScalarspVector(a,b); 
			break;
		case "spmatrix":
			return addScalarspMatrix(a,b);
			break;
		case "ComplexVector":
			return addScalarComplexVector(a,b); 
			break;
		case "ComplexMatrix":
			return addScalarComplexMatrix(a,b); 
			break;
		default:
			return undefined;
			break;			
		}
	}
	else if ( tb == "number" ) {
		switch(ta) {
		case "Complex":
			return addComplexReal(a,b);
			break;
		case "vector":
			return addScalarVector(b,a); 
			break;
		case "matrix":
			return addScalarMatrix(b,a);
			break;
		case "spvector":
			return addScalarspVector(b,a); 
			break;
		case "spmatrix":
			return addScalarspMatrix(b,a);
			break;
		case "ComplexVector":
			return addScalarComplexVector(b,a); 
			break;
		case "ComplexMatrix":
			return addScalarComplexMatrix(b,a); 
			break;
		default:
			return undefined;
			break;			
		}
	}
	else if ( ta == "vector" ) {
		switch(tb) {
		case "vector":
			// vector addition
			if ( a.length != b.length ) {
				error("Error in add(a,b): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined;
			}
			return addVectors(a,b);
			break;
		case "spvector":
			if ( a.length != b.length ) {
				error("Error in add(a,b): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined;
			}
			return addVectorspVector(a,b);
			break;
		case "ComplexVector":
			if ( a.length != b.length ) {
				error("Error in add(a,b): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined;
			}
			return addComplexVectorVector(b,a);
			break;
		case "matrix":
		case "spmatrix":
		default:
			error("Error in add(a,B): a is a vector and B is a " + tb + ".");
			return undefined;
			break;			
		}
	}
	else if ( ta == "matrix" ) {
		switch(tb) {
		case "matrix":
			// Matrix addition
			if ( a.m != b.m || a.n != b.n ) {
				error("Error in add(A,B): size(A) = [" + a.m + "," + a.n + "] != [" + b.m + "," + b.n + "] = size(B).");
				return undefined;
			}
			return addMatrices(a,b);
			break;
		case "spmatrix":
			// Matrix addition
			if ( a.m != b.m || a.n != b.n ) {
				error("Error in add(A,B): size(A) = [" + a.m + "," + a.n + "] != [" + b.m + "," + b.n + "] = size(B).");
				return undefined;
			}
			return addMatrixspMatrix(a,b);
			break;
		case "ComplexMatrix":
			// Matrix addition
			if ( a.m != b.m || a.n != b.n ) {
				error("Error in add(A,B): size(A) = [" + a.m + "," + a.n + "] != [" + b.m + "," + b.n + "] = size(B).");
				return undefined;
			}
			return addComplexMatrixMatrix(b,a);
			break;
		case "vector":
		case "spvector":
		default:
			error("Error in add(A,b): a is a matrix and B is a " + tb + ".");
			return undefined;
			break;			
		}		
	}
	else if ( ta == "spvector" ) {
		switch(tb) {
		case "vector":
			// vector addition
			if ( a.length != b.length ) {
				error("Error in add(a,b): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined;
			}
			return addVectorspVector(b,a);
			break;
		case "spvector":
			if ( a.length != b.length ) {
				error("Error in add(a,b): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined;
			}
			return addspVectors(a,b);
			break;
		case "matrix":
		case "spmatrix":
		default:
			error("Error in add(a,B): a is a sparse vector and B is a " + tb + ".");
			return undefined;
			break;			
		}
	}
	else if ( ta == "spmatrix" ) {
		switch(tb) {
		case "matrix":
			// Matrix addition
			if ( a.m != b.m || a.n != b.n ) {
				error("Error in add(A,B): size(A) = [" + a.m + "," + a.n + "] != [" + b.m + "," + b.n + "] = size(B).");
				return undefined;
			}
			return addMatrixspMatrix(b,a);
			break;
		case "spmatrix":
			// Matrix addition
			if ( a.m != b.m || a.n != b.n ) {
				error("Error in add(A,B): size(A) = [" + a.m + "," + a.n + "] != [" + b.m + "," + b.n + "] = size(B).");
				return undefined;
			}
			return addspMatrices(a,b);
			break;
		case "vector":
		case "spvector":
		default:
			error("Error in add(A,b): a is a sparse matrix and B is a " + tb + ".");
			return undefined;
			break;			
		}		
	}
	else if ( ta == "ComplexVector" ) {
		switch(tb) {
		case "vector":
			// vector addition
			if ( a.length != b.length ) {
				error("Error in add(a,b): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined;
			}
			return addComplexVectorVector(a,b);
			break;
		case "spvector":
			if ( a.length != b.length ) {
				error("Error in add(a,b): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined;
			}
			return addComplexVectorspVector(a,b);
			break;
		case "ComplexVector":
			if ( a.length != b.length ) {
				error("Error in add(a,b): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined;
			}
			return addComplexVectors(b,a);
			break;
		case "matrix":
		case "spmatrix":
		default:
			error("Error in add(a,B): a is a vector and B is a " + tb + ".");
			return undefined;
			break;			
		}
	}
	else if ( ta == "ComplexMatrix" ) {
		switch(tb) {
		case "matrix":
			// Matrix addition
			if ( a.m != b.m || a.n != b.n ) {
				error("Error in add(A,B): size(A) = [" + a.m + "," + a.n + "] != [" + b.m + "," + b.n + "] = size(B).");
				return undefined;
			}
			return addComplexMatrixMatrix(a,b);
			break;
		case "spmatrix":
			// Matrix addition
			if ( a.m != b.m || a.n != b.n ) {
				error("Error in add(A,B): size(A) = [" + a.m + "," + a.n + "] != [" + b.m + "," + b.n + "] = size(B).");
				return undefined;
			}
			return addComplexMatrixspMatrix(a,b);
			break;
		case "ComplexMatrix":
			// Matrix addition
			if ( a.m != b.m || a.n != b.n ) {
				error("Error in add(A,B): size(A) = [" + a.m + "," + a.n + "] != [" + b.m + "," + b.n + "] = size(B).");
				return undefined;
			}
			return addComplexMatrices(a,b);
			break;
		case "vector":
		case "spvector":
		default:
			error("Error in add(A,b): a is a matrix and B is a " + tb + ".");
			return undefined;
			break;			
		}		
	}
	else
		return undefined;
}
/**
 * @param {number}
 * @param {Float64Array}
 * @return {Float64Array} 
 */
function subScalarVector ( scalar, vec ) {
	const n = vec.length;
	var res = new Float64Array(n);
	for (var i = 0 ; i< n; i++) 
		res[i] = scalar - vec[i];		
	
	return res;
}
/**
 * @param {Float64Array}
 * @param {number}
 * @return {Float64Array} 
 */
function subVectorScalar ( vec, scalar ) {
	const n = vec.length;
	var res = new Float64Array(vec);
	for (var i = 0 ; i< n; i++) 
		res[i] -= scalar;
	
	return res;
}
/**
 * @param {number}
 * @param {Matrix} 
 * @return {Matrix} 
 */
function subScalarMatrix(a, B ) {
	return new Matrix(B.m, B.n, subScalarVector(a, B.val), true );
}
/**
 * @param {Matrix}
 * @param {number} 
 * @return {Matrix} 
 */
function subMatrixScalar(B, a ) {
	return new Matrix(B.m, B.n, subVectorScalar(B.val, a) , true);
}
/**
 * @param {Float64Array}
 * @param {Float64Array}
 * @return {Float64Array} 
 */
function subVectors(a,b) {
	const n = a.length;
	var c = new Float64Array(a);
	for (var i=0; i < n; i++)
		c[i] -= b[i];
	return c;
}
/**
 * @param {Matrix}
 * @param {Matrix} 
 * @return {Matrix} 
 */
function subMatrices(A,B) {
	return new Matrix(A.m, A.n, subVectors(A.val, B.val), true );
}
function sub(a,b) {
	
	const ta = type(a);
	const tb = type(b);
	if ( ta == "number" && tb == "number" )
		return a - b;
	else if ( ta == "number") {
		switch(tb) {
		case "Complex":
			return addComplexReal(minusComplex(b),a);
			break;
		case "vector":
			return subScalarVector(a,b); 
			break;
		case "matrix":
			return subScalarMatrix(a,b);
			break;
		case "spvector":
			return subScalarspVector(a,b); 
			break;
		case "spmatrix":
			return subScalarspMatrix(a,b);
			break;
		default:
			return undefined;
			break;			
		}
	}
	else if ( tb == "number" ) {
		switch(ta) {
		case "Complex":
			return addComplexReal(b,-a);
			break;
		case "vector":
			return subVectorScalar (a, b);
			break;
		case "matrix":
			return subMatrixScalar(a,b);
			break;
		case "spvector":
			return addScalarspVector(-b,a); 
			break;
		case "spmatrix":
			return addScalarspMatrix(-b,a);
			break;
		default:
			return undefined;
			break;			
		}		
	}
	else if ( ta == "vector" ) {
		switch(tb) {
		case "vector":
			// vector substraction
			if ( a.length != b.length ) {
				error("Error in sub(a,b): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined;
			}
			return subVectors(a,b);
			break;
		case "spvector":
			// vector substraction
			if ( a.length != b.length ) {
				error("Error in sub(a,b): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined;
			}
			return subVectorspVector(a,b);
			break;
		case "matrix":
		case "spmatrix":
		default:
			error("Error in sub(a,B): a is a vector and B is a " + tb + ".");
			return undefined;
			break;			
		}		
	}
	else if ( ta == "matrix" ) {
		switch(tb) {
		case "matrix":
			// Matrix sub
			if ( a.m != b.m || a.n != b.n ) {
				error("Error in sub(A,B): size(A) = [" + a.m + "," + a.n + "] != [" + b.m + "," + b.n + "] = size(B).");
				return undefined;
			}
			return subMatrices(a,b);
			break;
		case "spmatrix":
			// Matrix addition
			if ( a.m != b.m || a.n != b.n ) {
				error("Error in sub(A,B): size(A) = [" + a.m + "," + a.n + "] != [" + b.m + "," + b.n + "] = size(B).");
				return undefined;
			}
			return subMatrixspMatrix(a,b);
			break;
		case "vector":
		case "spvector":
		default:
			error("Error in sub(A,b): A is a matrix and b is a " + tb + ".");
			return undefined;
			break;			
		}	
	}
	else if ( ta == "spvector" ) {
		switch(tb) {
		case "vector":
			if ( a.length != b.length ) {
				error("Error in sub(a,b): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined;
			}
			return subspVectorVector(a,b);
			break;
		case "spvector":
			if ( a.length != b.length ) {
				error("Error in sub(a,b): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined;
			}
			return subspVectors(a,b);
			break;
		case "matrix":
		case "spmatrix":
		default:
			error("Error in sub(a,B): a is a sparse vector and B is a " + tb + ".");
			return undefined;
			break;			
		}
	}
	else if ( ta == "spmatrix" ) {
		switch(tb) {
		case "matrix":
			if ( a.m != b.m || a.n != b.n ) {
				error("Error in sub(A,B): size(A) = [" + a.m + "," + a.n + "] != [" + b.m + "," + b.n + "] = size(B).");
				return undefined;
			}
			return subspMatrixMatrix(a,b);
			break;
		case "spmatrix":
			if ( a.m != b.m || a.n != b.n ) {
				error("Error in sub(A,B): size(A) = [" + a.m + "," + a.n + "] != [" + b.m + "," + b.n + "] = size(B).");
				return undefined;
			}
			return subspMatrices(a,b);
			break;
		case "vector":
		case "spvector":
		default:
			error("Error in sub(A,b): a is a sparse matrix and B is a " + tb + ".");
			return undefined;
			break;			
		}		
	}
	else
		return undefined;
}

function pow(a,b) {
	var i;
	const ta = type(a);
	const tb = type(b);
	
	if ( ta == "number" && tb == "number" )
		return Math.pow(a, b);
	else if ( ta == "number") {
		if ( tb == "vector" ) {
			var c = zeros(b.length);
			if ( !isZero(a) ) {
				for (i=0;i<b.length;i++) {
					c[i] = Math.pow(a, b[i]);					
				}
			}
			return c;
		}
		else {
			var c = new Matrix( b.m, b.n, pow(a, b.val), true);
			return c;
		}	
	}
	else if ( tb == "number" ) {
		if ( ta == "vector" ) {			
			var c = zeros(a.length);
			for (i=0; i < a.length; i++)
				c[i] = Math.pow(a[i], b);
			return c;
		}
		else {			
			var c = new Matrix( a.m, a.n, pow(a.val, b), true);
			return c;
		}
	}
	else if ( ta == "vector" ) {
		if ( tb == "vector" ) {
			// entry-wise power
			if ( a.length != b.length ) {
				error("Error in pow(a,b): a.length = " + a.length + " != " + b.length + " = b.length.");
				return undefined;
			}
			var c = zeros(a.length);
			for ( i=0; i<a.length; i++ ) {
				c[i] = Math.pow(a[i], b[i]);
			}
			return c;
		}
		else {
			// vector + matrix
			return "undefined";
		}
	}
	else {
		if ( tb == "vector" ) {
			// matrix + vector 
			return "undefined";
		}
		else {
			// entry-wise power
			var c = new Matrix( a.m, a.n, pow(a.val, b.val), true);
			return c;
		}
	}
}

function minus ( x ) {
	
	switch(type(x)) {
	case "number":
		return -x;
		break;
	case "vector":
		return minusVector(x);
		break;
	case "spvector":
		return new spVector(x.length, minusVector(x.val), x.ind );		
		break;
	case "ComplexVector":
		return minusComplexVector(x);
		break;
	case "matrix":
		return new Matrix(x.m, x.n, minusVector(x.val), true );		
		break;
	case "spmatrix":
		return new spMatrix(x.m, x.n, minusVector(x.val), x.cols, x.rows );		
		break;
	case "ComplexMatrix":
		return minusComplexMatrix(x);
		break;
	default:
		return undefined;
	}
}
/**
 * @param {Float64Array}
 * @return {Float64Array} 
 */
function minusVector( x ) {
	var res = new Float64Array(x.length);
	for (var i =0; i < x.length; i++)
		res[i] = -x[i];	
	return res;
}
/**
 * @param {Matrix}
 * @return {Matrix} 
 */
function minusMatrix( x ) {
	return new Matrix(x.m, x.n, minusVector(x.val), true );		
}
// minimum

/**
 * @param {Float64Array}
 * @return {number} 
 */
function minVector( a ) {
	const n = a.length;
	var res = a[0];
	for (var i = 1; i < n ; i++) {
		if ( a[i] < res)
			res = a[i];
	}
	return res; 
}
/**
 * @param {Matrix}
 * @return {number} 
 */
function minMatrix( A ) {	
	return minVector(A.val);
}
/**
 * @param {Float64Array}
 * @param {number}
 * @return {Float64Array} 
 */
function minVectorScalar(vec, scalar ) {
	var n = vec.length;
	var res = new Float64Array(vec);
	for (var i = 0; i < n ; i++) {
		if ( scalar < vec[i])
			res[i] = scalar;
	}
	return res; 
}
/**
 * @param {Matrix}
 * @param {number}
 * @return {Matrix} 
 */
function minMatrixScalar(A, scalar ) {
	return new Matrix(A.m, A.n, minVectorScalar(A.val, scalar), true);
}
/**
 * @param {Matrix}
 * @return {Matrix} 
 */
function minMatrixRows( A ) {
	const m = A.m;
	const n = A.n;
	var res = new Float64Array(A.val.subarray(0,n) );
	var j;
	var r = n;
	for ( var i=1; i < m; i++) {
		for ( j = 0; j < n; j++) 
			if( A.val[r + j] < res[j])
				res[j] = A.val[r + j];
		r += n;		
	}
	return new Matrix(1,n,res, true);
}
/**
 * @param {Matrix}
 * @return {Float64Array} 
 */
function minMatrixCols( A ) {
	var m = A.m;
	var res = new Float64Array(m);
	var r = 0;
	for ( var i=0; i < m; i++) {
		res[i] = minVector(A.val.subarray(r, r+A.n) );
		r += A.n;
	}
	return res;
}
/**
 * @param {Float64Array}
 * @param {Float64Array} 
 * @return {Float64Array} 
 */
function minVectorVector(a, b) {
	const n = a.length;
	var res = new Float64Array(a);
	for (var i = 0; i < n ; i++) {
		if ( b[i] < a[i])
			res[i] = b[i];
	}
	return res; 
}
/**
 * @param {Matrix}
 * @param {Matrix} 
 * @return {Matrix} 
 */
function minMatrixMatrix( A, B ) {
	return new Matrix(A.m, A.n, minVectorVector(A.val, B.val), true);
}
function min(a,b) {
	var ta = type(a);
	
	if ( arguments.length == 1 ) {
		switch( ta ) {
		case "vector":
			return minVector(a);
			break;
		case "spvector":
			var m = minVector(a.val);
			if ( m > 0 && a.val.length < a.length )
				return 0;
			else
				return m;
			break;
		case "matrix":
			return minMatrix(a);
			break;
		case "spmatrix":
			var m = minVector(a.val);
			if ( m > 0 && a.val.length < a.m * a.n )
				return 0;
			else
				return m;
			break;
		default:
			return a;
			break;
		}
	}

	var tb = type(b); 
	if (ta == "spvector" ) {
		a = fullVector(a);
		ta = "vector";
	}
	if (ta == "spmatrix" ) {
		a = fullMatrix(a);
		ta = "matrix";
	}
	if (tb == "spvector" ) {
		b = fullVector(b);
		tb = "vector";
	}
	if (tb == "spmatrix" ) {
		b = fullMatrix(b);
		tb = "matrix";
	}

	if ( ta == "number" && tb == "number" ) 
		return Math.min(a,b);
	else if ( ta == "number") {
		if ( tb == "vector" )  
			return minVectorScalar(b, a ) ;
		else 
			return minMatrixScalar(b, a ) ;
	}	
	else if ( tb == "number" ) {
		if ( ta == "vector" ) 
			return minVectorScalar(a, b);
		else {
			// MAtrix , scalar 
			if ( b == 1) 
				return minMatrixRows(a); // return row vector of min of columns
			else if ( b == 2 ) 
				return minMatrixCols(a); // return column vector of min of rows
			else 
				return minMatrixScalar(a, b);
		}
	}
	else if ( ta == "vector" ) {
		if ( tb == "vector" ) 
			return minVectorVector(a,b);
		else 
			return "undefined";
	}
	else {
		if ( tb == "matrix" ) 
			return minMatrixMatrix(a,b);
		else 
			return "undefined";				
	}
}

// maximum
/**
 * @param {Float64Array}
 * @return {number} 
 */
function maxVector( a ) {
	const n = a.length;
	var res = a[0];
	for (var i = 1; i < n ; i++) {
		if ( a[i] > res)
			res = a[i];
	}
	return res; 
}
/**
 * @param {Matrix}
 * @return {number} 
 */
function maxMatrix( A ) {
	return maxVector(A.val);
}
/**
 * @param {Float64Array}
 * @param {number} 
 * @return {Float64Array} 
 */
function maxVectorScalar(vec, scalar ) {
	const n = vec.length;
	var res = new Float64Array(vec);
	for (var i = 0; i < n ; i++) {
		if ( scalar > vec[i])
			res[i] = scalar;
	}
	return res; 
}
/**
 * @param {Matrix}
 * @param {number} 
 * @return {Matrix} 
 */
function maxMatrixScalar(A, scalar ) {
	return maxVectorScalar(A.val, scalar);
}
/**
 * @param {Matrix}
 * @return {Matrix} 
 */
function maxMatrixRows( A ) {
	const m = A.m;
	const n = A.n;
	var res = new Float64Array(A.val.subarray(0,n) );
	var j;
	var r = n;
	for ( var i=1; i < m; i++) {
		for ( j = 0; j < n; j++) 
			if( A.val[r + j] > res[j])
				res[j] = A.val[r + j];
		r += n;		
	}
	return new Matrix(1,n,res,true);
}
/**
 * @param {Matrix}
 * @return {Float64Array} 
 */
function maxMatrixCols( A ) {
	const m = A.m;
	var res = new Float64Array(m);
	var r = 0;
	for ( var i=0; i < m; i++) {
		res[i] = maxVector(A.val.subarray(r, r+A.n) );
		r += A.n;
	}
	return res;
}
/**
 * @param {Float64Array}
 * @param {Float64Array} 
 * @return {Float64Array} 
 */
function maxVectorVector(a, b) {
	var n = a.length;
	var res = new Float64Array(a);
	for (var i = 0; i < n ; i++) {
		if ( b[i] > a[i])
			res[i] = b[i];
	}
	return res; 
}
/**
 * @param {Matrix}
 * @param {Matrix} 
 * @return {Matrix} 
 */
function maxMatrixMatrix( A, B ) {
	return new Matrix(A.m, A.n, maxVectorVector(A.val, B.val), true);
}
function max(a,b) {
	var ta = type(a);

	if ( arguments.length == 1 ) {
		switch( ta ) {
		case "vector":
			return maxVector(a);
			break;
		case "spvector":
			var m = maxVector(a.val);
			if ( m < 0 && a.val.length < a.length )
				return 0;
			else
				return m;
			break;
		case "matrix":
			return maxMatrix(a);
			break;
		case "spmatrix":
			var m = maxVector(a.val);
			if ( m < 0 && a.val.length < a.m * a.n )
				return 0;
			else
				return m;
			break;
		default:
			return a;
			break;
		}
	}

	var tb = type(b); 
	if (ta == "spvector" ) {
		a = fullVector(a);
		ta = "vector";
	}
	if (ta == "spmatrix" ) {
		a = fullMatrix(a);
		ta = "matrix";
	}
	if (tb == "spvector" ) {
		b = fullVector(b);
		tb = "vector";
	}
	if (tb == "spmatrix" ) {
		b = fullMatrix(b);
		tb = "matrix";
	}
	
	if ( ta == "number" && tb == "number" ) 
		return Math.max(a,b);
	else if ( ta == "number") {
		if ( tb == "vector" )  
			return maxVectorScalar(b, a ) ;
		else 
			return maxMatrixScalar(b, a ) ;
	}	
	else if ( tb == "number" ) {
		if ( ta == "vector" ) 
			return maxVectorScalar(a, b);
		else {
			// MAtrix , scalar 
			if ( b == 1) 
				return maxMatrixRows(a); // return row vector of max of columns
			else if ( b == 2 ) 
				return maxMatrixCols(a); // return column vector of max of rows
			else 
				return maxMatrixScalar(a, b);
		}
	}
	else if ( ta == "vector" ) {
		if ( tb == "vector" ) 
			return maxVectorVector(a,b);
		else 
			return "undefined";
	}
	else {
		if ( tb == "matrix" ) 
			return maxMatrixMatrix(a,b);
		else 
			return "undefined";				
	}
}
/**
 * @param {Matrix} 
 */
function transposeMatrix ( A ) {
	var i;
	var j;
	const m = A.m;
	const n = A.n;
	if ( m > 1 ) {
		var res = zeros( n,m);
		var Aj = 0;
		for ( j=0; j< m;j++) {
			var ri = 0;
			for ( i=0; i < n ; i++) {
				res.val[ri + j] = A.val[Aj + i];
				ri += m;
			}
			Aj += n;
		}
		return res;
	}
	else {
		return A.val;
	}
}
/**
 * @param {Float64Array} 
 * @return {Matrix}
 */
function transposeVector ( a ) {
	return new Matrix(1,a.length, a);
}
function transpose( A ) {	
	var i;
	var j;
	switch( type( A ) ) {
		case "number":
			return A;
			break;
		case "vector":
			var res = new Matrix(1,A.length, A);
			return res;	// matrix with a single row
			break;
		case "spvector":
			return transposespVector(A);
			break;
		case "ComplexVector":
			var res = new ComplexMatrix(1,A.length, conj(A));
			return res;	// matrix with a single row
			break;
		case "matrix":	
			return transposeMatrix(A);
			break;
		case "spmatrix":
			return transposespMatrix(A);
			break;
		case "ComplexMatrix":
			return transposeComplexMatrix(A);
			break;
		default:
			return undefined;
			break;
	}
}

/**
 * @param {Matrix} 
 * @return {number}
 */
function det( A ) {	
	const n = A.n;
	if ( A.m != n || typeof(A.m) =="undefined") 
		return undefined; 
	
	if ( n == 2 ) {
		return A.val[0]*A.val[3] - A.val[1]*A.val[2];
	}
	else {
		var detA = 0;
		var i,j;
		for ( i=0; i < n; i++ ) {
			var proddiag = 1;
			for ( j=0; j < n ; j++) 
				proddiag *= A.val[( (i+j)%n ) * n + j];			
			
			detA += proddiag;			
		}
		for ( i=0; i < n; i++ ) {
			var proddiag = 1;
			for ( j=0; j < n ; j++) 
				proddiag *= A.val[( (i+n-1-j)%n ) * n + j];			
			
			detA -= proddiag;			
		}
	}
	return detA;
}
function trace ( A ) {
	if ( type(A) == "matrix") {
		var n = A.length;
		if ( A.m  != n ) 
			return "undefined";
		var res = 0;
		for ( var i =0; i< n;i++) 
			res += A.val[i*n + i];
		return res;
	}
	else {
		return undefined;
	}
}
/**
 * @param {Matrix} 
 * @return {Matrix}
 */
function triu ( A ) {
	// return the upper triangular part of A
	var i;
	var j;
	const n = A.n;
	const m = A.m;
	var res = zeros(m, n);
	var im = m;
	if ( n < m )
		im = n;
	var r = 0;
	for (i=0; i < im; i++) {
		for ( j=i; j < n; j++)
			res.val[r + j] = A.val[r + j]; 
		r += n;
	}
	return res;
}
/**
 * @param {Matrix} 
 * @return {Matrix}
 */
function tril ( A ) {	
	// return the lower triangular part of A
	var i;
	var j;
	const n = A.n;
	const m = A.m;
	var res = zeros(m, n);
	var im = m;
	if ( n < m )
		im = n;
	var r = 0;		
	for (i=0; i < im; i++) {
		for ( j=0; j <= i; j++)
			res.val[r + j] = A.val[r + j]; 
		r += n;
	}
	if ( m > im ) {
		for (i=im; i < m; i++) {
			for ( j=0; j < n; j++)
				res.val[r + j] = A.val[r + j]; 
			r += n;	
		}
	}
	return res;
}

/**
 * @param {Matrix} 
 * @return {boolean}
 */
function issymmetric ( A ) {	
	const m = A.m;
	const n= A.n;
	if ( m != n )
		return false;
		
	for (var i=0;i < m; i++)
		for ( var j=0; j < n; j++) 
			if ( A.val[i*n+j] != A.val[j*n+i] )
				return false;
				
	return true;
}

/** Concatenate matrices/vectors
 * @param {Array} 
 * @param {boolean}
 * @return {Matrix}
 */
function mat( elems, rowwise ) {
	var k;
	var concatWithNumbers = false;
	var elemtypes = new Array(elems.length);
	for ( k=0; k < elems.length; k++) {
		elemtypes[k] = type(elems[k]);
		if ( elemtypes[k] == "number" ) 
			concatWithNumbers = true;		
	}
	
	
	if (typeof(rowwise ) == "undefined") {
		// check if vector of numbers
		if ( type(elems) == "vector" )
			return new Float64Array(elems);
			
		// check if 2D Array => toMatrix rowwise
		var rowwise = true;		
		for (k=0; k < elems.length; k++) {
			if ( !Array.isArray(elems[k] ) || elemtypes[k] == "vector" ) {
				rowwise = false;
				if ( elemtypes[k] == "string" ) 
					return elems; // received vector of strings => return it directly
			}
		}
	}

	if ( elems.length == 0 ) {
		return []; 
	}

	var m = 0;
	var n = 0;
	var i;
	var j;
	if ( rowwise ) {
		var res = new Array( ) ;
		
		for ( k= 0; k<elems.length; k++) {
			switch( elemtypes[k] ) {
			case "matrix":
				res. push( elems[k].val ) ;
				m += elems[k].m;
				n = elems[k].n;
				break;
			
			case "vector": 				
				if ( concatWithNumbers ) {
					// return a column by concatenating vectors and numbers
					for ( var l=0; l < elems[k].length; l++)
						res.push(elems[k][l]) ;
					n = 1;
					m += elems[k].length;
				}
				else {
					// vector (auto transposed) as row in a matrix
					res.push (elems[k]) ;
					m += 1;
					n = elems[k].length;
				}
				break;
			
			case "number":
				res.push(elems[k]) ; 
				m += 1; 
				n = 1;
				break;

			case "spvector":
				return spmat(elems);

			default:
				// Array containing not only numbers... 
				// probably calling mat( Array2D ) => return Array2D
				return elems;
				break;
			}
		}
		if ( n == 1) {
			var M = new Float64Array(res); 
			return M; 
		}
		var M = new Matrix( m , n ) ;
		var p = 0;
		for (k=0; k < res.length ; k++) {
			if(res[k].buffer) {
				M.val.set( res[k], p);
				p += res[k].length;
			}
			else {
				for ( j=0; j < res[k].length; j++)
					M.val[p+j] = res[k][j];
				p += res[k].length;
			}
		}
		return M;
	}
	else {
		// compute size
		m = size(elems[0], 1);
		for ( k= 0; k<elems.length; k++) {
			if ( elemtypes[k] == "matrix")
				n += elems[k].n;
			else 
				n++;
			if ( size( elems[k], 1) != m)
				return "undefined";			
		}

		// Build matrix
		var res = new Matrix(m, n); 
		var c;
		for (i=0;i<m;i++) {
			c = 0; // col index
			for ( k=0;k<elems.length; k++) {
				switch( elemtypes[k] ) {
				case "matrix":
					for ( j=0; j < elems[k].n; j++) {
							res.val[i*n + j+c] = elems[k].val[i*elems[k].n + j] ;
					}
					c += elems[k].n;
					break;
				
				case "vector": //vector 
					res.val[i*n +c]= elems[k][i] ;
					c++;
					break;
				
				case "number":
					res.val[i*n+c] = elems[k]; 
					c++;
					break;
				default:
					break;
				}
			}
		}
		
		return res;
	}
}
/// Relational Operators

function isEqual( a, b) {
	var i;
	var j;
	var res;
	var ta = type(a);
	var tb = type(b);
	
	if ( ta == "number" && tb != "number" )
		return isEqual(b,a);
	
	if( ta != "number" && tb == "number" ) {
		// vector/matrix + scalar
		switch( ta ) {
			case "vector":
				res = new Float64Array(a.length);
				for ( i=0; i<a.length; i++) {
					if ( isZero( a[i] - b ) )
						res[i] = 1;					
				}
				return res;
				break;
			case "matrix":
				res = new Matrix(a.m, a.n, isEqual(a.val, b), true );
				return res;
				break;
			default:
				return (a==b?1:0);
		}
	}
	else if ( ta == tb ) {

		switch( ta ) {
			case "number":
				return ( isZero(a - b)?1:0 );
				break;
			case "vector":
				res = new Float64Array(a.length);
				for ( i=0; i<a.length; i++) {
					if ( isZero( a[i] - b[i] ) )
						res[i] = 1;					
				}
				return res;
				break;
			case "matrix":
				res = new Matrix(a.m, a.n, isEqual(a.val, b.val) , true);
				return res;
				break;
			default:
				return (a==b?1:0);
		}
	}
	else 
		return "undefined";
}	 
function isNotEqual( a, b) {
	var i;
	var j;
	var res;
	var ta = type(a);
	var tb = type(b);
	
	if ( ta == "number" && tb != "number" )
		return isNotEqual(b,a);
	
	if( ta != "number" && tb == "number" ) {
		// vector/matrix + scalar
		switch( ta ) {
			case "vector":
				res = new Float64Array(a.length);
				for ( i=0; i<a.length; i++) {
					if ( !isZero( a[i] - b ) )
						res[i] = 1;		
				}
				return res;
				break;
			case "matrix":
				res = new Matrix(a.m, a.n, isNotEqual(a.val, b), true );
				return res;
				break;
			default:
				return (a!=b?1:0);
		}
	}
	else if ( ta == tb ) {

		switch( ta ) {
			case "number":
				return ( !isZero(a - b)?1:0 );
				break;
			case "vector":
				res = new Float64Array(a.length);
				for ( i=0; i<a.length; i++) {
					if ( !isZero( get(a, i) - get(b,i) ) )
						res[i] = 1;					
				}
				return res;
				break;
			case "matrix":
				res = new Matrix(a.m, a.n, isNotEqual(a.val, b.val), true );
				return res;
				break;
			default:
				return (a!=b?1:0);
		}
	}
	else 
		return "undefined";
}	 

function isGreater( a, b) {
	var i;
	var j;
	var res;
	var ta = type(a);
	var tb = type(b);
	
	if ( ta == "number" && tb != "number" )
		return isGreater(b,a);
	
	if( ta != "number" && tb == "number" ) {
		// vector/matrix + scalar
		switch( ta ) {
			case "vector":
				res = new Float64Array(a.length);
				for ( i=0; i<a.length; i++) {
					if (  a[i] - b > EPS )
						res[i] = 1;					
				}
				return res;
				break;
			case "matrix":
				res = new Matrix(a.m, a.n, isGreater(a.val, b), true );
				return res;
				break;
			default:
				return (a>b?1:0);
		}
	}
	else if (ta == tb) {

		switch( ta ) {
			case "number":
				return (a>b?1:0);
				break;
			case "vector":
				res = new Float64Array(a.length);
				for ( i=0; i<a.length; i++) {
					if (  a[i] - b[i] > EPS )
						res[i] = 1;					
				}
				return res;
				break;
			case "matrix":
				res = new Matrix(a.m, a.n, isGreater(a.val, b.val), true );
				return res;
				break;
			default:
				return (a>b?1:0);
		}
	}
	else 
		return "undefined";
}	 
function isGreaterOrEqual( a, b) {
	var i;
	var j;
	var res;
	var ta = type(a);
	var tb = type(b);
	
	if ( ta == "number" && tb != "number" )
		return isGreaterOrEqual(b,a);
	
	if( ta != "number" && tb == "number" ) {
		// vector/matrix + scalar
		switch( ta ) {
			case "vector":
				res = new Float64Array(a.length);
				for ( i=0; i<a.length; i++) {
					if (  a[i] - b > -EPS )
						res[i] = 1;					
				}
				return res;
				break;
			case "matrix":
				res = new Matrix(a.m, a.n, isGreaterOrEqual(a.val, b), true );
				return res;
				break;
			default:
				return (a>=b?1:0);
		}
	}
	else if ( ta == tb ) {

		switch( ta ) {
			case "number":
				return (a>=b);
				break;
			case "vector":
				res = new Float64Array(a.length);
				for ( i=0; i<a.length; i++) {
					if ( a[i] - b[i] > -EPS )
						res[i] = 1;					
				}
				return res;
				break;
			case "matrix":
				res = new Matrix(a.m, a.n, isGreaterOrEqual(a.val, b.val), true );
				return res;
				break;
			default:
				return (a>=b?1:0);
		}
	}
	else 
		return "undefined";
}	 

function isLower( a, b) {
	var i;
	var j;
	var res;
	var ta = type(a);
	var tb = type(b);
	
	if ( ta == "number" && tb != "number" )
		return isLower(b,a);
	
	if( ta != "number" && tb == "number" ) {
		// vector/matrix + scalar
		switch( ta ) {
			case "vector":
				res = new Float64Array(a.length);
				for ( i=0; i<a.length; i++) {
					if (  b - a[i] > EPS ) 
						res[i] = 1;					
				}
				return res;
				break;
			case "matrix":
				res = new Matrix(a.m, a.n, isLower(a.val, b), true );
				return res;
				break;
			default:
				return (a<b?1:0);
		}
	}
	else if ( ta == tb ) {

		switch( ta ) {
			case "number":
				return (a<b?1:0);
				break;
			case "vector":
				res = new Float64Array(a.length);
				for ( i=0; i<a.length; i++) {
					if (  b[i] - a[i] > EPS )
						res[i] = 1;					
				}
				return res;
				break;
			case "matrix":
				res = new Matrix(a.m, a.n, isLower(a.val, b.val), true );
				return res;
				break;
			default:
				return (a<b?1:0);
		}
	}
	else 
		return "undefined";
}	 
function isLowerOrEqual( a, b) {
	var i;
	var j;
	var res;
	
	var ta = type(a);
	var tb = type(b);
	
	if ( ta == "number" && tb != "number" )
		return isLowerOrEqual(b,a);
	
	if( ta != "number" && tb == "number" ) {
		// vector/matrix + scalar
		switch( ta ) {
			case "vector":
				res = new Float64Array(a.length);
				for ( i=0; i<a.length; i++) {
					if (  b - a[i] > -EPS )
						res[i] = 1;					
				}
				return res;
				break;
			case "matrix":
				res = new Matrix(a.m, a.n, isLowerOrEqual(a.val, b), true );
				return res;
				break;
			default:
				return (a<=b?1:0);
		}
	}
	else if ( ta == tb ) {

		switch( ta ) {
			case "number":
				return (a<=b?1:0);
				break;
			case "vector":
				res = new Float64Array(a.length);
				for ( i=0; i<a.length; i++) {
					if ( b[i] - a[i] > -EPS )
						res[i] = 1;					
				}
				return res;
				break;
			case "matrix":
				res = new Matrix(a.m, a.n, isLowerOrEqual(a.val, b.val) , true);
				return res;
				break;
			default:
				return (a<=b?1:0);
		}
	}
	else 
		return "undefined";
}	 


function find( b ) {
	// b is a boolean vector of 0 and 1.
	// return the indexes of the 1's.
	var i;
	var n = b.length;
	var res = new Array();
	for ( i=0; i < n; i++) {
		if ( b[i] != 0 )
			res.push(i);			
	}
	return res;
}
argmax = findmax;
function findmax( x ) {
	// return the index of the maximum in x
	var i;
	
	switch ( type(x)) {
	case "number":
		return 0;
		break;
	case "vector":
		var idx = 0;
		var maxi = x[0];
		for ( i= 1; i< x.length; i++) {
			if ( x[i] > maxi ) {
				maxi = x[i];
				idx = i;
			}
		}
		return idx;
		break;	
	case "spvector":
		var maxi = x.val[0];
		var idx = x.ind[0];

		for ( i= 1; i< x.val.length; i++) {
			if ( x.val[i] > maxi ) {
				maxi = x.val[i];
				idx = x.ind[i];
			}
		}
		if ( maxi < 0 && x.val.length < x.length ) {
			idx = 0;
			while ( x.ind.indexOf(idx) >= 0 && idx < x.length)
				idx++;
		}
		return idx;
		break;			
	default:
		return "undefined";
	}	

}
argmin = findmin;
function findmin( x ) {
	// return the index of the minimum in x
	var i;
	
	switch ( type(x)) {
	case "number":
		return 0;
		break;
	case "vector":
		var idx = 0;
		var mini = x[0];
		for ( i= 1; i< x.length; i++) {
			if ( x[i] < mini ) {
				mini = x[i];
				idx = i;
			}
		}		
		return idx;
		break;
	case "spvector":
		var mini = x.val[0];
		var idx = x.ind[0];

		for ( i= 1; i< x.val.length; i++) {
			if ( x.val[i] < mini ) {
				mini = x.val[i];
				idx = x.ind[i];
			}
		}
		if ( mini > 0 && x.val.length < x.length ) {
			idx = 0;
			while ( x.ind.indexOf(idx) >= 0 && idx < x.length)
				idx++;
		}
		return idx;
		break;				
	default:
		return "undefined";
	}

}

/**
 * @param {Float64Array}
 * @param {boolean} 
 * @param {boolean}  
 * @return {Float64Array|Array} 
 */
function sort( x, decreasingOrder , returnIndexes) {
	// if returnIndexes = true : replace x with its sorted version 
	// otherwise return a sorted copy without altering x

	if ( typeof(decreasingOrder) == "undefined")
		var decreasingOrder = false;
	if ( typeof(returnIndexes) == "undefined")
		var returnIndexes = false;
	
	var i;
	var j;
	var tmp;
		
	const n = x.length;
	if ( returnIndexes ) {
		var indexes = range(n);
		for ( i=0; i < n - 1; i++) {
			if ( decreasingOrder ) 
				j = findmax( get ( x, range(i,n) ) ) + i ;
			else 
				j = findmin( get ( x, range(i,n) ) ) + i;		

			if ( i!=j) {
				tmp = x[i]; 
				x[i] = x[j];
				x[j] = tmp;
			
				tmp = indexes[i]; 
				indexes[i] = indexes[j];
				indexes[j] = tmp;
			}			
		}
		return indexes;
	}
	else {
		var xs = vectorCopy(x);
		for ( i=0; i < n - 1; i++) {
			if ( decreasingOrder ) 
				j = findmax( get ( xs, range(i,n) ) ) + i;
			else 
				j = findmin( get ( xs, range(i,n) ) ) + i;		
			
			if ( i!=j) {
				tmp = xs[i]; 
				xs[i] = xs[j];
				xs[j] = tmp;
			}
		}
		return xs;
	}
}

/// Stats
/**
 * @param {Float64Array} 
 * @return {number}
 */
function sumVector ( a ) {
	var i;
	const n = a.length;
	var res = a[0];
	for ( i=1; i< n; i++) 
		res += a[i];
	return res;
}
/**
 * @param {Matrix} 
 * @return {number}
 */
function sumMatrix ( A ) {
	return sumVector(A.val);
}
/**
 * @param {Matrix} 
 * @return {Matrix}
 */
function sumMatrixRows( A ) {
	var i;
	var j;
	const m = A.m;
	const n = A.n;
	var res = new Float64Array(n); 
	var r = 0;
	for ( i=0; i< m; i++) {
		for (j=0; j < n; j++)
			res[j] += A.val[r + j]; 
		r += n;
	}
	return new Matrix(1,n,res, true); // return row vector 
}
/**
 * @param {Matrix} 
 * @return {Float64Array}
 */
function sumMatrixCols( A ) {
	const m = A.m;
	var res = new Float64Array(m);
	var r = 0;
	for ( var i=0; i < m; i++) {
		for (var j=0; j < A.n; j++)
			res[i] += A.val[r + j];
		r += A.n;
	}
	return res;
}
function sum( A , sumalongdimension ) {
	
	switch ( type( A ) ) {
	case "vector":
		if ( arguments.length == 1 || sumalongdimension == 1 ) {
			return sumVector(A);
		}
		else {
			return vectorCopy(A);
		}
		break;
	case "spvector":
		if ( arguments.length == 1 || sumalongdimension == 1 ) 
			return sumVector(A.val);		
		else 
			return A.copy();
		break;

	case "matrix":
		if( arguments.length == 1  ) {
			return sumMatrix( A ) ;
		}
		else if ( sumalongdimension == 1 ) {
			return sumMatrixRows( A );	
		}
		else if ( sumalongdimension == 2 ) {
			return sumMatrixCols( A );	
		}
		else 
			return undefined;
		break;
	case "spmatrix":
		if( arguments.length == 1  ) {
			return sumVector( A.val ) ;
		}
		else if ( sumalongdimension == 1 ) {
			return sumspMatrixRows( A );	
		}
		else if ( sumalongdimension == 2 ) {
			return sumspMatrixCols( A );	
		}
		else 
			return undefined;
		break;
	default: 
		return A;
		break;
	}
}
/**
 * @param {Float64Array} 
 * @return {number}
 */
function prodVector ( a ) {
	var i;
	const n = a.length;
	var res = a[0];
	for ( i=1; i< n; i++) 
		res *= a[i];
	return res;
}
/**
 * @param {Matrix} 
 * @return {number}
 */
function prodMatrix ( A ) {
	return prodVector(A.val);
}
/**
 * @param {Matrix} 
 * @return {Matrix}
 */
function prodMatrixRows( A ) {
	var i;
	var j;
	const m = A.m;
	const n = A.n;
	var res = new Float64Array(A.row(0)); 
	var r = n;
	for ( i=1; i< m; i++) {
		for (j=0; j < n; j++)
			res[j] *= A.val[r + j]; 
		r += A.n;
	}
	return new Matrix(1,n,res, true); // return row vector 
}
/**
 * @param {Matrix} 
 * @return {Float64Array}
 */
function prodMatrixCols( A ) {
	const m = A.m;
	var res = new Float64Array(m);
	var r = 0;
	for ( var i=0; i < m; i++) {
		res[i] = A.val[r];
		for (var j=1; j < A.n; j++)
			res[i] *= A.val[r + j];
		r += A.n;
	}
	return res;
}
function prod( A , prodalongdimension ) {
	
	switch ( type( A ) ) {
	case "vector":
		if ( arguments.length == 1 || prodalongdimension == 1 ) 
			return prodVector(A);
		else 
			return vectorCopy(A);
		break;
	case "spvector":
		if ( arguments.length == 1 || prodalongdimension == 1 ) {
			if ( A.val.length < A.length )
				return 0;
			else
				return prodVector(A.val);
		}
		else 
			return A.copy();
		break;
	case "matrix":
		if( arguments.length == 1  ) {
			return prodMatrix( A ) ;
		}
		else if ( prodalongdimension == 1 ) {
			return prodMatrixRows( A );	
		}
		else if ( prodalongdimension == 2 ) {
			return prodMatrixCols( A );	
		}
		else 
			return undefined;
		break;
	case "spmatrix":
		if( arguments.length == 1  ) { 
			if ( A.val.length < A.m * A.n )
				return 0;
			else
				return prodVector( A.val ) ;
		}
		else if ( prodalongdimension == 1 ) {
			return prodspMatrixRows( A );	
		}
		else if ( prodalongdimension == 2 ) {
			return prodspMatrixCols( A );	
		}
		else 
			return undefined;
		break;
	default: 
		return A;
		break;
	}
}

function mean( A , sumalongdimension ) {
	
	switch ( type( A ) ) {
	case "vector":
		if ( arguments.length == 1 || sumalongdimension == 1 ) {
			return sumVector(A) / A.length;
		}
		else {
			return vectorCopy(A);
		}
		break;
	case "spvector":
		if ( arguments.length == 1 || sumalongdimension == 1 ) 
			return sumVector(A.val) / A.length;		
		else 
			return A.copy();		
		break;

	case "matrix":
		if( arguments.length == 1  ) {
			return sumMatrix( A ) / ( A.m * A.n);
		}
		else if ( sumalongdimension == 1 ) {
			return mulScalarMatrix( 1/A.m, sumMatrixRows( A ));	
		}
		else if ( sumalongdimension == 2 ) {
			return mulScalarVector( 1/A.n, sumMatrixCols( A )) ;	
		}
		else 
			return undefined;
		break;
	case "spmatrix":
		if( arguments.length == 1  ) {
			return sumVector( A.val ) / ( A.m * A.n);
		}
		else if ( sumalongdimension == 1 ) {
			return mulScalarMatrix(1/A.m, sumspMatrixRows(A));
		}
		else if ( sumalongdimension == 2 ) {
			return mulScalarVector(1/A.n, sumspMatrixCols(A));
		}
		else 
			return undefined;
		break;
	default: 
		return A;
		break;
	}
}

function variance(A, alongdimension ) {
	// variance = sum(A^2)/n - mean(A)^2
	if ( arguments.length > 1 )	
		var meanA = mean(A, alongdimension);
	else
		var meanA = mean(A);

	switch ( type( A ) ) {
	case "number":
		return 0;
		break;
	case "vector":
		if ( arguments.length == 1 || alongdimension == 1 ) {		
			var res = ( dot(A,A) / A.length ) - meanA*meanA;
			return res ;
		}
		else {
			return zeros(A.length);
		}
		break;
	case "spvector":
		if ( arguments.length == 1 || alongdimension == 1 ) {		
			var res = ( dot(A.val,A.val) / A.length ) - meanA*meanA;
			return res ;
		}
		else 
			return zeros(A.length);
		
		break;
			
	case "matrix":
	case "spmatrix":
		if( typeof(alongdimension) == "undefined" ) {
			var res = (sum(entrywisemul(A,A)) / (A.m * A.n ) ) - meanA*meanA;
			return res;
		}
		else if ( alongdimension == 1 ) {
			// var of columns
			var res = sub( entrywisediv(sum(entrywisemul(A,A),1) , A.length ) , entrywisemul(meanA,meanA) );			
			return res;		
		}
		else if ( alongdimension == 2 ) {
			// sum all columns, result is column vector
			res = sub( entrywisediv(sum(entrywisemul(A,A),2) , A.n ) , entrywisemul(meanA,meanA) );
			return res;		
		}
		else 
			return undefined;
		break;
	default: 
		return undefined;
	}
}

function std(A, alongdimension)  {
	if ( arguments.length > 1 )	
		return sqrt(variance(A,alongdimension));
	else
		return sqrt(variance(A));
}

/**
 * Covariance matrix C = X'*X ./ X.m
 * @param {Matrix|Float64Array|spVector}
 * @return {Matrix|number}
 */
function cov( X ) {	
	switch ( type( X ) ) {
	case "number":
		return 0;
		break;
	case "vector":
		var mu = mean(X);
		return ( dot(X,X) / X.length - mu*mu);
		break;		
	case "spvector":
		var mu = mean(X);
		return ( dot(X.val,X.val) / X.length - mu*mu);
		break;
	case "matrix":
		var mu = mean(X,1).row(0);
		return divMatrixScalar(xtx( subMatrices(X, outerprod(ones(X.m), mu ) ) ), X.m);
		break;
	case "spmatrix":
		var mu = mean(X,1).row(0);
		return divMatrixScalar(xtx( subspMatrixMatrix(X, outerprod(ones(X.m), mu ) ) ), X.m);
		break;
	default: 
		return undefined;
	}
}
/**
 * Compute X'*X
 * @param {Matrix}
 * @return {Matrix}
 */
function xtx( X ) {
	const N = X.m;
	const d = X.n; 

	var C = new Matrix(d,d); 
	for (var i=0; i < N; i++) {
		var xi= X.row(i);
		for(var k = 0; k < d; k++) {
			var xik = xi[k];
			for (var j=k; j < d; j++) {
				C.val[k*d + j] += xik * xi[j]; 
			}
		}
	}
	// Symmetric lower triangular part:
	for(var k = 0; k < d; k++) {
		var kd = k*d;
		for (var j=k; j < d; j++) 
			C.val[j*d+k] = C.val[kd+j]; 
	}
	return C;
}

function norm( A , sumalongdimension ) {
	// l2-norm (Euclidean norm) of vectors or Frobenius norm of matrix
	var i;
	var j;
	switch ( type( A ) ) {
	case "number":
		return Math.abs(A);
		break;
	case "vector":
		if ( arguments.length == 1 || sumalongdimension == 1 ) {
			return Math.sqrt(dot(A,A));
		}
		else 
			return abs(A);
		break;
	case "spvector":
		if ( arguments.length == 1 || sumalongdimension == 1 ) {
			return Math.sqrt(dot(A.val,A.val));
		}
		else 
			return abs(A);
		break;
	case "matrix":
		if( arguments.length == 1 ) {
			return Math.sqrt(dot(A.val,A.val));
		}
		else if ( sumalongdimension == 1 ) {
			// norm of columns, result is row vector
			const n = A.n;
			var res = zeros(1, n);			
			var r = 0;
			for (i=0; i< A.m; i++) {				
				for(j=0; j<n; j++) 
					res.val[j] += A.val[r+j]*A.val[r + j];
				r += n;
			}
			for(j=0;j<n; j++)
				res.val[j] = Math.sqrt(res.val[j]);
			return res;		
		}
		else if ( sumalongdimension == 2 ) {
			// norm of rows, result is column vector
			var res = zeros(A.m);
			var r = 0;
			for ( i=0; i < A.m; i++) {
				for ( j=0; j < A.n; j++)
					res[i] += A.val[r + j] * A.val[r + j];
				r += A.n;
				res[i] = Math.sqrt(res[i]);
			}			
			
			return res;		
		}
		else 
			return "undefined";
		break;
	case "spmatrix":
		if( arguments.length == 1 ) {
			return Math.sqrt(dot(A.val,A.val));
		}
		else if ( sumalongdimension == 1 && !A.rowmajor ) {
			// norm of columns, result is row vector
			const nn = A.n;
			var res = zeros(1, nn);
			for(j=0; j<nn; j++) {
				var s = A.cols[j];
				var e = A.cols[j+1];
				for ( var k=s; k < e; k++)
					res.val[j] += A.val[k]*A.val[k];
				res.val[j] = Math.sqrt(res.val[j]);
			}
			return res;		
		}
		else if ( sumalongdimension == 2 && A.rowmajor ) {
			// norm of rows, result is column vector
			var res = zeros(A.m);
			for ( i=0; i < A.m; i++) {
				var s = A.rows[i];
				var e = A.rows[i+1];
				for ( var k=s; k < e; k++)
					res[i] += A.val[k] * A.val[k];
				res[i] = Math.sqrt(res[i]);
			}
			
			return res;		
		}
		else 
			return "undefined";
		break;
	default: 
		return "undefined";
	}
}
function norm1( A , sumalongdimension ) {
	// l1-norm of vectors and matrices
	if ( arguments.length == 1 )
		return sum(abs(A));
	else
		return sum(abs(A), sumalongdimension);
}
function norminf( A , sumalongdimension ) {
	// linf-norm of vectors and max-norm of matrices
	if ( arguments.length == 1 )
		return max(abs(A));
	else
		return max(abs(A), sumalongdimension);
}
function normp( A , p, sumalongdimension ) {
	// lp-norm of vectors and matrices
	if ( arguments.length == 2 )
		return Math.pow( sum(pow(abs(A), p) ), 1/p);
	else
		return pow(sum(pow(abs(A), p), sumalongdimension), 1/p);
}

function normnuc( A ) {
	// nuclear norm
	switch( type(A) ) {
	case "matrix":
		return sumVector(svd(A)); 
		break;
	case "spmatrix":
		return sumVector(svd(fullMatrix(A))); 
		break;
	case "number":
		return A;
		break;
	case "vector":
	case "spvector":
		return 1;
		break;
	default:
		return undefined;
		break;
	}
}
function norm0( A , sumalongdimension, epsilonarg ) {
	// l0-pseudo-norm of vectors and matrices
	// if epsilon > 0, consider values < epsilon as 0
	
	var epsilon = EPS;
	if ( arguments.length == 3 ) 
		epsilon = epsilonarg;
	
	var i;
	var j;
	switch ( type( A ) ) {
	case "number":
		return (Math.abs(A) > epsilon);
		break;
	case "vector":
		if ( arguments.length == 1 || sumalongdimension == 1 ) {		
			return norm0Vector(A, epsilon);
		}
		else 
			return isGreater(abs(a), epsilon);
		break;
	case "spvector":
		if ( arguments.length == 1 || sumalongdimension == 1 ) {		
			return norm0Vector(A.val, epsilon);
		}
		else 
			return isGreater(abs(a), epsilon);
		break;
	case "matrix":
		if( arguments.length == 1 ) {
			return norm0Vector(A.val, epsilon);
		}
		else if ( sumalongdimension == 1 ) {
			// norm of columns, result is row vector
			var res = zeros(1, A.n);
			for (i=0; i< A.m; i++) {				
				for(j = 0; j < A.n; j++) 
					if ( Math.abs(A[i*A.n + j]) > epsilon )
						res.val[j]++;
			}
			return res;		
		}
		else if ( sumalongdimension == 2 ) {
			// norm of rows, result is column vector
			var res = zeros(A.m);
			for (i=0; i< A.m; i++) {
				for(j = 0; j < A.n; j++) 
					if ( Math.abs(A[i*A.n + j]) > epsilon )
						res[i]++;	
			}
			return res;		
		}
		else 
			return undefined;
		break;
	case "spmatrix":
		if( arguments.length == 1 ) {
			return norm0Vector(A.val, epsilon);
		}
		else if ( sumalongdimension == 1 ) {
			// norm of columns, result is row vector
			var res = zeros(1, A.n);
			if ( A.rowmajor ) {
				for ( var k=0; k < A.val.length; k++)
					if (Math.abs(A.val[k]) > epsilon)
						res.val[A.cols[k]] ++;
			}
			else {
				for ( var i=0; i<A.n; i++)
					res.val[i] = norm0Vector(A.col(i).val, epsilon);
			}
			return res;		
		}
		else if ( sumalongdimension == 2 ) {
			// norm of rows, result is column vector
			var res = zeros(A.m);
			if ( A.rowmajor ) {
				for ( var i=0; i<A.m; i++)
					res[i] = norm0Vector(A.row(i).val, epsilon);			
			}
			else {
				for ( var k=0; k < A.val.length; k++)
					if (Math.abs(A.val[k]) > epsilon)
						res[A.rows[k]]++;
			}
			return res;		
		}
		else 
			return undefined;
		break;
	default: 
		return undefined;
	}
}
/**
 * @param {Float64Array}
 * @param {number}
 * @return {number}
 */
function norm0Vector( x, epsilon ) {
	const n = x.length;
	var res = 0;	
	for (var i=0; i < n; i++)
		if ( Math.abs(x[i]) > epsilon )
			res++;
	return res;
}

///////////////////////////////////////////:
// Linear systems of equations
///////////////////////////////////////

function solve( A, b ) {
	/* Solve the linear system Ax = b	*/

	var tA = type(A);

	if ( tA == "vector" || tA == "spvector" || (tA == "matrix" && A.m == 1) ) {
		// One-dimensional least squares problem: 
		var AtA = mul(transpose(A),A);
		var Atb = mul(transpose(A), b);
		return Atb / AtA; 		
	}
	
	if ( tA == "spmatrix" ) {
		/*if ( A.m == A.n )
			return spsolvecg(A, b); // assume A is positive definite
		else*/
		return spcgnr(A, b);
	}

	if( type(b) == "vector" ) {
		if ( A.m == A.n )
			return solveGaussianElimination(A, b) ; 			
		else
			return solveWithQRcolumnpivoting(A, b) ; 
	}
	else
		return solveWithQRcolumnpivotingMultipleRHS(A, b) ; // b is a matrix
}
/**
 * Solve the linear system Ax = b given the Cholesky factor L of A
 * @param {Matrix}
 * @param {Float64Array} 
 * @return {Float64Array}
 */
function cholsolve ( L, b ) {
	var z = forwardsubstitution(L, b);
	var x = backsubstitution(transposeMatrix(L), z);
	return x;
}

/**
 * @param {Matrix}
 * @param {Float64Array} 
 * @return {Float64Array}
 */
function solveWithQRfactorization ( A, b ) {
	const m = A.length;
	const n = A.n;
	var QRfact = qr(A);
	var R = QRfact.R;
	var beta = QRfact.beta;
	
	var btmp = vectorCopy(b);
	var j;
	var i;
	var k;
	var v;
	
	var smallb;
	
	for (j=0;j<n-1; j++) {
		v = get(R, range(j,m), j) ; // get Householder vectors
		v[0] = 1;
		// b(j:m) = (I - beta v v^T ) * b(j:m)
		smallb = get(btmp, range(j,m) );		
		set ( btmp, range(j,m), sub ( smallb , mul( beta[j] * mul( v, smallb) , v ) ) );
	}
	// last iteration only if m>n
	if ( m > n ) {
		j = n-1;
		
		v = get(R, range(j,m), j) ; // get Householder vectors
		v[0] = 1;
		// b(j:m) = (I - beta v v^T ) * b(j:m)
		smallb = get(btmp, range(j,m) );		
		set ( btmp, range(j,m), sub ( smallb , mul( beta[j] * mul( v, smallb) , v ) ) );

	}
	
	// Solve R x = b with backsubstitution (R is upper triangular, well it is not really here because we use the lower part to store the vectors v): 
	return backsubstitution ( R , get ( btmp, range(n)) );
	
	
//	return backsubstitution ( get ( R, range(n), range(n) ) , rows ( btmp, range(1,n)) );
//	we can spare the get and copy of R : backsubstitution will only use this part anyway
}

/**
 * @param {Matrix}
 * @param {Float64Array} 
 * @return {Float64Array}
 */
function backsubstitution ( U, b ) {
	// backsubstitution to solve a linear system U x = b with upper triangular U

	const n = b.length;
	var j = n-1;
	var x = zeros(n);
	
	if ( ! isZero(U.val[j*n+j]) )
		x[j] = b[j] / U.val[j*n+j];
	
	j = n-2;
	if ( !isZero(U.val[j*n+j]) )
		x[j] = ( b[j] - U.val[j*n+n-1] * x[n-1] ) / U.val[j*n+j];
		
	for ( j=n-3; j >= 0 ; j-- ) {
		if ( ! isZero(U.val[j*n+j]) )
			x[j] = ( b[j] - dot( U.row(j).subarray(j+1,n) , x.subarray(j+1,n) ) ) / U.val[j*n+j];		
	}
	
	// solution
	return x;
}
/**
 * @param {Matrix}
 * @param {Float64Array} 
 * @return {Float64Array}
 */
function forwardsubstitution ( L, b ) {
	// forward substitution to solve a linear system L x = b with lower triangular L

	const n = b.length;
	var j;
	var x = zeros(n);
		
	if ( !isZero(L.val[0]) )
		x[0] = b[0] / L.val[0];
	
	if ( ! isZero(L.val[n+1]) )
		x[1] = ( b[1] - L.val[n] * x[0] ) / L.val[n+1];
		
	for ( j=2; j < n ; j++ ) {
		if ( ! isZero(L.val[j*n+j]) )
			x[j] = ( b[j] - dot( L.row(j).subarray(0,j) , x.subarray(0,j) ) ) / L.val[j*n+j];		
	}
	
	// solution
	return x;
}
/**
 * @param {Matrix}
 * @param {Float64Array} 
 * @return {Float64Array}
 */
function solveWithQRcolumnpivoting ( A, b ) {
	
	var m;
	var n;
	var R;
	var V;
	var beta;
	var r;
	var piv;
	if ( type( A ) == "matrix" ) {
		// Compute the QR factorization
		m = A.m;
		n = A.n;
		var QRfact = qr(A);
		R = QRfact.R;
		V = QRfact.V;
		beta = QRfact.beta;
		r = QRfact.rank;
		piv = QRfact.piv;
	}
	else {
		// we get the QR factorization in A
		R = A.R;
		r = A.rank;
		V = A.V;
		beta = A.beta;
		piv = A.piv;
		m = R.m;
		n = R.n;
	}

	var btmp = vectorCopy(b);
	var j;
	var i;
	var k;

	var smallb;
	// b = Q' * b
	for (j=0;j < r; j++) {
	
		// b(j:m) = (I - beta v v^T ) * b(j:m)
		smallb = get(btmp, range(j,m) );		
		
		set ( btmp, range(j,m), sub ( smallb , mul( beta[j] * mul( V[j], smallb) , V[j] ) ) );
	}
	// Solve R x = b with backsubstitution
	var x = zeros(n);

	if ( r > 1 ) {
		set ( x, range(0,r), backsubstitution ( R , get ( btmp, range(r)) ) );
		// note: if m < n, backsubstitution only uses n columns of R.
	}
	else {
		x[0] = btmp[0] / R.val[0];
	}
	
	// and apply permutations
	for ( j=r-1; j>=0; j--) {
		if ( piv[j] != j ) {
			var tmp = x[j] ;
			x[j] = x[piv[j]];
			x[piv[j]] = tmp;
		}
	}
	return x;	
	
}
/**
 * @param {Matrix}
 * @param {Matrix} 
 * @return {Matrix}
 */
function solveWithQRcolumnpivotingMultipleRHS ( A, B ) {
	
	var m;
	var n;
	var R;
	var V;
	var beta;
	var r;
	var piv;
	if ( type( A ) == "matrix" ) {
		// Compute the QR factorization
		m = A.m;
		n = A.n;
		var QRfact = qr(A);
		R = QRfact.R;
		V = QRfact.V;
		beta = QRfact.beta;
		r = QRfact.rank;
		piv = QRfact.piv;
	}
	else {
		// we get the QR factorization in A
		R = A.R;
		r = A.rank;
		V = A.V;
		beta = A.beta;
		piv = A.piv;
		m = R.m;
		n = R.n;
	}

	var btmp = matrixCopy(B);
	var j;
	var i;
	var k;

	var smallb;
	// B = Q' * B
	for (j=0;j < r; j++) {
	
		// b(j:m) = (I - beta v v^T ) * b(j:m)
		smallb = get(btmp, range(j,m), [] );
		
		set ( btmp, range(j,m), [], sub ( smallb , mul(mul( beta[j], V[j]), mul( transpose(V[j]), smallb) ) ) );
	}
	// Solve R X = B with backsubstitution
	var X = zeros(n,m);

	if ( r > 1 ) {
		for ( j=0; j < m; j++) 
			set ( X, range(0,r), j, backsubstitution ( R , get ( btmp, range(r), j) ) );
		// note: if m < n, backsubstitution only uses n columns of R.
	}
	else {
		set(X, 0, [], entrywisediv(get(btmp, 0, []) , R.val[0]) );
	}
	
	// and apply permutations
	for ( j=r-1; j>=0; j--) {
		if ( piv[j] != j ) {
			swaprows(X, j, piv[j]);
		}
	}
	return X;	
	
}

function solveGaussianElimination(Aorig, borig) {

	// Solve square linear system Ax = b with Gaussian elimination
	
	var i;
	var j;
	var k;
	
	var A = matrixCopy( Aorig ).toArrayOfFloat64Array(); // useful to quickly switch rows
	var b = vectorCopy( borig ); 
		
	const m = Aorig.m;
	const n = Aorig.n;
	if ( m != n)
		return undefined;
	
	// Set to zero small values... ??
	
	for (k=0; k < m ; k++) {
		
		// Find imax = argmax_i=k...m |A_i,k|
		var imax = k;
		var Aimaxk = Math.abs(A[imax][k]);
		for (i=k+1; i<m ; i++) {
			var Aik = Math.abs( A[i][k] );
			if ( Aik > Aimaxk ) {
				imax = i;
				Aimaxk = Aik;
			}
		}
		if ( isZero( Aimaxk ) ) {
			console.log("** Warning in solve(A,b), A is square but singular, switching from Gaussian elimination to QR method.");
			return solveWithQRcolumnpivoting(A,b);
		} 
		
		if ( imax != k ) {
			// Permute the rows
			var a = A[k];
			A[k] = A[imax];
			A[imax] = a;
			var tmpb = b[k];
			b[k] = b[imax];
			b[imax] = tmpb;			
		}		
		var Ak = A[k];
		
		// Normalize row k 
		var Akk = Ak[k];
		b[k] /= Akk;
		
		//Ak[k] = 1; // not used afterwards
		for ( j=k+1; j < n; j++) 
			Ak[j] /= Akk;
		
		if ( Math.abs(Akk) < 1e-8 ) {
			console.log("** Warning in solveGaussianElimination: " + Akk + " " + k + ":" + m );
		}
			
		// Substract the kth row from others to get 0s in kth column
		var Aik ;			
		var bk = b[k];
		for ( i=0; i< m; i++) {
			if ( i != k ) {
				var Ai = A[i]; 
				Aik = Ai[k];
				for ( j=k+1; j < n; j++) { // Aij = 0  with j < k and Aik = 0 after this operation but is never used
					Ai[j] -= Aik * Ak[j]; 						
				}
				b[i] -= Aik * bk;				
			}
		}	
	}

	// Solution: 
	return b;
}

function inv( M ) {
	if ( typeof(M) == "number" )
		return 1/M;

	// inverse matrix with Gaussian elimination
		
	var i;
	var j;
	var k;
	const m = M.length;
	const n = M.n;
	if ( m != n)
		return "undefined";
		
	// Make extended linear system:	
	var A = matrixCopy(M) ;
	var B = eye(n); 
		
	for (k=0; k < m ; k++) {
		var kn = k*n;
		
		// Find imax = argmax_i=k...m |A_i,k|
		var imax = k;
		var Aimaxk = Math.abs(A.val[imax*n + k]);
		for (i=k+1; i<m ; i++) {
			if ( Math.abs( A.val[i*n + k] ) > Aimaxk ) {
				imax = i;
				Aimaxk = Math.abs(A.val[i * n + k]);
			}
		}
		if ( Math.abs( Aimaxk ) < 1e-12 ) {
			return "singular";
		} 
		
		if ( imax != k ) {
			// Permute the rows
			swaprows(A, k, imax);
			swaprows(B,k, imax);		
		}		
		
		// Normalize row k 
		var Akk = A.val[kn + k];
		for ( j=0; j < n; j++) {
			A.val[kn + j] /= Akk;
			B.val[kn + j] /= Akk;
		}
		
		if ( Math.abs(Akk) < 1e-8 )
			console.log("!! Warning in inv(): " + Akk + " " + k + ":" + m );
			
		// Substract the kth row from others to get 0s in kth column
		var Aik ;
		for ( i=0; i< m; i++) {
			if ( i != k ) {
				var ri = i*n;
				Aik = A.val[ri+k];
				if ( ! isZero(Aik) ) {
					for ( j=0; j < n; j++) {
						A.val[ri + j] -= Aik * A.val[kn+j]; 
						B.val[ri + j] -= Aik * B.val[kn+j] ;
					}
				}
			}
		}		
	}

	// Solution: 
	return B;
}

function chol( A ) {
	// Compute the Cholesky factorization A = L L^T with L lower triangular 
	// for a positive definite and symmetric A
	// returns L or undefined if A is not positive definite
	const n = A.m;
	if ( A.n != n) {
		error("Cannot compute the cholesky factorization: the matrix is not square.");
		return undefined; 
	}
	const n2= n*n;
	const Aval = A.val;
	var L = new Float64Array(n2);
		
	var i,j;
	// first column = A(:,0) / sqrt(L(0,0)
	var sqrtLjj = Math.sqrt(Aval[0]);
	for ( i=0; i < n2 ; i+=n) { 	// i = i*n = ptr to row i
		L[i] = Aval[i] / sqrtLjj;
	}
	// other colums 
	j = 1;
	var jn = n;
	while ( j < n && !isNaN(sqrtLjj)) {				
		for ( i = jn; i < n2; i+=n ) {	// i = i*n
			var Lij = Aval[i+j];
			for ( var k=0; k < j; k++) {
				Lij -= L[jn + k] * L[i + k]; 
			}
			if (i == jn)
				sqrtLjj = Math.sqrt(Lij);
				
			L[i +j] = Lij / sqrtLjj;
		}
		j++;
		jn += n;
	}
	if ( isNaN(sqrtLjj) ) 
		return undefined; // not positive definite
	else
		return new Matrix(n,n,L,true);
}

function ldlsymmetricpivoting ( Aorig ) {
	// LDL factorization for symmetric matrices
	var A = matrixCopy( Aorig );
	var n = A.length;
	if ( A.m != n ) {
		error("Error in ldl(): the matrix is not square.");
		return undefined;
	}
	var k;
	var piv = zeros(n);
	var alpha;
	var v;
	
	for ( k=0; k < n-1; k++) {
		
		piv[k] = findmax(get(diag(A ), range(k,n) ));
		swaprows(A, k, piv[k] );
		swapcols(A, k, piv[k] );
		alpha = A.val[k*n + k];
		v = getCols ( A, [k]).subarray(k+1,n);
		
		for ( var i=k+1;i < n; i++)
			A.val[i*n + k] /= alpha;
		
		set( A, range(k+1,n),range(k+1,n), sub (get(A,range(k+1,n), range(k+1,n)), outerprod(v,v, 1/alpha)));		
		
	}
	
	// Make it lower triangular
	for (var j=0; j < n-1; j++) {
		for (var k=j+1; k < n ; k++)
			A.val[j*n + k] = 0;
	}
	return {L: A, piv: piv};
}
/**
 * @param {Float64Array} 
 * @return {{v: Float64Array, beta: number}}
 */
function house ( x ) {
	// Compute Houselholder vector v such that 
	// P = (I - beta v v') is orthogonal and Px = ||x|| e_1

	const n = x.length; 
	var i;
	var mu;
	var beta;
	var v = zeros(n);	
	var v0;
	var sigma ;
	
	var x0 = x[0];
	var xx = dot(x,x);
	
	// sigma = x(2:n)^T x(2:n) 
	sigma = xx -x0*x0;	
		
	if ( isZero( sigma ) ) {
		// x(2:n) is zero =>  v=[1,0...0], beta = 0
		beta = 0;
		v[0] = 1;
	}
	else {
		mu = Math.sqrt(xx); // norm(x) ; //Math.sqrt( x0*x0 + sigma );
		if ( x0 < EPS ) {
			v0 = x0 - mu;
		}
		else {
			v0 = -sigma / (x0 + mu);
		}
		
		beta = 2 * v0 * v0 / (sigma + v0 * v0 );
		
		// v = [v0,x(2:n)] / v0
		v[0] = 1;
		for ( i=1; i< n; i++) 
			v[i] = x[i] / v0;		
	}
	
	return { "v" : v , "beta" : beta};
}
/**
 * @param {Matrix}
 * @return {{Q: (Matrix|undefined), R: Matrix, beta: Float64Array}
 */
function qroriginal( A, compute_Q ) {
	// QR factorization based on Householder reflections WITHOUT column pivoting
	// A with m rows and n cols; m >= n
	
	// test with A = [[12,-51,4],[6,167,-68],[-4,24,-41]]
	// then R = [ [14 -21 -14 ], [ -3, 175, -70], [2, -0.75, 35]]
	
	var m = A.length;
	var n = A.n;
	if ( n > m)
		return "QR factorization unavailable for n > m.";
	
	var i;
	var j;
	var k;
	var householder;
	var R = matrixCopy(A);
	var beta = zeros(n); 
	var outer;
	var smallR; 
	var Q;
	var V = new Array(); // store householder vectors

	
	for ( j=0; j < n - 1 ; j++) {
		householder = house( get( R, range(j,m), j) );
		// R(j:m,j:n) = ( I - beta v v' ) * R(j:m,j:n) = R - (beta v) (v'R)
		smallR =  get(R, range(j,m), range(j,n) );
		set ( R, range(j,m), range(j,n) , subMatrices (  smallR , outerprodVectors( householder.v, mulMatrixVector( transposeMatrix(smallR), householder.v) ,  householder.beta ) ) ) ;

		 V[j] = householder.v;
		 beta[j] = householder.beta;
	
	}
	// Last iteration only if m > n: if m=n, (I - beta v v' ) = 1 => R(n,n) is unchanged		
	if ( m > n ) {
		j = n-1;
		smallR = get( R, range(j,m), j) 
		householder = house( smallR );
		 // R(j:m,n) = ( I - beta v v' ) * R(j:m, n) = R(j:m,n) - (beta v) (v'R(j:m,n) ) = Rn - ( beta *(v' * Rn) )* v
		set ( R, range(j,m), n-1 , subVectors (  smallR , mulScalarVector( dot( householder.v, smallR ) *  householder.beta, householder.v  ) ) ) ;

	 	V[j] = vectorCopy(householder.v);
		beta[j] = householder.beta;

	}

	if ( compute_Q ) {
		var r;
		if ( typeof( compute_Q ) == "number") {
			// compute only first r columns of Q
			r = compute_Q; 
			Q = eye(m,r);			
		}
		else {
			Q = eye(m);
			r = m;
		}	
		var smallQ;
		var nmax = n-1;
		if ( m<=n)
			nmax = n-2;
		if ( nmax >= r )
			nmax = r-1;			

		for ( j=nmax; j >=0; j--) {
			smallQ =  get(Q, range(j,m), range(j,r) ); 
			
			if ( r > 1 ) {
				if ( j == r-1) 
					set ( Q, range(j,m), [j] , subVectors (  smallQ ,  mulScalarVector( dot( smallQ, V[j]) * beta[j],  V[j] ) ) );
				else
					set ( Q, range(j,m), range(j,r), sub (  smallQ , outerprod( V[j], mul( transpose( smallQ), V[j]), beta[j] ) ) );
			}
			else
				Q = subVectors (  smallQ , mulScalarVector( dot( smallQ, V[j]) * beta[j],  V[j] ) );
		}		 
	}

	return {"Q" : Q, "R" : R, "beta" : beta };
}	

/**
 * @param {Matrix}
 * @return {{Q: (Matrix|undefined), R: Matrix, V: Array, beta: Float64Array, piv: Float64Array, rank: number}
 */
function qr( A, compute_Q ) {	
	// QR factorization with column pivoting AP = QR based on Householder reflections
	// A with m rows and n cols; m >= n (well, it also works with m < n)
	// piv = vector of permutations : P = P_rank with P_j = identity with swaprows ( j, piv(j) )
	
	// Implemented with R transposed for faster computations on rows instead of columns
	
	/* TEST
	A  = [[12,-51,4],[6,167,-68],[-4,24,-41]]
	QR = qr(A)
	QR.R
	
	
	*/
	const m = A.m;
	const n = A.n;
	
	/*
	if ( n > m)
		return "QR factorization unavailable for n > m.";
	*/
	
	var i;
	var j;

	var householder;
	var R = transpose(A);// transposed for faster implementation
	var Q;
	
	var V = new Array(); // store householder vectors in this list (not a matrix)
	var beta = zeros(n); 
	var piv = zeros(n);
	
	var smallR; 
	
	var r = -1; // rank estimate -1
	
	var normA = norm(A);
	var normR22 = normA;
	var Rij;
	
	const TOL = 1e-5;
	var TOLnormR22square = TOL * normA;
	TOLnormR22square *= TOLnormR22square;
	
	var tau = 0;
	var k = 0;
	var c = zeros (n);
	for ( j=0; j < n ; j++) {
		var Rj = R.val.subarray(j*R.n,j*R.n + R.n);
		c[j] = dot(Rj,Rj);
		if ( c[j] > tau ) {
			tau = c[j];
			k = j;
		}
	}

	var updateR = function (r, v, beta) {
		// set ( R, range(r,n), range(r,m) , subMatrices (  smallR , outerprodVectors( mulMatrixVector( smallR, householder.v), householder.v,  householder.beta ) ) ) ;
		// most of the time is spent here... 
		var i,j,l;
		var m_r = m-r;
		for ( i=r; i < n; i++) {
			var smallRiv = 0;
			var Ri = i*m + r; // =  i * R.n + r
			var Rval = R.val.subarray(Ri,Ri+m_r);
			for ( l = 0 ; l < m_r ; l ++) 
				smallRiv += Rval[l] * v[l];	//smallRiv += R.val[Ri + l] * v[l];
			smallRiv *= beta ;
			for ( j=0; j < m_r ; j ++) {
				Rval[j] -= smallRiv * v[j]; // R.val[Ri + j] -= smallRiv * v[j];
			}
		}
	};

	// Update c
	var updateC = function(r) {
		var j;
		for (j=r+1; j < n; j++) {
			var Rjr = R.val[j*m + r];
			c[j] -= Rjr * Rjr;
		}			

		// tau, k = max ( c[r+1 : n] )
		k=r+1;
		tau = c[r+1];
		for ( j=r+2; j<n;j++) {
			if ( c[j] > tau ) {
				tau = c[j];
				k = j;
			}
		}
	};
	
	// Compute norm of residuals
	var computeNormR22 = function(r) {
		//normR22 = norm(get ( R, range(r+1,n), range(r+1,m), ) );
		var normR22 = 0;
		var i = r+1;
		var ri = i*m;
		var j;
		while ( i < n && normR22 <= TOLnormR22square ) {
			for ( j=r+1; j < m; j++) {
				var Rij = R.val[ri + j];
				normR22 += Rij*Rij;
			}
			i++;
			ri += m;
		}
		return normR22;
	}


	while ( tau > EPS  && r < n-1 &&  normR22 > TOLnormR22square ) {

		r++;
						
		piv[r] = k;
		swaprows ( R, r, k);
		c[k] = c[r];
		c[r] = tau;		

		if ( r < m-1) {
			householder = house( R.val.subarray(r*R.n + r,r*R.n + m) ); // house only reads vec so subarray is ok
		}
		else {
			householder.v = [1];
			householder.beta = 0;
			//smallR = R[m-1][m-1];
		}
		
		if (r < n-1) {
			// smallR is a matrix
			updateR(r, householder.v, householder.beta);
		}
		else {
			// smallR is a row vector (or a number if m=n):	
			if ( r < m-1) {
				updateR(r, householder.v, householder.beta);
			/*
				var r_to_m = range(r,m);
				smallR = get(R, r, r_to_m);
				set ( R, r , r_to_m, sub (  smallR , transpose(mul( householder.beta * mul( smallR, householder.v) ,householder.v  ) )) ) ;*/
			}
			else {
				//var smallRnumber = R.val[(m-1)*R.n + m-1]; // beta is zero, so no update
				//set ( R, r , r, sub (  smallRnumber , transpose(mul( householder.beta * mul( smallRnumber, householder.v) ,householder.v  ) )) ) ;
			}
		}

		// Store householder vectors and beta 			
		V[r] = vectorCopy( householder.v );
		beta[r] = householder.beta;

		if ( r<n-1 ) {
			// Update c
			updateC(r);			

			// stopping criterion for rank estimation
			if ( r < m-1 ) 
				normR22 = computeNormR22(r);
			else
				normR22 = 0;
		}	
	}

	if ( compute_Q ) {
		Q = eye(m);
		var smallQ;
		var nmax = r;
		if ( m > r+1)
			nmax = r-1;
		for ( j=nmax; j >=0; j--) {
			if ( j == m-1 ) {
				Q.val[j*m+j] -=  beta[j] * V[j][0] * V[j][0] * Q.val[j*m+j];
			}
			else {
				var j_to_m = range(j,m);
				smallQ =  get(Q, j_to_m, j_to_m );// matrix
				set ( Q, j_to_m, j_to_m, subMatrices (  smallQ , outerprodVectors(  V[j], mulMatrixVector( transposeMatrix(smallQ), V[j]), beta[j] ) ) );
			}
		}
	}

	return {"Q" : Q, "R" : transpose(R), "V": V, "beta" : beta, "piv" : piv, "rank" : r+1 };
}

function qrRnotTransposed( A, compute_Q ) {
	// QR factorization with column pivoting AP = QR based on Householder reflections
	// A with m rows and n cols; m >= n (well, it also works with m < n)
	// piv = vector of permutations : P = P_rank with P_j = identity with swaprows ( j, piv(j) )
	
	// original implementation working on columns 
	
	/* TEST
	A  = [[12,-51,4],[6,167,-68],[-4,24,-41]]
	QR = qr(A)
	QR.R
	
	
	*/
	var m = A.m;
	var n = A.n;
	
	/*
	if ( n > m)
		return "QR factorization unavailable for n > m.";
	*/
	
	var i;
	var j;

	var householder;
	var R = matrixCopy(A);
	var Q;
	
	var V = new Array(); // store householder vectors in this list (not a matrix)
	var beta = zeros(n); 
	var piv = zeros(n);
	
	var smallR; 
	
	var r = -1; // rank estimate -1
	
	var normA = norm(A);
	var normR22 = normA;
	
	var TOL = 1e-6;
	
	var tau = 0;
	var k = 0;
	var c = zeros (n);
	for ( j=0; j < n ; j++) {
		var Aj = getCols ( A, [j]);
		c[j] = dot(Aj, Aj);
		if ( c[j] > tau ) {
			tau = c[j];
			k = j;
		}
	}

	while ( tau > EPS  && r < n-1 &&  normR22 > TOL * normA ) {
	
		r++;
						
		piv[r] = k;
		swapcols ( R, r, k);
		c[k] = c[r];
		c[r] = tau;		

		if ( r < m-1) {
			householder = house( get( R, range(r,m), r) );
			smallR = get(R, range(r,m), range(r,n) );
		}
		else {
			householder.v = [1];
			householder.beta = 0;
			smallR = R[m-1][m-1];
		}
		
		if (r < n-1) {
			// smallR is a matrix
			set ( R, range(r,m), range(r,n) , subMatrices (  smallR , outerprodVectors( householder.v, mulMatrixVector( transposeMatrix(smallR), householder.v) ,  householder.beta ) ) ) ;
		}
		else {
			// smallR is a vector (or a number if m=n):
			set ( R, range(r,m), r , sub (  smallR , mul( householder.beta * mul( smallR, householder.v) ,householder.v  ) ) ) ;
		}

		// Store householder vectors and beta 			
		if ( m > r+1 )
			V[r] = vectorCopy( householder.v );
		beta[r] = householder.beta;

		if ( r<n-1 ) {
			// Update c
			for ( j=r+1; j < n; j++) {
				c[j] -= R[r][j] * R[r][j];
			}			
	
			// tau, k = max ( c[r+1 : n] )
			k=r+1;
			tau = c[r+1];
			for ( j=r+2; j<n;j++) {
				if ( c[j] > tau ) {
					tau = c[j];
					k = j;
				}
			}

			// stopping criterion for rank estimation
			if ( r < m-1 ) {
				//normR22 = norm(get ( R, range(r+1,m),range(r+1,n) ) );
				normR22 = 0;
				for ( i=r+1; i < m; i++) {
					for ( j=r+1; j < n; j++) {
						Rij = R[i][j];
						normR22 += Rij*Rij;
					}
				}
				normR22 = Math.sqrt(normR22);
			}
			else
				normR22 = 0;
		}
	}
	
	if ( compute_Q ) {
		Q = eye(m);
		var smallQ;
		var nmax = r;
		if ( m>r+1)
			nmax = r-1;
		for ( j=nmax; j >=0; j--) {
			if ( j == m-1 ) {
				Q.val[j*m+j] -=  beta[j] * V[j][0] * V[j][0] * Q.val[j*m+j];
			}
			else {
				smallQ =  get(Q, range(j,m), range(j,m) );
				set ( Q, range(j,m), range(j,m) , subMatrices (  smallQ , outerprodVectors(  V[j], mulMatrixVector( transposeMatrix(smallQ), V[j]), beta[j] ) ) );
			}
		}
		 
	}

	return {"Q" : Q, "R" : R, "V": V, "beta" : beta, "piv" : piv, "rank" : r+1 };
}

/** Conjugate gradient method for solving the symmetyric positive definite system Ax = b
 * @param{{Matrix|spMatrix}}
 * @param{Float64Array}
 * @return{Float64Array}
 */
function solvecg ( A, b) {
	if( A.type == "spmatrix" ) 
		return spsolvecg(A,b);
	else
		return solvecgdense(A,b);		
}

/** Conjugate gradient method for solving the symmetyric positive definite system Ax = b
 * @param{Matrix}
 * @param{Float64Array}
 * @return{Float64Array}
 */
function solvecgdense ( A, b) {
/*
TEST
A = randn(2000,1000)
x = randn(1000)
b = A*x + 0.01*randn(2000)
tic()
xx = solve(A,b)
t1 = toc()
ee = norm(A*xx - b)
tic()
xh=solvecg(A'*A, A'*b)
t2 = toc()
e = norm(A*xh - b)
*/
	
	const n = A.n;	
	const m = A.m;

	var x = randn(n); //vectorCopy(x0);
	var r = subVectors(b, mulMatrixVector(A, x));
	var rhoc = dot(r,r);
	const TOL = 1e-8;
	var delta2 = TOL * norm(b);
	delta2 *= delta2;
	
	// first iteration:
	var p = vectorCopy(r);
	var w = mulMatrixVector(A,p);
	var mu = rhoc / dot(p, w);
	saxpy( mu, p, x);
	saxpy( -mu, w, r);
	var rho_ = rhoc;
	rhoc = dot(r,r);

	var k = 1;

	var updateP = function (tau, r) {
		for ( var i=0; i < m; i++)
			p[i] = r[i] + tau * p[i];
	}
	
	while ( rhoc > delta2 && k < n ) {
		updateP(rhoc/rho_, r);
		w = mulMatrixVector(A,p);
		mu = rhoc / dot(p, w);
		saxpy( mu, p, x);
		saxpy( -mu, w, r);
		rho_ = rhoc;
		rhoc = dot(r,r);
		k++;
	}
	return x;
}
/** Conjugate gradient normal equation residual method for solving the rectangular system Ax = b
 * @param{{Matrix|spMatrix}}
 * @param{Float64Array}
 * @return{Float64Array}
 */
function cgnr ( A, b) {
	if( A.type == "spmatrix" ) 
		return spcgnr(A,b);
	else
		return cgnrdense(A,b);		
}
/** Conjugate gradient normal equation residual method for solving the rectangular system Ax = b
 * @param{Matrix}
 * @param{Float64Array}
 * @return{Float64Array}
 */
function cgnrdense ( A, b) {
/*
TEST
A = randn(2000,1000)
x = randn(1000)
b = A*x + 0.01*randn(2000)
tic()
xx = solve(A,b)
t1 = toc()
ee = norm(A*xx - b)
tic()
xh=cgnr(A, b)
t2 = toc()
e = norm(A*xh - b)
*/
	
	const n = A.n;	
	const m = A.m;

	var x = randn(n); // vectorCopy(x0);
	var At = transposeMatrix(A);
	var r = subVectors(b, mulMatrixVector(A, x));	
	const TOL = 1e-8;
	var delta2 = TOL * norm(b);
	delta2 *= delta2;
	
	// first iteration:
	var z = mulMatrixVector(At, r);
	var rhoc = dot(z,z);	
	var p = vectorCopy(z);
	var w = mulMatrixVector(A,p);
	var mu = rhoc / dot(w, w);
	saxpy( mu, p, x);
	saxpy( -mu, w, r);	
	z = mulMatrixVector(At, r);
	var rho_ = rhoc;
	rhoc = dot(z,z);

	var k = 1;

	var updateP = function (tau, z) {
		for ( var i=0; i < m; i++)
			p[i] = z[i] + tau * p[i];
	}
	
	while ( rhoc > delta2 && k < n ) {
		updateP(rhoc/rho_, z);
		w = mulMatrixVector(A,p);
		mu = rhoc / dot(w, w);
		saxpy( mu, p, x);
		saxpy( -mu, w, r);
		z = mulMatrixVector(At, r);
		rho_ = rhoc;
		rhoc = dot(z,z);
		k++;
	}
	return x;
}

/** Lanczos algorithm
 * @param{Matrix}
 */
function lanczos ( A, q1 ) {

	const maxIters = 300;
	const TOL = EPS * norm(A); 
	const n = A.n;
	var i;
	var k = 0;
	var w = vectorCopy(q1);
	var v = mulMatrixVector(A, w);
	var alpha = dot(w,v);
	saxpy(-alpha, w, v);
	beta = norm(b);
	
	while ( beta > TOL && k < maxIters ) {
	
		for ( i=0; i < n; i++) {
			var t = w[i];
			w[i] = v[i] / beta;
			v[i] = -beta / t;
		}
		
		var Aw = mulMatrixVector(A,w);
		
		for ( i=0; i < n; i++) 
			v[i] += Aw[i];
		
		alpha = dot(w,v);
		saxpy(-alpha,w,v);
		beta = norm(v);
		k++;
	}
}

/**
 * @param{Matrix}
 * @param{boolean}
 * @return{Matrix}
 */
function tridiagonalize( A, returnQ ) {
	// A : a square and symmetric  matrix
	// T = Q A Q' , where T is tridiagonal and Q = (H1 ... Hn-2)' is the product of Householder transformations.
	// if returnQ, then T overwrites A
	var k;
	const n = A.length;
	var T;
	var Q;
	var Pk;
	if ( returnQ ) {
		T = A;
		Q = eye(n);
		var beta = [];
		var V = [];
	}
	else
		T = matrixCopy(A);
	var p;
	var w;
	var vwT; 
	var normTkp1k;
	var householder;
	
	for (k=0; k < n-2; k++) {
		Tkp1k = get ( T, range(k+1, n), k);
		Tkp1kp1 = get ( T, range(k+1,n), range(k+1, n));

		householder = house ( Tkp1k );
		p = mulScalarVector( householder.beta , mulMatrixVector( Tkp1kp1, householder.v ) );
		w = subVectors ( p, mulScalarVector( 0.5*householder.beta * dot(p, householder.v ), householder.v) );
		
		/*
		T[k+1][k] = norm ( Tkp1k );
		T[k][k+1] = T[k+1][k];		
		*/
		// make T really tridiagonal: the above does not modify the other entries to set them to 0
		normTkp1k = zeros(n-k-1);
		normTkp1k[0] = norm ( Tkp1k );
		set ( T, k, range(k+1,n ), normTkp1k );		
		set ( T, range(k+1,n), k, normTkp1k);

		vwT = outerprodVectors(householder.v,w);
		set ( T, range(k+1,n), range(k+1, n), subMatrices( subMatrices ( Tkp1kp1, vwT) , transpose(vwT)) );

		if ( returnQ ) {
			V[k] = householder.v;
			beta[k] = householder.beta;
		}
	}
	if ( returnQ ) {
		var updateQ = function(j, v, b) {
			// Q = Q - b* v (Q'v)'
			//smallQ =  get(Q, range(j,n), range(j,n) );// matrix
			//set ( Q, range(j,n), range(j,n) , subMatrices (  smallQ , outerprodVectors(  V[k], mulMatrixVector( transposeMatrix(smallQ), V[k]), beta[k] ) ) );			
			var i,k;
			var Qtv = zeros(n-j);
			var n_j = n-j;
			for ( i=0; i<n_j; i++) {
				var Qi = (i+j)*n + j;
				for ( k=0;k<n_j; k++) 
					Qtv[k] += v[i] * Q.val[Qi + k];
			}
			for ( i=0; i < n_j; i++) {
				var Qi = (i+j)*n + j;
				var betavk = b * v[i];				
				for ( k=0; k < n_j ; k++) {
					Q.val[Qi + k] -= betavk * Qtv[k];
				}
			}
		};
		
		// Backaccumulation of Q
		for ( k=n-3; k >=0; k--) {
			updateQ(k+1,V[k], beta[k]);
		}
		return Q;
	}
	else
		return T;
}
function givens(a,b,Gi,Gk,n) {
	// compute a Givens rotation:
	var c;
	var s;
	var tau;
	var G;
	
	// Compute c and s
	if ( b == 0) {
		c = 1;
		s = 0;		
	}
	else {
		if ( Math.abs(b) > Math.abs(a) ) {
			tau = -a / b;
			s = 1 / Math.sqrt(1+tau*tau);
			c = s*tau;
		}
		else {
			tau = -b / a;
			c = 1 / Math.sqrt(1+tau*tau);
			s = c * tau;
		}		
	}
	
	if ( arguments.length == 5 ) {
		// Build Givens matrix G from c and s:
		G = eye(n) ;
		G.val[Gi*n+Gi] = c;
		G.val[Gi*n+Gk] = s;
		G.val[Gk*n+Gi] = -s;
		G.val[Gk*n+Gk] = c;
		return G;
	}
	else {
		return [c,s];
	}
	
}
/**
 * @param {number}
 * @param {number}
 * @param {number}  
 * @param {number}
 * @param {Matrix}
 */
function premulGivens ( c, s, i, k, A) {
	// apply a Givens rotation to A : A([i,k],:) = G' * A([i,k],:)
	//  with G = givens (a,b,i,k) and [c,s]=givens(a,b)
	// NOTE: this modifies A

	const n = A.n;
	var j;
	const ri = i*n;
	const rk = k*n;
	var t1;
	var t2;
	for ( j=0; j < n; j++) {
		t1 = A.val[ri + j]; 
		t2 = A.val[rk + j]; 
		A.val[ri + j] = c * t1 - s * t2; 
		A.val[rk + j] = s * t1 + c * t2;
	}	
}
/**
 * @param {number}
 * @param {number}
 * @param {number}  
 * @param {number}
 * @param {Matrix}
 */
function postmulGivens ( c, s, i, k, A) {
	// apply a Givens rotation to A : A(:, [i,k]) =  A(:, [i,k]) * G
	//  with G = givens (a,b,i,k) and [c,s]=givens(a,b)
	// NOTE: this modifies A

	const m = A.length;
	var j;
	var t1;
	var t2;
	var rj = 0;
	for ( j=0; j < m; j++) {
		t1 = A.val[rj + i]; 
		t2 = A.val[rj + k]; 
		A.val[rj + i] = c * t1 - s * t2; 
		A.val[rj + k] = s * t1 + c * t2;
		rj += A.n;
	}	
}

function implicitSymQRWilkinsonShift( T , computeZ) {
	// compute T = Z' T Z
	// if computeZ:  return {T,cs} such that T = Z' T Z  with Z = G1.G2... 
	// and givens matrices Gk of parameters cs[k]

	const n = T.length;
	const rn2 = n*(n-2);
	const rn1 = n*(n-1);

	const d = ( T.val[rn2 + n-2] - T.val[rn1 + n-1] ) / 2;
	const t2 = T.val[rn1 + n-2] * T.val[rn1 + n-2] ;
	const mu = T.val[rn1 + n-1] - t2 / ( d + Math.sign(d) * Math.sqrt( d*d + t2) );
	var x = T.val[0] - mu; // T[0][0]
	var z = T.val[n];		// T[1][0]
	var cs;
	if ( computeZ)
		var csArray = new Array(n-1);
		//var Z = eye(n);
		
	var k;	
	for ( k = 0; k < n-1; k++) {
		/*
		G = givens(x,z, k, k+1, n);
		T = mul(transpose(G), mul(T, G) ); // can do this much faster
		if ( computeZ ) {
			Z = mul(Z, G );
		}
		*/
		cs = givens(x,z);
		postmulGivens(cs[0], cs[1], k, k+1, T);
		premulGivens(cs[0], cs[1], k, k+1, T);
		if( computeZ )
			csArray[k] = [cs[0], cs[1]];
			//postmulGivens(cs[0], cs[1], k, k+1, Z);
		
		if ( k < n-2 ) {
			var r = n*(k+1) + k;
			x = T.val[r];
			z = T.val[r + n]; // [k+2][k];
		}
	}
	if ( computeZ) {
		return {"T": T, "cs": csArray} ;
//		return {"T": T, "Z": Z} ;
	}
	else 
		return T;
}

function eig( A , computeEigenvectors ) {
	// Eigendecomposition of a symmetric matrix A (QR algorithm)
	
	var Q; 
	var D;	
	if ( computeEigenvectors ) {
		D = matrixCopy(A);
		Q = tridiagonalize( D, true );
	}
	else {
		D = tridiagonalize( A ); 
	}	
	
	var q;
	var p;
	const n = A.length;
	var i;
	
	const TOL = 1e-12; //10 * EPS;

	do { 
		for ( i=0; i<n-1; i++) {
			if ( Math.abs( D.val[i*n + i+1] ) < TOL * ( Math.abs(D.val[i*n+i] ) + Math.abs(D.val[(i+1)*n+i+1] ) ) ) {
				D.val[i*n+i+1] = 0;
				D.val[(i+1)*n+i] = 0;
			}
		}

		// find largest q such that D[n-p-q:n][n-p-q:n] is diagonal: 
		if ( !isZero( D.val[(n-1)*n+n-2] )  || !isZero( D.val[(n-2)*n + n-1] )  ) 
			q = 0;
		else {
			q = 1;		
			while ( q < n-1 && isZero( D.val[(n-q-1)*n+ n-q-2] ) && isZero( D.val[(n-q-2)*n + n-q-1] ) )
				q++;	
			if ( q >= n-1 ) 
				q = n;			
		}
		
		// find smallest p such that D[p:q][p:q] is unreduced ( without zeros on subdiagonal?)
		p = -1;
		var zerosOnSubdiagonal ;
		do { 
			p++;
			zerosOnSubdiagonal = false;
			k=p;
			while (k<n-q-1 && zerosOnSubdiagonal == false) {
				if ( isZero ( D.val[(k+1)*n + k] ) )
					zerosOnSubdiagonal = true;
				k++;
			}
		} while (  zerosOnSubdiagonal && p + q < n  ); 

		// Apply implicit QR iteration
		if ( q < n ) {
			
			if ( computeEigenvectors ) {
				var res = implicitSymQRWilkinsonShift( get ( D, range(p,n-q), range(p,n-q)), true);
				set( D, range(p,n-q), range(p,n-q), res.T );
				for ( var kk = 0; kk < n-q-p-1; kk++)
					postmulGivens(res.cs[kk][0], res.cs[kk][1], p+kk, p+kk+1, Q);
				//Z = eye(n);
				//set(Z, range(p,n-q), range(p,n-q), DZ22.Z );
				// Q = mulMatrixMatrix ( Q, Z );	
				
			}
			else {
				set( D, range(p,n-q), range(p,n-q), implicitSymQRWilkinsonShift( get ( D, range(p,n-q), range(p,n-q)) , false)) ;
			}
		}

	} while (q < n ) ;

	if ( computeEigenvectors ) {
		return { "V" : diag(D), "U": Q};
	}	
	else 
		return diag(D);
}

function eigs( A, r, smallest ) {
	// Compute r largest or smallest eigenvalues and eigenvectors
	if( typeof(r) == "undefined")
		var r = 1;
	if( typeof(smallest) == "undefined" || smallest == false || smallest !="smallest" ) {		
		if ( r == 1)
			return eig_powerIteration ( A );
		else 
			return eig_orthogonalIteration ( A , r) ;
	}
	else {
		// look for smallest eigenvalues
		if ( r == 1)
			return eig_inverseIteration ( A , 0);
		else 
			return eig_bisect( A, r);
			//return eig_inverseOrthogonalIteration ( A , r) ;
	}			
}

function eig_powerIteration ( A , u0) {
// Compute the largest eigenvalue and eigenvector with the power method
	const maxIters = 1000;
	var k;
	const n = A.length;
	
	// init with a random u or an initial guess u0
	var u;
	if ( typeof(u0) == "undefined")
		u = randn(n);
	else
		u = u0;
	u = mulScalarVector(1/norm(u), u);
	var lambda = 1;
	for ( k=0; k< maxIters; k++) {		
		// Apply the iteration : u = Au / norm(Au)
		u = mulMatrixVector(A, u) ;
		lambda = norm(u);
		u = mulScalarVector(1/ lambda, u);				
	}
	return { "v" : lambda, "u" : u};
}

function eig_orthogonalIteration ( A, r ) {

	if ( r == 1 )	
		return eig_powerIteration ( A );

// Compute the r largest eigenvalue and eigenvector with the power method (orthogonal iteration)
	const maxIters = 1000;
	var k;
	const n = A.length;
	
	// init with a random Q
	var Q = randn(n,r);
	var normQ = norm(Q,1);
	Q = entrywisediv(Q, mul(ones(n),normQ) );
	var QR;
	var Z; 

	const TOL = 1e-11;
	var V;

	for ( k=0; k< maxIters; k++) {		

		// Z = AQ		
		Z = mulMatrixMatrix(A, Q);
		if ( Math.floor(k / 50) == k / 50) {
			// convergence test
			V = mulMatrixMatrix(transpose(Q), Z);

			if ( norm ( subMatrices ( Z, mulMatrixMatrix(Q, diag(diag(V)) ) ) ) < TOL )
				break;
		}	
			
		// QR = Z	// XXX maybe not do this at every iteration...
		Q = qroriginal(Z,r).Q;	
	
	}

	V = mulMatrixMatrix(transpose(Q), mulMatrixMatrix(A, Q) );

	return {"V": diag(V ), "U" : Q};
}

function eig_inverseIteration ( A, lambda ) {
	// Compute an eigenvalue-eigenvector pair from an approximate eigenvalue with the inverse iteration
	var perturbation = 0.0001*lambda;

	if ( typeof(maxIters) == "undefined" )
		var maxIters = 100;
		
	var k;
	const n = A.length;

	// apply power iteration with (A - lambda I)^-1 instead of A
	var A_lambdaI = sub(A, mul(lambda + perturbation, eye(n) ));
	var QR = qr( A_lambdaI ); // and precompute QR factorization

	while (QR.rank < n) { // check if not singular
		perturbation *= 10;
		A_lambdaI = sub(A, mul(lambda + perturbation, eye(n) ));
		QR = qr( A_lambdaI ); // and precompute QR factorization
		//console.log(perturbation);
	}
	
	// init
	var u = sub(mul(2,rand(n)),1); //ones(n); // 
	u = mulScalarVector( 1/norm(u), u );
	var v;
	var r;
	var norminfA = norminf(A);
	k = 0;
	do {
		// u =  solve(A_lambdaI , u) ;
		
		u = solveWithQRcolumnpivoting ( QR, u ); // QR factorization precomputed
		
		v = norm(u);
		u = entrywisediv(u , v);	

		r = mulMatrixVector(A_lambdaI, u); 
		
		k++;
	} while ( k < maxIters && maxVector(absVector(r)) < 1e-10 * norminfA); // && Math.abs(v * perturbation - 1 ) < EPS );
	return u;

}
function eigenvector ( A, lambda ) {
	return eig_inverseIteration(A, lambda, 2);
} 

function eig_inverseOrthogonalIteration ( A, r ) {

	if ( r == 1 )	
		return eig_inverseIteration ( A );

// Compute the r smallest eigenvalue and eigenvectors with the inverse power method 
// (orthogonal iteration)
	const maxIters = 1000;
	var k;
	const n = A.length;
	var QR = qr( A ); // precompute QR factorization

	// init with a random Q
	var Q = randn(n,r);
	var normQ = norm(Q,1);
	Q = entrywisediv(Q, mul(ones(n),normQ) );
	var QR;
	var Z; 

	const TOL = 1e-11;
	var V;

	for ( k=0; k< maxIters; k++) {		

		// Z = A^-1 Q
		Z = solveWithQRcolumnpivotingMultipleRHS ( QR, Q );
		
		if ( Math.floor(k / 50) == k / 50) {
			// convergence test
			V = mulMatrixMatrix(transpose(Q), Z);

			if ( norm ( subMatrices ( Z, mulMatrixMatrix(Q, V ) ) ) < TOL )
				break;
		}	
			
		// QR = Z	// XXX maybe not do this at every iteration...
		Q = qroriginal(Z,r).Q;	
	
	}

	V = mulMatrixMatrix(transpose(Q), mulMatrixMatrix(A, Q) );

	return {"V": diag(V ), "U" : Q, "iters": k};
}


function eig_bisect( A, K ) {
// find K smallest eigenvalues 

/*
TEST
//Symmetric eigenvalue decomposition
X = rand(5,5)
A = X*X'
v = eig(A)
eig_bisect(A,3)
*/
	
	var x,y,z;
	
	// Tridiagonalize A	
	var T = tridiagonalize( A ); 	
	const n = T.n;
	var a = diag(T);
	var b = zeros(n);
	var i;
	for ( i=0; i < n-1; i++) 
		b[i] =  T.val[i*n + i + 1];
		
	// Initialize [y,z] with Gershgorin disk theorem
	var y0 = a[0] - b[0];
	var z0 = a[0] + b[0];
	for ( var i=1; i < n; i++) {
		var yi = a[i] - b[i] - b[i-1];
		var zi = a[i] + b[i] + b[i-1];
		if( yi < y0 )
			y0 = yi;
		if( zi > z0 )
			z0 = zi;
	}
	
	/*
	// polynomial evaluation and counting sign changes (original method)
	var polya = function (x,a,b,n) {
		var pr_2 = 1;
		var pr_1 = a[0] - x;
		var pr;
		var signchanges = 0;
		if (  pr_1 < EPS )
			signchanges = 1;
			
		var r;
		for ( r = 1; r < n ; r++) {
			pr = (a[r] - x) * pr_1 - b[r-1] * b[r-1] * pr_2;

			if ( Math.abs(pr) < EPS || (pr > 0 &&  pr_1 < 0 ) || (pr < 0) && (pr_1 > 0) )
				signchanges ++;

			pr_2 = pr_1;
			pr_1 = pr;			
		}
		return signchanges;
	};
	*/
	
	// ratio of polynomials evaluation and counting sign changes
	// (modification discussed in Barth et al., 1967 for better stability due to pr ~ 0 in the above)
	var polyq = function (x,a,b,n) {
		var qi_1 = a[0] - x;
		var qi;
		var signchanges = 0;
		if (  qi_1 < EPS )
			signchanges = 1;
			
		var i;
		for ( i = 1; i < n ; i++) {
			qi = (a[i] - x) - b[i-1] * b[i-1] / qi_1;

			if ( qi < EPS ) 
				signchanges ++;

			if ( Math.abs(qi) < EPS )
				qi_1 = EPS;
			else
				qi_1 = qi;			
		}
		return signchanges;
	};


	// Start bisection
	const TOL = 1e-10; 
	var lambda = zeros(K);
	var xu = entrywisemul(z0,ones(K)); // upper bounds on lambdas
	y = y0;
	var n_lowerthan_x;// nb of eigenvalues lower than x
	for ( var k = 1; k <= K ; k++ ) {
		// k is the number of desired eigenvalues in this sweep 
		
		z = xu[k-1];
		//y=y; from previous sweep
		
		// find the (n-k+1)th eigenvalue
		while ( Math.abs(z - y) > TOL*(Math.abs(y) + Math.abs(z)) ) {
			x = (y+z)/2;
			n_lowerthan_x = polyq(x,a,b,n);

			if(n_lowerthan_x  >= k ) 
				z = x; // enough eigenvalues below x, decrease upper bound to x
			else
				y = x; // not enough ev below x, increase lower bound to x
				
			// update boudns on other lambdas
			for ( var j=k+1; j <= K; j++) 
				if ( n_lowerthan_x >= j )
					xu[j-1] = x;			
			
		}
		lambda[k-1] = (y+z)/2;
	}
	//return lambda;
	
	// Compute eigenvectors: XXX can be faster by using inverse iteration on the tridiagonal matrix 
	//						 with faster system solving
	
	var u = eigenvector( A, lambda[0] ); 
	var U = mat([u],false);
	
	for ( k = 1; k < K; k++) {
		// deal with too close eigenvalues
		var perturbtol = 10 * Math.max(EPS, Math.abs(EPS * lambda[k-1])); 
		if ( lambda[k] < lambda[k-1] + perturbtol ) 
			lambda[k] = lambda[k-1] + perturbtol;
	
		u = eigenvector( A, lambda[k] ); 
		U = mat([U, u], false ); 
		U = qroriginal( U, U.n ).Q; // orthogonalize
	}

	
	return {U: U, V: lambda};
}


function bidiagonalize( A, computeU, thinU , computeV ) {
	// B = U' A V , where B is upper bidiagonal

	var j;
	const m = A.length;
	const n = A.n;
	var B;
	B = matrixCopy( A );
	
	var householder; 
	
	if ( computeU ) {
		if ( thinU ) {
			var U = eye(m,n);
			var nU = n;						
		}
		else {
			var U = eye(m);
			var nU = m;
		}
	}
	if ( computeV ) {
		var V = eye(n);		
	}
	
	
	var updateB1 = function (j, v, beta) {
		// B = B - (beta v) ( v'* B) = B-outer(beta v, B'*v)
		//Bjmjn = get ( B, range(j,m), range(j, n));
		//set ( B, range(j,m), range(j,n), sub ( Bjmjn , outerprod ( householder.v, mul(transpose(Bjmjn), householder.v), householder.beta) ) );
			
		var i,k;
		var Btv = zeros(n-j);
		var n_j = n-j;
		var m_j = m-j;
		for ( i=0; i<m_j; i++) {
			var Bi = (i+j)*n + j;
			for ( k=0;k<n_j; k++) 
				Btv[k] += v[i] * B.val[Bi+k];
		}
		for ( i=0; i < m_j; i++) {
			var betavk = beta * v[i];
			var Bi = (i+j)*n + j;
			for ( k=0; k < n_j ; k++) {
				B.val[Bi+k] -= betavk * Btv[k];
			}
		}
	};
	var updateB2 = function (j, v, beta) {
		// B = B - beta (Bv) v' (with B = B_j:m, j+1:n)

		//Bjmjn = get ( B, range(j,m), range(j+1, n));
		//set ( B, range(j,m), range(j+1,n) , sub( Bjmjn, outerprod( mul(Bjmjn, householder.v), householder.v, householder.beta) ) );		
		var i,k;	
		var n_j_1 = n-j-1;
		for ( i=j; i < m; i++) {
			var Bi = i*n + j + 1;
			var Bv = 0;
			for ( k=0;k<n_j_1; k++) 
				Bv += B.val[Bi + k] *  v[k] ;
			var betaBvk = beta * Bv;
			for ( k=0; k < n_j_1 ; k++) {
				B.val[Bi + k] -= betaBvk * v[k];
			}
		}
	};
	
	if ( computeV ) {
		var updateV = function (j, v, beta) {
			//smallV = get ( V, range(0,n), range(j+1, n));
			//set ( V, range(0,n), range(j+1,n) , sub( smallV, outerprod( mul(smallV, householder.v), householder.v, householder.beta) ) );	
			var i,k;	
			var n_j_1 = n-j-1;
			for ( i=0; i < n; i++) {
				var Vi = i*n + j + 1;
				var Vv = 0;
				for ( k=0;k<n_j_1; k++) 
					Vv += V.val[Vi + k] *  v[k] ;
				var betaVvk = beta * Vv;
				for ( k=0; k < n_j_1 ; k++) {
					V.val[Vi + k] -= betaVvk * v[k];
				}
			}
		};
	}
	if ( computeU ) {
		var hv=new Array(n);// Householder vectors and betas
		var hb=new Array(n);
	}
	
	for (j=0; j < n ; j++) {
				
		if ( j < m-1)  {
			householder = house( get ( B, range(j, m), j) );
			
			updateB1(j, householder.v, householder.beta);
			
			if ( computeU ) {				
				hv[j] = vectorCopy(householder.v);
				hb[j] = householder.beta;
				//	updateU(j, householder.v, householder.beta);
			}
		}
				
		if ( j < n-2) {
			householder = house ( B.row(j).subarray(j+1, n) ) ;
			
			updateB2(j, householder.v, householder.beta);
			
			if( computeV ) {
				updateV(j, householder.v, householder.beta);
			
			}	
		}		
	}
	if (computeU) {		
		// Back accumulation of U (works with less than m columns)
		// Un_1 = (I-beta v v')Un = Un - beta v (v' Un)

		/*for (j=n-1;j>=0; j--) {
			if (j<m-1){
				smallU = get(U,range(j,m),[]);
				set(U,range(j,m),[], sub(smallU, mul(bv[j],mul(hv[j], mul(transpose(hv[j]) , smallU)))));
			}
		}*/
		var updateU = function (j, v, beta) {			
			var i,k;
			var vtU = zeros(nU);
			for ( i=j; i<m; i++) {
				var Ui = i*nU;
				var i_j = i-j;
				for ( k=0;k<nU; k++) 
					vtU[k] += v[i_j] * U.val[Ui + k];
			}
			for ( i=j; i < m; i++) {
				var betavk = beta * v[i-j];
				var Ui = i*nU;		
				for ( k=0; k < nU ; k++) {
					U.val[Ui + k] -= betavk * vtU[k];
				}
			}
		};
		var nj = Math.min(n-1,m-2);
		for (j=nj;j>=0; j--) {
				updateU(j,hv[j], hb[j]);
		}
	}

	if ( computeU && computeV ) {
		return { "U" : U, "V": V, "B": B};	 
	}
	else if (computeV )
		return { "V": V, "B": B};
	else if (computeU)
		return { "U" : U, "B": B};	 
	else
		return B;
}


function GolubKahanSVDstep ( B, i, j, m, n, computeUV ) {
	// Apply GolubKahanSVDstep to B(i:i+m, j:j+n)
	// Note: working on Utrans
	if (type ( B ) != "matrix" ) 
		return B;

	if ( n < 2 ) 
		return B;

	const rn2 = (i+n-2)*B.n + j;
	const dm = B.val[rn2 + n-2];
	const fm = B.val[rn2 + n-1];
	var fm_1 ;
	if ( n>2)
		fm_1 = B.val[(i+n-3)*B.n + j + n-2];
	else
		fm_1 = 0;
		
	const dn = B.val[(i+n-1)*B.n + j + n-1];
	
	const d = ( dm*dm + fm_1*fm_1 - dn*dn - fm*fm ) / 2;
	const t2 = dm*fm * dm*fm;
	const mu = dn*dn+fm*fm - t2 / ( d + Math.sign(d) * Math.sqrt( d*d + t2) );

	var k;
	
	//var B0 = getCols ( B, [0]); 
	//var B1 = getCols ( B, [1]) ;
	//var y = mul( B0, B0 ) - mu;
	//var z =  mul( B0, B1 );
	var y = - mu;
	var z = 0.0;
	var r0 = i*B.n + j;
	for ( k = 0; k< n; k++) {
		y += B.val[r0] * B.val[r0];
		z += B.val[r0] * B.val[r0+1];
		r0 += B.n;
	}
	

	var G;	
	var cs;
	
	var postmulgivens = function ( c, s, k1, k2) {
		// apply a Givens rotation to a subset of rows of B : B(i:i+m, [k1,k2]) =  B(i:i+m, [k1,k2]) * G
		var jj;
		var t1;
		var t2;
		var rj = i*B.n + j;
		for ( jj=0; jj < m; jj++) {
			t1 = B.val[rj + k1]; 
			t2 = B.val[rj + k2]; 
			B.val[rj + k1] = c * t1 - s * t2; 
			B.val[rj + k2] = s * t1 + c * t2;
			rj += B.n;
		}	
	}
	var premulgivens = function ( c, s, k1, k2) {
	// apply a Givens rotation to a subset of cols of B : B([k1,k2],j:j+n) = G' * B([k1,k2],j:j+n)
		var jj;
		const ri = (i+k1)*B.n + j;
		const rk = (i+k2)*B.n + j;
		var t1;
		var t2;
		for ( jj=0; jj < n; jj++) {
			t1 = B.val[ri + jj]; 
			t2 = B.val[rk + jj]; 
			B.val[ri + jj] = c * t1 - s * t2; 
			B.val[rk + jj] = s * t1 + c * t2;
		}	
	}
	
	if ( computeUV) {
		//var U = eye(m);
		//var V = eye(n);
		var csU = new Array(n-1);
		var csV = new Array(n-1);		
	}

	for ( k = 0; k < n-1 ; k++) {
		cs = givens(y,z);
		postmulgivens(cs[0],cs[1], k, k+1);
		
		if ( computeUV ) {
			csV[k] = [cs[0], cs[1]];
			//	postmulGivens(cs[0],cs[1], k, k+1, V);
		}
			
			
		y = B.val[(i+k)*B.n + j + k];
		z = B.val[(i+k+1)*B.n + j + k];
			
		cs = givens(y,z);
		premulgivens(cs[0],cs[1], k, k+1);
	
		if ( computeUV ) {
			csU[k] = [cs[0], cs[1]];
			//premulGivens(cs[0],cs[1], k, k+1, U);
		}

		if ( k < n-2 ) {
			y = B.val[(i+k)*B.n + j + k+1];
			z = B.val[(i+k)*B.n + j + k+2];
		}
			
	}

	if ( computeUV) 
		return {csU: csU, csV: csV};
}

function svd( A , computeUV ) {
/* TEST:
A=[ [-149,-50,-154],[537,180,546],[-27,-9,-25]]
s=svd(A)
should return [ 817.7597, 2.4750, 0.0030]
*/	

	if ( type(A) == "vector" || (type(A) == "matrix" && A.n == 1) ) {
		return { "U" : matrixCopy(A), "S" : ones(1,1), "V" : ones(1,1), "s" : [1] };
	}
	if ( A.m == 1) {
		return { "U" : ones(1,1), "S" : ones(1,1), "V" : transpose(A), "s" : [1] };
	}
	

	var i;
	var m = A.length;
	var n = A.n; 
	
	
	var Atransposed = false;
	if ( n > m ) {
		Atransposed = true;
		var At = transposeMatrix(A);
		n = m;
		m = At.length;
	}
	
	var computeU = false;
	var computeV = false; 
	var thinU = false;
	if ( typeof( computeUV) != "undefined" && computeUV!==false)  {
	
		if ( computeUV === "full" ) {
			computeU = true; 
			computeV = true;
			thinU = false;
		}
		else if (computeUV === true || computeUV === "thin" ) {
			computeU = true; 
			computeV = true;
			thinU = true;
		}
		else if ( typeof(computeUV) == "string") {
			if ( computeUV.indexOf("U") >=0 )
				computeU = true;
			if ( computeUV.indexOf("V") >=0 )
				computeV = true;
			if ( computeUV.indexOf("thin") >=0 )
				thinU = true;
		}
		var UBV;		
		if ( Atransposed ) {
			var tmp = computeU;
			computeU = computeV;
			computeV = tmp;
			UBV = bidiagonalize( At, computeU, thinU, computeV );
		}
		else
			UBV =  bidiagonalize( A, computeU, thinU, computeV );

		if ( computeU ) {
			var U = transpose(UBV.U);//Utrans
		}
		else
			var U = undefined;
			
		if( computeV ) {	
			var V = UBV.V;
			var Vt = transposeMatrix(V);
		}
		else
			var V = undefined;

		var B = UBV.B;
	}
	else {
		if ( Atransposed ) 
			var B = bidiagonalize( At, false, false, false );
		else
			var B = bidiagonalize( matrixCopy(A), false, false, false );
	}

	var B22;
	var U22;
	var V22;
	var cs;
	
	var q;
	var p;
	var k;

	const TOL = 1e-11;
	
	do {
		
		for ( i=0; i<n-1; i++) {
			if ( Math.abs( B.val[i*B.n + i+1] ) < TOL * ( Math.abs(B.val[i*B.n + i]) + Math.abs(B.val[(i+1) * B.n + i+1]) ) ) {
				B.val[i*B.n + i+1] = 0;
			}
		}

		// find largest q such that B[n-p-q:n][n-p-q:n] is diagonal: 
		if ( ( Math.abs( B.val[(n-1)*B.n + n-2] ) > TOL ) || (Math.abs(B.val[(n-2)*B.n + n-1]) > TOL ) ) {
			q = 0;
		}
		else {
			q = 1;		
			while ( q < n-1 && Math.abs( B.val[(n-q-1)*B.n + n-q-2] ) < TOL && Math.abs( B.val[(n-q-2)*B.n + n-q-1] ) < TOL ) {
				q++;	
			}
			if ( q >= n-1 ) 
				q = n;			
		}
				
		// find smallest p such that B[p:q][p:q] has no zeros on superdiag
		p=n-q-1;
		while ( p > 0 && ! isZero ( B.val[(p-1)*B.n + p] ) )
			p--;
			
		if ( q < n ) {
			var DiagonalofB22isZero = -1;
			for ( k=p; k< n-q-1 ; k++) {
				if ( Math.abs(  B.val[k*B.n + k] ) < TOL ) {
					DiagonalofB22isZero = k;
					break; 
				}
			}
			if ( DiagonalofB22isZero >= 0 ) {
				
				if ( DiagonalofB22isZero < n-q-1 ) {		
					// Zero B(k,k+1) and entire row k...
		      		for (j=DiagonalofB22isZero+1; j < n; j++) {	

						cs = givens(- B.val[j*B.n + j] , B.val[DiagonalofB22isZero * B.n + j] );
						premulGivens(cs[0],cs[1], DiagonalofB22isZero, j, B);
						if ( computeU ) 
							premulGivens(cs[0],cs[1], DiagonalofB22isZero, j, U);								
					}
				}
				else {	
					// Zero B(k-1,k) and entire row k...
		      		for (j=DiagonalofB22isZero - 1; j >= p; j--) {
						 
						cs = givens(B.val[j*B.n * j] , B.val[j*B.n + n-q-1] );
						postmulGivens(cs[0],cs[1], j, n-q-1, B);
						if ( computeV ) 
							premulGivens(cs[0],cs[1], j, n-q-1, Vt);
//							postmulGivens(cs[0],cs[1], j, n-q-1, V);
		
					}
				}
				
			}
			else {
				//B22 = get ( B, range(p , n - q ) , range (p , n-q ) );	
				
				if ( computeUV ) {
					// UBV = GolubKahanSVDstep( B22, true ) ;
					// set ( U, range(p,n-q), [], mul(UBV.U, get(U, range(p,n-q), []) ) );
					// set ( Vt, range(p,n-q), [], mul(transpose(UBV.V), getRows(Vt, range(p,n-q)) ) );

					var GKstep = GolubKahanSVDstep( B, p, p, n-q-p, n-q-p, true ) ;// this updates B22 inside B
					for ( var kk=0; kk < n-q-p-1; kk++) {
						if ( computeU )
							premulGivens(GKstep.csU[kk][0], GKstep.csU[kk][1], p+kk, p+kk+1, U);
						if ( computeV )
							premulGivens(GKstep.csV[kk][0], GKstep.csV[kk][1], p+kk, p+kk+1, Vt); // premul because Vtransposed
					}												
				}
				else {
					GolubKahanSVDstep( B, p, p, n-q-p, n-q-p ) ;
				}
				//set ( B , range(p , n - q ) , range (p , n-q ), B22  );			
			}		
		}
	} while ( q < n ) ;

	if (computeUV ) {
	
		if ( computeV)
			V = transposeMatrix(Vt);
	
		// Correct sign of singular values:
		var s = diag(B);
		var signs = zeros(n);
		for ( i=0; i< n; i++) {
			if (s[i] < 0) {
				if ( computeV )
					set(V, [], i, minus(get(V,[],i)));
				s[i] = -s[i];
			}
		}

		// Rearrange in decreasing order: 
		var indexes = sort(s,true, true);
		if(computeV)
			V = get( V, [], indexes);
		if(computeU) {
			if ( !thinU) {
				for ( i=n; i < m; i++)
					indexes.push(i);
			}
			U = get(U, indexes,[]) ;
		}
		
		if ( thinU )
			var S = diag(s) ;
		else
			var S = mat([diag(s), zeros(m-n,n)],true) ;
		
		var Ut = undefined;
		if ( computeU )
			Ut = transpose(U);
			
		if ( Atransposed ) {
			if ( thinU )
				return { "U" : V, "S" : S, "V" : Ut, "s" : s };			
			else
				return { "U" : V, "S" : transpose(S), "V" : Ut, "s" : s };
		}		
		else {
			return { "U" : Ut, "S" : S, "V" : V, "s" : s };
		}
	}
	else 
		return sort(abs(diag(B)), true);
}

function rank( A ) {
	const s = svd(A);
	var rank = 0;
	var i;
	for ( i=0;i < s.length;i++)
		if ( s[i] > 1e-10 )
			rank++;
			
	return rank;
}

function nullspace( A ) {
	// Orthonormal basis for the null space of A
	const s = svd( A, "V" ) ; 
	const n = A.n;

	var rank = 0;
	const TOL = 1e-8; 
	while ( rank < n && s.s[rank] > TOL )
		rank++;

	if ( rank < n ) 
		return get ( s.V, [], range(rank, n) );
	else
		return zeros(n);
	
}

function orth( A ) {
	// Orthonormal basis for the range of A
	const s = svd( A, "thinU" ) ; 
	const n = A.n;

	var rank = 0;
	const TOL = 1e-8; 
	while ( rank < n && s.s[rank] > TOL )
		rank++;
	
	return get ( s.U, [], range(0,rank) );
	
}

/////////////////////////////
//// Sparse matrix and vectors 
/////////////////////////////

/**
 *
 * new spVector(n) => allocate for n nonzeros with dim n
 * new spVector(n, nnz) => allocate for nnz nonzeros out of n
 * new spVector(n,values,indexes) => allocate for values.length nonzeros
 *
 * @constructor
 * @struct
 */
function spVector(n, values, indexes) {
	
	/** @const */ this.length = n;
	/** @const */ this.size = [n,1];
	/** @const */ this.type = "spvector";
	
	if ( arguments.length <= 2) {
		if ( arguments.length == 1)
			var nnz = n;		// too large but more efficient at some point...
		else
			var nnz = values;
			
		/** @type{Float64Array} */ this.val = new Float64Array(nnz);  // nz values
		/** @type{Uint32Array} */ this.ind = new Uint32Array(nnz);   // ind[k] = index of val[k]
	}
	else {
		var nnz = values.length;
		/** @type{Float64Array} */ this.val = new Float64Array(values);  // nz values
		/** @type{Uint32Array} */ this.ind = new Uint32Array(indexes);   // ind[k] = index of val[k]
	}
	
	/** @const */ this.nnz = nnz;	
}
/*
 * @param{number}
 * @return{number}
 */
spVector.prototype.get = function ( i ) {
	var k = this.ind.indexOf(i);
	if ( k < 0 )
		return 0;
	else
		return this.val[k];
}
/*
 * @param{number}
 * @param{number}
 */
spVector.prototype.set = function ( i, value ) {
	// Inefficient do not use this, use sparse(x) instead
	if ( i > this.n ) {
		error( "Error in spVector.set(i,value): i > this.length)");
		return undefined;
	}
	var k = this.ind.indexOf(i);
	if ( k < 0 ) {
		var ind = new Uint32Array(this.nnz + 1);
		var val = new Float64Array(this.nnz + 1);
		k = 0; 
		while ( this.ind[k] < i ) { // copy values until i
			ind[k] = this.ind[k];	// making sure this.ind remains sorted
			val[k] = this.val.ind[k];
			k++;
		}
		ind[k] = i;// insert value
		val[k] = value;
		ind.set(this.ind.subarray(k), k+1);// copy rest of vector
		val.set(this.val.subarray(k), k+1);
		this.nnz++;
	}
	else 
		this.val[k] = value;
		
	return value;
}
/*
 * @return{spVector}
 */
spVector.prototype.copy = function () {
	return new spVector(this.n, this.val, this.ind);	
}

/**
 *
 * new spMatrix(m,n) => allocate for m*n nonzeros
 * new spMatrix(m,n, nnz) => allocate for nnz nonzeros
 * new spMatrix(m,n,values,cols,rows) => allocate for values.length nonzeros
 *
 * @constructor
 * @struct
 */
function spMatrix(m,n, values, cols, rows) {
	
	/** @const */ this.length = m;
	/** @const */ this.m = m;
	/** @const */ this.n = n;
	/** @const */ this.size = [m,n];
	/** @const */ this.type = "spmatrix";
	
	if ( arguments.length <= 3) {
		if ( arguments.length == 2)
			var nnz = m*n;		// too large but more efficient at some point...
		else
			var nnz = values;
			
		/** @type{boolean} */ this.rowmajor = true;
		/** @type{Float64Array} */ this.val = new Float64Array(nnz);  // nnz values
		/** @type{Uint32Array} */ this.cols = new Uint32Array(nnz); // cols[j] = starting index of col j in val and rows
		/** @type{Uint32Array} */ this.rows = new Uint32Array(m+1);   // rows[k] = row of val[k]
	}
	else {
		var nnz = values.length;
		if ( rows.length == nnz && cols.length == n+1 && cols[cols.length-1] == nnz ) {
			/** @type{boolean} */ this.rowmajor = false;
			/** @type{Float64Array} */ this.val = new Float64Array(values);  // nz values
			/** @type{Uint32Array} */ this.cols = new Uint32Array(cols); // cols[j] = starting index of col j in val and rows
			/** @type{Uint32Array} */ this.rows = new Uint32Array(rows);   // rows[k] = row of val[k]		
		}
		else {
			/** @type{boolean} */ this.rowmajor = true;
			/** @type{Float64Array} */ this.val = new Float64Array(values);  // nz values
			/** @type{Uint32Array} */ this.cols = new Uint32Array(cols); // cols[k] = col of val[k]	
			/** @type{Uint32Array} */ this.rows = new Uint32Array(rows);   // rows[i] = starting index of row i in val and cols
		}
	}
	
	/** @const */ this.nnz = nnz;
	
}
/*
 * @return{spMatrix}
 */
spMatrix.prototype.copy = function () {
	return new spMatrix(this.m, this.n, this.val, this.cols, this.rows);	
}
/*
 * @return{spMatrix}
 */
spMatrix.prototype.toRowmajor = function () {
	if ( this.rowmajor ) 
		return this.copy();
	else {
		return sparseMatrixRowMajor( fullMatrix(this) );
	}
}
/*
 * Get a pointer to the spVector for row i
 * @return{spVector}
 */
spMatrix.prototype.row = function ( i ) {
	if ( this.rowmajor ) {
		return new spVector(this.n, this.val.subarray(this.rows[i], this.rows[i+1]), this.cols.subarray(this.rows[i], this.rows[i+1]));	
	/*
		var s = this.rows[i];
		var e = this.rows[i+1];
		var vec = new spVector(this.n);
		vec.val.set(this.val.subarray(s,e));
		vec.ind.set(this.cols.subarray(s,e));
		return vec;*/
	}
	else {
		error ("Cannot extract sparse column from a sparse matrix in row major format.");
		return undefined;
	}
}
/*
 * Get a pointer to the spVector for column j
 * @return{spVector}
 */
spMatrix.prototype.col = function ( j ) {
	if ( ! this.rowmajor )
		return new spVector(this.m, this.val.subarray(this.cols[j], this.cols[j+1]), this.rows.subarray(this.cols[j], this.cols[j+1]));	
	else {
		error ("Cannot extract sparse column from a sparse matrix in row major format.");
		return undefined;
	}
}

/*
 * @param{number}
 * @param{number} 
 * @return{number}
 */
spMatrix.prototype.get = function ( i, j ) {
	if ( this.rowmajor ) {
		var rowind =  this.cols.subarray(this.rows[i], this.rows[i+1]);
		var k = rowind.indexOf(j);
		if ( k < 0 )
			return 0;
		else
			return this.val[this.rows[i] + k];	
	}
	else {
		var colind =  this.rows.subarray(this.cols[j], this.cols[j+1]);
		var k = colind.indexOf(i);
		if ( k < 0 )
			return 0;
		else
			return this.val[this.cols[j] + k];
	}
}

function spgetRows(A, rowsrange) {
	var n = rowsrange.length;
	if ( A.rowmajor) {
		if ( n > 1 ) {

			var rowsidx = sort(rowsrange);
			var Ai = new Array(n);
			var nnz = 0;
			for ( var i = 0; i < n; i++) {
				Ai[i] = A.row(rowsidx[i]);
				nnz += Ai[i].val.length;
			}
			var val = new Float64Array( nnz );
			var cols = new Uint32Array( nnz );
			var rows = new Uint32Array( n+1 );
			var k = 0;
			for ( var i = 0; i < n; i++) {
				rows[i] = k;
				val.set(Ai[i].val, k);
				cols.set(Ai[i].ind, k);
				k += Ai[i].val.length;
			}
			rows[i] = k;
			return new spMatrix(n, A.n, val, cols, rows);
		}
		else
			return A.row( rowsrange[0] ) ;
	}
	else {
		return getRows(fullMatrix(A), rowsrange);
	}
}

/**
 * Return the full/dense version of the vector
 * @param{spVector} 
 * @return{Float64Array}
 */
function fullVector (x) {
	var k;
	const n = x.length;
	const nnz = x.val.length;
	var a = new Float64Array(n);
	
	for ( k=0; k < nnz; k++) 
		a[x.ind[k]] = x.val[k];
	
	return a;
}
/**
 * Return the full/dense version of the matrix
 * @param{spMatrix} 
 * @return{Matrix}
 */
function fullMatrix (S) {
	const n = S.n;
	if ( S.rowmajor ) {
		var k;
		const m = S.m;
		var A = new Float64Array(m * n);
		var ri = 0;
		for (var i = 0; i < m; i++) {
			var s = S.rows[i];
			var e = S.rows[i+1];
			for ( k=s; k < e; k++) {
				A[ri + S.cols[k] ] = S.val[k];
			}
			ri += n;
		}
		return new Matrix(m, n, A, true);
	}
	else {
		var k;
		var A = new Float64Array(S.m * n);
		for (var j = 0; j < n; j++) {
			var s = S.cols[j];
			var e = S.cols[j+1];
			for ( k=s; k < e; k++) {
				var i = S.rows[k];
				A[i*n + j] = S.val[k];
			}
		}
		return new Matrix(S.m, n, A, true);
	}
}
function full( A ) {
	switch(type(A)) {
	case "spvector": 
		return fullVector(A);
		break;
	case "spmatrix":
		return fullMatrix(A);
		break;
	default:
		return A;
		break;
	}
}

/**
 * @param{Float64Array}
 * @return{spVector}
 */
function sparseVector( a ) {
	var i,k;
	const n = a.length;
	var val = new Array();
	var ind = new Array();
	for ( i=0; i < n; i++) {
		if (!isZero(a[i]) ) {
			val.push(a[i]);
			ind.push(i);
		}
	}		
	return new spVector(n,val,ind);
}
/**
 * @param{Matrix}
 * @return{spMatrix}
 */
function sparseMatrix( A ) {
	var i,j;
	const m = A.m;
	const n = A.n;
	var val = new Array();
	var rows = new Array();
	var cols = new Uint32Array(n+1);
	var k;
	for ( j=0; j< n; j++) {
		k = j;
		for ( i=0; i < m; i++) {
			// k = i*n+j;
			if (!isZero(A.val[k]) ) {
				val.push(A.val[k]);
				rows.push(i);
				cols[j+1]++;
			}	
			k += n;	
		}		
	}	
	for ( j=1; j< n; j++) 
		cols[j+1] += cols[j];
	
	return new spMatrix(m,n,val,cols,rows);
}
/**
 * @param{Matrix}
 * @return{spMatrix}
 */
function sparseMatrixRowMajor( A ) {
	var i,j;
	const m = A.m;
	const n = A.n;
	var val = new Array();
	var cols = new Array();
	var rows = new Uint32Array(m+1);
	var k = 0;
	for ( i=0; i < m; i++) {
		for ( j=0; j< n; j++) {
			// k = i*n+j;
			if (!isZero(A.val[k]) ) {
				val.push(A.val[k]);
				rows[i+1]++;
				cols.push(j); 
			}		
			k++;
		}		
	}	
	for ( i=1; i< m; i++) 
		rows[i+1] += rows[i];
	
	return new spMatrix(m,n,val,cols,rows);
}

function sparse( A , rowmajor ) {
	if(typeof(rowmajor) == "undefined" ) 
		var rowmajor = true;
		
	switch(type(A)) {
	case "vector": 
		return sparseVector(A);
		break;	
	case "matrix":
		if ( rowmajor )
			return sparseMatrixRowMajor(A);
		else
			return sparseMatrix(A);
		break;
	case "spvector":
	case "spmatrix":
		return A.copy();
		break;
	default:
		return A;
		break;
	}
}

/**
 * @param{number}
 * @return{spMatrix}
 */
function speye(m,n) {
	if ( typeof(n) == "undefined" ) 
		var n = m;
	if ( m == 1 && n == 1)
		return 1;
	
	var e = (m<n)?m:n;
	
	var val = ones(e);
	var rows = range(e+1);
	var cols = rows.slice(0,e);
	return new spMatrix(m,n,val,cols,rows);
}
/**
 * @param{Float64Array}
 * @return{spMatrix}
 */
function spdiag(val) {
	var n = val.length;
	var rows = range(n+1);
	var cols = rows.slice(0,n);
	var tv = type(val);
	if ( tv == "vector")
		return new spMatrix(n,n,val,cols,rows);
	else {
		error("Error in spdiag( x ): x is a " + tv + " but should be a vector.");
		return undefined;
	}
}

/**
 * @param{spVector}
 * @return{Matrix}
 */
function transposespVector (a) {
	return new Matrix(1,a.length, fullVector(a), true);
}
/**
 * @param{spMatrix}
 * @return{spMatrix}
 */
function transposespMatrix (A) {
	return new spMatrix(A.n, A.m, A.val, A.rows, A.cols);
	/*
	const m = A.m;
	const n = A.n;
	
	var At = zeros(n, m);	
	for ( var j=0; j < n; j++) {
		var s = A.cols[j];
		var e = A.cols[j+1];

		for ( var k=s;k < e; k++) {
			At[ rj + A.rows[k] ] = A.val[k];
		}
		rj += m;
	}
	return sparseMatrix(At);
	*/
}



/** Concatenate sparse matrices/vectors
 * @param {Array} 
 * @param {boolean}
 * @return {spMatrix}
 */
function spmat( elems, rowwise ) {
	var k;
	var elemtypes = new Array(elems.length);
	for ( k=0; k < elems.length; k++) {
		elemtypes[k] = type(elems[k]);
	}
		
	if ( typeof(rowwise) == "undefined")
		var rowwise = true;
		
	if ( elems.length == 0 ) {
		return []; 
	}

	var m = 0;
	var n = 0;
	var nnz = 0;
	var i;
	var j;
	if ( rowwise ) {
		var res = new Array( ) ;
		
		for ( k= 0; k<elems.length; k++) {
			switch( elemtypes[k] ) {

			case "vector": // vector (auto transposed)
				var v = sparseVector(elems[k]);
				res.push ( v ) ;
				m += 1;
				n = elems[k].length;
				nnz += v.val.length;
				break;			
			
			case "spvector":
				res.push(elems[k]);
				n = elems[k].length;
				m += 1;
				nnz += elems[k].val.length;
				break;
				
			case "spmatrix":
				for ( var r=0; r < elems[k].m; r++)
					res.push(elems[k].row(r));
				res.push(elems[k]);
				n = elems[k].length;
				m += 1;
				nnz += elems[k].val.length;
				
				break;
				
			default:
				return undefined;
				break;
			}
		}
		
		var M = new spMatrix( m , n , nnz ) ;
		var p = 0;
		M.rows[0] = 0;		
		for (k=0; k < res.length ; k++) {
			if ( res[k].val.length > 1 ) {
				M.val.set( new Float64Array(res[k].val), p);
				M.cols.set( new Uint32Array(res[k].ind), p);
				M.rows[k+1] = M.rows[k] + res[k].val.length;
				p += res[k].val.length;
			}
			else if (res[k].val.length == 1) {
				M.val[p] = res[k].val[0];
				M.cols[p] = res[k].ind[0];
				M.rows[k+1] = M.rows[k] + 1;
				p += 1;			
			}
				
		}
		return M;
	}
	else {
		// not yet...
		
		error("spmat(..., false) for columnwise concatenation of sparse vectors not yet implemented");
		
		return res;
	}
}



/**
 * @param{number}
 * @param{spVector}
 * @return{spVector}
 */
function mulScalarspVector (a, b) {
	const nnz = b.val.length;
	var c = b.copy();
	for ( var k=0;k < nnz; k++) 
		c.val[k] *= a;	
	return c;
}
/**
 * @param{number}
 * @param{spMatrix}
 * @return{spMatrix}
 */
function mulScalarspMatrix (a, B) {
	const nnz = B.nnz;
	var C = B.copy();
	for ( var k=0;k < nnz; k++) 
		C.val[k] *= a;	
	return C;
}

/**
 * @param{spVector}
 * @param{spVector}
 * @return{number}
 */
function spdot (a, b) {
	const nnza = a.val.length;
	const nnzb = b.val.length;
	var c = 0;
	var ka = 0;
	var kb = 0;	
	while ( ka < nnza && kb < nnzb ){
		var i = a.ind[ka]; 
		while ( b.ind[kb] < i && kb < nnzb)
			kb++;
		if(b.ind[kb] == i)
			c += a.val[ka] * b.val[kb];	
		ka++;
	}
	return c;
}
/**
 * @param{spVector}
 * @param{Float64Array}
 * @return{number}
 */
function dotspVectorVector (a, b) {
	const nnza = a.val.length;
	var c = 0;
	for ( var ka=0;ka < nnza; ka++) 
		c += a.val[ka] * b[a.ind[ka]];
	
	return c;
}
/**
 * @param{Matrix}
 * @param{spVector}
 * @return{Float64Array}
 */
function mulMatrixspVector (A, b) {
	const m = A.m;
	const n = A.n;
	const nnz = b.val.length;
	var c = zeros(m);
	var ri = 0;
	for ( var i=0;i < n; i++) {
		for ( var k=0; k < nnz; k++) 
			c[i] += A.val[ri + b.ind[k]] * b.val[k];
		ri+=n;
	}
	return c;
}
/**
 * @param{spMatrix}
 * @param{Float64Array}
 * @return{Float64Array}
 */
function mulspMatrixVector (A, b) {
	const m = A.m;
	const n = A.n;
	var c = zeros(m);
	if ( A.rowmajor) {
		for(var i=0; i < m; i++) {
			var s = A.rows[i];
			var e = A.rows[i+1];
			for(var k = s; k < e; k++) {
				c[i] += A.val[k] * b[A.cols[k]];
			}
		}
	}
	else {
		for ( var j=0;j < n; j++) {
			var s = A.cols[j];
			var e = A.cols[j+1];
			var bj = b[j];
			for ( var k= s; k < e; k++) {
				c[A.rows[k]] += A.val[k] * bj;
			}
		}
	}
	return c;
}
/**
 * @param{spMatrix}
 * @param{Float64Array}
 * @return{Float64Array}
 */
function mulspMatrixTransVector (A, b) {
	const m = A.m;
	const n = A.n;
	var c = zeros(n);
	if ( A.rowmajor ) {
		for ( var j=0;j < m; j++) {
			var s = A.rows[j];
			var e = A.rows[j+1];
			var bj = b[j];
			for ( var k= s; k < e; k++) {
				c[A.cols[k]] += A.val[k] * bj;
			}
		}
	}
	else {
		for ( var j=0;j < n; j++) {
			var s = A.cols[j];
			var e = A.cols[j+1];
			for ( var k= s; k < e; k++) {
				c[j] += A.val[k] * b[A.rows[k]];
			}
		}
	}
	return c;
}
/**
 * @param{spMatrix}
 * @param{spVector}
 * @return{Float64Array}
 */
function mulspMatrixspVector (A, b) {
	const m = A.m;
	const n = A.n;
	var c = zeros(m);
	const nnzb = b.val.length;
	if ( A.rowmajor) {
		for(var i=0; i < m; i++) {
			c[i] = spdot(A.row(i), b);
		}
	}
	else {
		for ( var kb=0;kb < nnzb; kb++) {
			var j = b.ind[kb];		
			var bj = b.val[kb];
			var s = A.cols[j];
			var e = A.cols[j+1];

			for ( var k= s; k < e; k++) {
				c[A.rows[k]] += A.val[k] * bj;
			}
		}
	}
	return c;
}
/**
 * @param{spMatrix}
 * @param{spVector}
 * @return{Float64Array}
 */
function mulspMatrixTransspVector (A, b) {
	const m = A.m;
	const n = A.n;
	var c = zeros(n);
	const nnzb = b.val.length;
	if (A.rowmajor) {
		for ( var kb=0;kb < nnzb; kb++) {
			var j = b.ind[kb];		
			var bj = b.val[kb];
			var s = A.rows[j];
			var e = A.rows[j+1];
			for ( var k= s; k < e; k++) {
				c[A.cols[k]] += A.val[k] * bj;
			}
		}
	}
	else {
		for ( var i= 0; i < n; i++) {
			var kb = 0;
			var s = A.cols[i];
			var e = A.cols[i+1];

			for ( var ka=s;ka < e; ka++) {
				var j = A.rows[ka]; 
				while ( b.ind[kb] < j && kb < nnzb)
					kb++;
				if(b.ind[kb] == i)
					c[i] += A.val[ka] * b.val[kb];	
			}
		}
	}
	return c;
}
/**
 * @param{spMatrix}
 * @param{spMatrix} 
 * @return{Matrix}
 */
function mulspMatrixspMatrix (A, B) {
	const m = A.m;
	const n = A.n;
	const n2 = B.n;
	var c = zeros(m, n2);

	if ( A.rowmajor ) {
		if ( B.rowmajor ) {
			for ( var ic = 0; ic < m; ic++) {
				var sa = A.rows[ic];
				var ea = A.rows[ic+1];
	
				for ( var ka = sa; ka < ea; ka++) {
					var j = A.cols[ka];
					var aj = A.val[ka];
		
					var s = B.rows[j];
					var e = B.rows[j+1];

					var rc = ic * n2 ;
					for (var k= s; k < e; k++) {						
						c.val[rc + B.cols[k] ] += aj * B.val[k] ;
					}
				}
			}
		}
		else {
			var kc = 0;
			for ( var i=0; i < m; i++) {
				for ( var j=0; j < n2; j++) {
					c.val[kc] = spdot(A.row(i), B.col(j));
					kc++;
				}
			}
		}
	}
	else {
		if ( B.rowmajor ) {
			for (var ja=0;ja < n; ja++) {
				var sa = A.cols[ja];
				var ea = A.cols[ja+1];
				var sb = B.rows[ja];
				var eb = B.rows[ja+1];					
				for ( var ka = sa; ka < ea; ka++) {
					var rc = A.rows[ka] * n2;
					var aij = A.val[ka];
					
					for(var kb = sb; kb < eb; kb++) {
						c.val[rc  + B.cols[kb]] += aij * B.val[kb];	
					}										
				} 
			}
		}
		else {
			for ( var jc = 0; jc < n2; jc++) {
				var sb = B.cols[jc];
				var eb = B.cols[jc+1];
	
				for ( var kb = sb; kb < eb; kb++) {
					var j = B.rows[kb];
					var bj = B.val[kb];
		
					var s = A.cols[j];
					var e = A.cols[j+1];

					for (var k= s; k < e; k++) {
						c.val[A.rows[k] * n2 + jc] += A.val[k] * bj;
					}
				}
			}
		}
	}
	return c;
}
/**
 * @param{Matrix}
 * @param{spMatrix} 
 * @return{Matrix}
 */
function mulMatrixspMatrix (A, B) {
	const m = A.m;
	const n = A.n;
	const n2 = B.n;
	var c = zeros(m, n2);
	
	if ( B.rowmajor ) {
		for (var ja=0;ja < n; ja++) {
			var sb = B.rows[ja];
			var eb = B.rows[ja+1];					
			for ( var i = 0; i < m; i++) {
				var rc = i * n2;
				var aij = A.val[i * n + ja];
				
				for(var kb = sb; kb < eb; kb++) {
					c.val[rc  + B.cols[kb]] += aij * B.val[kb];	
				}										
			}
		}
	}
	else {
		for ( var jc = 0; jc < n2; jc++) {
			var sb = B.cols[jc];
			var eb = B.cols[jc+1];
	
			for ( var kb = sb; kb < eb; kb++) {
				var j = B.rows[kb];
				var bj = B.val[kb];
		
				for ( i= 0; i < m; i++) {
					c.val[i * n2 + jc] += A.val[i*n + j] * bj;
				}
			}
		}
	}
	return c;
}

/**
 * @param{spMatrix}
 * @param{Matrix} 
 * @return{Matrix}
 */
function mulspMatrixMatrix (A, B) {
	const m = A.m;
	const n = A.n;
	const n2 = B.n;
	var c = zeros(m, n2);

	if ( A.rowmajor ) {
		for(var i=0; i < m; i++) {
			var sa = A.rows[i];
			var ea = A.rows[i+1];
			for(var ka = sa; ka < ea; ka++) {
				var ai = A.val[ka];
				var rb = A.cols[ka] * n2;
				var rc = i*n2;
				for ( j=0; j < n2; j++) {
					c.val[rc + j] += ai * B.val[rb + j];
				}				
			}
		}
	}
	else {
		for(var j=0; j < n; j++) {
			var s = A.cols[j];
			var e = A.cols[j+1];

			for ( var k= s; k < e; k++) {
				var i = A.rows[k];
				for ( var jc = 0; jc < n2; jc++) 
					c.val[i*n2 + jc ] += A.val[k] * B.val[j*n2 + jc];
			}
		}
	}
	return c;
}

/**
 * @param{spVector}
 * @param{spVector}
 * @return{spVector}
 */
function entrywisemulspVectors (a, b) {
	const nnza = a.val.length;
	const nnzb = b.val.length;
	var val = new Array();
	var ind = new Array();
	
	var ka = 0;
	var kb = 0;	
	while ( ka < nnza && kb < nnzb ){
		var i = a.ind[ka]; 
		while ( b.ind[kb] < i && kb < nnzb)
			kb++;
		if(b.ind[kb] == i) {
			var aibi = a.val[ka] * b.val[kb];
			if ( !isZero(aibi) ) {
				val.push(aibi);	
				ind.push(i);
			}
		}
		ka++;
	}
	return new spVector(a.length, val, ind);
}
/**
 * @param{spVector}
 * @param{Float64Array}
 * @return{spVector}
 */
function entrywisemulspVectorVector (a, b) {
	// fast operation but might not yield optimal nnz:
	var c = a.copy();	
	const nnz = a.val.length;
	for ( var k = 0; k< nnz; k++) {
		c.val[k] *= b[a.ind[k]];
	}
	return c;
}
/**
 * @param{spMatrix}
 * @param{spMatrix}
 * @return{spMatrix}
 */
function entrywisemulspMatrices (A, B) {
	if ( A.rowmajor ) {
		if ( B.rowmajor ) {
			var val = new Array();
			var cols = new Array();
			var rows = new Uint32Array(A.m+1);
			var ka;
			var kb;
			var i;	
			for ( i=0; i < A.m; i++) {
				ka = A.rows[i];
				kb = B.rows[i];
				var ea = A.rows[i+1];
				var eb = B.rows[i+1];
				while ( ka < ea & kb < eb ){
					var j = A.cols[ka]; 
					while ( B.cols[kb] < j && kb < eb)
						kb++;
					if(B.cols[kb] == j) {
						val.push(A.val[ka] * B.val[kb]);	
						cols.push(j);
						rows[i+1]++;
					}
					ka++;
				}
			}
			for(i=1; i < A.m; i++)
				rows[i+1] += rows[i];
				
			return new spMatrix(A.m, A.n, val, cols, rows);
		}
		else {
			return entrywisemulspMatrixMatrix(B, fullMatrix(A)); // perhaps not the fastest
		}
	}
	else {
		if ( B.rowmajor ) {
			return entrywisemulspMatrixMatrix(A, fullMatrix(B)); // perhaps not the fastest
		}
		else {
			var val = new Array();
			var cols = new Uint32Array(A.n+1);
			var rows = new Array();
			var ka;
			var kb;	
			var j;
			for ( j=0; j < A.n; j++) {
				ka = A.cols[j];
				kb = B.cols[j];
				var ea = A.cols[j+1];
				var eb = B.cols[j+1];
				while ( ka < ea & kb < eb ){
					var i = A.rows[ka]; 
					while ( B.rows[kb] < i && kb < eb)
						kb++;
					if(B.rows[kb] == i) {
						val.push(A.val[ka] * B.val[kb]);	
						rows.push(i);
						cols[j+1]++;
					}
					ka++;
				}
			}
			for ( j=1; j< A.n; j++) 
				cols[j+1] += cols[j];
	
			return new spMatrix(A.m, A.n, val, cols, rows);
		}
	}
}
/**
 * @param{spMatrix}
 * @param{Matrix}
 * @return{spMatrix}
 */
function entrywisemulspMatrixMatrix (A, B) {
	var c = A.copy();	
	const nnz = A.val.length;
	const n = A.n;
	const m = A.m;
	if ( A.rowmajor ) {
		for ( i=0;i< m; i++) {
			var s = c.rows[i];
			var e = c.rows[i+1];
			var r = i*n;
			for ( var k = s; k< e; k++) {
				c.val[k] *= B.val[r + c.cols[k] ];
			}
		}
	}
	else {
		for ( j=0;j< n; j++) {
			var s = c.cols[j];
			var e = c.cols[j+1];
			for ( var k = s; k< e; k++) {
				c.val[k] *= B.val[c.rows[k] * n + j];
			}
		}
	}
	return c;
}

/**
 * @param{number}
 * @param{spVector}
 * @return{Float64Array}
 */
function addScalarspVector (a, b) {
	const nnzb = b.val.length;
	const n = b.length;
	var c = zeros(n);
	var k;
	for ( k=0;k < n; k++) 
		c[k] = a;
	for ( k=0;k < nnzb; k++) 
		c[b.ind[k]] += b.val[k];
			
	return c;
}
/**
 * @param{Float64Array}
 * @param{spVector}
 * @return{Float64Array}
 */
function addVectorspVector (a, b) {
	const nnzb = b.val.length;
	const n = b.length;
	var c = new Float64Array(a);
	for (var k=0;k < nnzb; k++) 
		c[b.ind[k]] += b.val[k];
			
	return c;
}
/**
 * @param{spVector}
 * @param{spVector}
 * @return{spVector}
 */
function addspVectors (a, b) {
	const nnza = a.val.length;
	const nnzb = b.val.length;
	var c = zeros(a.length);
	var k;
	for ( k=0;k < nnza; k++) 
		c[a.ind[k]] = a.val[k];
	for ( k=0;k < nnzb; k++) 
		c[b.ind[k]] += b.val[k];
			
	return sparseVector(c);
}

/**
 * @param{number}
 * @param{spMatrix}
 * @return{Matrix}
 */
function addScalarspMatrix (a, B) {
	const nnzb = B.val.length;
	const m = B.m;
	const n = B.n;
	const mn = m*n;
	
	var C = zeros(m,n); 
	var i;
	for (i = 0; i < mn; i++)
		C.val[i] = a;
	if ( B.rowmajor ) {
		var ri = 0;
		for (i = 0; i < m; i++) {
			var s = B.rows[i];
			var e = B.rows[i+1];
			for (var k= s; k < e; k++)
				C.val[ri + B.cols[k]] += B.val[k];
			ri += n;
		}
	}
	else {
		for (i = 0; i < n; i++) {
			var s = B.cols[i];
			var e = B.cols[i+1];
			for (var k= s; k < e; k++)
				C.val[B.rows[k] * n + i] += B.val[k];
		}
	}
	return C;
}
/**
 * @param{Matrix}
 * @param{spMatrix}
 * @return{Matrix}
 */
function addMatrixspMatrix (A, B) {
	const nnzb = B.val.length;
	const m = B.m;
	const n = B.n;
	const mn = m*n;
	
	var C = matrixCopy(A);
	var i;	
	if ( B.rowmajor ) {
		var ri = 0;
		for (i = 0; i < m; i++) {
			var s = B.rows[i];
			var e = B.rows[i+1];
			for (var k= s; k < e; k++)
				C.val[ri + B.cols[k]] += B.val[k];
			ri += n;
		}
	}
	else {
		for (i = 0; i < n; i++) {
			var s = B.cols[i];
			var e = B.cols[i+1];
			for (var k= s; k < e; k++)
				C.val[B.rows[k] * n + i] += B.val[k];
		}
	}
	return C;
}
/**
 * @param{spMatrix}
 * @param{spMatrix}
 * @return{spMatrix}
 */
function addspMatrices (A, B) {
	const nnza = A.val.length;
	const nnzb = B.val.length;
	const m = A.m;
	const n = A.n;
	
	var C = fullMatrix(A); 
	var i;	
	if ( B.rowmajor ) {
		var ri = 0;
		for (i = 0; i < m; i++) {
			var s = B.rows[i];
			var e = B.rows[i+1];
			for (var k= s; k < e; k++)
				C.val[ri + B.cols[k]] += B.val[k];
			ri += n;
		}
	}
	else {
		for (i = 0; i < n; i++) {
			var s = B.cols[i];
			var e = B.cols[i+1];
			for (var k= s; k < e; k++)
				C.val[B.rows[k] * n + i] += B.val[k];
		}
	}
	return sparseMatrixRowMajor(C);
}

/** sparse SAXPY : y = y + ax with x sparse and y dense
 * @param {number}
 * @param {spVector}
 * @param {Float64Array}
 */
function spsaxpy ( a, x, y) {
	const nnz = x.val.length;	
	for (var k=0;k < nnz; k++) 
		y[x.ind[k]] += a * x.val[k];			
}

/**
 * @param{number}
 * @param{spVector}
 * @return{Float64Array}
 */
function subScalarspVector (a, b) {
	const nnzb = b.val.length;
	const n = b.length;
	var c = zeros(n);
	var k;
	for ( k=0;k < n; k++) 
		c[k] = a;
	for ( k=0;k < nnzb; k++) 
		c[b.ind[k]] -= b.val[k];
			
	return c;
}
/**
 * @param{Float64Array}
 * @param{spVector}
 * @return{Float64Array}
 */
function subVectorspVector (a, b) {
	const nnzb = b.val.length;
	const n = b.length;
	var c = new Float64Array(a);
	for (var k=0;k < nnzb; k++) 
		c[b.ind[k]] -= b.val[k];
			
	return c;
}
/**
 * @param{spVector}
 * @param{Float64Array}
 * @return{Float64Array}
 */
function subspVectorVector (a, b) {
	return subVectors(fullVector(a), b);
}
/**
 * @param{spVector}
 * @param{spVector}
 * @return{spVector}
 */
function subspVectors (a, b) {
	const nnza = a.val.length;
	const nnzb = b.val.length;
	var c = zeros(a.length);
	var k;
	for ( k=0;k < nnza; k++) 
		c[a.ind[k]] = a.val[k];
	for ( k=0;k < nnzb; k++) 
		c[b.ind[k]] -= b.val[k];
			
	return sparseVector(c);
}

/**
 * @param{number}
 * @param{spMatrix}
 * @return{Matrix}
 */
function subScalarspMatrix (a, B) {
	const nnzb = B.val.length;
	const m = B.m;
	const n = B.n;
	const mn = m*n;
	
	var C = zeros(m,n); 
	var i;
	for (i = 0; i < mn; i++)
		C.val[i] = a;
	if ( B.rowmajor ) {
		var ri = 0;
		for (i = 0; i < m; i++) {
			var s = B.rows[i];
			var e = B.rows[i+1];
			for (var k= s; k < e; k++)
				C.val[ri + B.cols[k]] -= B.val[k];
			ri += n;
		}
	}
	else {
		for (i = 0; i < n; i++) {
			var s = B.cols[i];
			var e = B.cols[i+1];
			for (var k= s; k < e; k++)
				C.val[B.rows[k] * n + i] -= B.val[k];
		}
	}
	return C;
}
/**
 * @param{spMatrix}
 * @param{Matrix}
 * @return{Matrix}
 */
function subspMatrixMatrix (A, B) {
	return subMatrices(fullMatrix(A), B);
}
/**
 * @param{Matrix}
 * @param{spMatrix}
 * @return{Matrix}
 */
function subMatrixspMatrix (A, B) {
	const nnzb = B.val.length;
	const m = B.m;
	const n = B.n;
	const mn = m*n;
	
	var C = matrixCopy(A);
	var i;	
	if ( B.rowmajor ) {
		var ri = 0;
		for (i = 0; i < m; i++) {
			var s = B.rows[i];
			var e = B.rows[i+1];
			for (var k= s; k < e; k++)
				C.val[ri + B.cols[k]] -= B.val[k];
			ri += n;
		}
	}
	else {
		for (i = 0; i < n; i++) {
			var s = B.cols[i];
			var e = B.cols[i+1];
			for (var k= s; k < e; k++)
				C.val[B.rows[k] * n + i] -= B.val[k];
		}
	}
	return C;
}
/**
 * @param{spMatrix}
 * @param{spMatrix}
 * @return{spMatrix}
 */
function subspMatrices (A, B) {
	const nnza = A.val.length;
	const nnzb = B.val.length;
	const m = A.m;
	const n = A.n;
	
	var C = fullMatrix(A); 
	var i;	
	if ( B.rowmajor ) {
		var ri = 0;
		for (i = 0; i < m; i++) {
			var s = B.rows[i];
			var e = B.rows[i+1];
			for (var k= s; k < e; k++)
				C.val[ri + B.cols[k]] -= B.val[k];
			ri += n;
		}
	}
	else {
		for (i = 0; i < n; i++) {
			var s = B.cols[i];
			var e = B.cols[i+1];
			for (var k= s; k < e; k++)
				C.val[B.rows[k] * n + i] -= B.val[k];
		}
	}
	return sparseMatrixRowMajor(C);
}

/**
 * @param{function}
 * @param{spVector}
 * @return{Float64Array}
 */
function applyspVector( f, x ) {
	const nnz = x.val.length;
	const n = x.length;
	var res = new Float64Array(n);
	var i;
	const f0 = f(0);
	for ( i=0; i< n; i++) 
		res[i] = f0;
	for ( i=0; i< nnz; i++) 
		res[x.ind[i]] = f(x.val[i]);
	return res;
}
/**
 * @param{function}
 * @param{spMatrix}
 * @return{Matrix}
 */
function applyspMatrix( f, X ) {
	const nnz = X.val.length;
	const m = X.m;
	const n = X.n;
	const mn = m*n;
	const f0 = f(0);
	var C = zeros(m,n); 
	var i;
	if ( !isZero(f0) ) {
		for (i = 0; i < mn; i++)
			C.val[i] = f0;
	}
	if ( X.rowmajor ) {
		var ri = 0;
		for (i = 0; i < m; i++) {
			var s = X.rows[i];
			var e = X.rows[i+1];
			for (var k= s; k < e; k++)
				C.val[ri + X.cols[k]] = f(X.val[k]);
			ri += n;
		}
	}
	else {
		for (i = 0; i < n; i++) {
			var s = X.cols[i];
			var e = X.cols[i+1];
			for (var k= s; k < e; k++)
				C.val[X.rows[k] * n + i] += f(X.val[k]);
		}
	}
	return C;
}
/**
 * @param{spVector}
 * @return{number}
 */
function sumspVector( a ) {
	return sumVector(a.val);
}
/**
 * @param{spMatrix}
 * @return{number}
 */
function sumspMatrix( A ) {
	return sumVector(A.val);
}
/**
 * @param{spMatrix}
 * @return{Matrix}
 */
function sumspMatrixRows( A ) {
	var res = zeros(A.n);
	if ( A.rowmajor ) {
		for ( var k=0; k < A.val.length; k++)
			res[A.cols[k]] += A.val[k];
	}
	else {
		for ( var i=0; i<A.n; i++)
			res[i] = sumspVector(A.col(i));
	}
	return new Matrix(1,A.n, res, true);
}
/**
 * @param{spMatrix}
 * @return{Float64Array}
 */
function sumspMatrixCols( A ) {	
	var res = zeros(A.m);
	if ( A.rowmajor ) {
		for ( var i=0; i<A.m; i++)
			res[i] = sumspVector(A.row(i));			
	}
	else {
		for ( var k=0; k < A.val.length; k++)
			res[A.rows[k]] += A.val[k];
	}
	return res;
}
/**
 * @param{spMatrix}
 * @return{Matrix}
 */
function prodspMatrixRows( A ) {
	if ( A.rowmajor ) {
		var res = ones(A.n);	
		for ( var i=0; i < A.m; i++) {
			var s = A.rows[i];
			var e = A.rows[i+1];
			for ( var j=0; j < A.n; j++) 
				if ( A.cols.subarray(s,e).indexOf(j) < 0 )
					res[j] = 0;
			for ( var k=s; k < e; k++)
				res[A.cols[k]] *= A.val[k];
		}
	}
	else {
		var res = zeros(A.n);
		for ( var i=0; i<A.n; i++) {
			var a = A.col(i);
			if ( a.val.length == a.length )
				res[i] = prodVector(a.val);
		}
	}
	return new Matrix(1,A.n, res, true);
}
/**
 * @param{spMatrix}
 * @return{Float64Array}
 */
function prodspMatrixCols( A ) {	
	if ( A.rowmajor ) {
		var res = zeros(A.m);
		for ( var i=0; i<A.m; i++) {
			var a = A.row(i);
			if ( a.val.length == a.length )
				res[i] = prodVector(a.val);
		}
	}
	else {
		var res = ones(A.m);	
		for ( var j=0; j < A.n; j++) {
			var s = A.cols[j];
			var e = A.cols[j+1];
			for ( var i=0; i < A.m; i++) 
				if ( A.rows.subarray(s,e).indexOf(i) < 0 )
					res[i] = 0;
			for ( var k=s; k < e; k++)
				res[A.rows[k]] *= A.val[k];
		}
	}
	return res;
}


///////////////////////////
/// Sparse linear systems 
///////////////////////////
/** Sparse Conjugate gradient method for solving the symmetric positie definite system Ax = b
 * @param{spMatrix}
 * @param{Float64Array}
 * @return{Float64Array}
 */
function spsolvecg ( A, b) {

	const n = A.n;	
	const m = A.m;

	var x = randn(n); 
	var r = subVectors(b, mulspMatrixVector(A, x));
	var rhoc = dot(r,r);
	const TOL = 1e-8;
	var delta2 = TOL * norm(b);
	delta2 *= delta2;
	
	// first iteration:
	var p = vectorCopy(r);
	var w = mulspMatrixVector(A,p);
	var mu = rhoc / dot(p, w);
	saxpy( mu, p, x);
	saxpy( -mu, w, r);
	var rho_ = rhoc;
	rhoc = dot(r,r);

	var k = 1;

	var updateP = function (tau, r) {
		for ( var i=0; i < m; i++)
			p[i] = r[i] + tau * p[i];
	}
	
	while ( rhoc > delta2 && k < n ) {
		updateP(rhoc/rho_, r);
		w = mulspMatrixVector(A,p);
		mu = rhoc / dot(p, w);
		saxpy( mu, p, x);
		saxpy( -mu, w, r);
		rho_ = rhoc;
		rhoc = dot(r,r);
		k++;
	}
	return x;
}
/** Sparse Conjugate gradient normal equation residual method for solving the rectangular system Ax = b
 * @param{spMatrix}
 * @param{Float64Array}
 * @return{Float64Array}
 */
function spcgnr ( A, b) {
/*
TEST
A = randnsparse(0.3,10000,1000)
x = randn(1000)
b = A*x + 0.01*randn(10000)
tic()
xx = cgnr(A,b)
t1 = toc()
ee = norm(A*xx - b)
tic()
xh=spcgnr(sparse(A), b)
t2 = toc()
e = norm(A*xh - b)
*/
	
	const n = A.n;	
	const m = A.m;

	var x = randn(n); 
	var r = subVectors(b, mulspMatrixVector(A, x));	
	const TOL = 1e-8;
	var delta2 = TOL * norm(b);
	delta2 *= delta2;
	
	// first iteration:
	var z = mulspMatrixTransVector(A, r);
	var rhoc = dot(z,z);	
	var p = vectorCopy(z);
	var w = mulspMatrixVector(A,p);
	var mu = rhoc / dot(w, w);
	saxpy( mu, p, x);
	saxpy( -mu, w, r);	
	z = mulspMatrixTransVector(A, r);
	var rho_ = rhoc;
	rhoc = dot(z,z);

	var k = 1;

	var updateP = function (tau, z) {
		for ( var i=0; i < m; i++)
			p[i] = z[i] + tau * p[i];
	}
	
	while ( rhoc > delta2 && k < n ) {
		updateP(rhoc/rho_, z);
		w = mulspMatrixVector(A,p);
		mu = rhoc / dot(w, w);
		saxpy( mu, p, x);
		saxpy( -mu, w, r);
		z = mulspMatrixTransVector(A, r);
		rho_ = rhoc;
		rhoc = dot(z,z);
		k++;
	}
	return x;
}


/* glpk.js is now included (cat) in lalolib.js
if ( self.hasOwnProperty("window") ) {
	// in main window 
}
else { 
	// in worker
	importScripts("glpk.js");
	//importScripts("glpk.min.js");
}*/

// Install glpk as lp function: 
if ( typeof(lp) == "undefined" ) {
	lp = glp;
	linprog = glp;
}

function glp (c, A, b, Aeq, beq, lb , ub, integer_variables, verbose) {
/*
	Call GLPK to solve 
	min c' x s.t. Ax<= b, Aeq = beq, lb<= x <= ub, x[integer_variables] in Z
*/

/* TESTS:
Aineq = [[1, 1]; [-1,1]]
Bineq = [2; 1]
costineq = [-1; -2]
lb = [0;0]
xsol = glp(costineq, Aineq, Bineq, [], [], lb)

A = [[3,2,1,1,0],[2,5,3,0,1]]
b=[10,15]
c=[-2,-3,-4,0,0]
lb = zeros(5)
xsol = glp(c, [],[],A, b,lb,[])

*/
	var prob = glp_create_prob();
	glp_set_obj_dir ( prob, GLP_MIN ) ;
	
	if ( typeof(Aeq) == "undefined" )
		var Aeq = [];
	
	glp_add_cols(prob, c.length);
	if ( A.length + Aeq.length > 0 )
		glp_add_rows(prob, A.length + Aeq.length);

	var i;
	var j;
	var indexes ;
	var values;
	var n = c.length;
	
	if ( lb ) {
		var lbdense = vectorCopy(lb);
		for ( i=0; i < lbdense.length; i++){
			if ( !isFinite( lbdense[i] ) )
				lbdense[i] = NaN;
		}
	}
	else 
		var lbdense = [];

	if ( ub ) {
		var ubdense = vectorCopy(ub);
		for ( i=0; i < ubdense.length; i++){
			if ( !isFinite( ubdense[i] ) )
				lbdense[i] = NaN;
		}
	}
	else 
		var ubdense = [];
	
	for ( i=0; i < c.length; i++) {
		// variable bounds
		var lbi = NaN;
		var ubi = NaN; 
		if ( lbdense.length > 0)	
			lbi = lbdense[i];
		if ( ubdense.length > 0 )
			ubi = ubdense[i] ;
			
		if ( !isNaN(lbi)  && !isNaN(ubi)) 
			glp_set_col_bnds( prob, i+1, GLP_DB, lbi , ubi );
		else if ( !isNaN(lbi) )
			glp_set_col_bnds( prob, i+1, GLP_LO, lbi );
		else if ( !isNaN(ubi) )
			glp_set_col_bnds( prob, i+1, GLP_UP, 0, ubi );
		else 
			glp_set_col_bnds( prob, i+1, GLP_FR );
			
		// cost
		glp_set_obj_coef ( prob, i+1, c[i]  );
		
	}	
	
	// Integer variables
	if ( integer_variables ) {
		for ( i=0; i< integer_variables.length ; i++) 
			glp_set_col_kind(prob, integer_variables[i]+1, GLP_IV );
	}
	
	// inequalities
	if ( A.length == 1 && typeof(b) == "number")
		b = [b];
	for ( i=0; i<A.length; i++) {
		
		// RHS		
		glp_set_row_bnds(prob, i+1, GLP_UP, 0, b[i] );	// pass lb=0 otherwise ub undefined!!
		
		// LHS
		indexes = new Array(); 	
		values = new Array(); 	
		indexes.push(0);	// to make it start at 1
		values.push(0); 	
		for ( j = 0; j < n; j++ ) {
			if ( !isZero(A.val[i*n+j] )) {
				indexes.push(j+1);
				values.push( A.val[i*n+j] );
			}
		}
		glp_set_mat_row( prob, i+1, indexes.length -1, indexes, values) ;
		
	}

	// equality constraints	
	if ( Aeq.length == 1 && typeof(beq) == "number")
		beq = [beq];
	for ( i=0; i<Aeq.length; i++) {
		
		// RHS		
		glp_set_row_bnds(prob, A.length+i+1, GLP_FX, beq[i] );
				
		// LHS
		indexes = new Array(); 
		values = new Array(); 		
		indexes.push(0);	// to make it start at 1
		values.push(0); 	
		for ( j = 0; j < n; j++ ) {
			if (  !isZero(Aeq.val[i*n+j] )) {
				indexes.push(j+1);
				values.push( Aeq.val[i*n+j] );
			}
		}
		glp_set_mat_row( prob,A.length+ i+1, indexes.length -1, indexes, values) ;
	}

	//glp_write_lp(prob, undefined, function (str) {console.log(str);});

	var rc;
	if ( integer_variables && integer_variables.length > 0) {
		// Solve with MILP solver
		var iocp = new IOCP({presolve: GLP_ON});
		glp_scale_prob(prob, GLP_SF_AUTO);
		rc = glp_intopt(prob, iocp);
		
		// get solution
		if ( rc == 0 ) {
			var sol = zeros(n);
			for ( i=0; i<n; i++) {
				sol[i] = glp_mip_col_val( prob, i+1);
			}
			
			if ( verbose) {
				var obj = glp_mip_obj_val(prob);
				console.log("Status : " + glp_mip_status(prob) );
				console.log("Obj : " + obj);
			}
			return sol;
		}
		else
			return "Status : " + glp_get_prim_stat(prob);
	}
	else {
		// Parameters
		var smcp = new SMCP({presolve: GLP_ON});
		// Solve with Simplex
		glp_scale_prob(prob, GLP_SF_AUTO);
		rc = glp_simplex(prob, smcp);
		
		// get solution
		if ( rc == 0 ) {
			var sol = zeros(n);
			for ( i=0; i<n; i++) {
				sol[i] = glp_get_col_prim( prob, i+1);
			}
			if ( verbose) {
				var obj = glp_get_obj_val(prob);
				console.log("Status : " + glp_get_status(prob) + "(OPT=" + GLP_OPT + ",FEAS=" + GLP_FEAS + ",INFEAS=" + GLP_INFEAS + ",NOFEAS=" + GLP_NOFEAS + ",UNBND=" + GLP_UNBND + ",UNDEF=" + GLP_UNDEF + ")" );
				console.log("Obj : " + obj);
			}
			return sol;
		}
		else {
			GLPLASTLP = "";
			glp_write_lp(prob, undefined, function (str) {GLPLASTLP += str + "<br>";});
			return "RC=" + rc + " ; Status : "  + glp_get_status(prob) + "(OPT=" + GLP_OPT + ",FEAS=" + GLP_FEAS + ",INFEAS=" + GLP_INFEAS + ",NOFEAS=" + GLP_NOFEAS + ",UNBND=" + GLP_UNBND + ",UNDEF=" + GLP_UNDEF + ")" ;
		}
	}
	
}

///////////////////////////////:
/////// L1-minimization and sparse recovery //////////
///////////
function minl1 ( A, b) {
	/*
		Solves min ||x||_1 s.t. Ax = b
		
		as 
		
			min sum a_i s.t. -a <= x <= a and Ax = b
			
		example: 
A = randn(10,20)
r = zeros(20)
r[0:3] = randn(3)
x=minl1(A,A*r)

	*/
	const n = A.n;
	
	var Aineq = zeros ( 2*n, 2*n ) ;
	var i;
	
	//set ( Aineq, range(0,n),range(0,n) , I) ;
	//set ( Aineq, range(0,n),range(n,2*n) , I_) ;
	//set ( Aineq, range(n,2*n),range(0,n) , I_) ;
	//set ( Aineq, range(n,2*n),range(n,2*n) , I_) ;
	for ( i=0; i < n; i++) {
		Aineq.val[i*Aineq.n + i] = 1;
		Aineq.val[i*Aineq.n + n+i] = -1;
		Aineq.val[(n+i)*Aineq.n + i] = -1;
		Aineq.val[(n+i)*Aineq.n + n+i] = -1;
	}
	var bineq = zeros ( 2*n);
	
	var Aeq = zeros(A.length, 2*n);
	set ( Aeq , [], range( 0,n), A );
	
	var cost = zeros(2*n);
	set ( cost, range(n,2*n),  ones(n) );
		
	var lb = zeros(2*n);	// better to constraint a>=0
	set ( lb, range(n), mulScalarVector(-Infinity , ones( n )) ) ;	
//console.log( cost, Aineq, bineq, Aeq, b, lb);	
//	var lpsol = lp( cost, Aineq, bineq, Aeq, b, lb, [], 0 , 1e-6 );
	var lpsol = glp( cost, Aineq, bineq, Aeq, b, lb);	

	return get(lpsol, range(n) );
}



function minl0 ( A, b, M) {
	/*
		Solves min ||x||_0 s.t. Ax = b  -M <= x <= M
		
		as a mixed integer linear program
		
			min sum a_i s.t. -M a <= x <= M a , Ax = b and a_i in {0,1}
			
		example: 
A = randn(10,20)
r = zeros(20)
r[0:3] = randn(3)
x=minl0(A,A*r)

	*/
	
	if ( typeof(M) == "undefined" ) 
		var M = 10;
		
	var n = A.n;
	
	var Aineq = zeros ( 2*n, 2*n ) ;
	//set ( Aineq, range(0,n),range(0,n) , I) ;
	//set ( Aineq, range(0,n),range(n,2*n) , mul(M, I_) ) ;
	//set ( Aineq, range(n,2*n),range(0,n) , I_) ;
	//set ( Aineq, range(n,2*n),range(n,2*n) ,mul(M, I_) ) ;
	var i;
	for ( i=0; i < n; i++) {
		Aineq.val[i*Aineq.n + i] = 1;
		Aineq.val[i*Aineq.n + n+i] = -M;
		Aineq.val[(n+i)*Aineq.n + i] = -1;
		Aineq.val[(n+i)*Aineq.n + n+i] = -M;

	}
	var bineq = zeros ( 2*n);
	
	var Aeq = zeros(A.length, 2*n);
	set ( Aeq , [], range( 0,n), A );
	
	var cost = zeros(2*n);
	set ( cost, range(n,2*n),  ones(n) );
		
	var lb = zeros(2*n);	// better to constraint a>=0
	set ( lb, range(n), mulScalarVector(-M , ones( n )) ) ;	

	var ub =  ones(2*n) ;
	set(ub, range(n), mulScalarVector(M, ones(n) ) );
	
	var lpsol = glp( cost, Aineq, bineq, Aeq, b, lb, ub, range(n,2*n) );	// glptweak??

	// set to 0 the x corresponding to 0 binary variables:
	var x = entrywisemulVector( getSubVector(lpsol, range(n) ), getSubVector(lpsol, range(n,2*n) ) );

	return x;
}


///////////////////////////////////////////
/// Quadratic Programming 
////////////////
quadprog = qp;

function qp(Q,c,A,b,Aeq,beq,lb,ub,x0, epsilon) {
	// Solve quad prog by Frank-Wolfe algorithm
	/*
		min 0.5 x' * Q * x  c' * x
		s.t. Ax <= b   and   lu <= x <= ub
		
		NOTE: all variables should be bounded or constrained,
		otherwise the LP might be unbounded even if the QP is well-posed
	*/
	if (typeof(epsilon) === 'undefined')
		var epsilon = 1e-3;
		
	var normdiff;
	var normgrad;
	var grad;
	var y;
	var gamma;
	var direction;
	
	var x;
	if ( typeof(x0) === 'undefined' ) {		
		//console.log ("providing an initial x0 might be better for qp.");		
		x = glp(zeros(c.length),A, b, Aeq, beq, lb, ub, [], false) ;  
		if ( typeof(x) == "string")
			return "infeasible";
	}
	else {
		x = vectorCopy(x0);
	}

	var iter = 0;
	do {

		// Compute gradient : grad = Qx + c
		grad = add( mul( Q, x) , c );
		normgrad = norm(grad);

		// Find direction of desecnt : direction = argmin_y   y'*grad s.t. same constraints as QP
		y = glp(grad, A, b, Aeq, beq, lb, ub, [], false) ; 
/*		if ( typeof(y) == "string") 
			return x; // error return current solution;
	*/

		// Step size: gamma = -(y - x)' [ Qx + c] / (y-x)'Q(y-x) = numerator / denominator
		direction = sub (y, x);
		
		numerator = - mul(direction, grad);
		
		denominator = mul(direction, mul(Q, direction) ); 

		if ( Math.abs(denominator) > 1e-8 && denominator > 0)
			gamma = numerator / denominator; 
		else 
			gamma = 0;
			
		if ( gamma > 1 ) 
			gamma = 1;

		// Update x <- x + gamma * direction
		if ( gamma > 0 ) {
			x = add(x, mul(gamma, direction) );		
			normdiff = gamma * norm(direction) ;
		}
		else 
			normdiff = 0;

		iter++;
	} while ( normdiff > epsilon && normgrad > epsilon && iter < 10000) ;

	return x;
}



/////////////////////////////////////////:
//// Unconstrained Minimization
/////////////////////////////////////////
function minimize( f, grad, x0 ) {
/*
function loss(x) {
return (norm(b - A*x)^2)
}
function grad(x) {
return (2*A'*A*x - 2*A'*b)
}
x = randn(10)
A = randn(100,10)
b = A*x + 0.01*randn(100)
xh = minimize(A.n, loss, grad)
norm(x - xh)
*/
	var x;
	var n = 1; // dimension of x
	
	if ( arguments.length == 3 ) {
		if ( typeof(x0) == "number" ) {
			if( x0 > 0 && Math.floor(x0) == x0 ) {
				n = x0;
				x = sub(mul(20,rand(n)), 10); 
			}
			else {
				n = 1;
				x = x0; 
			}
		}
		else {
			n = x0.length;
			x = x0;
		}
	}
	else {		
		n = 1;
		x = 20 * Math.random() - 10; 
	}
	
	if ( n == 1 )
		return secant(f, grad, x);
	else if ( n > 500 ) 
		return steepestdescent(f, grad, x);
	else
		return bfgs(f, grad, x);
}

function secant( f, grad, x0 ) {
	// for a unidimensional function f
	// find a root to f'(x) = 0 with the secant method
	const TOLx = 1e-6;
	
	var x = x0; 
	var g = grad(x);
	var dx = -0.01*g;
	x += dx;
	var gprev,dg;
	do {
		gprev = g;
		g = grad(x);
		dg = g-gprev;

		dx *= -g / dg;
		x += dx;

	} while ( Math.abs(dx) > TOLx);
	return x;
}


function steepestdescent(f, grad, x0) {
	// assume x is a vector
	
	const TOLobj = 1e-8;
	const TOLx = 1e-6;
	const TOLgrad = 1e-4;

	var x = x0;
	var xprev;
	var obj = f(x);
	var g = grad(x);
	var normg = norm(g);
	var iter = 0;
	do {
		
		// line search
		var linesearch = armijo(f, x, obj, g, normg);		
		
		// take the step
		xprev = vectorCopy(x);
		prevobj = obj;		
		x = linesearch.x;
		obj = linesearch.obj;
		g = grad(x);
		normg = norm(g);
		
		iter++;
		//console.log(linesearch.lambda, x, obj, g);
	} while ( normg > TOLgrad && prevobj - obj > TOLobj && norm(subVectors(x, xprev) ) > TOLx ) ;
	console.log(" OBJ: " + obj + ", norm(grad): " + normg, "prevobj - obj", prevobj - obj, "iter: ", iter );
	return x;
}

function bfgs( f, grad, x0 ) {
	// assume x is a vector
	
	const n = x0.length;
	const TOLobj = 1e-8;
	const TOLx = 1e-6;
	const TOLgrad = 1e-4;

	var x = x0;
	var xprev;
	var obj = f(x);
	var H = eye(n);
	var g,direction, delta, gamma, ls;
	var normg;
	var Hgamma;
	var dH;
	var iter = 0;
	do {
		g = grad(x);
		normg = norm(g);
		direction = minusVector( mulMatrixVector(H, g ) );
		
		// line search
		var linesearch = armijodir (f, x, obj, g, direction ); 

		// take the step
		xprev = vectorCopy(x);
		prevobj = obj;		
		x = linesearch.x;
		obj = linesearch.obj;

		// update Hessian inverse approximation
		delta = subVectors(x,xprev);
		gamma = subVectors(grad(x) , g);
		
		Hgamma = mulMatrixVector(H, gamma);
		
		var deltagamma = dot(delta,gamma);
		var delta_ = mulScalarVector(1/deltagamma, delta);

		var deltagammaH = outerprodVectors(delta_, Hgamma);
		
		dH = subMatrices(outerprodVectors(delta_, delta, 1+ dot(gamma, Hgamma)/deltagamma) , addMatrices(deltagammaH, transposeMatrix(deltagammaH) ) );
		//--		
		
		H = add(H, dH); 	
		
		iter++;
			
	} while ( normg > TOLgrad && prevobj - obj > TOLobj && norm(subVectors(x, xprev) ) > TOLx ) ;
	console.log(" OBJ: " + obj + ", norm(grad): " + normg, "prevobj - obj", prevobj - obj, "iters: ", iter );
	return x;
}


/**
 * Return minimizer of p(x) = p0 + p1 x + p2 x^2 + p3 x^3 with p(x1) = px1, p(x2) = px2
 * within [lb, ub]
 *
 * @param {number}
 * @param {number}
 * @param {number}
 * @param {number}
 * @param {number}
 * @param {number}
 * @param {number}
 * @param {number}
 * @return {number}  
 */ 
function mincubic(p0, p1, x1, px1, x2, px2, lb, ub) {

	const x1square = x1*x1;
	const x2square = x2*x2;
	
	var A = new Matrix(2,2, [x1square, x1*x1square, x2square, x2*x2square]);
	var b = new Float64Array([px1 - p0 - p1*x1, px2 - p0 - p1*x2]);
    var c = solve(A,b);
    var x = (-c[0] + Math.sqrt(c[0]*c[0] - 3 *c[1] * p1))/(3*c[1]);
  
    return Math.min(ub, Math.max(lb, x));
}
/**
 * Return minimizer of p(x) = p0 + p1 x + p2 x^2 with p(x1) = px1 (x1 ~ 1)
 * within [lb, ub]
 *
 * @param {number}
 * @param {number}
 * @param {number}
 * @param {number}
 * @param {number}
 * @param {number}
 * @return {number}  
 */
function minquadratic(p0, p1, px1, x1, lb, ub) {	
    var x = - p1/(2 * x1 * (px1 - p0 - p1) );
    return Math.min(ub, Math.max(lb, x));
}

/**
 * Armijo line search with objective function f
 * and starting point xc, fc, g
 *
 * @param {function}
 * @param {{Float64Array|number}}
 * @param {number}
 * @param {{Float64Array|number}}
 * @param {number}
 * @return {{Float64Array|number}}  
 */
function armijo (f, xc, fc, g, normg ) {
	// Armijo's rule line search in the direction of gradient g
	const alpha = 0.0001;
	const blow = 0.1;
	const bhigh = 0.5;
	const normg2 = normg * normg;
	
	var lambda = Math.min(1,100/(1+normg)); 
	var fgoal = fc - alpha * lambda * normg2;
	
    var lambda1 = lambda;
    var xt = subVectors(xc, mulScalarVector(lambda, g) );
    var ft_1 = fc;
    var ft = f(xt);

    var iter = 1;

	// first iter
    lambda = minquadratic(fc, -normg2, lambda1, ft, blow*lambda1, bhigh*lambda1);
	var ft_1 = ft;
	var lambda2 = lambda1;
	lambda1 = lambda;
		
    iter++;
    // next iterations
	while(ft > fgoal && iter <= 10) {
		            
		lambda = mincubic(fc, -normg2, lambda1, ft, lambda2, ft_1, blow*lambda1, bhigh*lambda1);
		lambda2 = lambda1;
		lambda1 = lambda;
		
		xt = subVectors(xc, mulScalarVector(lambda, g) );
		ft_1 = ft;
		ft = f(xt);
		
		fgoal = fc - alpha * lambda * normg2;
                
		iter++;
	}
	return {"lambda": lambda, "x": xt, "obj": ft};
}
function armijodir (f, xc, fc, g, d ) {
	// Armijo's rule line search in the direction d
	const alpha = 0.0001;
	const blow = 0.1;
	const bhigh = 0.5;
	const p1 = dot( g, d);
	
	var lambda = Math.min(1,100/(1+norm(g))); 
	var fgoal = fc + alpha * lambda * p1;
	
    var lambda1 = lambda;
    var xt = addVectors(xc, mulScalarVector(lambda, d) );
    var ft_1 = fc;
    var ft = f(xt);

    var iter = 1;

	// first iter
    lambda = minquadratic(fc, p1, lambda1, ft, blow*lambda1, bhigh*lambda1);
	var ft_1 = ft;
	var lambda2 = lambda1;
	lambda1 = lambda;
		
    iter++;
    // next iterations
	while(ft > fgoal && iter <= 10) {
		            
		lambda=mincubic(fc, p1, lambda1, ft, lambda2, ft_1, blow*lambda1, bhigh*lambda1 );
		lambda2 = lambda1;
		lambda1 = lambda;
		
		xt = addVectors(xc, mulScalarVector(lambda, d) );
		ft_1 = ft;
		ft = f(xt);
		
		fgoal = fc + alpha * lambda * p1;
                
		iter++;
	}
	return {"lambda": lambda, "x": xt, "obj": ft};
}

/*! glpk.js - v4.49.0
* https://github.com/hgourvest/glpk.js
* Copyright (c) 2013 Henri Gourvest; Licensed GPLv2 */
(function(exports) {
var s=Number.MAX_VALUE,aa=Number.MIN_VALUE;function w(a){throw Error(a);}function x(){}exports.glp_get_print_func=function(){return x};exports.glp_set_print_func=function(a){x=a};function da(a,b){for(var c in b)a[c]=b[c]}function ga(a,b,c,d,e){for(;0<e;b++,d++,e--)a[b]=c[d]}function ha(a,b,c,d){for(;0<d;b++,d--)a[b]=c}function ia(a,b,c){for(;0<c;b++,c--)a[b]={}}function ja(){return(new Date).getTime()}function la(a){return(ja()-a)/1E3}
function ma(a,b,c){var d=Array(b);ga(d,0,a,1,b);d.sort(c);ga(a,1,d,0,b)}var na={},ra=exports.glp_version=function(){return pa+"."+qa};function ta(a){a="string"==typeof a?a.charCodeAt(0):-1;return 0<=a&&31>=a||127==a}function ua(a){a="string"==typeof a?a.charCodeAt(0):-1;return 65<=a&&90>=a||97<=a&&122>=a}function va(a){a="string"==typeof a?a.charCodeAt(0):-1;return 65<=a&&90>=a||97<=a&&122>=a||48<=a&&57>=a}function wa(a){a="string"==typeof a?a.charCodeAt(0):-1;return 48<=a&&57>=a}
function xa(){function a(a,d,e,k,l,p,m){a>>>=0;e=e&&a&&{2:"0b",8:"0",16:"0x"}[d]||"";a=e+c(a.toString(d),p||0,"0",!1);return b(a,e,k,l,m)}function b(a,b,d,e,l,p){var m=e-a.length;0<m&&(a=d||!l?c(a,e,p,d):a.slice(0,b.length)+c("",m,"0",!0)+a.slice(b.length));return a}function c(a,b,c,d){c||(c=" ");b=a.length>=b?"":Array(1+b-a.length>>>0).join(c);return d?a+b:b+a}var d=arguments,e=0;return d[e++].replace(/%%|%(\d+\$)?([-+\'#0 ]*)(\*\d+\$|\*|\d+)?(\.(\*\d+\$|\*|\d+))?([scboxXuideEfFgG])/g,function(f,
g,h,k,l,p,m){var q,r;if("%%"==f)return"%";var n=!1;r="";var t=l=!1;q=" ";for(var y=h.length,E=0;h&&E<y;E++)switch(h.charAt(E)){case " ":r=" ";break;case "+":r="+";break;case "-":n=!0;break;case "'":q=h.charAt(E+1);break;case "0":l=!0;break;case "#":t=!0}k=k?"*"==k?+d[e++]:"*"==k.charAt(0)?+d[k.slice(1,-1)]:+k:0;0>k&&(k=-k,n=!0);if(!isFinite(k))throw Error("sprintf: (minimum-)width must be finite");p=p?"*"==p?+d[e++]:"*"==p.charAt(0)?+d[p.slice(1,-1)]:+p:-1<"fFeE".indexOf(m)?6:"d"==m?0:void 0;g=g?
d[g.slice(0,-1)]:d[e++];switch(m){case "s":return m=String(g),null!=p&&(m=m.slice(0,p)),b(m,"",n,k,l,q);case "c":return m=String.fromCharCode(+g),null!=p&&(m=m.slice(0,p)),b(m,"",n,k,l,void 0);case "b":return a(g,2,t,n,k,p,l);case "o":return a(g,8,t,n,k,p,l);case "x":return a(g,16,t,n,k,p,l);case "X":return a(g,16,t,n,k,p,l).toUpperCase();case "u":return a(g,10,t,n,k,p,l);case "i":case "d":return q=+g||0,q=Math.round(q-q%1),f=0>q?"-":r,g=f+c(String(Math.abs(q)),p,"0",!1),b(g,f,n,k,l);case "e":case "E":case "f":case "F":case "g":case "G":return q=
+g,f=0>q?"-":r,r=["toExponential","toFixed","toPrecision"]["efg".indexOf(m.toLowerCase())],m=["toString","toUpperCase"]["eEfFgG".indexOf(m)%2],g=f+Math.abs(q)[r](p),b(g,f,n,k,l)[m]();default:return f}})}function ya(a){a.Dd=3621377730;a.ke=null;a.V=null;a.name=null;a.eb=null;a.dir=za;a.ha=0;a.hb=100;a.K=200;a.g=a.i=0;a.L=0;a.n=Array(1+a.hb);a.f=Array(1+a.K);a.fc={};a.Lc={};a.valid=0;a.head=new Int32Array(1+a.hb);a.Qd=null;a.U=null;a.na=a.sa=Aa;a.aa=0;a.$=0;a.some=0;a.df=Aa;a.ae=0;a.za=Aa;a.ta=0}
var Ba=exports.glp_create_prob=function(){var a={};ya(a);return a},Ca=exports.glp_set_prob_name=function(a,b){var c=a.V;null!=c&&0!=c.reason&&w("glp_set_prob_name: operation not allowed");a.name=b},Da=exports.glp_set_obj_name=function(a,b){var c=a.V;null!=c&&0!=c.reason&&w("glp_set_obj_name: operation not allowed");a.eb=b},Fa=exports.glp_set_obj_dir=function(a,b){var c=a.V;null!=c&&0!=c.reason&&w("glp_set_obj_dir: operation not allowed");b!=za&&b!=Ea&&w("glp_set_obj_dir: dir = "+b+"; invalid direction flag");
a.dir=b},La=exports.glp_add_rows=function(a,b){var c=a.V,d;1>b&&w("glp_add_rows: nrs = "+b+"; invalid number of rows");b>1E8-a.g&&w("glp_add_rows: nrs = "+b+"; too many rows");var e=a.g+b;if(a.hb<e){for(;a.hb<e;)a.hb+=a.hb;a.n.length=1+a.hb;a.head=new Int32Array(1+a.hb)}for(var f=a.g+1;f<=e;f++){a.n[f]=d={};d.ea=f;d.name=null;d.rb=null;d.La=0;d.origin=0;d.qc=0;if(null!=c)switch(c.reason){case Ga:d.La=c.N.La;d.origin=Ha;break;case Ia:d.La=c.N.La,d.origin=Ja}d.type=Ka;d.c=d.d=0;d.k=null;d.ma=1;d.m=
A;d.bind=0;d.r=d.J=0;d.dc=d.mc=0;d.Sa=0}a.g=e;a.valid=0;null!=c&&0!=c.reason&&(c.pe=1);return e-b+1},Oa=exports.glp_add_cols=function(a,b){var c=a.V;null!=c&&0!=c.reason&&w("glp_add_cols: operation not allowed");1>b&&w("glp_add_cols: ncs = "+b+"; invalid number of columns");b>1E8-a.i&&w("glp_add_cols: ncs = "+b+"; too many columns");var d=a.i+b;if(a.K<d){for(;a.K<d;)a.K+=a.K;a.f.length=1+a.K}for(var e=a.i+1;e<=d;e++)a.f[e]=c={},c.C=e,c.name=null,c.rb=null,c.kind=Ma,c.type=B,c.c=c.d=0,c.u=0,c.k=null,
c.va=1,c.m=Na,c.bind=0,c.r=c.J=0,c.dc=c.mc=0,c.Sa=0;a.i=d;return d-b+1},Pa=exports.glp_set_row_name=function(a,b,c){1<=b&&b<=a.g||w("glp_set_row_name: i = "+b+"; row number out of range");b=a.n[b];null!=b.name&&(delete a.fc[b.name],b.name=null);null!=c&&(b.name=c,a.fc[b.name]=b)},Qa=exports.glp_set_col_name=function(a,b,c){var d=a.V;null!=d&&0!=d.reason&&w("glp_set_col_name: operation not allowed");1<=b&&b<=a.i||w("glp_set_col_name: j = "+b+"; column number out of range");b=a.f[b];null!=b.name&&(delete a.Lc[b.name],
b.name=null);null!=c&&(b.name=c,a.Lc[b.name]=b)},Va=exports.glp_set_row_bnds=function(a,b,c,d,e){1<=b&&b<=a.g||w("glp_set_row_bnds: i = "+b+"; row number out of range");a=a.n[b];a.type=c;switch(c){case Ka:a.c=a.d=0;a.m!=A&&(a.m=Ra);break;case Sa:a.c=d;a.d=0;a.m!=A&&(a.m=G);break;case Ta:a.c=0;a.d=e;a.m!=A&&(a.m=Ua);break;case I:a.c=d;a.d=e;a.m!=A&&a.m!=G&&a.m!=Ua&&(a.m=Math.abs(d)<=Math.abs(e)?G:Ua);break;case B:a.c=a.d=d;a.m!=A&&(a.m=Na);break;default:w("glp_set_row_bnds: i = "+b+"; type = "+c+"; invalid row type")}},
Wa=exports.glp_set_col_bnds=function(a,b,c,d,e){1<=b&&b<=a.i||w("glp_set_col_bnds: j = "+b+"; column number out of range");a=a.f[b];a.type=c;switch(c){case Ka:a.c=a.d=0;a.m!=A&&(a.m=Ra);break;case Sa:a.c=d;a.d=0;a.m!=A&&(a.m=G);break;case Ta:a.c=0;a.d=e;a.m!=A&&(a.m=Ua);break;case I:a.c=d;a.d=e;a.m!=A&&a.m!=G&&a.m!=Ua&&(a.m=Math.abs(d)<=Math.abs(e)?G:Ua);break;case B:a.c=a.d=d;a.m!=A&&(a.m=Na);break;default:w("glp_set_col_bnds: j = "+b+"; type = "+c+"; invalid column type")}},Xa=exports.glp_set_obj_coef=
function(a,b,c){var d=a.V;null!=d&&0!=d.reason&&w("glp_set_obj_coef: operation not allowed");0<=b&&b<=a.i||w("glp_set_obj_coef: j = "+b+"; column number out of range");0==b?a.ha=c:a.f[b].u=c},Ya=exports.glp_set_mat_row=function(a,b,c,d,e){var f,g,h;1<=b&&b<=a.g||w("glp_set_mat_row: i = "+b+"; row number out of range");for(var k=a.n[b];null!=k.k;)g=k.k,k.k=g.B,f=g.f,null==g.ra?f.k=g.I:g.ra.I=g.I,null!=g.I&&(g.I.ra=g.ra),a.L--,f.m==A&&(a.valid=0);0<=c&&c<=a.i||w("glp_set_mat_row: i = "+b+"; len = "+
c+"; invalid row length ");c>5E8-a.L&&w("glp_set_mat_row: i = "+b+"; len = "+c+"; too many constraint coefficients");for(h=1;h<=c;h++)g=d[h],1<=g&&g<=a.i||w("glp_set_mat_row: i = "+b+"; ind["+h+"] = "+g+"; column index out of range"),f=a.f[g],null!=f.k&&f.k.n.ea==b&&w("glp_set_mat_row: i = "+b+"; ind["+h+"] = "+g+"; duplicate column indices not allowed"),g={},a.L++,g.n=k,g.f=f,g.j=e[h],g.ua=null,g.B=k.k,g.ra=null,g.I=f.k,null!=g.B&&(g.B.ua=g),null!=g.I&&(g.I.ra=g),k.k=f.k=g,f.m==A&&0!=g.j&&(a.valid=
0);for(g=k.k;null!=g;g=b)b=g.B,0==g.j&&(null==g.ua?k.k=b:g.ua.B=b,null!=b&&(b.ua=g.ua),g.f.k=g.I,null!=g.I&&(g.I.ra=null),a.L--)},Za=exports.glp_set_mat_col=function(a,b,c,d,e){var f=a.V,g,h,k;null!=f&&0!=f.reason&&w("glp_set_mat_col: operation not allowed");1<=b&&b<=a.i||w("glp_set_mat_col: j = "+b+"; column number out of range");for(f=a.f[b];null!=f.k;)h=f.k,f.k=h.I,g=h.n,null==h.ua?g.k=h.B:h.ua.B=h.B,null!=h.B&&(h.B.ua=h.ua),a.L--;0<=c&&c<=a.g||w("glp_set_mat_col: j = "+b+"; len = "+c+"; invalid column length");
c>5E8-a.L&&w("glp_set_mat_col: j = "+b+"; len = "+c+"; too many constraint coefficients");for(k=1;k<=c;k++)h=d[k],1<=h&&h<=a.g||w("glp_set_mat_col: j = "+b+"; ind["+k+"] = "+h+"; row index out of range"),g=a.n[h],null!=g.k&&g.k.f.C==b&&w("glp_set_mat_col: j = "+b+"; ind["+k+"] = "+h+"; duplicate row indices not allowed"),h={},a.L++,h.n=g,h.f=f,h.j=e[k],h.ua=null,h.B=g.k,h.ra=null,h.I=f.k,null!=h.B&&(h.B.ua=h),null!=h.I&&(h.I.ra=h),g.k=f.k=h;for(h=f.k;null!=h;h=b)b=h.I,0==h.j&&(h.n.k=h.B,null!=h.B&&
(h.B.ua=null),null==h.ra?f.k=b:h.ra.I=b,null!=b&&(b.ra=h.ra),a.L--);f.m==A&&(a.valid=0)};
exports.glp_load_matrix=function(a,b,c,d,e){var f=a.V,g,h,k,l;null!=f&&0!=f.reason&&w("glp_load_matrix: operation not allowed");for(k=1;k<=a.g;k++)for(f=a.n[k];null!=f.k;)h=f.k,f.k=h.B,a.L--;for(h=1;h<=a.i;h++)a.f[h].k=null;0>b&&w("glp_load_matrix: ne = "+b+"; invalid number of constraint coefficients");5E8<b&&w("glp_load_matrix: ne = "+b+"; too many constraint coefficients");for(l=1;l<=b;l++)k=c[l],h=d[l],1<=k&&k<=a.g||w("glp_load_matrix: ia["+l+"] = "+k+"; row index out of range"),f=a.n[k],1<=h&&
h<=a.i||w("glp_load_matrix: ja["+l+"] = "+h+"; column index out of range"),g=a.f[h],h={},a.L++,h.n=f,h.f=g,h.j=e[l],h.ua=null,h.B=f.k,null!=h.B&&(h.B.ua=h),f.k=h;for(k=1;k<=a.g;k++)for(h=a.n[k].k;null!=h;h=h.B){g=h.f;if(null!=g.k&&g.k.n.ea==k){for(l=1;l<=b&&(c[l]!=k||d[l]!=g.C);l++);w("glp_load_mat: ia["+l+"] = "+k+"; ja["+l+"] = "+g.C+"; duplicate indices not allowed")}h.ra=null;h.I=g.k;null!=h.I&&(h.I.ra=h);g.k=h}for(k=1;k<=a.g;k++)for(f=a.n[k],h=f.k;null!=h;h=b)b=h.B,0==h.j&&(null==h.ua?f.k=b:
h.ua.B=b,null!=b&&(b.ua=h.ua),null==h.ra?h.f.k=h.I:h.ra.I=h.I,null!=h.I&&(h.I.ra=h.ra),a.L--);a.valid=0};
exports.glp_check_dup=function(a,b,c,d,e){var f,g,h,k,l;0>a&&w("glp_check_dup: m = %d; invalid parameter");0>b&&w("glp_check_dup: n = %d; invalid parameter");0>c&&w("glp_check_dup: ne = %d; invalid parameter");0<c&&null==d&&w("glp_check_dup: ia = "+d+"; invalid parameter");0<c&&null==e&&w("glp_check_dup: ja = "+e+"; invalid parameter");for(h=1;h<=c;h++)if(f=d[h],g=e[h],!(1<=f&&f<=a&&1<=g&&g<=b))return a=-h;if(0==a||0==b)return 0;k=new Int32Array(1+a);l=new Int32Array(1+c);b=new Int8Array(1+b);for(h=
1;h<=c;h++)f=d[h],l[h]=k[f],k[f]=h;for(f=1;f<=a;f++){for(h=k[f];0!=h;h=l[h]){g=e[h];if(b[g]){for(h=1;h<=c&&(d[h]!=f||e[h]!=g);h++);for(h++;h<=c&&(d[h]!=f||e[h]!=g);h++);return a=+h}b[g]=1}for(h=k[f];0!=h;h=l[h])b[e[h]]=0}return 0};
var $a=exports.glp_sort_matrix=function(a){var b,c,d;null!=a&&3621377730==a.Dd||w("glp_sort_matrix: P = "+a+"; invalid problem object");for(c=a.g;1<=c;c--)a.n[c].k=null;for(d=a.i;1<=d;d--)for(b=a.f[d].k;null!=b;b=b.I)c=b.n.ea,b.ua=null,b.B=a.n[c].k,null!=b.B&&(b.B.ua=b),a.n[c].k=b;for(d=a.i;1<=d;d--)a.f[d].k=null;for(c=a.g;1<=c;c--)for(b=a.n[c].k;null!=b;b=b.B)d=b.f.C,b.ra=null,b.I=a.f[d].k,null!=b.I&&(b.I.ra=b),a.f[d].k=b},ab=exports.glp_del_rows=function(a,b,c){var d=a.V,e,f,g;1<=b&&b<=a.g||w("glp_del_rows: nrs = "+
b+"; invalid number of rows");for(g=1;g<=b;g++)f=c[g],1<=f&&f<=a.g||w("glp_del_rows: num["+g+"] = "+f+"; row number out of range"),e=a.n[f],null!=d&&0!=d.reason&&(d.reason!=Ga&&d.reason!=Ia&&w("glp_del_rows: operation not allowed"),e.La!=d.N.La&&w("glp_del_rows: num["+g+"] = "+f+"; invalid attempt to delete row created not in current subproblem"),e.m!=A&&w("glp_del_rows: num["+g+"] = "+f+"; invalid attempt to delete active row (constraint)"),d.tf=1),0==e.ea&&w("glp_del_rows: num["+g+"] = "+f+"; duplicate row numbers not allowed"),
Pa(a,f,null),Ya(a,f,0,null,null),e.ea=0;b=0;for(f=1;f<=a.g;f++)e=a.n[f],0!=e.ea&&(e.ea=++b,a.n[e.ea]=e);a.g=b;a.valid=0};
exports.glp_del_cols=function(a,b,c){var d=a.V,e,f;null!=d&&0!=d.reason&&w("glp_del_cols: operation not allowed");1<=b&&b<=a.i||w("glp_del_cols: ncs = "+b+"; invalid number of columns");for(f=1;f<=b;f++)d=c[f],1<=d&&d<=a.i||w("glp_del_cols: num["+f+"] = "+d+"; column number out of range"),e=a.f[d],0==e.C&&w("glp_del_cols: num["+f+"] = "+d+"; duplicate column numbers not allowed"),Qa(a,d,null),Za(a,d,0,null,null),e.C=0,e.m==A&&(a.valid=0);b=0;for(d=1;d<=a.i;d++)e=a.f[d],0!=e.C&&(e.C=++b,a.f[e.C]=e);
a.i=b;if(a.valid)for(c=a.g,e=a.head,d=1;d<=b;d++)f=a.f[d].bind,0!=f&&(e[f]=c+d)};
var hb=exports.glp_copy_prob=function(a,b,c){var d=a.V,e={},f,g,h,k;null!=d&&0!=d.reason&&w("glp_copy_prob: operation not allowed");a==b&&w("glp_copy_prob: copying problem object to itself not allowed");c!=bb&&c!=cb&&w("glp_copy_prob: names = "+c+"; invalid parameter");db(a);c&&null!=b.name&&Ca(a,b.name);c&&null!=b.eb&&Da(a,b.eb);a.dir=b.dir;a.ha=b.ha;0<b.g&&La(a,b.g);0<b.i&&Oa(a,b.i);eb(b,e);fb(a,e);a.na=b.na;a.sa=b.sa;a.aa=b.aa;a.some=b.some;a.df=b.df;a.ae=b.ae;a.za=b.za;a.ta=b.ta;for(f=1;f<=b.g;f++)d=
a.n[f],e=b.n[f],c&&null!=e.name&&Pa(a,f,e.name),d.type=e.type,d.c=e.c,d.d=e.d,d.ma=e.ma,d.m=e.m,d.r=e.r,d.J=e.J,d.dc=e.dc,d.mc=e.mc,d.Sa=e.Sa;h=new Int32Array(1+b.g);k=new Float64Array(1+b.g);for(f=1;f<=b.i;f++)d=a.f[f],e=b.f[f],c&&null!=e.name&&Qa(a,f,e.name),d.kind=e.kind,d.type=e.type,d.c=e.c,d.d=e.d,d.u=e.u,g=gb(b,f,h,k),Za(a,f,g,h,k),d.va=e.va,d.m=e.m,d.r=e.r,d.J=e.J,d.dc=e.dc,d.mc=e.mc,d.Sa=e.Sa},db=exports.glp_erase_prob=function(a){var b=a.V;null!=b&&0!=b.reason&&w("glp_erase_prob: operation not allowed");
a.Dd=1061109567;a.ke=null;a.n=null;a.f=null;a.fc=null;a.Lc=null;a.head=null;a.Qd=null;a.U=null;ya(a)};exports.glp_get_prob_name=function(a){return a.name};
var ib=exports.glp_get_obj_name=function(a){return a.eb},jb=exports.glp_get_obj_dir=function(a){return a.dir},kb=exports.glp_get_num_rows=function(a){return a.g},lb=exports.glp_get_num_cols=function(a){return a.i},mb=exports.glp_get_row_name=function(a,b){1<=b&&b<=a.g||w("glp_get_row_name: i = "+b+"; row number out of range");return a.n[b].name},nb=exports.glp_get_col_name=function(a,b){1<=b&&b<=a.i||w("glp_get_col_name: j = "+b+"; column number out of range");return a.f[b].name},ob=exports.glp_get_row_type=
function(a,b){1<=b&&b<=a.g||w("glp_get_row_type: i = "+b+"; row number out of range");return a.n[b].type},pb=exports.glp_get_row_lb=function(a,b){var c;1<=b&&b<=a.g||w("glp_get_row_lb: i = "+b+"; row number out of range");switch(a.n[b].type){case Ka:case Ta:c=-s;break;case Sa:case I:case B:c=a.n[b].c}return c},qb=exports.glp_get_row_ub=function(a,b){var c;1<=b&&b<=a.g||w("glp_get_row_ub: i = "+b+"; row number out of range");switch(a.n[b].type){case Ka:case Sa:c=+s;break;case Ta:case I:case B:c=a.n[b].d}return c},
rb=exports.glp_get_col_type=function(a,b){1<=b&&b<=a.i||w("glp_get_col_type: j = "+b+"; column number out of range");return a.f[b].type},sb=exports.glp_get_col_lb=function(a,b){var c;1<=b&&b<=a.i||w("glp_get_col_lb: j = "+b+"; column number out of range");switch(a.f[b].type){case Ka:case Ta:c=-s;break;case Sa:case I:case B:c=a.f[b].c}return c},tb=exports.glp_get_col_ub=function(a,b){var c;1<=b&&b<=a.i||w("glp_get_col_ub: j = "+b+"; column number out of range");switch(a.f[b].type){case Ka:case Sa:c=
+s;break;case Ta:case I:case B:c=a.f[b].d}return c};exports.glp_get_obj_coef=function(a,b){0<=b&&b<=a.i||w("glp_get_obj_coef: j = "+b+"; column number out of range");return 0==b?a.ha:a.f[b].u};exports.glp_get_num_nz=function(a){return a.L};
var ub=exports.glp_get_mat_row=function(a,b,c,d){var e;1<=b&&b<=a.g||w("glp_get_mat_row: i = "+b+"; row number out of range");e=0;for(a=a.n[b].k;null!=a;a=a.B)e++,null!=c&&(c[e]=a.f.C),null!=d&&(d[e]=a.j);return e},gb=exports.glp_get_mat_col=function(a,b,c,d){var e;1<=b&&b<=a.i||w("glp_get_mat_col: j = "+b+"; column number out of range");e=0;for(a=a.f[b].k;null!=a;a=a.I)e++,null!=c&&(c[e]=a.n.ea),null!=d&&(d[e]=a.j);return e},vb=exports.glp_create_index=function(a){var b,c;if(null==a.fc)for(a.fc=
{},c=1;c<=a.g;c++)b=a.n[c],null!=b.name&&(a.fc[b.name]=b);if(null==a.Lc)for(a.Lc={},c=1;c<=a.i;c++)b=a.f[c],null!=b.name&&(a.Lc[b.name]=b)},wb=exports.glp_find_row=function(a,b){var c=0;null==a.fc&&w("glp_find_row: row name index does not exist");var d=a.fc[b];d&&(c=d.ea);return c},xb=exports.glp_find_col=function(a,b){var c=0;null==a.Lc&&w("glp_find_col: column name index does not exist");var d=a.Lc[b];d&&(c=d.C);return c},yb=exports.glp_delete_index=function(a){a.fc=null;a.fc=null},zb=exports.glp_set_rii=
function(a,b,c){1<=b&&b<=a.g||w("glp_set_rii: i = "+b+"; row number out of range");0>=c&&w("glp_set_rii: i = "+b+"; rii = "+c+"; invalid scale factor");if(a.valid&&a.n[b].ma!=c)for(var d=a.n[b].k;null!=d;d=d.B)if(d.f.m==A){a.valid=0;break}a.n[b].ma=c},Ab=exports.glp_set_sjj=function(a,b,c){1<=b&&b<=a.i||w("glp_set_sjj: j = "+b+"; column number out of range");0>=c&&w("glp_set_sjj: j = "+b+"; sjj = "+c+"; invalid scale factor");a.valid&&a.f[b].va!=c&&a.f[b].m==A&&(a.valid=0);a.f[b].va=c},Cb=exports.glp_get_rii=
function(a,b){1<=b&&b<=a.g||w("glp_get_rii: i = "+b+"; row number out of range");return a.n[b].ma},Db=exports.glp_get_sjj=function(a,b){1<=b&&b<=a.i||w("glp_get_sjj: j = "+b+"; column number out of range");return a.f[b].va},Eb=exports.glp_unscale_prob=function(a){var b=kb(a),c=lb(a),d;for(d=1;d<=b;d++)zb(a,d,1);for(b=1;b<=c;b++)Ab(a,b,1)},Fb=exports.glp_set_row_stat=function(a,b,c){1<=b&&b<=a.g||w("glp_set_row_stat: i = "+b+"; row number out of range");c!=A&&c!=G&&c!=Ua&&c!=Ra&&c!=Na&&w("glp_set_row_stat: i = "+
b+"; stat = "+c+"; invalid status");b=a.n[b];if(c!=A)switch(b.type){case Ka:c=Ra;break;case Sa:c=G;break;case Ta:c=Ua;break;case I:c!=Ua&&(c=G);break;case B:c=Na}if(b.m==A&&c!=A||b.m!=A&&c==A)a.valid=0;b.m=c},Gb=exports.glp_set_col_stat=function(a,b,c){1<=b&&b<=a.i||w("glp_set_col_stat: j = "+b+"; column number out of range");c!=A&&c!=G&&c!=Ua&&c!=Ra&&c!=Na&&w("glp_set_col_stat: j = "+b+"; stat = "+c+"; invalid status");b=a.f[b];if(c!=A)switch(b.type){case Ka:c=Ra;break;case Sa:c=G;break;case Ta:c=
Ua;break;case I:c!=Ua&&(c=G);break;case B:c=Na}if(b.m==A&&c!=A||b.m!=A&&c==A)a.valid=0;b.m=c},Hb=exports.glp_std_basis=function(a){var b;for(b=1;b<=a.g;b++)Fb(a,b,A);for(b=1;b<=a.i;b++){var c=a.f[b];c.type==I&&Math.abs(c.c)>Math.abs(c.d)?Gb(a,b,Ua):Gb(a,b,G)}},sc=exports.glp_simplex=function(a,b){function c(a,b){var c;if(!Ib(a)&&(c=Jb(a),0!=c&&(c==Kb?b.o>=Lb&&x("glp_simplex: initial basis is invalid"):c==Mb?b.o>=Lb&&x("glp_simplex: initial basis is singular"):c==Nb&&b.o>=Lb&&x("glp_simplex: initial basis is ill-conditioned")),
0!=c))return c;b.cb==Ob?c=Pb(a,b):b.cb==Qb?(c=Rb(a,b),c==Sb&&a.valid&&(c=Pb(a,b))):b.cb==Tb&&(c=Rb(a,b));return c}function d(a,b){function d(){Ub(e,f);f=null;Vb(e,a);return r=0}var e,f=null,g={},r;b.o>=Wb&&x("Preprocessing...");e=Xb();Yb(e,a,Zb);r=$b(e,0);0!=r&&(r==ac?b.o>=Wb&&x("PROBLEM HAS NO PRIMAL FEASIBLE SOLUTION"):r==bc&&b.o>=Wb&&x("PROBLEM HAS NO DUAL FEASIBLE SOLUTION"));if(0!=r)return r;f=Ba();cc(e,f);if(0==f.g&&0==f.i)return f.na=f.sa=dc,f.aa=f.ha,b.o>=fc&&0==b.fb&&x(a.$+": obj = "+f.aa+
"  infeas = 0.0"),b.o>=Wb&&x("OPTIMAL SOLUTION FOUND BY LP PREPROCESSOR"),d();b.o>=Wb&&x(f.g+" row"+(1==f.g?"":"s")+", "+f.i+" column"+(1==f.i?"":"s")+", "+f.L+" non-zero"+(1==f.L?"":"s")+"");eb(a,g);fb(f,g);var g=na,n=g.Fb;g.Fb=!n||b.o<Wb?cb:bb;gc(f,hc);g.Fb=n;g=na;n=g.Fb;g.Fb=!n||b.o<Wb?cb:bb;ic(f);g.Fb=n;f.$=a.$;r=c(f,b);a.$=f.$;return 0!=r||f.na!=dc||f.sa!=dc?(b.o>=Lb&&x("glp_simplex: unable to recover undefined or non-optimal solution"),0==r&&(f.na==jc?r=ac:f.sa==jc&&(r=bc)),r):d()}function e(a,
b){function c(){f.m=G;f.r=f.c}function d(){f.m=Ua;f.r=f.d}var e,f,g,n,t;a.valid=0;a.na=a.sa=dc;a.aa=a.ha;n=t=a.some=0;for(g=1;g<=a.g;g++){e=a.n[g];e.m=A;e.r=e.J=0;if(e.type==Sa||e.type==I||e.type==B)e.c>+b.Gb&&(a.na=jc,0==a.some&&b.cb!=Ob&&(a.some=g)),n<+e.c&&(n=+e.c);if(e.type==Ta||e.type==I||e.type==B)e.d<-b.Gb&&(a.na=jc,0==a.some&&b.cb!=Ob&&(a.some=g)),n<-e.d&&(n=-e.d)}for(e=g=1;e<=a.i;e++)f=a.f[e],g<Math.abs(f.u)&&(g=Math.abs(f.u));g=(a.dir==za?1:-1)/g;for(e=1;e<=a.i;e++){f=a.f[e];f.type==Ka?
(f.m=Ra,f.r=0):f.type==Sa?c():f.type==Ta?d():f.type==I?0<g*f.u?c():0>g*f.u?d():Math.abs(f.c)<=Math.abs(f.d)?c():d():f.type==B&&(f.m=Na,f.r=f.c);f.J=f.u;a.aa+=f.u*f.r;if(f.type==Ka||f.type==Sa)g*f.J<-b.tb&&(a.sa=jc,0==a.some&&b.cb==Ob&&(a.some=a.g+e)),t<-g*f.J&&(t=-g*f.J);if(f.type==Ka||f.type==Ta)g*f.J>+b.tb&&(a.sa=jc,0==a.some&&b.cb==Ob&&(a.some=a.g+e)),t<+g*f.J&&(t=+g*f.J)}b.o>=fc&&0==b.fb&&x("~"+a.$+": obj = "+a.aa+"  infeas = "+(b.cb==Ob?n:t)+"");b.o>=Wb&&0==b.fb&&(a.na==dc&&a.sa==dc?x("OPTIMAL SOLUTION FOUND"):
a.na==jc?x("PROBLEM HAS NO FEASIBLE SOLUTION"):b.cb==Ob?x("PROBLEM HAS UNBOUNDED SOLUTION"):x("PROBLEM HAS NO DUAL FEASIBLE SOLUTION"))}var f;null!=a&&3621377730==a.Dd||w("glp_simplex: P = "+a+"; invalid problem object");null!=a.V&&0!=a.V.reason&&w("glp_simplex: operation not allowed");null==b&&(b=new kc);b.o!=lc&&b.o!=Lb&&b.o!=fc&&b.o!=Wb&&b.o!=mc&&w("glp_simplex: msg_lev = "+b.o+"; invalid parameter");b.cb!=Ob&&b.cb!=Qb&&b.cb!=Tb&&w("glp_simplex: meth = "+b.cb+"; invalid parameter");b.fd!=nc&&b.fd!=
oc&&w("glp_simplex: pricing = "+b.fd+"; invalid parameter");b.ne!=pc&&b.ne!=qc&&w("glp_simplex: r_test = "+b.ne+"; invalid parameter");0<b.Gb&&1>b.Gb||w("glp_simplex: tol_bnd = "+b.Gb+"; invalid parameter");0<b.tb&&1>b.tb||w("glp_simplex: tol_dj = "+b.tb+"; invalid parameter");0<b.xe&&1>b.xe||w("glp_simplex: tol_piv = "+b.xe+"; invalid parameter");0>b.oc&&w("glp_simplex: it_lim = "+b.oc+"; invalid parameter");0>b.sb&&w("glp_simplex: tm_lim = "+b.sb+"; invalid parameter");1>b.bc&&w("glp_simplex: out_frq = "+
b.bc+"; invalid parameter");0>b.fb&&w("glp_simplex: out_dly = "+b.fb+"; invalid parameter");b.yc!=bb&&b.yc!=cb&&w("glp_simplex: presolve = "+b.yc+"; invalid parameter");a.na=a.sa=Aa;a.aa=0;a.some=0;for(f=1;f<=a.g;f++){var g=a.n[f];if(g.type==I&&g.c>=g.d)return b.o>=Lb&&x("glp_simplex: row "+f+": lb = "+g.c+", ub = "+g.d+"; incorrect bounds"),f=rc}for(f=1;f<=a.i;f++)if(g=a.f[f],g.type==I&&g.c>=g.d)return b.o>=Lb&&x("glp_simplex: column "+f+": lb = "+g.c+", ub = "+g.d+"; incorrect bounds"),f=rc;b.o>=
Wb&&(x("GLPK Simplex Optimizer, v"+ra()+""),x(a.g+" row"+(1==a.g?"":"s")+", "+a.i+" column"+(1==a.i?"":"s")+", "+a.L+" non-zero"+(1==a.L?"":"s")+""));0==a.L?(e(a,b),f=0):f=b.yc?d(a,b):c(a,b);return f},kc=exports.SMCP=function(a){a=a||{};this.o=a.msg_lev||Wb;this.cb=a.meth||Ob;this.fd=a.pricing||oc;this.ne=a.r_test||qc;this.Gb=a.tol_bnd||1E-7;this.tb=a.tol_dj||1E-7;this.xe=a.tol_piv||1E-10;this.hf=a.obj_ll||-s;this.jf=a.obj_ul||+s;this.oc=a.it_lim||2147483647;this.sb=a.tm_lim||2147483647;this.bc=a.out_frq||
500;this.fb=a.out_dly||0;this.yc=a.presolve||cb},xc=exports.glp_get_status=function(a){var b;b=tc(a);switch(b){case dc:switch(uc(a)){case dc:b=vc;break;case jc:b=wc}}return b},tc=exports.glp_get_prim_stat=function(a){return a.na},uc=exports.glp_get_dual_stat=function(a){return a.sa},yc=exports.glp_get_obj_val=function(a){return a.aa},zc=exports.glp_get_row_stat=function(a,b){1<=b&&b<=a.g||w("glp_get_row_stat: i = "+b+"; row number out of range");return a.n[b].m},Ac=exports.glp_get_row_prim=function(a,
b){1<=b&&b<=a.g||w("glp_get_row_prim: i = "+b+"; row number out of range");return a.n[b].r},Bc=exports.glp_get_row_dual=function(a,b){1<=b&&b<=a.g||w("glp_get_row_dual: i = "+b+"; row number out of range");return a.n[b].J},Cc=exports.glp_get_col_stat=function(a,b){1<=b&&b<=a.i||w("glp_get_col_stat: j = "+b+"; column number out of range");return a.f[b].m},Dc=exports.glp_get_col_prim=function(a,b){1<=b&&b<=a.i||w("glp_get_col_prim: j = "+b+"; column number out of range");return a.f[b].r},Ec=exports.glp_get_col_dual=
function(a,b){1<=b&&b<=a.i||w("glp_get_col_dual: j = "+b+"; column number out of range");return a.f[b].J};exports.glp_get_unbnd_ray=function(a){var b=a.some;b>a.g+a.i&&(b=0);return b};
var Hc=exports.glp_set_col_kind=function(a,b,c){1<=b&&b<=a.i||w("glp_set_col_kind: j = "+b+"; column number out of range");var d=a.f[b];switch(c){case Ma:d.kind=Ma;break;case Fc:d.kind=Fc;break;case Gc:d.kind=Fc;d.type==I&&0==d.c&&1==d.d||Wa(a,b,I,0,1);break;default:w("glp_set_col_kind: j = "+b+"; kind = "+c+"; invalid column kind")}},Ic=exports.glp_get_col_kind=function(a,b){1<=b&&b<=a.i||w("glp_get_col_kind: j = "+b+"; column number out of range");var c=a.f[b],d=c.kind;switch(d){case Fc:c.type==
I&&0==c.c&&1==c.d&&(d=Gc)}return d},Jc=exports.glp_get_num_int=function(a){for(var b,c=0,d=1;d<=a.i;d++)b=a.f[d],b.kind==Fc&&c++;return c},Kc=exports.glp_get_num_bin=function(a){for(var b,c=0,d=1;d<=a.i;d++)b=a.f[d],b.kind==Fc&&b.type==I&&0==b.c&&1==b.d&&c++;return c};
exports.glp_intopt=function(a,b){function c(a,b){var c;if(xc(a)!=vc)return b.o>=Lb&&x("glp_intopt: optimal basis to initial LP relaxation not provided"),c=Lc;b.o>=Wb&&x("Integer optimization begins...");var d=a.g;c=a.i;var e,f;a.V=e={};e.i=c;e.wc=d;e.ac=new Int8Array(1+d+c);e.bd=new Float64Array(1+d+c);e.cd=new Float64Array(1+d+c);e.mf=new Int8Array(1+d+c);e.lf=new Float64Array(1+d+c);e.kf=new Float64Array(1+d+c);for(f=1;f<=d;f++){var q=a.n[f];e.ac[f]=q.type;e.bd[f]=q.c;e.cd[f]=q.d;e.mf[f]=q.m;e.lf[f]=
q.r;e.kf[f]=q.J}for(f=1;f<=c;f++)q=a.f[f],e.ac[d+f]=q.type,e.bd[d+f]=q.c,e.cd[d+f]=q.d,e.mf[d+f]=q.m,e.lf[d+f]=q.r,e.kf[d+f]=q.J;e.ih=a.aa;e.fe=0;e.Sc=0;e.ya=null;e.head=e.Xa=null;e.Pd=e.Zf=e.Jg=0;e.Ig=0;e.se=null;e.qe=e.te=null;e.re=null;e.N=null;e.A=a;e.ad=new Int8Array(1+c);e.Fg=e.Gg=0;e.qf=null;e.of=e.rf=null;e.pf=null;d={size:0};d.head=d.Xa=null;d.fh=0;d.N=null;e.Bd=d;e.Xf=null;e.Ne=null;e.Fd=null;e.Bg=new Int32Array(1+c);e.Tg=new Float64Array(1+c);e.p=b;e.hc=ja();e.Lg=0;e.qh=0;e.reason=0;e.pe=
0;e.tf=0;e.Tc=0;e.Jf=0;e.ud=0;e.gf=0;e.stop=0;Mc(e,null);c=Nc(e);var d=e.A,r=d.g;f=d.i;if(r!=e.wc){var n,r=r-e.wc;n=new Int32Array(1+r);for(q=1;q<=r;q++)n[q]=e.wc+q;ab(d,r,n)}r=e.wc;for(q=1;q<=r;q++)Va(d,q,e.ac[q],e.bd[q],e.cd[q]),Fb(d,q,e.mf[q]),d.n[q].r=e.lf[q],d.n[q].J=e.kf[q];for(q=1;q<=f;q++)Wa(d,q,e.ac[r+q],e.bd[r+q],e.cd[r+q]),Gb(d,q,e.mf[r+q]),d.f[q].r=e.lf[r+q],d.f[q].J=e.kf[r+q];d.na=d.sa=dc;d.aa=e.ih;Oc(e.Bd);d.V=null;0==c?a.za==dc?(b.o>=Wb&&x("INTEGER OPTIMAL SOLUTION FOUND"),a.za=vc):
(b.o>=Wb&&x("PROBLEM HAS NO INTEGER FEASIBLE SOLUTION"),a.za=jc):c==Pc?b.o>=Wb&&x("RELATIVE MIP GAP TOLERANCE REACHED; SEARCH TERMINATED"):c==Qc?b.o>=Wb&&x("TIME LIMIT EXCEEDED; SEARCH TERMINATED"):c==Sb?b.o>=Lb&&x("glp_intopt: cannot solve current LP relaxation"):c==Rc&&b.o>=Wb&&x("SEARCH TERMINATED BY APPLICATION");return c}function d(a,b){function d(){Ub(m,q);q=null;Vb(m,a);return n}var e=na,f=e.Fb,m,q=null,r={},n;b.o>=Wb&&x("Preprocessing...");m=Xb();Yb(m,a,Sc);e.Fb=!f||b.o<Wb?cb:bb;n=Tc(m,b);
e.Fb=f;0!=n&&(n==ac?b.o>=Wb&&x("PROBLEM HAS NO PRIMAL FEASIBLE SOLUTION"):n==bc&&b.o>=Wb&&x("LP RELAXATION HAS NO DUAL FEASIBLE SOLUTION"));if(0!=n)return n;q=Ba();cc(m,q);if(0==q.g&&0==q.i)return q.za=vc,q.ta=q.ha,b.o>=Wb&&(x("Objective value = "+q.ta+""),x("INTEGER OPTIMAL SOLUTION FOUND BY MIP PREPROCESSOR")),d();if(b.o>=Wb){var t=Jc(q),y=Kc(q);x(q.g+" row"+(1==q.g?"":"s")+", "+q.i+" column"+(1==q.i?"":"s")+", "+q.L+" non-zero"+(1==q.L?"":"s")+"");x(t+" integer variable"+(1==t?"":"s")+", "+(0==
y?"none of":1==t&&1==y?"":1==y?"one of":y==t?"all of":y+" of")+" which "+(1==y?"is":"are")+" binary")}eb(a,r);fb(q,r);e.Fb=!f||b.o<Wb?cb:bb;gc(q,Uc|Vc|Wc|Xc);e.Fb=f;e.Fb=!f||b.o<Wb?cb:bb;ic(q);e.Fb=f;b.o>=Wb&&x("Solving LP relaxation...");e=new kc;e.o=b.o;q.$=a.$;n=sc(q,e);a.$=q.$;if(0!=n)return b.o>=Lb&&x("glp_intopt: cannot solve LP relaxation"),n=Sb;n=xc(q);n==vc?n=0:n==jc?n=ac:n==wc&&(n=bc);if(0!=n)return n;q.$=a.$;n=c(q,b);a.$=q.$;return q.za!=vc&&q.za!=dc?(a.za=q.za,n):d()}var e,f;null!=a&&
3621377730==a.Dd||w("glp_intopt: P = "+a+"; invalid problem object");null!=a.V&&w("glp_intopt: operation not allowed");null==b&&(b=new Yc);b.o!=lc&&b.o!=Lb&&b.o!=fc&&b.o!=Wb&&b.o!=mc&&w("glp_intopt: msg_lev = "+b.o+"; invalid parameter");b.Jb!=Zc&&b.Jb!=$c&&b.Jb!=ad&&b.Jb!=bd&&b.Jb!=cd&&w("glp_intopt: br_tech = "+b.Jb+"; invalid parameter");b.kc!=dd&&b.kc!=ed&&b.kc!=fd&&b.kc!=gd&&w("glp_intopt: bt_tech = "+b.kc+"; invalid parameter");0<b.Ub&&1>b.Ub||w("glp_intopt: tol_int = "+b.Ub+"; invalid parameter");
0<b.we&&1>b.we||w("glp_intopt: tol_obj = "+b.we+"; invalid parameter");0>b.sb&&w("glp_intopt: tm_lim = "+b.sb+"; invalid parameter");0>b.bc&&w("glp_intopt: out_frq = "+b.bc+"; invalid parameter");0>b.fb&&w("glp_intopt: out_dly = "+b.fb+"; invalid parameter");0<=b.Me&&256>=b.Me||w("glp_intopt: cb_size = "+b.Me+"; invalid parameter");b.ed!=hd&&b.ed!=id&&b.ed!=jd&&w("glp_intopt: pp_tech = "+b.ed+"; invalid parameter");0>b.ce&&w("glp_intopt: mip_gap = "+b.ce+"; invalid parameter");b.Ed!=bb&&b.Ed!=cb&&
w("glp_intopt: mir_cuts = "+b.Ed+"; invalid parameter");b.Ad!=bb&&b.Ad!=cb&&w("glp_intopt: gmi_cuts = "+b.Ad+"; invalid parameter");b.xd!=bb&&b.xd!=cb&&w("glp_intopt: cov_cuts = "+b.xd+"; invalid parameter");b.vd!=bb&&b.vd!=cb&&w("glp_intopt: clq_cuts = "+b.vd+"; invalid parameter");b.yc!=bb&&b.yc!=cb&&w("glp_intopt: presolve = "+b.yc+"; invalid parameter");b.sd!=bb&&b.sd!=cb&&w("glp_intopt: binarize = "+b.sd+"; invalid parameter");b.Xe!=bb&&b.Xe!=cb&&w("glp_intopt: fp_heur = "+b.Xe+"; invalid parameter");
a.za=Aa;a.ta=0;for(e=1;e<=a.g;e++)if(f=a.n[e],f.type==I&&f.c>=f.d)return b.o>=Lb&&x("glp_intopt: row "+e+": lb = "+f.c+", ub = "+f.d+"; incorrect bounds"),e=rc;for(e=1;e<=a.i;e++)if(f=a.f[e],f.type==I&&f.c>=f.d)return b.o>=Lb&&x("glp_intopt: column "+e+": lb = "+f.c+", ub = "+f.d+"; incorrect bounds"),e=rc;for(e=1;e<=a.i;e++)if(f=a.f[e],f.kind==Fc){if((f.type==Sa||f.type==I)&&f.c!=Math.floor(f.c))return b.o>=Lb&&x("glp_intopt: integer column "+e+" has non-integer lower bound "+f.c+""),e=rc;if((f.type==
Ta||f.type==I)&&f.d!=Math.floor(f.d))return b.o>=Lb&&x("glp_intopt: integer column "+e+" has non-integer upper bound "+f.d+""),e=rc;if(f.type==B&&f.c!=Math.floor(f.c))return b.o>=Lb&&x("glp_intopt: integer column "+e+" has non-integer fixed value "+f.c+""),e=rc}b.o>=Wb&&(e=Jc(a),f=Kc(a),x("GLPK Integer Optimizer, v"+ra()+""),x(a.g+" row"+(1==a.g?"":"s")+", "+a.i+" column"+(1==a.i?"":"s")+", "+a.L+" non-zero"+(1==a.L?"":"s")+""),x(e+" integer variable"+(1==e?"":"s")+", "+(0==f?"none of":1==e&&1==f?
"":1==f?"one of":f==e?"all of":f+" of")+" which "+(1==f?"is":"are")+" binary"));return e=b.yc?d(a,b):c(a,b)};
var Yc=exports.IOCP=function(a){a=a||{};this.o=a.msg_lev||Wb;this.Jb=a.br_tech||bd;this.kc=a.bt_tech||fd;this.Ub=a.tol_int||1E-5;this.we=a.tol_obj||1E-7;this.sb=a.tm_lim||2147483647;this.bc=a.out_frq||5E3;this.fb=a.out_dly||1E4;this.ob=a.cb_func||null;this.Uc=a.cb_info||null;this.Me=a.cb_size||0;this.ed=a.pp_tech||jd;this.ce=a.mip_gap||0;this.Ed=a.mir_cuts||cb;this.Ad=a.gmi_cuts||cb;this.xd=a.cov_cuts||cb;this.vd=a.clq_cuts||cb;this.yc=a.presolve||cb;this.sd=a.binarize||cb;this.Xe=a.fp_heur||cb};
exports.glp_mip_status=function(a){return a.za};exports.glp_mip_obj_val=function(a){return a.ta};
var kd=exports.glp_mip_row_val=function(a,b){1<=b&&b<=a.g||w("glp_mip_row_val: i = "+b+"; row number out of range");return a.n[b].Sa},ld=exports.glp_mip_col_val=function(a,b){1<=b&&b<=a.i||w("glp_mip_col_val: j = "+b+"; column number out of range");return a.f[b].Sa},Ib=exports.glp_bf_exists=function(a){return 0==a.g||a.valid},Jb=exports.glp_factorize=function(a){function b(a,b,c,d){var e=a.g,f;f=a.head[b];if(f<=e)b=1,c[1]=f,d[1]=1;else for(b=0,a=a.f[f-e].k;null!=a;a=a.I)b++,c[b]=a.n.ea,d[b]=-a.n.ma*
a.j*a.f.va;return b}var c=a.g,d=a.i,e=a.n,f=a.f,g=a.head,h,k,l;h=a.valid=0;for(k=1;k<=c+d;k++)if(k<=c?(l=e[k].m,e[k].bind=0):(l=f[k-c].m,f[k-c].bind=0),l==A){h++;if(h>c)return a=Kb;g[h]=k;k<=c?e[k].bind=h:f[k-c].bind=h}if(h<c)return a=Kb;if(0<c){null==a.U&&(a.U={valid:0,type:md,gb:null,Za:null,Cd:0,cc:0.1,xc:4,gc:1,Mb:1E-15,sc:1E10,$c:100,ic:1E-6,vc:100,kd:1E3,Ch:-1,hg:0},nd(a));switch(od(a.U,c,b,a)){case pd:return a=Mb;case qd:return a=Nb}a.valid=1}return 0};
exports.glp_bf_updated=function(a){0==a.g||a.valid||w("glp_bf_update: basis factorization does not exist");return 0==a.g?0:a.U.hg};var eb=exports.glp_get_bfcp=function(a,b){var c=a.Qd;null==c?(b.type=md,b.Cd=0,b.cc=0.1,b.xc=4,b.gc=bb,b.Mb=1E-15,b.sc=1E10,b.$c=100,b.ic=1E-6,b.vc=100,b.kd=0):da(b,c)};function nd(a){var b={};eb(a,b);a=a.U;a.type=b.type;a.Cd=b.Cd;a.cc=b.cc;a.xc=b.xc;a.gc=b.gc;a.Mb=b.Mb;a.sc=b.sc;a.$c=b.$c;a.ic=b.ic;a.vc=b.vc;a.kd=b.kd}
var fb=exports.glp_set_bfcp=function(a,b){var c=a.Qd;null==b?null!=c&&(a.Qd=null):(null==c&&(c=a.Qd={}),da(c,b),c.type!=md&&c.type!=rd&&c.type!=sd&&w("glp_set_bfcp: type = "+c.type+"; invalid parameter"),0>c.Cd&&w("glp_set_bfcp: lu_size = "+c.Cd+"; invalid parameter"),0<c.cc&&1>c.cc||w("glp_set_bfcp: piv_tol = "+c.cc+"; invalid parameter"),1>c.xc&&w("glp_set_bfcp: piv_lim = "+c.xc+"; invalid parameter"),c.gc!=bb&&c.gc!=cb&&w("glp_set_bfcp: suhl = "+c.gc+"; invalid parameter"),0<=c.Mb&&1E-6>=c.Mb||
w("glp_set_bfcp: eps_tol = "+c.Mb+"; invalid parameter"),1>c.sc&&w("glp_set_bfcp: max_gro = "+c.sc+"; invalid parameter"),1<=c.$c&&32767>=c.$c||w("glp_set_bfcp: nfs_max = "+c.$c+"; invalid parameter"),0<c.ic&&1>c.ic||w("glp_set_bfcp: upd_tol = "+c.ic+"; invalid parameter"),1<=c.vc&&32767>=c.vc||w("glp_set_bfcp: nrs_max = "+c.vc+"; invalid parameter"),0>c.kd&&w("glp_set_bfcp: rs_size = "+c.vc+"; invalid parameter"),0==c.kd&&(c.kd=20*c.vc));null!=a.U&&nd(a)},td=exports.glp_get_bhead=function(a,b){0==
a.g||a.valid||w("glp_get_bhead: basis factorization does not exist");1<=b&&b<=a.g||w("glp_get_bhead: k = "+b+"; index out of range");return a.head[b]},ud=exports.glp_get_row_bind=function(a,b){0==a.g||a.valid||w("glp_get_row_bind: basis factorization does not exist");1<=b&&b<=a.g||w("glp_get_row_bind: i = "+b+"; row number out of range");return a.n[b].bind},vd=exports.glp_get_col_bind=function(a,b){0==a.g||a.valid||w("glp_get_col_bind: basis factorization does not exist");1<=b&&b<=a.i||w("glp_get_col_bind: j = "+
b+"; column number out of range");return a.f[b].bind},xd=exports.glp_ftran=function(a,b){var c=a.g,d=a.n,e=a.f,f,g;0==c||a.valid||w("glp_ftran: basis factorization does not exist");for(f=1;f<=c;f++)b[f]*=d[f].ma;0<c&&wd(a.U,b);for(f=1;f<=c;f++)g=a.head[f],b[f]=g<=c?b[f]/d[g].ma:b[f]*e[g-c].va},zd=exports.glp_btran=function(a,b){var c=a.g,d=a.n,e=a.f,f,g;0==c||a.valid||w("glp_btran: basis factorization does not exist");for(f=1;f<=c;f++)g=a.head[f],b[f]=g<=c?b[f]/d[g].ma:b[f]*e[g-c].va;0<c&&yd(a.U,
b);for(f=1;f<=c;f++)b[f]*=d[f].ma};
exports.glp_warm_up=function(a){var b,c,d,e,f;a.na=a.sa=Aa;a.aa=0;a.some=0;for(d=1;d<=a.g;d++)b=a.n[d],b.r=b.J=0;for(d=1;d<=a.i;d++)b=a.f[d],b.r=b.J=0;if(!Ib(a)&&(e=Jb(a),0!=e))return e;e=new Float64Array(1+a.g);for(d=1;d<=a.g;d++)b=a.n[d],b.m!=A&&(b.m==G?b.r=b.c:b.m==Ua?b.r=b.d:b.m==Ra?b.r=0:b.m==Na&&(b.r=b.c),e[d]-=b.r);for(d=1;d<=a.i;d++)if(b=a.f[d],b.m!=A&&(b.m==G?b.r=b.c:b.m==Ua?b.r=b.d:b.m==Ra?b.r=0:b.m==Na&&(b.r=b.c),0!=b.r))for(c=b.k;null!=c;c=c.I)e[c.n.ea]+=c.j*b.r;xd(a,e);a.na=dc;for(d=
1;d<=a.g;d++)if(b=a.n[d],b.m==A){b.r=e[b.bind];c=b.type;if(c==Sa||c==I||c==B)f=1E-6+1E-9*Math.abs(b.c),b.r<b.c-f&&(a.na=Ad);if(c==Ta||c==I||c==B)f=1E-6+1E-9*Math.abs(b.d),b.r>b.d+f&&(a.na=Ad)}for(d=1;d<=a.i;d++)if(b=a.f[d],b.m==A){b.r=e[b.bind];c=b.type;if(c==Sa||c==I||c==B)f=1E-6+1E-9*Math.abs(b.c),b.r<b.c-f&&(a.na=Ad);if(c==Ta||c==I||c==B)f=1E-6+1E-9*Math.abs(b.d),b.r>b.d+f&&(a.na=Ad)}a.aa=a.ha;for(d=1;d<=a.i;d++)b=a.f[d],a.aa+=b.u*b.r;for(d=1;d<=a.g;d++)e[d]=0;for(d=1;d<=a.i;d++)b=a.f[d],b.m==
A&&(e[b.bind]=b.u);zd(a,e);a.sa=dc;for(d=1;d<=a.g;d++)if(b=a.n[d],b.m==A)b.J=0;else if(b.J=-e[d],c=b.m,b=a.dir==za?+b.J:-b.J,(c==Ra||c==G)&&-1E-5>b||(c==Ra||c==Ua)&&1E-5<b)a.sa=Ad;for(d=1;d<=a.i;d++)if(b=a.f[d],b.m==A)b.J=0;else{b.J=b.u;for(c=b.k;null!=c;c=c.I)b.J+=c.j*e[c.n.ea];c=b.m;b=a.dir==za?+b.J:-b.J;if((c==Ra||c==G)&&-1E-5>b||(c==Ra||c==Ua)&&1E-5<b)a.sa=Ad}return 0};
var Bd=exports.glp_eval_tab_row=function(a,b,c,d){var e=a.g,f=a.i,g,h,k,l,p,m,q;0==e||a.valid||w("glp_eval_tab_row: basis factorization does not exist");1<=b&&b<=e+f||w("glp_eval_tab_row: k = "+b+"; variable number out of range");g=b<=e?ud(a,b):vd(a,b-e);0==g&&w("glp_eval_tab_row: k = "+b+"; variable must be basic");m=new Float64Array(1+e);l=new Int32Array(1+e);q=new Float64Array(1+e);m[g]=1;zd(a,m);h=0;for(b=1;b<=e+f;b++){if(b<=e){if(zc(a,b)==A)continue;p=-m[b]}else{if(Cc(a,b-e)==A)continue;k=gb(a,
b-e,l,q);p=0;for(g=1;g<=k;g++)p+=m[l[g]]*q[g]}0!=p&&(h++,c[h]=b,d[h]=p)}return h},Cd=exports.glp_eval_tab_col=function(a,b,c,d){var e=a.g,f=a.i,g;0==e||a.valid||w("glp_eval_tab_col: basis factorization does not exist");1<=b&&b<=e+f||w("glp_eval_tab_col: k = "+b+"; variable number out of range");(b<=e?zc(a,b):Cc(a,b-e))==A&&w("glp_eval_tab_col: k = "+b+"; variable must be non-basic");f=new Float64Array(1+e);if(b<=e)f[b]=-1;else for(g=gb(a,b-e,c,d),b=1;b<=g;b++)f[c[b]]=d[b];xd(a,f);g=0;for(b=1;b<=e;b++)0!=
f[b]&&(g++,c[g]=td(a,b),d[g]=f[b]);return g},Dd=exports.glp_transform_row=function(a,b,c,d){var e,f,g,h,k,l,p,m,q,r;Ib(a)||w("glp_transform_row: basis factorization does not exist ");f=kb(a);g=lb(a);m=new Float64Array(1+g);0<=b&&b<=g||w("glp_transform_row: len = "+b+"; invalid row length");for(h=1;h<=b;h++)e=c[h],1<=e&&e<=g||w("glp_transform_row: ind["+h+"] = "+e+"; column index out of range"),0==d[h]&&w("glp_transform_row: val["+h+"] = 0; zero coefficient not allowed"),0!=m[e]&&w("glp_transform_row: ind["+
h+"] = "+e+"; duplicate column indices not allowed"),m[e]=d[h];q=new Float64Array(1+f);for(e=1;e<=f;e++)b=td(a,e),q[e]=b<=f?0:m[b-f];zd(a,q);b=0;for(e=1;e<=f;e++)zc(a,e)!=A&&(p=-q[e],0!=p&&(b++,c[b]=e,d[b]=p));l=new Int32Array(1+f);r=new Float64Array(1+f);for(e=1;e<=g;e++)if(Cc(a,e)!=A){p=m[e];k=gb(a,e,l,r);for(h=1;h<=k;h++)p+=r[h]*q[l[h]];0!=p&&(b++,c[b]=f+e,d[b]=p)}return b};
exports.glp_transform_col=function(a,b,c,d){var e,f,g,h;Ib(a)||w("glp_transform_col: basis factorization does not exist ");f=kb(a);h=new Float64Array(1+f);0<=b&&b<=f||w("glp_transform_col: len = "+b+"; invalid column length");for(g=1;g<=b;g++)e=c[g],1<=e&&e<=f||w("glp_transform_col: ind["+g+"] = "+e+"; row index out of range"),0==d[g]&&w("glp_transform_col: val["+g+"] = 0; zero coefficient not allowed"),0!=h[e]&&w("glp_transform_col: ind["+g+"] = "+e+"; duplicate row indices not allowed"),h[e]=d[g];
xd(a,h);b=0;for(e=1;e<=f;e++)0!=h[e]&&(b++,c[b]=td(a,e),d[b]=h[e]);return b};
var Ed=exports.glp_prim_rtest=function(a,b,c,d,e,f){var g,h,k,l,p,m,q,r,n,t,y,E,C;tc(a)!=dc&&w("glp_prim_rtest: basic solution is not primal feasible ");1!=e&&-1!=e&&w("glp_prim_rtest: dir = "+e+"; invalid parameter");0<f&&1>f||w("glp_prim_rtest: eps = "+f+"; invalid parameter");h=kb(a);k=lb(a);l=0;C=s;r=0;for(p=1;p<=b;p++)if(g=c[p],1<=g&&g<=h+k||w("glp_prim_rtest: ind["+p+"] = "+g+"; variable number out of range"),g<=h?(m=ob(a,g),t=pb(a,g),y=qb(a,g),q=zc(a,g),n=Ac(a,g)):(m=rb(a,g-h),t=sb(a,g-h),
y=tb(a,g-h),q=Cc(a,g-h),n=Dc(a,g-h)),q!=A&&w("glp_prim_rtest: ind["+p+"] = "+g+"; non-basic variable not allowed"),g=0<e?+d[p]:-d[p],m!=Ka){if(m==Sa){if(g>-f)continue;E=(t-n)/g}else if(m==Ta){if(g<+f)continue;E=(y-n)/g}else if(m==I)if(0>g){if(g>-f)continue;E=(t-n)/g}else{if(g<+f)continue;E=(y-n)/g}else if(m==B){if(-f<g&&g<+f)continue;E=0}0>E&&(E=0);if(C>E||C==E&&r<Math.abs(g))l=p,C=E,r=Math.abs(g)}return l},Fd=exports.glp_dual_rtest=function(a,b,c,d,e,f){var g,h,k,l,p,m,q,r,n,t,y;uc(a)!=dc&&w("glp_dual_rtest: basic solution is not dual feasible");
1!=e&&-1!=e&&w("glp_dual_rtest: dir = "+e+"; invalid parameter");0<f&&1>f||w("glp_dual_rtest: eps = "+f+"; invalid parameter");h=kb(a);k=lb(a);n=jb(a)==za?1:-1;l=0;y=s;q=0;for(p=1;p<=b;p++){g=c[p];1<=g&&g<=h+k||w("glp_dual_rtest: ind["+p+"] = "+g+"; variable number out of range");g<=h?(m=zc(a,g),r=Bc(a,g)):(m=Cc(a,g-h),r=Ec(a,g-h));m==A&&w("glp_dual_rtest: ind["+p+"] = "+g+"; basic variable not allowed");g=0<e?+d[p]:-d[p];if(m==G){if(g<+f)continue;t=n*r/g}else if(m==Ua){if(g>-f)continue;t=n*r/g}else if(m==
Ra){if(-f<g&&g<+f)continue;t=0}else if(m==Na)continue;0>t&&(t=0);if(y>t||y==t&&q<Math.abs(g))l=p,y=t,q=Math.abs(g)}return l};
function Gd(a,b,c,d,e,f,g){var h,k,l,p=0,m,q;a.na==Aa&&w("glp_analyze_row: primal basic solution components are undefined");a.sa!=dc&&w("glp_analyze_row: basic solution is not dual feasible");0<=b&&b<=a.i||w("glp_analyze_row: len = "+b+"; invalid row length");q=0;for(h=1;h<=b;h++)k=c[h],1<=k&&k<=a.g+a.i||w("glp_analyze_row: ind["+h+"] = "+k+"; row/column index out of range"),k<=a.g?(a.n[k].m==A&&w("glp_analyze_row: ind["+h+"] = "+k+"; basic auxiliary variable is not allowed"),m=a.n[k].r):(a.f[k-a.g].m==
A&&w("glp_analyze_row: ind["+h+"] = "+k+"; basic structural variable is not allowed"),m=a.f[k-a.g].r),q+=d[h]*m;if(e==Sa){if(q>=f)return 1;l=1}else if(e==Ta){if(q<=f)return 1;l=-1}else w("glp_analyze_row: type = "+e+"; invalid parameter");e=f-q;b=Fd(a,b,c,d,l,1E-9);if(0==b)return 2;k=c[b];m=k<=a.g?a.n[k].r:a.f[k-a.g].r;c=e/d[b];g(b,m,c,q,e,k<=a.g?a.n[k].J*c:a.f[k-a.g].J*c);return p}
exports.glp_analyze_bound=function(a,b,c){var d,e,f,g,h,k,l,p,m,q,r,n,t,y;r=n=t=y=null;null!=a&&3621377730==a.Dd||w("glp_analyze_bound: P = "+a+"; invalid problem object");e=a.g;f=a.i;a.na==dc&&a.sa==dc||w("glp_analyze_bound: optimal basic solution required");0==e||a.valid||w("glp_analyze_bound: basis factorization required");1<=b&&b<=e+f||w("glp_analyze_bound: k = "+b+"; variable number out of range");d=b<=e?a.n[b]:a.f[b-e];g=d.m;f=d.r;g==A&&w("glp_analyze_bound: k = "+b+"; basic variable not allowed ");
g=new Int32Array(1+e);q=new Float64Array(1+e);k=Cd(a,b,g,q);for(b=-1;1>=b;b+=2)l=Ed(a,k,g,q,b,1E-9),0==l?(h=0,l=0>b?-s:+s):(h=g[l],h<=e?(d=a.n[h],p=pb(a,d.ea),m=qb(a,d.ea)):(d=a.f[h-e],p=sb(a,d.C),m=tb(a,d.C)),d=d.r,d=0>b&&0<q[l]||0<b&&0>q[l]?p-d:m-d,l=f+d/q[l]),0>b?(r=l,n=h):(t=l,y=h);c(r,n,t,y)};
exports.glp_analyze_coef=function(a,b,c){var d,e,f,g,h,k,l,p,m,q,r,n,t,y,E,C,D,H,R,V,O=null,Q=null,F=null,W=null,X=null,ca=null;null!=a&&3621377730==a.Dd||w("glp_analyze_coef: P = "+a+"; invalid problem object");e=a.g;f=a.i;a.na==dc&&a.sa==dc||w("glp_analyze_coef: optimal basic solution required");0==e||a.valid||w("glp_analyze_coef: basis factorization required");1<=b&&b<=e+f||w("glp_analyze_coef: k = "+b+"; variable number out of range");b<=e?(d=a.n[b],g=d.type,n=d.c,t=d.d,y=0):(d=a.f[b-e],g=d.type,
n=d.c,t=d.d,y=d.u);h=d.m;E=d.r;h!=A&&w("glp_analyze_coef: k = "+b+"; non-basic variable not allowed");h=new Int32Array(1+e);V=new Float64Array(1+e);r=new Int32Array(1+f);R=new Float64Array(1+f);m=Bd(a,b,r,R);for(f=-1;1>=f;f+=2)a.dir==za?l=-f:a.dir==Ea&&(l=+f),q=Fd(a,m,r,R,l,1E-9),0==q?(C=0>f?-s:+s,k=0,q=E):(k=r[q],d=k<=e?a.n[k]:a.f[k-e],l=d.J,d=-l/R[q],C=y+d,l=0>f&&0<R[q]||0<f&&0>R[q]?1:-1,a.dir==Ea&&(l=-l),p=Cd(a,k,h,V),d=b<=e?a.n[b]:a.f[b-e],d.type=Ka,d.c=d.d=0,p=Ed(a,p,h,V,l,1E-9),d=b<=e?a.n[b]:
a.f[b-e],d.type=g,d.c=n,d.d=t,0==p?q=0>l&&0<R[q]||0<l&&0>R[q]?-s:+s:(d=h[p],d<=e?(d=a.n[d],D=pb(a,d.ea),H=qb(a,d.ea)):(d=a.f[d-e],D=sb(a,d.C),H=tb(a,d.C)),d=d.r,d=0>l&&0<V[p]||0<l&&0>V[p]?D-d:H-d,q=E+R[q]/V[p]*d)),0>f?(O=C,Q=k,F=q):(W=C,X=k,ca=q);c(O,Q,F,W,X,ca)};exports.glp_ios_reason=function(a){return a.reason};exports.glp_ios_get_prob=function(a){return a.A};function Hd(a){a.reason!=Ia&&w("glp_ios_pool_size: operation not allowed");return a.Bd.size}
function Id(a,b,c,d,e,f,g){a.reason!=Ia&&w("glp_ios_add_row: operation not allowed");var h=a.Bd,k,l;k={name:null};0<=b&&255>=b||w("glp_ios_add_row: klass = "+b+"; invalid cut class");k.qc=b;k.k=null;0<=c&&c<=a.i||w("glp_ios_add_row: len = "+c+"; invalid cut length");for(l=1;l<=c;l++)b={},1<=d[l]&&d[l]<=a.i||w("glp_ios_add_row: ind["+l+"] = "+d[l]+"; column index out of range"),b.C=d[l],b.j=e[l],b.e=k.k,k.k=b;f!=Sa&&f!=Ta&&f!=B&&w("glp_ios_add_row: type = "+f+"; invalid cut type");k.type=f;k.cg=g;
k.ca=h.Xa;k.e=null;null==k.ca?h.head=k:k.ca.e=k;h.Xa=k;h.size++}function Jd(a,b){1<=b&&b<=a.A.i||w("glp_ios_can_branch: j = "+b+"; column number out of range");return a.ad[b]}
function Kd(a,b){var c=a.A,d=a.wc,e=a.i,f,g;g=c.ha;for(f=1;f<=e;f++){var h=c.f[f];if(h.kind==Fc&&b[f]!=Math.floor(b[f]))return 1;g+=h.u*b[f]}if(c.za==dc)switch(c.dir){case za:if(g>=a.A.ta)return 1;break;case Ea:if(g<=a.A.ta)return 1}a.p.o>=fc&&x("Solution found by heuristic: "+g+"");c.za=dc;c.ta=g;for(f=1;f<=e;f++)c.f[f].Sa=b[f];for(e=1;e<=d;e++)for(f=c.n[e],f.Sa=0,g=f.k;null!=g;g=g.B)f.Sa+=g.j*g.f.Sa;return 0}exports.glp_mpl_alloc_wksp=function(){return Ld()};
exports._glp_mpl_init_rand=function(a,b){0!=a.D&&w("glp_mpl_init_rand: invalid call sequence\n");Md(a.Gd,b)};var Od=exports.glp_mpl_read_model=function(a,b,c,d){0!=a.D&&w("glp_mpl_read_model: invalid call sequence");a=Nd(a,b,c,d);1==a||2==a?a=0:4==a&&(a=1);return a};exports.glp_mpl_read_model_from_string=function(a,b,c,d){var e=0;return Od(a,b,function(){return e<c.length?c[e++]:-1},d)};
var Qd=exports.glp_mpl_read_data=function(a,b,c){1!=a.D&&2!=a.D&&w("glp_mpl_read_data: invalid call sequence");a=Pd(a,b,c);2==a?a=0:4==a&&(a=1);return a};exports.glp_mpl_read_data_from_string=function(a,b,c){var d=0;return Qd(a,b,function(){return d<c.length?c[d++]:-1})};exports.glp_mpl_generate=function(a,b,c,d){1!=a.D&&2!=a.D&&w("glp_mpl_generate: invalid call sequence\n");a=Rd(a,b,c,d);3==a?a=0:4==a&&(a=1);return a};
exports.glp_mpl_build_prob=function(a,b){var c,d,e,f,g,h,k;3!=a.D&&w("glp_mpl_build_prob: invalid call sequence\n");db(b);Ca(b,Sd(a));c=Td(a);0<c&&La(b,c);for(d=1;d<=c;d++){Pa(b,d,Ud(a,d));g=Vd(a,d,function(a,b){h=a;k=b});switch(g){case Wd:g=Ka;break;case Xd:g=Sa;break;case Yd:g=Ta;break;case Zd:g=I;break;case $d:g=B}g==I&&Math.abs(h-k)<1E-9*(1+Math.abs(h))&&(g=B,Math.abs(h)<=Math.abs(k)?k=h:h=k);Va(b,d,g,h,k);0!=ae(a,d)&&x("glp_mpl_build_prob: row "+Ud(a,d)+"; constant term "+ae(a,d)+" ignored")}d=
be(a);0<d&&Oa(b,d);for(e=1;e<=d;e++){Qa(b,e,ce(a,e));f=de(a,e);switch(f){case ee:case fe:Hc(b,e,Fc)}g=ge(a,e,function(a,b){h=a;k=b});switch(g){case Wd:g=Ka;break;case Xd:g=Sa;break;case Yd:g=Ta;break;case Zd:g=I;break;case $d:g=B}if(f==fe){if(g==Ka||g==Ta||0>h)h=0;if(g==Ka||g==Sa||1<k)k=1;g=I}g==I&&Math.abs(h-k)<1E-9*(1+Math.abs(h))&&(g=B,Math.abs(h)<=Math.abs(k)?k=h:h=k);Wa(b,e,g,h,k)}g=new Int32Array(1+d);e=new Float64Array(1+d);for(d=1;d<=c;d++)f=he(a,d,g,e),Ya(b,d,f,g,e);for(d=1;d<=c;d++)if(f=
ie(a,d),f==je||f==ke){Da(b,Ud(a,d));Fa(b,f==je?za:Ea);Xa(b,0,ae(a,d));f=he(a,d,g,e);for(c=1;c<=f;c++)Xa(b,g[c],e[c]);break}};
exports.glp_mpl_postsolve=function(a,b,c){var d,e,f,g,h,k;(3!=a.D||a.Of)&&w("glp_mpl_postsolve: invalid call sequence");c!=Zb&&c!=le&&c!=Sc&&w("glp_mpl_postsolve: sol = "+c+"; invalid parameter");e=Td(a);f=be(a);e==kb(b)&&f==lb(b)||w("glp_mpl_postsolve: wrong problem object\n");if(!me(a))return 0;for(d=1;d<=e;d++)c==Zb?(g=zc(b,d),h=Ac(b,d),k=Bc(b,d)):c==le?(g=0,h=glp_ipt_row_prim(b,d),k=glp_ipt_row_dual(b,d)):c==Sc&&(g=0,h=kd(b,d),k=0),1E-9>Math.abs(h)&&(h=0),1E-9>Math.abs(k)&&(k=0),ne(a,d,g,h,k);
for(d=1;d<=f;d++)c==Zb?(g=Cc(b,d),h=Dc(b,d),k=Ec(b,d)):c==le?(g=0,h=glp_ipt_col_prim(b,d),k=glp_ipt_col_dual(b,d)):c==Sc&&(g=0,h=ld(b,d),k=0),1E-9>Math.abs(h)&&(h=0),1E-9>Math.abs(k)&&(k=0),oe(a,d,g,h,k);a=pe(a);3==a?a=0:4==a&&(a=1);return a};
function qe(a,b){var c,d,e;c=null;for(d=a.root;null!=d;)c=d,0>=a.yg(a.info,b,c.key)?(e=0,d=c.left,c.pa++):(e=1,d=c.right);d={};d.key=b;d.type=0;d.link=null;d.pa=1;d.R=c;d.ba=null==c?0:e;d.wa=0;d.left=null;d.right=null;a.size++;for(null==c?a.root=d:0==e?c.left=d:c.right=d;null!=c;){if(0==e){if(0<c.wa){c.wa=0;break}if(0>c.wa){re(a,c);break}c.wa=-1}else{if(0>c.wa){c.wa=0;break}if(0<c.wa){re(a,c);break}c.wa=1}e=c.ba;c=c.R}null==c&&a.height++;return d}
function re(a,b){var c,d,e,f,g;0>b.wa?(c=b.R,d=b.left,e=d.right,0>=d.wa?(null==c?a.root=d:0==b.ba?c.left=d:c.right=d,b.pa-=d.pa,d.R=c,d.ba=b.ba,d.wa++,d.right=b,b.R=d,b.ba=1,b.wa=-d.wa,b.left=e,null!=e&&(e.R=b,e.ba=0)):(f=e.left,g=e.right,null==c?a.root=e:0==b.ba?c.left=e:c.right=e,b.pa-=d.pa+e.pa,e.pa+=d.pa,b.wa=0<=e.wa?0:1,d.wa=0>=e.wa?0:-1,e.R=c,e.ba=b.ba,e.wa=0,e.left=d,e.right=b,b.R=e,b.ba=1,b.left=g,d.R=e,d.ba=0,d.right=f,null!=f&&(f.R=d,f.ba=1),null!=g&&(g.R=b,g.ba=0))):(c=b.R,d=b.right,e=
d.left,0<=d.wa?(null==c?a.root=d:0==b.ba?c.left=d:c.right=d,d.pa+=b.pa,d.R=c,d.ba=b.ba,d.wa--,d.left=b,b.R=d,b.ba=0,b.wa=-d.wa,b.right=e,null!=e&&(e.R=b,e.ba=1)):(f=e.left,g=e.right,null==c?a.root=e:0==b.ba?c.left=e:c.right=e,d.pa-=e.pa,e.pa+=b.pa,b.wa=0>=e.wa?0:-1,d.wa=0<=e.wa?0:1,e.R=c,e.ba=b.ba,e.wa=0,e.left=b,e.right=d,b.R=e,b.ba=0,b.right=f,d.R=e,d.ba=1,d.left=g,null!=f&&(f.R=b,f.ba=1),null!=g&&(g.R=d,g.ba=0)))}var pd=1,qd=2,se=3,te=4,ue=5;
function od(a,b,c,d){var e,f;f=a.valid=0;switch(a.type){case md:a.Za=null;null==a.gb&&(f={},f.hb=f.g=0,f.valid=0,f.ia=ve(),f.$d=50,f.Pb=0,f.Ze=f.af=f.$e=null,f.je=f.ie=null,f.ug=null,f.vg=null,f.ic=1E-6,f.ag=0,a.gb=f,f=1);break;case rd:case sd:a.gb=null,null==a.Za&&(we&&x("lpf_create_it: warning: debug mode enabled"),f={valid:0},f.Nc=f.ef=0,f.ia=ve(),f.g=0,f.Cf=null,f.K=50,f.i=0,f.Md=f.Ld=null,f.Od=f.Nd=null,f.Qc=null,f.Ge=f.Fe=null,f.Ie=f.He=null,f.Jd=1E3,f.od=0,f.Wb=null,f.Xb=null,f.jb=f.Gc=null,
a.Za=f,f=1)}null!=a.gb?e=a.gb.ia:null!=a.Za&&(e=a.Za.ia);f&&(e.Va=a.Cd);e.cc=a.cc;e.xc=a.xc;e.gc=a.gc;e.Mb=a.Mb;e.sc=a.sc;null!=a.gb&&(f&&(a.gb.$d=a.$c),a.gb.ic=a.ic);null!=a.Za&&(f&&(a.Za.K=a.vc),f&&(a.Za.Jd=a.kd));if(null!=a.gb){a:{e=a.gb;1>b&&w("fhv_factorize: m = "+b+"; invalid parameter");1E8<b&&w("fhv_factorize: m = "+b+"; matrix too big");e.g=b;e.valid=0;null==e.Ze&&(e.Ze=new Int32Array(1+e.$d));null==e.af&&(e.af=new Int32Array(1+e.$d));null==e.$e&&(e.$e=new Int32Array(1+e.$d));e.hb<b&&(e.hb=
b+100,e.je=new Int32Array(1+e.hb),e.ie=new Int32Array(1+e.hb),e.ug=new Int32Array(1+e.hb),e.vg=new Float64Array(1+e.hb));switch(xe(e.ia,b,c,d)){case ye:b=ze;break a;case Ae:b=Be;break a}e.valid=1;e.Pb=0;ga(e.je,1,e.ia.kb,1,b);ga(e.ie,1,e.ia.vb,1,b);b=e.ag=0}switch(b){case ze:return a=pd;case Be:return a=qd}}else if(null!=a.Za){a:{e=a.Za;if(we)var g,h,k,l,p,m;1>b&&w("lpf_factorize: m = "+b+"; invalid parameter");1E8<b&&w("lpf_factorize: m = "+b+"; matrix too big");e.ef=e.g=b;e.valid=0;null==e.Md&&
(e.Md=new Int32Array(1+e.K));null==e.Ld&&(e.Ld=new Int32Array(1+e.K));null==e.Od&&(e.Od=new Int32Array(1+e.K));null==e.Nd&&(e.Nd=new Int32Array(1+e.K));null==e.Qc&&(f=e.K,Ce&&x("scf_create_it: warning: debug mode enabled"),1<=f&&32767>=f||w("scf_create_it: n_max = "+f+"; invalid parameter"),g={},g.K=f,g.i=0,g.Nb=new Float64Array(1+f*f),g.v=new Float64Array(1+f*(f+1)/2),g.s=new Int32Array(1+f),g.fg=De,g.pa=0,g.l=Ce?new Float64Array(1+f*f):null,g.ig=new Float64Array(1+f),e.Qc=g);null==e.Wb&&(e.Wb=new Int32Array(1+
e.Jd));null==e.Xb&&(e.Xb=new Float64Array(1+e.Jd));e.Nc<b&&(e.Nc=b+100,e.Ge=new Int32Array(1+e.Nc+e.K),e.Fe=new Int32Array(1+e.Nc+e.K),e.Ie=new Int32Array(1+e.Nc+e.K),e.He=new Int32Array(1+e.Nc+e.K),e.jb=new Float64Array(1+e.Nc+e.K),e.Gc=new Float64Array(1+e.Nc+e.K));switch(xe(e.ia,b,c,d)){case ye:b=Ee;break a;case Ae:b=LPF_ECOND;break a}e.valid=1;if(we){e.Cf=p=new Float64Array(1+b*b);l=new Int32Array(1+b);m=new Float64Array(1+b);for(f=1;f<=b*b;f++)p[f]=0;for(h=1;h<=b;h++)for(k=c(d,h,l,m),f=1;f<=
k;f++)g=l[f],p[(g-1)*b+h]=m[f]}e.i=0;c=e.Qc;c.i=c.pa=0;for(f=1;f<=b;f++)e.Ge[f]=e.Fe[f]=f,e.Ie[f]=e.He[f]=f;e.od=1;b=0}switch(b){case 0:switch(a.type){case rd:a.Za.Qc.fg=De;break;case sd:a.Za.Qc.fg=Fe}break;case Ee:return a=pd;case LPF_ECOND:return a=qd}}a.valid=1;return a.hg=0}
function wd(a,b){if(null!=a.gb){var c=a.gb,d=c.ia.kb,e=c.ia.vb,f=c.je,g=c.ie;c.valid||w("fhv_ftran: the factorization is not valid");c.ia.kb=f;c.ia.vb=g;Ge(c.ia,0,b);c.ia.kb=d;c.ia.vb=e;He(c,0,b);Ie(c.ia,0,b)}else if(null!=a.Za){var c=a.Za,d=c.ef,e=c.g,h=c.i,k=c.Fe,f=c.He,g=c.jb,l,p;if(we)var m;c.valid||w("lpf_ftran: the factorization is not valid");if(we)for(m=new Float64Array(1+e),l=1;l<=e;l++)m[l]=b[l];for(l=1;l<=d+h;l++)g[l]=(p=k[l])<=e?b[p]:0;Ge(c.ia,0,g);Je(c,g,d,g);Ke(c.Qc,0,g,d);h=c.i;k=c.Md;
l=c.Ld;p=c.Wb;var q=c.Xb,r,n,t,y;for(r=1;r<=h;r++)if(0!=g[r+d])for(y=-1*g[r+d],n=k[r],t=n+l[r];n<t;n++)g[p[n]]+=y*q[n];Ie(c.ia,0,g);for(l=1;l<=e;l++)b[l]=g[f[l]];we&&Le(c,0,b,m)}}
function yd(a,b){if(null!=a.gb){var c=a.gb,d=c.ia.kb,e=c.ia.vb,f=c.je,g=c.ie;c.valid||w("fhv_btran: the factorization is not valid");Ie(c.ia,1,b);He(c,1,b);c.ia.kb=f;c.ia.vb=g;Ge(c.ia,1,b);c.ia.kb=d;c.ia.vb=e}else if(null!=a.Za){var c=a.Za,d=c.ef,e=c.g,h=c.i,f=c.Ge,k=c.Ie,g=c.jb,l,p;if(we)var m;c.valid||w("lpf_btran: the factorization is not valid");if(we)for(m=new Float64Array(1+e),l=1;l<=e;l++)m[l]=b[l];for(l=1;l<=d+h;l++)g[l]=(p=k[l])<=e?b[p]:0;Ie(c.ia,1,g);Me(c,g,d,g);Ke(c.Qc,1,g,d);h=c.i;k=c.Od;
l=c.Nd;p=c.Wb;var q=c.Xb,r,n,t,y;for(r=1;r<=h;r++)if(0!=g[r+d])for(y=-1*g[r+d],n=k[r],t=n+l[r];n<t;n++)g[p[n]]+=y*q[n];Ge(c.ia,1,g);for(l=1;l<=e;l++)b[l]=g[f[l]];we&&Le(c,1,b,m)}}
function Ne(a,b,c,d,e,f){if(null!=a.gb)switch(Oe(a.gb,b,c,d,e,f)){case ze:return a.valid=0,a=pd;case Pe:return a.valid=0,a=se;case Qe:return a.valid=0,a=te;case Re:return a.valid=0,a=ue}else if(null!=a.Za){a:{var g=a.Za,h=g.ef,k=g.g;if(we)var l=g.Cf;var p=g.i,m=g.Md,q=g.Ld,r=g.Od,n=g.Nd,t=g.Ge,y=g.Fe,E=g.Ie,C=g.He,D=g.od,H=g.Wb,R=g.Xb,V=g.Gc,O=g.jb,Q=g.Gc,F,W,X;g.valid||w("lpf_update_it: the factorization is not valid");1<=b&&b<=k||w("lpf_update_it: j = "+b+"; column number out of range");if(p==g.K)g.valid=
0,b=LPF_ELIMIT;else{for(F=1;F<=k;F++)V[F]=0;for(X=1;X<=c;X++)F=d[e+X],1<=F&&F<=k||w("lpf_update_it: ind["+X+"] = "+F+"; row number out of range"),0!=V[F]&&w("lpf_update_it: ind["+X+"] = "+F+"; duplicate row index not allowed"),0==f[X]&&w("lpf_update_it: val["+X+"] = "+f[X]+"; zero element not allowed"),V[F]=f[X];if(we)for(F=1;F<=k;F++)l[(F-1)*k+b]=V[F];for(F=1;F<=h+p;F++)O[F]=(W=y[F])<=k?V[W]:0;for(F=1;F<=h+p;F++)Q[F]=0;Q[C[b]]=1;Ge(g.ia,0,O);Ie(g.ia,1,Q);if(g.Jd<D+h+h){F=g.Jd;c=g.od-1;d=g.Wb;for(e=
g.Xb;F<D+h+h;)F+=F;g.Jd=F;g.Wb=new Int32Array(1+F);g.Xb=new Float64Array(1+F);ga(g.Wb,1,d,1,c);ga(g.Xb,1,e,1,c);H=g.Wb;R=g.Xb}m[p+1]=D;for(F=1;F<=h;F++)0!=O[F]&&(H[D]=F,R[D]=O[F],D++);q[p+1]=D-g.od;g.od=D;r[p+1]=D;for(F=1;F<=h;F++)0!=Q[F]&&(H[D]=F,R[D]=Q[F],D++);n[p+1]=D-g.od;g.od=D;Je(g,O,0,O);Me(g,Q,0,Q);q=0;for(F=1;F<=h;F++)q-=Q[F]*O[F];m=g.Qc;D=q;F=m.K;q=m.i;c=m.Nb;d=m.v;e=m.s;if(Ce)var ca=m.l;n=m.ig;r=0;if(q==F)r=Se;else{m.i=++q;f=1;for(k=(f-1)*m.K+q;f<q;f++,k+=F)c[k]=0;k=1;for(f=(q-1)*m.K+k;k<
q;k++,f++)c[f]=0;for(f=c[(q-1)*m.K+q]=1;f<q;f++){H=0;k=1;for(l=(f-1)*m.K+1;k<q;k++,l++)H+=c[l]*O[k+h];d[Te(m,f,q)]=H}for(k=1;k<q;k++)n[k]=Q[e[k]+h];n[q]=D;e[q]=q;if(Ce){f=1;for(k=(f-1)*m.K+q;f<q;f++,k+=F)ca[k]=O[f+h];k=1;for(f=(q-1)*m.K+k;k<q;k++,f++)ca[f]=Q[k+h];ca[(q-1)*m.K+q]=D}for(O=1;O<q&&0==n[O];O++);switch(m.fg){case De:Q=m.i;ca=m.Nb;for(D=m.v;O<Q;O++){e=Te(m,O,O);c=(O-1)*m.K+1;f=(Q-1)*m.K+1;if(Math.abs(D[e])<Math.abs(n[O])){F=O;for(d=e;F<=Q;F++,d++)l=D[d],D[d]=n[F],n[F]=l;F=1;d=c;for(k=f;F<=
Q;F++,d++,k++)l=ca[d],ca[d]=ca[k],ca[k]=l}Math.abs(D[e])<Ue&&(D[e]=n[O]=0);if(0!=n[O]){l=n[O]/D[e];F=O+1;for(d=e+1;F<=Q;F++,d++)n[F]-=l*D[d];F=1;d=c;for(k=f;F<=Q;F++,d++,k++)ca[k]-=l*ca[d]}}Math.abs(n[Q])<Ue&&(n[Q]=0);D[Te(m,Q,Q)]=n[Q];break;case Fe:Ve(m,O,n)}F=m.K;O=m.i;Q=m.v;D=0;ca=1;for(n=Te(m,ca,ca);ca<=O;ca++,n+=F,F--)0!=Q[n]&&D++;m.pa=D;m.pa!=q&&(r=We);Ce&&Le(m,"scf_update_exp")}switch(r){case We:g.valid=0;b=Ee;break a}t[h+p+1]=y[h+p+1]=h+p+1;E[h+p+1]=C[h+p+1]=h+p+1;F=C[b];W=C[h+p+1];E[F]=h+
p+1;C[h+p+1]=F;E[W]=b;C[b]=W;g.i++;b=0}}switch(b){case Ee:return a.valid=0,a=pd;case LPF_ELIMIT:return a.valid=0,a=te}}a.hg++;return 0}
var Xe="!\"#$%&()/,.;?@_`'{}|~",Ye=exports.glp_read_lp=function(a,b,c){function d(a,b){throw Error(a.count+": "+b);}function e(a,b){x(a.count+": warning: "+b)}function f(a){var b;"\n"==a.l&&a.count++;b=a.Qg();0>b?"\n"==a.l?(a.count--,b=-1):(e(a,"missing final end of line"),b="\n"):"\n"!=b&&(0<=" \t\n\v\f\r".indexOf(b)?b=" ":ta(b)&&d(a,"invalid control character "+b.charCodeAt(0)));a.l=b}function g(a){a.h+=a.l;f(a)}function h(a,b){return a.toLowerCase()==b.toLowerCase()?1:0}function k(a){function b(){for(a.b=
Q;va(a.l)||0<=Xe.indexOf(a.l);)g(a);c&&(h(a.h,"minimize")?a.b=y:h(a.h,"minimum")?a.b=y:h(a.h,"min")?a.b=y:h(a.h,"maximize")?a.b=E:h(a.h,"maximum")?a.b=E:h(a.h,"max")?a.b=E:h(a.h,"subject")?" "==a.l&&(f(a),"t"==a.l.toLowerCase()&&(a.b=C,a.h+=" ",g(a),"o"!=a.l.toLowerCase()&&d(a,"keyword `subject to' incomplete"),g(a),ua(a.l)&&d(a,"keyword `"+a.h+a.l+"...' not recognized"))):h(a.h,"such")?" "==a.l&&(f(a),"t"==a.l.toLowerCase()&&(a.b=C,a.h+=" ",g(a),"h"!=a.l.toLowerCase()&&d(a,"keyword `such that' incomplete"),
g(a),"a"!=a.l.toLowerCase()&&d(a,"keyword `such that' incomplete"),g(a),"t"!=a.l.toLowerCase()&&d(a,"keyword `such that' incomplete"),g(a),ua(a.l)&&d(a,"keyword `"+a.h+a.l+"...' not recognized"))):h(a.h,"st")?a.b=C:h(a.h,"s.t.")?a.b=C:h(a.h,"st.")?a.b=C:h(a.h,"bounds")?a.b=D:h(a.h,"bound")?a.b=D:h(a.h,"general")?a.b=H:h(a.h,"generals")?a.b=H:h(a.h,"gen")?a.b=H:h(a.h,"integer")?a.b=R:h(a.h,"integers")?a.b=R:h(a.h,"int")?a.b=R:h(a.h,"binary")?a.b=V:h(a.h,"binaries")?a.b=V:h(a.h,"bin")?a.b=V:h(a.h,"end")&&
(a.b=O))}var c;a.b=-1;a.h="";for(a.value=0;;){for(c=0;" "==a.l;)f(a);if(-1==a.l)a.b=t;else if("\n"==a.l)if(f(a),ua(a.l))c=1,b();else continue;else if("\\"==a.l){for(;"\n"!=a.l;)f(a);continue}else if(ua(a.l)||"."!=a.l&&0<=Xe.indexOf(a.l))b();else if(wa(a.l)||"."==a.l){for(a.b=F;wa(a.l);)g(a);if("."==a.l)for(g(a),1!=a.h.length||wa(a.l)||d(a,"invalid use of decimal point");wa(a.l);)g(a);if("e"==a.l||"E"==a.l)for(g(a),"+"!=a.l&&"-"!=a.l||g(a),wa(a.l)||d(a,"numeric constant `"+a.h+"' incomplete");wa(a.l);)g(a);
a.value=Number(a.h);a.value==Number.NaN&&d(a,"numeric constant `"+a.h+"' out of range")}else"+"==a.l?(a.b=W,g(a)):"-"==a.l?(a.b=X,g(a)):":"==a.l?(a.b=ca,g(a)):"<"==a.l?(a.b=ka,g(a),"="==a.l&&g(a)):">"==a.l?(a.b=P,g(a),"="==a.l&&g(a)):"="==a.l?(a.b=u,g(a),"<"==a.l?(a.b=ka,g(a)):">"==a.l&&(a.b=P,g(a))):d(a,"character `"+a.l+"' not recognized");break}for(;" "==a.l;)f(a)}function l(a,b){var c=xb(a.Ka,b);if(0==c){c=Oa(a.Ka,1);Qa(a.Ka,c,b);if(a.K<c){var d=a.K,e=a.Z,f=a.j,g=a.ba,h=a.c,k=a.d;a.K+=a.K;a.Z=
new Int32Array(1+a.K);ga(a.Z,1,e,1,d);a.j=new Float64Array(1+a.K);ga(a.j,1,f,1,d);a.ba=new Int8Array(1+a.K);ha(a.ba,1,0,a.K);ga(a.ba,1,g,1,d);a.c=new Float64Array(1+a.K);ga(a.c,1,h,1,d);a.d=new Float64Array(1+a.K);ga(a.d,1,k,1,d)}a.c[c]=+s;a.d[c]=-s}return c}function p(a){for(var b,c=0,e,f,g;;)if(a.b==W?(f=1,k(a)):a.b==X?(f=-1,k(a)):f=1,a.b==F?(g=a.value,k(a)):g=1,a.b!=Q&&d(a,"missing variable name"),b=l(a,a.h),a.ba[b]&&d(a,"multiple use of variable `"+a.h+"' not allowed"),c++,a.Z[c]=b,a.j[c]=f*g,
a.ba[b]=1,k(a),a.b!=W&&a.b!=X){for(b=1;b<=c;b++)a.ba[a.Z[b]]=0;e=0;for(b=1;b<=c;b++)0!=a.j[b]&&(e++,a.Z[e]=a.Z[b],a.j[e]=a.j[b]);break}return e}function m(a,b,c){a.c[b]!=+s&&e(a,"lower bound of variable `"+nb(a.Ka,b)+"' redefined");a.c[b]=c}function q(a,b,c){a.d[b]!=-s&&e(a,"upper bound of variable `"+nb(a.Ka,b)+"' redefined");a.d[b]=c}function r(a){var b,c,e,f;for(k(a);a.b==W||a.b==X||a.b==F||a.b==Q;)a.b==W||a.b==X?(c=1,f=a.b==W?1:-1,k(a),a.b==F?(e=f*a.value,k(a)):h(a.h,"infinity")||h(a.h,"inf")?
(0<f&&d(a,"invalid use of `+inf' as lower bound"),e=-s,k(a)):d(a,"missing lower bound")):a.b==F?(c=1,e=a.value,k(a)):c=0,c&&(a.b!=ka&&d(a,"missing `<', `<=', or `=<' after lower bound"),k(a)),a.b!=Q&&d(a,"missing variable name"),b=l(a,a.h),c&&m(a,b,e),k(a),a.b==ka?(k(a),a.b==W||a.b==X?(f=a.b==W?1:-1,k(a),a.b==F?(q(a,b,f*a.value),k(a)):h(a.h,"infinity")||h(a.h,"inf")?(0>f&&d(a,"invalid use of `-inf' as upper bound"),q(a,b,+s),k(a)):d(a,"missing upper bound")):a.b==F?(q(a,b,a.value),k(a)):d(a,"missing upper bound")):
a.b==P?(c&&d(a,"invalid bound definition"),k(a),a.b==W||a.b==X?(f=a.b==W?1:-1,k(a),a.b==F?(m(a,b,f*a.value),k(a)):h(a.h,"infinity")||0==h(a.h,"inf")?(0<f&&d(a,"invalid use of `+inf' as lower bound"),m(a,b,-s),k(a)):d(a,"missing lower bound")):a.b==F?(m(a,b,a.value),k(a)):d(a,"missing lower bound")):a.b==u?(c&&d(a,"invalid bound definition"),k(a),a.b==W||a.b==X?(f=a.b==W?1:-1,k(a),a.b==F?(m(a,b,f*a.value),q(a,b,f*a.value),k(a)):d(a,"missing fixed value")):a.b==F?(m(a,b,a.value),q(a,b,a.value),k(a)):
d(a,"missing fixed value")):h(a.h,"free")?(c&&d(a,"invalid bound definition"),m(a,b,-s),q(a,b,+s),k(a)):c||d(a,"invalid bound definition")}function n(a){var b,c;a.b==H?(c=0,k(a)):a.b==R?(c=0,k(a)):a.b==V&&(c=1,k(a));for(;a.b==Q;)b=l(a,a.h),Hc(a.Ka,b,Fc),c&&(m(a,b,0),q(a,b,1)),k(a)}var t=0,y=1,E=2,C=3,D=4,H=5,R=6,V=7,O=8,Q=9,F=10,W=11,X=12,ca=13,ka=14,P=15,u=16,z={};x("Reading problem data");null==b&&(b={});z.Ka=a;z.p=b;z.Qg=c;z.count=0;z.l="\n";z.b=t;z.h="";z.value=0;z.K=100;z.Z=new Int32Array(1+
z.K);z.j=new Float64Array(1+z.K);z.ba=new Int8Array(1+z.K);ha(z.ba,1,0,z.K);z.c=new Float64Array(1+z.K);z.d=new Float64Array(1+z.K);db(a);vb(a);k(z);z.b!=y&&z.b!=E&&d(z,"`minimize' or `maximize' keyword missing");(function(a){var b,c;a.b==y?Fa(a.Ka,za):a.b==E&&Fa(a.Ka,Ea);k(a);a.b==Q&&":"==a.l?(Da(a.Ka,a.h),k(a),k(a)):Da(a.Ka,"obj");c=p(a);for(b=1;b<=c;b++)Xa(a.Ka,a.Z[b],a.j[b])})(z);z.b!=C&&d(z,"constraints section missing");(function(a){var b,c,e;for(k(a);b=La(a.Ka,1),a.b==Q&&":"==a.l?(0!=wb(a.Ka,
a.h)&&d(a,"constraint `"+a.h+"' multiply defined"),Pa(a.Ka,b,a.h),k(a),k(a)):Pa(a.Ka,b,"r."+a.count),c=p(a),Ya(a.Ka,b,c,a.Z,a.j),a.b==ka?(e=Ta,k(a)):a.b==P?(e=Sa,k(a)):a.b==u?(e=B,k(a)):d(a,"missing constraint sense"),a.b==W?(c=1,k(a)):a.b==X?(c=-1,k(a)):c=1,a.b!=F&&d(a,"missing right-hand side"),Va(a.Ka,b,e,c*a.value,c*a.value),"\n"!=a.l&&-1!=a.l&&d(a,"invalid symbol(s) beyond right-hand side"),k(a),a.b==W||a.b==X||a.b==F||a.b==Q;);})(z);for(z.b==D&&r(z);z.b==H||z.b==R||z.b==V;)n(z);z.b==O?k(z):
z.b==t?e(z,"keyword `end' missing"):d(z,"symbol "+z.h+" in wrong position");z.b!=t&&d(z,"extra symbol(s) detected beyond `end'");var L,v;for(b=1;b<=a.i;b++)L=z.c[b],v=z.d[b],L==+s&&(L=0),v==-s&&(v=+s),c=L==-s&&v==+s?Ka:v==+s?Sa:L==-s?Ta:L!=v?I:B,Wa(z.Ka,b,c,L,v);x(a.g+" row"+(1==a.g?"":"s")+", "+a.i+" column"+(1==a.i?"":"s")+", "+a.L+" non-zero"+(1==a.L?"":"s"));0<Jc(a)&&(b=Jc(a),c=Kc(a),1==b?0==c?x("One variable is integer"):x("One variable is binary"):(L=b+" integer variables, ",x((0==c?L+"none":
1==c?L+"one":c==b?L+"all":L+c)+" of which "+(1==c?"is":"are")+" binary")));x(z.count+" lines were read");yb(a);$a(a);return 0};
exports.glp_write_lp=function(a,b,c){function d(a){if("."==a[0]||wa(a[0]))return 1;for(var b=0;b<a.length;b++)if(!va(a[b])&&0>Xe.indexOf(a[b]))return 1;return 0}function e(a){for(var b=0;b<a.length;b++)" "==a[b]?a[b]="_":"-"==a[b]?a[b]="~":"["==a[b]?a[b]="(":"]"==a[b]&&(a[b]=")")}function f(a,b){var c;c=0==b?ib(a.Ka):mb(a.Ka,b);if(null==c)return 0==b?"obj":"r_"+b;e(c);return d(c)?0==b?"obj":"r_"+b:c}function g(a,b){var c=nb(a.Ka,b);if(null==c)return"x_"+b;e(c);return d(c)?"x_"+b:c}function h(){c("End");
r++;x(r+" lines were written");return 0}var k={},l,p,m,q,r,n;x("Writing problem data");null==b&&(b={});k.Ka=a;k.p=b;r=0;c("\\* Problem: "+(null==a.name?"Unknown":a.name)+" *\\");r++;c("");r++;if(!(0<a.g&&0<a.i))return x("Warning: problem has no rows/columns"),c("\\* WARNING: PROBLEM HAS NO ROWS/COLUMNS *\\"),r++,c(""),r++,h();a.dir==za?(c("Minimize"),r++):a.dir==Ea&&(c("Maximize"),r++);b=f(k,0);n=" "+b+":";p=0;for(m=1;m<=a.i;m++)if(l=a.f[m],0!=l.u||null==l.k)p++,b=g(k,m),q=0==l.u?" + 0 "+b:1==l.u?
" + "+b:-1==l.u?" - "+b:0<l.u?" + "+l.u+" "+b:" - "+-l.u+" "+b,72<n.length+q.length&&(c(n),n="",r++),n+=q;0==p&&(q=" 0 "+g(k,1),n+=q);c(n);r++;0!=a.ha&&(c("\\* constant term = "+a.ha+" *\\"),r++);c("");r++;c("Subject To");r++;for(m=1;m<=a.g;m++)if(l=a.n[m],l.type!=Ka){b=f(k,m);n=" "+b+":";for(p=l.k;null!=p;p=p.B)b=g(k,p.f.C),q=1==p.j?" + "+b:-1==p.j?" - "+b:0<p.j?" + "+p.j+" "+b:" - "+-p.j+" "+b,72<n.length+q.length&&(c(n),n="",r++),n+=q;l.type==I?(q=" - ~r_"+m,72<n.length+q.length&&(c(n),n="",r++),
n+=q):null==l.k&&(q=" 0 "+g(k,1),n+=q);if(l.type==Sa)q=" >= "+l.c;else if(l.type==Ta)q=" <= "+l.d;else if(l.type==I||l.type==B)q=" = "+l.c;72<n.length+q.length&&(c(n),n="",r++);n+=q;c(n);r++}c("");r++;q=0;for(m=1;m<=a.g;m++)l=a.n[m],l.type==I&&(q||(c("Bounds"),q=1,r++),c(" 0 <= ~r_"+m+" <= "+(l.d-l.c)),r++);for(m=1;m<=a.i;m++)if(l=a.f[m],l.type!=Sa||0!=l.c)q||(c("Bounds"),q=1,r++),b=g(k,m),l.type==Ka?(c(" "+b+" free"),r++):l.type==Sa?(c(" "+b+" >= "+l.c),r++):l.type==Ta?(c(" -Inf <= "+b+" <= "+l.d),
r++):l.type==I?(c(" "+l.c+" <= "+b+" <= "+l.d),r++):l.type==B&&(c(" "+b+" = "+l.c),r++);q&&c("");r++;q=0;for(m=1;m<=a.i;m++)l=a.f[m],l.kind!=Ma&&(q||(c("Generals"),q=1,r++),c(" "+g(k,m)),r++);q&&(c(""),r++);return h()};exports.glp_read_lp_from_string=function(a,b,c){var d=0;return Ye(a,b,function(){return d<c.length?c[d++]:-1})};var ze=1,Be=2,Pe=3,Qe=4,Re=5;
function He(a,b,c){var d=a.Pb,e=a.Ze,f=a.af,g=a.$e,h=a.ia.wb,k=a.ia.xb,l,p,m;a.valid||w("fhv_h_solve: the factorization is not valid");if(b)for(b=d;1<=b;b--){if(a=e[b],m=c[a],0!=m)for(l=f[b],p=l+g[b]-1;l<=p;l++)c[h[l]]-=k[l]*m}else for(b=1;b<=d;b++){a=e[b];m=c[a];l=f[b];for(p=l+g[b]-1;l<=p;l++)m-=k[l]*c[h[l]];c[a]=m}}
function Oe(a,b,c,d,e,f){var g=a.g,h=a.ia,k=h.Fc,l=h.Ec,p=h.pd,m=h.Af,q=h.Dc,r=h.Cc,n=h.Rc,t=h.kb,y=h.vb,E=h.sf,C=h.me,D=h.wb,H=h.xb,R=h.ze,V=h.Mb,O=a.Ze,Q=a.af,F=a.$e,W=a.je,X=a.ie,ca=a.ug,ka=a.vg,P=a.ic,u,z;a.valid||w("fhv_update_it: the factorization is not valid");1<=b&&b<=g||w("fhv_update_it: j = "+b+"; column number out of range");if(a.Pb==a.$d)return a.valid=0,a=Qe;for(u=1;u<=g;u++)ka[u]=0;for(z=1;z<=c;z++)u=d[e+z],1<=u&&u<=g||w("fhv_update_it: ind["+z+"] = "+u+"; row number out of range"),
0!=ka[u]&&w("fhv_update_it: ind["+z+"] = "+u+"; duplicate row index not allowed"),0==f[z]&&w("fhv_update_it: val["+z+"] = "+f[z]+"; zero element not allowed"),ka[u]=f[z];a.ia.kb=W;a.ia.vb=X;Ge(a.ia,0,ka);a.ia.kb=t;a.ia.vb=y;He(a,0,ka);c=0;for(u=1;u<=g;u++)e=ka[u],0==e||Math.abs(e)<V||(c++,ca[c]=u,ka[c]=e);X=q[b];for(W=X+r[b]-1;X<=W;X++){u=D[X];f=k[u];for(z=f+l[u]-1;D[f]!=b;f++);D[f]=D[z];H[f]=H[z];l[u]--}h.Qb-=r[b];r[b]=0;e=E[b];d=0;for(z=1;z<=c;z++){u=ca[z];if(l[u]+1>p[u]&&Ze(h,u,l[u]+10))return a.valid=
0,h.Va=h.Ga+h.Ga,a=Re;f=k[u]+l[u];D[f]=b;H[f]=ka[z];l[u]++;d<y[u]&&(d=y[u])}if(n[b]<c&&$e(h,b,c))return a.valid=0,h.Va=h.Ga+h.Ga,a=Re;X=q[b];ga(D,X,ca,1,c);ga(H,X,ka,1,c);r[b]=c;h.Qb+=c;if(e>d)return a.valid=0,a=ze;u=t[e];b=C[e];for(z=e;z<d;z++)t[z]=t[z+1],y[t[z]]=z,C[z]=C[z+1],E[C[z]]=z;t[d]=u;y[u]=d;C[d]=b;E[b]=d;for(b=1;b<=g;b++)R[b]=0;f=k[u];for(z=f+l[u]-1;f<=z;f++){b=D[f];R[b]=H[f];X=q[b];for(W=X+r[b]-1;D[X]!=u;X++);D[X]=D[W];H[X]=H[W];r[b]--}h.Qb-=l[u];l[u]=0;a.Pb++;O[a.Pb]=u;F[a.Pb]=0;if(h.Ma-
h.Fa<d-e&&(af(h),h.Ma-h.Fa<d-e))return a.valid=h.valid=0,h.Va=h.Ga+h.Ga,a=Re;for(z=e;z<d;z++)if(b=t[z],c=C[z],0!=R[c]){y=R[c]/m[b];E=k[b];for(c=E+l[b]-1;E<=c;E++)R[D[E]]-=y*H[E];h.Ma--;D[h.Ma]=b;H[h.Ma]=y;F[a.Pb]++}0==F[a.Pb]?a.Pb--:(Q[a.Pb]=h.Ma,a.ag+=F[a.Pb]);m[u]=R[C[d]];c=0;for(z=d+1;z<=g;z++)if(b=C[z],e=R[b],!(Math.abs(e)<V)){if(r[b]+1>n[b]&&$e(h,b,r[b]+10))return a.valid=0,h.Va=h.Ga+h.Ga,a=Re;X=q[b]+r[b];D[X]=u;H[X]=e;r[b]++;c++;ca[c]=b;ka[c]=e}if(p[u]<c&&Ze(h,u,c))return a.valid=0,h.Va=h.Ga+
h.Ga,a=Re;f=k[u];ga(D,f,ca,1,c);ga(H,f,ka,1,c);l[u]=c;h.Qb+=c;e=0;u=t[d];f=k[u];for(z=f+l[u]-1;f<=z;f++)e<Math.abs(H[f])&&(e=Math.abs(H[f]));b=C[d];X=q[b];for(W=X+r[b]-1;X<=W;X++)e<Math.abs(H[X])&&(e=Math.abs(H[X]));return Math.abs(m[u])<P*e?(a.valid=0,a=Pe):0}
function ic(a){function b(a,b,c,d,k,l){var p,m,q,r,n,t,y,E,C,D,H,R,V,O,Q=0;0<a&&0<b||w("triang: m = "+a+"; n = "+b+"; invalid dimension");p=new Int32Array(1+(a>=b?a:b));m=new Int32Array(1+a);q=new Int32Array(1+b);r=new Int32Array(1+a);n=new Int32Array(1+a);y=new Int32Array(1+b);E=new Int32Array(1+b);for(D=1;D<=b;D++)H=d(c,-D,p),y[D]=m[H],m[H]=D;for(H=t=0;H<=a;H++)for(D=m[H];0!=D;D=y[D])E[D]=t,t=D;H=0;for(D=t;0!=D;D=E[D])y[D]=H,H=D;for(C=1;C<=a;C++)m[C]=H=d(c,+C,p),r[C]=0,n[C]=q[H],0!=n[C]&&(r[n[C]]=
C),q[H]=C;for(C=1;C<=a;C++)k[C]=0;for(D=1;D<=b;D++)l[D]=0;R=1;for(V=b;R<=V;){C=q[1];if(0!=C){D=0;for(O=d(c,+C,p);1<=O;O--)H=p[O],0==l[H]&&(D=H);k[C]=l[D]=R;R++;Q++}else D=t,l[D]=V,V--;0==y[D]?t=E[D]:E[y[D]]=E[D];0!=E[D]&&(y[E[D]]=y[D]);for(O=d(c,-D,p);1<=O;O--)C=p[O],H=m[C],0==r[C]?q[H]=n[C]:n[r[C]]=n[C],0!=n[C]&&(r[n[C]]=r[C]),m[C]=--H,r[C]=0,n[C]=q[H],0!=n[C]&&(r[n[C]]=C),q[H]=C}for(C=1;C<=a;C++)0==k[C]&&(k[C]=R++);for(D=1;D<=b;D++);for(r=1;r<=a;r++)m[r]=0;for(C=1;C<=a;C++)r=k[C],m[r]=C;for(H=1;H<=
b;H++)q[H]=0;for(D=1;D<=b;D++)H=l[D],q[H]=D;for(r=1;r<=Q;r++)for(C=m[r],O=d(c,+C,p);1<=O;O--);return Q}function c(a,b,c){var d=kb(a);lb(a);var k,l,p,m=0;if(0<b){k=+b;p=ub(a,k,c,null);for(b=1;b<=p;b++)bf(a,c[b],function(a){a!=cf&&(c[++m]=d+c[b])});df(a,k,function(a){a!=cf&&(c[++m]=k)})}else l=-b,p=function(b){b!=cf&&(l<=d?c[++m]=l:m=gb(a,l-d,c,null))},l<=d?df(a,l,p):bf(a,l-d,p);return m}function d(a){var d=kb(a),g=lb(a),h,k,l,p,m,q,r,n=new Int32Array(1+d+g);x("Constructing initial basis...");if(0==
d||0==g)Hb(a);else{m=new Int32Array(1+d);k=new Int32Array(1+d+g);p=b(d,d+g,a,c,m,k);3<=ef(a)&&x("Size of triangular part = "+p+"");q=new Int32Array(1+d);r=new Int32Array(1+d+g);for(h=1;h<=d;h++)q[m[h]]=h;for(h=1;h<=d+g;h++)r[k[h]]=h;for(l=1;l<=d+g;l++)n[l]=-1;for(k=1;k<=p;k++)h=r[k],n[h]=ff;for(k=p+1;k<=d;k++)h=q[k],n[h]=ff;for(l=1;l<=d+g;l++)n[l]!=ff&&(p=function(a,b,c){switch(a){case gf:n[l]=hf;break;case jf:n[l]=kf;break;case lf:n[l]=mf;break;case nf:n[l]=Math.abs(b)<=Math.abs(c)?kf:mf;break;case cf:n[l]=
of}},l<=d?df(a,l,p):bf(a,l-d,p));for(l=1;l<=d+g;l++)l<=d?Fb(a,l,n[l]-ff+A):Gb(a,l-d,n[l]-ff+A)}}0==a.g||0==a.i?Hb(a):d(a)}
function Mc(a,b){var c,d;if(0==a.Sc)for(c=a.fe,d=a.ya,a.fe=0==c?20:c+c,a.ya=Array(1+a.fe),ia(a.ya,0,1+a.fe),null!=d&&ga(a.ya,1,d,1,c),d=a.fe;d>c;d--)a.ya[d].rb=null,a.ya[d].e=a.Sc,a.Sc=d;d=a.Sc;a.Sc=a.ya[d].e;a.ya[d].e=0;c=d;d={};a.ya[c].rb=d;d.s=c;d.R=b;d.La=null==b?0:b.La+1;d.count=0;d.Na=null;d.zc=null;d.ec=null;d.eg=0;d.rc=null==b?a.A.dir==za?-s:+s:b.rc;d.bound=null==b?a.A.dir==za?-s:+s:b.bound;d.Tc=0;d.tg=0;d.Ag=0;d.Zc=0;d.Rd=0;d.data=0==a.p.Me?null:{};d.ja=null;d.ca=a.Xa;d.e=null;null==a.head?
a.head=d:a.Xa.e=d;a.Xa=d;a.Pd++;a.Zf++;a.Jg++;null!=b&&b.count++;return d}
function pf(a,b){var c=a.A,d,e,f,g;d=a.ya[b].rb;a.N=d;e=a.ya[1].rb;if(d!=e){for(d.ja=null;null!=d;d=d.R)null!=d.R&&(d.R.ja=d);for(d=e;null!=d;d=d.ja){var h=c.g;e=c.i;if(null==d.ja){a.Fg=h;a.Gg<h+e&&(f=h+e+100,a.Gg=f,a.qf=new Int8Array(1+f),a.of=new Float64Array(1+f),a.rf=new Float64Array(1+f),a.pf=new Int8Array(1+f));for(f=1;f<=h;f++)g=c.n[f],a.qf[f]=g.type,a.of[f]=g.c,a.rf[f]=g.d,a.pf[f]=g.m;for(f=1;f<=e;f++)g=c.f[f],a.qf[c.g+f]=g.type,a.of[c.g+f]=g.c,a.rf[c.g+f]=g.d,a.pf[c.g+f]=g.m}for(f=d.Na;null!=
f;f=f.e)f.pc<=h?Va(c,f.pc,f.type,f.c,f.d):Wa(c,f.pc-h,f.type,f.c,f.d);for(f=d.zc;null!=f;f=f.e)f.pc<=h?Fb(c,f.pc,f.m):Gb(c,f.pc-h,f.m);if(null!=d.ec){var k,l,h=new Int32Array(1+e);l=new Float64Array(1+e);for(e=d.ec;null!=e;e=e.e){f=La(c,1);Pa(c,f,e.name);c.n[f].La=d.La;c.n[f].origin=e.origin;c.n[f].qc=e.qc;Va(c,f,e.type,e.c,e.d);k=0;for(g=e.k;null!=g;g=g.e)k++,h[k]=g.C,l[k]=g.j;Ya(c,f,k,h,l);zb(c,f,e.ma);Fb(c,f,e.m)}}}for(d=a.N;null!=d.Na;)f=d.Na,d.Na=f.e;for(;null!=d.zc;)f=d.zc,d.zc=f.e;for(;null!=
d.ec;)for(e=d.ec,d.ec=e.e;null!=e.k;)g=e.k,e.k=g.e}}
function qf(a){var b=a.A,c=b.g,d=b.i,e=a.N,f,g,h;if(null==e.R)for(a.Ig=c,a.se=new Int8Array(1+c+d),a.qe=new Float64Array(1+c+d),a.te=new Float64Array(1+c+d),a.re=new Int8Array(1+c+d),f=1;f<=c+d;f++)h=f<=c?b.n[f]:b.f[f-c],a.se[f]=h.type,a.qe[f]=h.c,a.te[f]=h.d,a.re[f]=h.m;else{var k=a.Ig,l=a.Fg;for(f=1;f<=l+d;f++){var p,m,q,r,n,t;p=a.qf[f];q=a.of[f];r=a.rf[f];g=a.pf[f];h=f<=l?b.n[f]:b.f[f-l];m=h.type;n=h.c;t=h.d;h=h.m;if(p!=m||q!=n||r!=t)p={},p.pc=f,p.type=m,p.c=n,p.d=t,p.e=e.Na,e.Na=p;g!=h&&(g={},
g.pc=f,g.m=h,g.e=e.zc,e.zc=g)}if(l<c)for(m=new Int32Array(1+d),n=new Float64Array(1+d),g=c;g>l;g--){h=b.n[g];t={};f=mb(b,g);t.name=null==f?null:f;t.type=h.type;t.c=h.c;t.d=h.d;t.k=null;p=ub(b,g,m,n);for(f=1;f<=p;f++)q={},q.C=m[f],q.j=n[f],q.e=t.k,t.k=q;t.ma=h.ma;t.m=h.m;t.e=e.ec;e.ec=t}if(c!=k){c-=k;e=new Int32Array(1+c);for(g=1;g<=c;g++)e[g]=k+g;ab(b,c,e)}c=b.g;for(g=1;g<=c;g++)Va(b,g,a.se[g],a.qe[g],a.te[g]),Fb(b,g,a.re[g]);for(k=1;k<=d;k++)Wa(b,k,a.se[c+k],a.qe[c+k],a.te[c+k]),Gb(b,k,a.re[c+k])}a.N=
null}function rf(a,b,c){var d;b=a.ya[b].rb;null==b.ca?a.head=b.e:b.ca.e=b.e;null==b.e?a.Xa=b.ca:b.e.ca=b.ca;b.ca=b.e=null;a.Pd--;for(d=1;2>=d;d++)c[d]=Mc(a,b).s}
function sf(a,b){var c;c=a.ya[b].rb;null==c.ca?a.head=c.e:c.ca.e=c.e;null==c.e?a.Xa=c.ca:c.e.ca=c.ca;c.ca=c.e=null;for(a.Pd--;;){for(var d;null!=c.Na;)d=c.Na,c.Na=d.e;for(;null!=c.zc;)d=c.zc,c.zc=d.e;for(;null!=c.ec;){d=c.ec;for(d.name=null;null!=d.k;)d.k=d.k.e;c.ec=d.e}b=c.s;a.ya[b].rb=null;a.ya[b].e=a.Sc;a.Sc=b;c=c.R;a.Zf--;if(null!=c&&(c.count--,0==c.count))continue;break}}
function tf(a,b,c){var d=a.A,e=d.g,f,g,h,k,l=a.Bg,p=a.Tg,m,q;xc(d);Ib(d);a=d.f[b].r;b=Bd(d,e+b,l,p);for(f=-1;1>=f;f+=2)if(h=l,g=Fd(d,b,h,p,f,1E-9),g=0==g?0:h[g],0==g)d.dir==za?0>f?m=+s:q=+s:d.dir==Ea&&(0>f?m=-s:q=-s);else{for(h=1;h<=b&&l[h]!=g;h++);h=p[h];g<=e?(k=d.n[g].m,g=d.n[g].J):(k=d.f[g-e].m,g=d.f[g-e].J);if(d.dir==za){if(k==G&&0>g||k==Ua&&0<g||k==Ra)g=0}else d.dir==Ea&&(k==G&&0<g||k==Ua&&0>g||k==Ra)&&(g=0);k=(0>f?Math.floor(a):Math.ceil(a))-a;k/=h;h=g*k;0>f?m=d.aa+h:q=d.aa+h}c(m,q)}
function uf(a,b){var c=a.A,d=c.i,e,f,g,h=a.Bg,k;g=0;k=c.ha;e=0;for(f=1;f<=d;f++){var l=c.f[f];if(0!=l.u)if(l.type==B)k+=l.u*l.r;else{if(l.kind!=Fc||l.u!=Math.floor(l.u))return b;2147483647>=Math.abs(l.u)?h[++g]=Math.abs(l.u)|0:e=1}}if(0==e){if(0==g)return b;d=0;for(e=1;e<=g;e++){if(1==e)d=h[1];else for(f=h[e],l=void 0;0<f;)l=d%f,d=f,f=l;if(1==d)break}e=d}c.dir==za?b!=+s&&(c=(b-k)/e,c>=Math.floor(c)+0.001&&(c=Math.ceil(c),b=e*c+k)):c.dir==Ea&&b!=-s&&(c=(b-k)/e,c<=Math.ceil(c)-0.001&&(c=Math.floor(c),
b=e*c+k));return b}function vf(a,b){var c=a.A,d=1,e;if(c.za==dc)switch(e=a.p.we*(1+Math.abs(c.ta)),c.dir){case za:b>=c.ta-e&&(d=0);break;case Ea:b<=c.ta+e&&(d=0)}else switch(c.dir){case za:b==+s&&(d=0);break;case Ea:b==-s&&(d=0)}return d}function wf(a){var b=null;switch(a.A.dir){case za:for(a=a.head;null!=a;a=a.e)if(null==b||b.bound>a.bound)b=a;break;case Ea:for(a=a.head;null!=a;a=a.e)if(null==b||b.bound<a.bound)b=a}return null==b?0:b.s}
var xf=exports.glp_ios_relative_gap=function(a){var b=a.A,c;b.za==dc?(b=b.ta,c=wf(a),0==c?a=0:(a=a.ya[c].rb.bound,a=Math.abs(b-a)/(Math.abs(b)+2.220446049250313E-16))):a=s;return a};function yf(a){var b=a.A,c=new kc;switch(a.p.o){case lc:c.o=lc;break;case Lb:c.o=Lb;break;case fc:case Wb:c.o=fc;break;case mc:c.o=Wb}c.cb=Qb;c.fb=a.p.o<mc?a.p.fb:0;if(b.za==dc)switch(a.A.dir){case za:c.jf=b.ta;break;case Ea:c.hf=b.ta}b=sc(b,c);a.N.eg++;return b}
function Oc(a){for(;null!=a.head;){var b=a.head;for(a.head=b.e;null!=b.k;)b.k=b.k.e}a.size=0;a.head=a.Xa=null;a.fh=0;a.N=null}
function zf(a,b){function c(a,b,c,d,e){var f,g,h;g=h=0;for(f=1;f<=a;f++)if(0<b[f])if(c[f]==-s)if(0==g)g=f;else{h=-s;g=0;break}else h+=b[f]*c[f];else if(0>b[f])if(d[f]==+s)if(0==g)g=f;else{h=-s;g=0;break}else h+=b[f]*d[f];e.Wd=h;e.Uf=g;g=h=0;for(f=1;f<=a;f++)if(0<b[f])if(d[f]==+s)if(0==g)g=f;else{h=+s;g=0;break}else h+=b[f]*d[f];else if(0>b[f])if(c[f]==-s)if(0==g)g=f;else{h=+s;g=0;break}else h+=b[f]*c[f];e.Vd=h;e.Tf=g}function d(a,b){b(0==a.Uf?a.Wd:-s,0==a.Tf?a.Vd:+s)}function e(a,b,c,d,e,f,g,h){var k,
l,m,n;c==-s||a.Vd==+s?k=-s:0==a.Tf?0<b[g]?k=c-(a.Vd-b[g]*f[g]):0>b[g]&&(k=c-(a.Vd-b[g]*e[g])):k=a.Tf==g?c-a.Vd:-s;d==+s||a.Wd==-s?l=+s:0==a.Uf?0<b[g]?l=d-(a.Wd-b[g]*e[g]):0>b[g]&&(l=d-(a.Wd-b[g]*f[g])):l=a.Uf==g?d-a.Wd:+s;1E-6>Math.abs(b[g])?(m=-s,n=+s):0<b[g]?(m=k==-s?-s:k/b[g],n=l==+s?+s:l/b[g]):0>b[g]&&(m=l==+s?-s:l/b[g],n=k==-s?+s:k/b[g]);h(m,n)}function f(a,b,c,e,f){var g=0,h=b[c],k=e[f],l=null,m=null;d(a,function(a,b){l=a;m=b});if(h!=-s&&(a=0.001*(1+Math.abs(h)),m<h-a)||k!=+s&&(a=0.001*(1+Math.abs(k)),
l>k+a))return 1;h!=-s&&(a=1E-12*(1+Math.abs(h)),l>h-a&&(b[c]=-s));k!=+s&&(a=1E-12*(1+Math.abs(k)),m<k+a&&(e[f]=+s));return g}function g(a,b,c,d,f,g,h,k,l){var m=0,n,q,p=null,r=null;n=f[k];q=g[k];e(a,b,c,d,f,g,k,function(a,b){p=a;r=b});h&&(p!=-s&&(p=0.001>p-Math.floor(p)?Math.floor(p):Math.ceil(p)),r!=+s&&(r=0.001>Math.ceil(r)-r?Math.ceil(r):Math.floor(r)));if(n!=-s&&(a=0.001*(1+Math.abs(n)),r<n-a)||q!=+s&&(a=0.001*(1+Math.abs(q)),p>q+a))return 1;p!=-s&&(a=0.001*(1+Math.abs(p)),n<p-a&&(n=p));r!=+s&&
(a=0.001*(1+Math.abs(r)),q>r+a&&(q=r));n!=-s&&q!=+s&&(a=Math.abs(n),b=Math.abs(q),n>q-1E-10*(1+(a<=b?a:b))&&(n==f[k]?q=n:q==g[k]?n=q:a<=b?q=n:n=q));l(n,q);return m}function h(a,b,c,d,e){var f,g=0;b<d&&(a||b==-s?g++:(f=c==+s?1+Math.abs(b):1+(c-b),d-b>=0.25*f&&g++));c>e&&(a||c==+s?g++:(f=b==-s?1+Math.abs(c):1+(c-b),c-e>=0.25*f&&g++));return g}var k=a.A,l=k.g,p=k.i,m,q,r,n=0,t,y,E,C;t=new Float64Array(1+l);y=new Float64Array(1+l);switch(k.za){case Aa:t[0]=-s;y[0]=+s;break;case dc:switch(k.dir){case za:t[0]=
-s;y[0]=k.ta-k.ha;break;case Ea:t[0]=k.ta-k.ha,y[0]=+s}}for(m=1;m<=l;m++)t[m]=pb(k,m),y[m]=qb(k,m);E=new Float64Array(1+p);C=new Float64Array(1+p);for(m=1;m<=p;m++)E[m]=sb(k,m),C[m]=tb(k,m);q=l+1;r=new Int32Array(1+q);for(m=1;m<=q;m++)r[m]=m-1;if(function(a,b,d,e,k,l,m,n){var q=a.g,p=a.i,r={},t,u,E=0,C,v,y,M,ba,J,ea,fa;C=new Int32Array(1+p);v=new Int32Array(1+q+1);y=new Int32Array(1+q+1);M=new Int32Array(1+q+1);ba=new Float64Array(1+p);J=new Float64Array(1+p);ea=new Float64Array(1+p);u=0;for(t=1;t<=
l;t++)q=m[t],v[++u]=q,y[q]=1;for(;0<u;)if(q=v[u--],y[q]=0,M[q]++,b[q]!=-s||d[q]!=+s){l=0;if(0==q)for(m=1;m<=p;m++)fa=a.f[m],0!=fa.u&&(l++,C[l]=m,ba[l]=fa.u);else for(m=a.n[q].k;null!=m;m=m.B)l++,C[l]=m.f.C,ba[l]=m.j;for(t=1;t<=l;t++)m=C[t],J[t]=e[m],ea[t]=k[m];c(l,ba,J,ea,r);if(f(r,b,q,d,q)){E=1;break}if(b[q]!=-s||d[q]!=+s)for(t=1;t<=l;t++){var sa,K=null,oa=null;m=C[t];fa=a.f[m];sa=fa.kind!=Ma;if(g(r,ba,b[q],d[q],J,ea,sa,t,function(a,b){K=a;oa=b}))return E=1;sa=h(sa,e[m],k[m],K,oa);e[m]=K;k[m]=oa;
if(0<sa)for(m=fa.k;null!=m;m=m.I)fa=m.n.ea,M[fa]>=n||b[fa]==-s&&d[fa]==+s||0!=y[fa]||(v[++u]=fa,y[fa]=1)}}return E}(k,t,y,E,C,q,r,b))return 1;for(m=1;m<=l;m++)zc(k,m)==A&&(t[m]==-s&&y[m]==+s?Va(k,m,Ka,0,0):y[m]==+s?Va(k,m,Sa,t[m],0):t[m]==-s&&Va(k,m,Ta,0,y[m]));for(m=1;m<=p;m++)Wa(k,m,E[m]==-s&&C[m]==+s?Ka:C[m]==+s?Sa:E[m]==-s?Ta:E[m]!=C[m]?I:B,E[m],C[m]);return n}
function Nc(a){function b(a,b){var c,d,e,f;d=a.A.za==dc?String(a.A.ta):"not found yet";c=wf(a);0==c?e="tree is empty":(c=a.ya[c].rb.bound,e=c==-s?"-inf":c==+s?"+inf":c);a.A.dir==za?f=">=":a.A.dir==Ea&&(f="<=");c=xf(a);x("+"+a.A.$+": "+(b?">>>>>":"mip =")+" "+d+" "+f+" "+e+" "+(0==c?"  0.0%":0.001>c?" < 0.1%":9.999>=c?"  "+Number(100*c).toFixed(1)+"%":"")+" ("+a.Pd+"; "+(a.Jg-a.Zf)+")");a.Lg=ja()}function c(a,b){return vf(a,a.ya[b].rb.bound)}function d(a){var b=a.A,c,d,e=0,f,g,h,k,l,m=0;for(c=1;c<=
b.i;c++)if(h=b.f[c],a.ad[c]=0,h.kind==Fc&&h.m==A){d=h.type;f=h.c;g=h.d;h=h.r;if(d==Sa||d==I||d==B){k=f-a.p.Ub;l=f+a.p.Ub;if(k<=h&&h<=l)continue;if(h<f)continue}if(d==Ta||d==I||d==B){k=g-a.p.Ub;l=g+a.p.Ub;if(k<=h&&h<=l)continue;if(h>g)continue}k=Math.floor(h+0.5)-a.p.Ub;l=Math.floor(h+0.5)+a.p.Ub;k<=h&&h<=l||(a.ad[c]=1,e++,k=h-Math.floor(h),l=Math.ceil(h)-h,m+=k<=l?k:l)}a.N.Ag=e;a.N.Zc=m;a.p.o>=mc&&(0==e?x("There are no fractional columns"):1==e?x("There is one fractional column, integer infeasibility is "+
m+""):x("There are "+e+" fractional columns, integer infeasibility is "+m+""))}function e(a){var b=a.A,c;b.za=dc;b.ta=b.aa;for(c=1;c<=b.g;c++){var d=b.n[c];d.Sa=d.r}for(c=1;c<=b.i;c++)d=b.f[c],d.kind==Ma?d.Sa=d.r:d.kind==Fc&&(d.Sa=Math.floor(d.r+0.5));a.qh++}function f(a,b,c){var d=a.A,e,f=d.g,g,h,k,l,m,n=Array(3),q,p,r,t,y=null,v=null,S;g=d.f[b].type;q=d.f[b].c;p=d.f[b].d;e=d.f[b].r;r=Math.floor(e);t=Math.ceil(e);switch(g){case Ka:h=Ta;k=Sa;break;case Sa:h=q==r?B:I;k=Sa;break;case Ta:h=Ta;k=t==p?
B:I;break;case I:h=q==r?B:I,k=t==p?B:I}tf(a,b,function(a,b){y=a;v=b});g=uf(a,y);S=uf(a,v);l=!vf(a,g);m=!vf(a,S);if(l&&m)return a.p.o>=mc&&x("Both down- and up-branches are hopeless"),2;if(m)return a.p.o>=mc&&x("Up-branch is hopeless"),Wa(d,b,h,q,r),a.N.rc=y,d.dir==za?a.N.bound<g&&(a.N.bound=g):d.dir==Ea&&a.N.bound>g&&(a.N.bound=g),1;if(l)return a.p.o>=mc&&x("Down-branch is hopeless"),Wa(d,b,k,t,p),a.N.rc=v,d.dir==za?a.N.bound<S&&(a.N.bound=S):d.dir==Ea&&a.N.bound>S&&(a.N.bound=S),1;a.p.o>=mc&&x("Branching on column "+
b+", primal value is "+e+"");l=a.N.s;a.N.Tc=b;a.N.tg=e;qf(a);rf(a,l,n);a.p.o>=mc&&x("Node "+n[1]+" begins down branch, node "+n[2]+" begins up branch ");e=a.ya[n[1]].rb;e.Na={};e.Na.pc=f+b;e.Na.type=h;e.Na.c=q;e.Na.d=r;e.Na.e=null;e.rc=y;d.dir==za?e.bound<g&&(e.bound=g):d.dir==Ea&&e.bound>g&&(e.bound=g);e=a.ya[n[2]].rb;e.Na={};e.Na.pc=f+b;e.Na.type=k;e.Na.c=t;e.Na.d=p;e.Na.e=null;e.rc=v;d.dir==za?e.bound<S&&(e.bound=S):d.dir==Ea&&e.bound>S&&(e.bound=S);c==Af?a.ud=0:c==Bf?a.ud=n[1]:c==Cf&&(a.ud=n[2]);
return 0}function g(a){var b=a.A,c,d,e=0,f,g,h,k;f=b.aa;for(c=1;c<=b.i;c++)if(k=b.f[c],k.kind==Fc)switch(g=k.c,h=k.d,d=k.m,k=k.J,b.dir){case za:d==G?(0>k&&(k=0),f+k>=b.ta&&(Wa(b,c,B,g,g),e++)):d==Ua&&(0<k&&(k=0),f-k>=b.ta&&(Wa(b,c,B,h,h),e++));break;case Ea:d==G?(0<k&&(k=0),f+k<=b.ta&&(Wa(b,c,B,g,g),e++)):d==Ua&&(0>k&&(k=0),f-k<=b.ta&&(Wa(b,c,B,h,h),e++))}a.p.o>=mc&&0!=e&&(1==e?x("One column has been fixed by reduced cost"):x(e+" columns have been fixed by reduced costs"))}function h(a){var b,c=0,
d=null;for(b=a.wc+1;b<=a.A.g;b++)a.A.n[b].origin==Ja&&a.A.n[b].La==a.N.La&&a.A.n[b].m==A&&(null==d&&(d=new Int32Array(1+a.A.g)),d[++c]=b);0<c&&(ab(a.A,c,d),Jb(a.A))}function k(a){var b=a.A,c,d=0,e=0,f=0,g=0,h=0;for(c=b.g;0<c;c--){var k=b.n[c];k.origin==Ja&&(k.qc==Df?d++:k.qc==Ef?e++:k.qc==Ff?f++:k.qc==Gf?g++:h++)}0<d+e+f+g+h&&(x("Cuts on level "+a.N.La+":"),0<d&&x(" gmi = "+d+";"),0<e&&x(" mir = "+e+";"),0<f&&x(" cov = "+f+";"),0<g&&x(" clq = "+g+";"),0<h&&x(" app = "+h+";"),x(""))}function l(a){if(a.p.Ed==
bb||a.p.Ad==bb||a.p.xd==bb||a.p.vd==bb){var b,c,d;c=a.i;1E3>c&&(c=1E3);d=0;for(b=a.wc+1;b<=a.A.g;b++)a.A.n[b].origin==Ja&&d++;if(!(d>=c)){a.p.Ad==bb&&5>a.N.Rd&&Hf(a);a.p.Ed==bb&&If(a,a.Xf);if(a.p.xd==bb){b=a.A;c=kb(b);var e=lb(b),f,g,h,k,l;xc(b);d=new Int32Array(1+e);k=new Float64Array(1+e);l=new Float64Array(1+e);for(e=1;e<=c;e++)for(h=1;2>=h;h++){g=ob(b,e)-Ka+gf;if(1==h){if(g!=lf&&g!=nf)continue;g=ub(b,e,d,k);k[0]=Jf(b,e)}else{if(g!=jf&&g!=nf)continue;g=ub(b,e,d,k);for(f=1;f<=g;f++)k[f]=-k[f];k[0]=
-Kf(b,e)}a:{var m=b;f=d;for(var n=k,q=l,p=null,r=null,t=Array(5),y=void 0,v=void 0,S=void 0,M=S=void 0,ba=void 0,J=M=M=void 0,S=0,v=1;v<=g;v++)y=f[v],rb(m,y)-Ka+gf==cf?n[0]-=n[v]*Lf(m,y):(S++,f[S]=f[v],n[S]=n[v]);g=S;S=0;for(v=1;v<=g;v++)y=f[v],(Ic(m,y)==Ma?Mf:Nf)==Nf&&rb(m,y)-Ka+gf==nf&&0==Lf(m,y)&&1==Of(m,y)&&(S++,ba=f[S],M=n[S],f[S]=f[v],n[S]=n[v],f[v]=ba,n[v]=M);if(2>S)g=0;else{ba=M=0;for(v=S+1;v<=g;v++){y=f[v];if(rb(m,y)-Ka+gf!=nf){g=0;break a}0<n[v]?(ba+=n[v]*Lf(m,y),M+=n[v]*Of(m,y)):(ba+=n[v]*
Of(m,y),M+=n[v]*Lf(m,y))}M-=ba;J=0;for(v=S+1;v<=g;v++)y=f[v],J+=n[v]*Dc(m,y);J-=ba;0>J&&(J=0);J>M&&(J=M);n[0]-=ba;for(v=1;v<=S;v++)y=f[v],q[v]=Dc(m,y),0>q[v]&&(q[v]=0),1<q[v]&&(q[v]=1);for(v=1;v<=S;v++)0>n[v]&&(f[v]=-f[v],n[v]=-n[v],n[0]+=n[v],q[v]=1-q[v]);m=S;v=n[0];y=J;J=void 0;for(J=1;J<=m;J++);for(J=1;J<=m;J++);J=void 0;b:{for(var ea=J=void 0,fa=0,sa=0,K=void 0,oa=void 0,Bb=0.001,K=0.001*(1+Math.abs(v)),J=1;J<=m;J++)for(ea=J+1;ea<=m;ea++){fa++;if(1E3<fa){J=sa;break b}n[J]+n[ea]+y>v+K&&(oa=n[J]+
n[ea]-v,p=1/(oa+M),r=2-p*oa,oa=q[J]+q[ea]+p*y-r,Bb<oa&&(Bb=oa,t[1]=J,t[2]=ea,sa=1))}J=sa}ea=void 0;if(J)ea=2;else{J=J=void 0;b:{for(var fa=ea=J=void 0,K=sa=0,Bb=oa=void 0,ec=0.001,oa=0.001*(1+Math.abs(v)),J=1;J<=m;J++)for(ea=J+1;ea<=m;ea++)for(fa=ea+1;fa<=m;fa++){sa++;if(1E3<sa){J=K;break b}n[J]+n[ea]+n[fa]+y>v+oa&&(Bb=n[J]+n[ea]+n[fa]-v,p=1/(Bb+M),r=3-p*Bb,Bb=q[J]+q[ea]+q[fa]+p*y-r,ec<Bb&&(ec=Bb,t[1]=J,t[2]=ea,t[3]=fa,K=1))}J=K}if(J)J=3;else{J=void 0;b:{for(var sa=fa=ea=J=void 0,oa=K=0,ec=Bb=void 0,
Wj=0.001,Bb=0.001*(1+Math.abs(v)),J=1;J<=m;J++)for(ea=J+1;ea<=m;ea++)for(fa=ea+1;fa<=m;fa++)for(sa=fa+1;sa<=m;sa++){K++;if(1E3<K){J=oa;break b}n[J]+n[ea]+n[fa]+n[sa]+y>v+Bb&&(ec=n[J]+n[ea]+n[fa]+n[sa]-v,p=1/(ec+M),r=4-p*ec,ec=q[J]+q[ea]+q[fa]+q[sa]+p*y-r,Wj<ec&&(Wj=ec,t[1]=J,t[2]=ea,t[3]=fa,t[4]=sa,oa=1))}J=oa}J=J?4:0}ea=J}M=ea;if(0==M)g=0;else{f[0]=0;n[0]=r;for(y=1;y<=M;y++)t[y]=f[t[y]];for(v=1;v<=M;v++)0<t[v]?(f[v]=+t[v],n[v]=1):(f[v]=-t[v],n[v]=-1,n[0]-=1);for(v=S+1;v<=g;v++)M++,f[M]=f[v],n[M]=
p*n[v];n[0]+=p*ba;g=M}}}if(0!=g){f=b;n=g;q=d;p=k;r=lb(f);S=t=void 0;ba=0;0>n&&w("lpx_eval_row: len = "+n+"; invalid row length");for(S=1;S<=n;S++)t=q[S],1<=t&&t<=r||w("lpx_eval_row: j = "+t+"; column number out of range"),ba+=p[S]*Dc(f,t);f=ba-k[0];0.001>f||Id(a,Ff,g,d,k,Ta,k[0])}}}a.p.vd==bb&&null!=a.Ne&&(0==a.N.La&&50>a.N.Rd||0<a.N.La&&5>a.N.Rd)&&(c=a.Ne,d=lb(a.A),b=new Int32Array(1+d),d=new Float64Array(1+d),c=Pf(a.A,c,b,d),0<c&&Id(a,Gf,c,b,d,Ta,d[0]))}}}function p(a){var b,d,e=0;for(b=a.head;null!=
b;b=d)d=b.e,c(a,b.s)||(sf(a,b.s),e++);a.p.o>=mc&&(1==e?x("One hopeless branch has been pruned"):1<e&&x(e+" hopeless branches have been pruned"))}var m,q,r,n,t=0,y=a.hc;for(q=0;;){r=null;switch(q){case 0:if(null==a.head){a.p.o>=mc&&x("Active list is empty!");n=0;r=3;break}if(null!=a.p.ob&&(a.reason=Qf,a.p.ob(a,a.p.Uc),a.reason=0,a.stop)){n=Rc;r=3;break}0==a.gf&&(a.gf=1==a.Pd?a.head.s:0!=a.ud?a.ud:Rf(a));pf(a,a.gf);a.gf=a.ud=0;null!=a.N.R&&a.N.R.s!=t&&(t=0);m=a.N.s;a.p.o>=mc&&(x("------------------------------------------------------------------------"),
x("Processing node "+m+" at level "+a.N.La+""));1==m&&(a.p.Ad==bb&&a.p.o>=Wb&&x("Gomory's cuts enabled"),a.p.Ed==bb&&(a.p.o>=Wb&&x("MIR cuts enabled"),a.Xf=Sf(a)),a.p.xd==bb&&a.p.o>=Wb&&x("Cover cuts enabled"),a.p.vd==bb&&(a.p.o>=Wb&&x("Clique cuts enabled"),a.Ne=Tf(a.A)));case 1:(a.p.o>=mc||a.p.o>=fc&&a.p.bc-1<=1E3*la(a.Lg))&&b(a,0);a.p.o>=Wb&&60<=la(y)&&(x("Time used: "+la(a.hc)+" secs"),y=ja());if(0<a.p.ce&&xf(a)<=a.p.ce){a.p.o>=mc&&x("Relative gap tolerance reached; search terminated ");n=Pc;
r=3;break}if(2147483647>a.p.sb&&a.p.sb-1<=1E3*la(a.hc)){a.p.o>=mc&&x("Time limit exhausted; search terminated");n=Qc;r=3;break}if(null!=a.p.ob&&(a.reason=Uf,a.p.ob(a,a.p.Uc),a.reason=0,a.stop)){n=Rc;r=3;break}if(a.p.ed!=hd)if(a.p.ed==id){if(0==a.N.La&&zf(a,100)){r=2;break}}else if(a.p.ed==jd&&zf(a,0==a.N.La?100:10)){r=2;break}if(!c(a,m)){x("*** not tested yet ***");r=2;break}a.p.o>=mc&&x("Solving LP relaxation...");n=yf(a);if(0!=n&&n!=Vf&&n!=Wf){a.p.o>=Lb&&x("ios_driver: unable to solve current LP relaxation; glp_simplex returned "+
n+"");n=Sb;r=3;break}q=a.A.na;r=a.A.sa;if(q==dc&&r==dc)a.p.o>=mc&&x("Found optimal solution to LP relaxation");else if(r==jc){a.p.o>=Lb&&x("ios_driver: current LP relaxation has no dual feasible solution");n=Sb;r=3;break}else if(q==Ad&&r==dc){a.p.o>=mc&&x("LP relaxation has no solution better than incumbent objective value");r=2;break}else if(q==jc){a.p.o>=mc&&x("LP relaxation has no feasible solution");r=2;break}q=a.N.rc=a.A.aa;q=uf(a,q);a.A.dir==za?a.N.bound<q&&(a.N.bound=q):a.A.dir==Ea&&a.N.bound>
q&&(a.N.bound=q);a.p.o>=mc&&x("Local bound is "+q+"");if(!c(a,m)){a.p.o>=mc&&x("Current branch is hopeless and can be pruned");r=2;break}if(null!=a.p.ob){a.reason=Ga;a.p.ob(a,a.p.Uc);a.reason=0;if(a.stop){n=Rc;r=3;break}if(a.pe){a.pe=a.tf=0;r=1;break}a.tf&&(a.tf=0,Jb(a.A))}d(a);if(0==a.N.Ag){a.p.o>=mc&&x("New integer feasible solution found");a.p.o>=Wb&&k(a);e(a);a.p.o>=fc&&b(a,1);if(null!=a.p.ob&&(a.reason=Xf,a.p.ob(a,a.p.Uc),a.reason=0,a.stop)){n=Rc;r=3;break}r=2;break}a.A.za==dc&&g(a);if(null!=
a.p.ob){a.reason=Yf;a.p.ob(a,a.p.Uc);a.reason=0;if(a.stop){n=Rc;r=3;break}if(!c(a,m)){a.p.o>=mc&&x("Current branch became hopeless and can be pruned");r=2;break}}if(a.p.Xe&&(a.reason=Yf,Zf(a),a.reason=0,!c(a,m))){a.p.o>=mc&&x("Current branch became hopeless and can be pruned");r=2;break}if(null!=a.p.ob&&(a.reason=Ia,a.p.ob(a,a.p.Uc),a.reason=0,a.stop)){n=Rc;r=3;break}if(0==a.N.La||0==t)a.reason=Ia,l(a),a.reason=0;0<a.Bd.size&&(a.reason=Ia,$f(a),a.reason=0);Oc(a.Bd);if(a.pe){a.pe=0;a.N.Rd++;r=1;break}h(a);
a.p.o>=Wb&&0==a.N.La&&k(a);null!=a.Fd&&ag(a);if(null!=a.p.ob&&(a.reason=bg,a.p.ob(a,a.p.Uc),a.reason=0,a.stop)){n=Rc;r=3;break}0==a.Tc&&(a.Tc=cg(a,function(b){a.Jf=b}));q=a.N.s;n=f(a,a.Tc,a.Jf);a.Tc=a.Jf=0;if(0==n){t=q;r=0;break}else if(1==n){a.N.eg=a.N.Rd=0;r=1;break}else if(2==n){r=2;break}case 2:a.p.o>=mc&&x("Node "+m+" fathomed");qf(a);sf(a,m);a.A.za==dc&&p(a);r=t=0;break;case 3:return a.p.o>=fc&&b(a,0),a.Xf=null,a.Ne=null,n}if(null==r)break;q=r}}
function dg(a){var b;b={};b.i=a;b.L=0;b.Ja=new Int32Array(1+a);b.Z=new Int32Array(1+a);b.j=new Float64Array(1+a);return b}function eg(a,b,c){var d=a.Ja[b];0==c?0!=d&&(a.Ja[b]=0,d<a.L&&(a.Ja[a.Z[a.L]]=d,a.Z[d]=a.Z[a.L],a.j[d]=a.j[a.L]),a.L--):(0==d&&(d=++a.L,a.Ja[b]=d,a.Z[d]=b),a.j[d]=c)}function fg(a){for(var b=1;b<=a.L;b++)a.Ja[a.Z[b]]=0;a.L=0}
function gg(a,b){for(var c=0,d=1;d<=a.L;d++)0==Math.abs(a.j[d])||Math.abs(a.j[d])<b?a.Ja[a.Z[d]]=0:(c++,a.Ja[a.Z[d]]=c,a.Z[c]=a.Z[d],a.j[c]=a.j[d]);a.L=c}function hg(a,b){fg(a);a.L=b.L;ga(a.Z,1,b.Z,1,a.L);ga(a.j,1,b.j,1,a.L);for(var c=1;c<=a.L;c++)a.Ja[a.Z[c]]=c}
function Hf(a){function b(a){return a-Math.floor(a)}function c(a,c,d){var e=a.A,f=e.g,g=e.i,h=c.Z,k=c.j;c=c.kh;var l,D,H,R,V,O,Q,F,W,X,ca;D=Bd(e,f+d,h,k);F=e.f[d].r;for(l=1;l<=f+g;l++)c[l]=0;ca=b(F);for(d=1;d<=D;d++){l=h[d];l<=f?(R=e.n[l],H=Ma):(R=e.f[l-f],H=R.kind);V=R.c;O=R.d;R=R.m;W=k[d];if(1E5<Math.abs(W))return;if(!(1E-10>Math.abs(W))){switch(R){case Ra:return;case G:Q=-W;break;case Ua:Q=+W;break;case Na:continue}switch(H){case Fc:if(1E-10>Math.abs(Q-Math.floor(Q+0.5)))continue;else X=b(Q)<=
b(F)?b(Q):b(F)/(1-b(F))*(1-b(Q));break;case Ma:X=0<=Q?+Q:b(F)/(1-b(F))*-Q}switch(R){case G:c[l]=+X;ca+=X*V;break;case Ua:c[l]=-X,ca-=X*O}}}for(d=1;d<=f;d++)if(!(1E-10>Math.abs(c[d])))for(R=e.n[d],Q=R.k;null!=Q;Q=Q.B)c[f+Q.f.C]+=c[d]*Q.j;D=0;for(d=1;d<=g;d++)1E-10>Math.abs(c[f+d])||(R=e.f[d],R.type==B?ca-=c[f+d]*R.c:(D++,h[D]=d,k[D]=c[f+d]));1E-12>Math.abs(ca)&&(ca=0);for(l=1;l<=D;l++)if(0.001>Math.abs(k[l])||1E3<Math.abs(k[l]))return;Id(a,Df,D,h,k,Sa,ca)}var d=a.A,e=d.g,f=d.i,g,h,k={};g=Array(1+f);
k.Z=new Int32Array(1+f);k.j=new Float64Array(1+f);k.kh=new Float64Array(1+e+f);e=0;for(h=1;h<=f;h++){var l=d.f[h];l.kind==Fc&&l.type!=B&&l.m==A&&(l=b(l.r),0.05<=l&&0.95>=l&&(e++,g[e].C=h,g[e].Nb=l))}ma(g,e,function(a,b){return a.Nb>b.Nb?-1:a.Nb<b.Nb?1:0});f=Hd(a);for(d=1;d<=e&&!(50<=Hd(a)-f);d++)c(a,k,g[d].C)}var ig=0,jg=5,kg=0,lg=1,mg=2;
function Sf(a){var b=a.A,c=b.g,b=b.i,d;ig&&x("ios_mir_init: warning: debug mode enabled");d={};d.g=c;d.i=b;d.Eb=new Int8Array(1+c);d.ab=new Int8Array(1+c+b);d.c=new Float64Array(1+c+b);d.Yb=new Int32Array(1+c+b);d.d=new Float64Array(1+c+b);d.zb=new Int32Array(1+c+b);d.x=new Float64Array(1+c+b);d.Ef=new Int32Array(1+jg);d.Ya=dg(c+b);d.lb=new Int8Array(1+c+b);d.oa=dg(c+b);d.G=dg(c+b);(function(a,b){var c=a.A,d=b.g,k;for(k=1;k<=d;k++){var l=c.n[k];b.Eb[k]=0;b.ab[k]=0;switch(l.type){case Ka:b.c[k]=-s;
b.d[k]=+s;break;case Sa:b.c[k]=l.c;b.d[k]=+s;break;case Ta:b.c[k]=-s;b.d[k]=l.d;break;case I:b.c[k]=l.c;b.d[k]=l.d;break;case B:b.c[k]=b.d[k]=l.c}b.Yb[k]=b.zb[k]=0}})(a,d);(function(a,b){var c=a.A,d=b.g,k=b.i,l;for(l=d+1;l<=d+k;l++){var p=c.f[l-d];switch(p.kind){case Ma:b.ab[l]=0;break;case Fc:b.ab[l]=1}switch(p.type){case Ka:b.c[l]=-s;b.d[l]=+s;break;case Sa:b.c[l]=p.c;b.d[l]=+s;break;case Ta:b.c[l]=-s;b.d[l]=p.d;break;case I:b.c[l]=p.c;b.d[l]=p.d;break;case B:b.c[l]=b.d[l]=p.c}b.Yb[l]=b.zb[l]=0}})(a,
d);(function(a,b){var c=a.A,d=b.g,k,l,p,m,q,r;for(l=1;l<=d;l++)if(0==b.c[l]&&b.d[l]==+s||b.c[l]==-s&&0==b.d[l])if(k=c.n[l].k,null!=k&&(p=d+k.f.C,q=k.j,k=k.B,null!=k&&(m=d+k.f.C,r=k.j,null==k.B))){if(b.ab[p]||!b.ab[m])if(b.ab[p]&&!b.ab[m])m=p,r=q,p=d+k.f.C,q=k.j;else continue;b.c[m]!=-s&&b.d[m]!=+s&&b.c[m]!=b.d[m]&&(0==b.d[l]&&(q=-q,r=-r),0<q?0==b.Yb[p]&&(b.c[p]=-r/q,b.Yb[p]=m,b.Eb[l]=1):0==b.zb[p]&&(b.d[p]=-r/q,b.zb[p]=m,b.Eb[l]=1))}})(a,d);(function(a,b){var c=a.A,d=b.g,k,l,p,m;for(l=1;l<=d;l++)if(b.c[l]==
-s&&b.d[l]==+s)b.Eb[l]=1;else{m=0;for(k=c.n[l].k;null!=k;k=k.B){p=d+k.f.C;if(b.c[p]==-s&&b.d[p]==+s){b.Eb[l]=1;break}if(b.ab[p]&&b.c[p]==-s||b.ab[p]&&b.d[p]==+s){b.Eb[l]=1;break}0==b.Yb[p]&&0==b.zb[p]&&b.c[p]==b.d[p]||m++}0==m&&(b.Eb[l]=1)}})(a,d);return d}
function If(a,b){function c(a,b,c,d,e,f,g){function k(a,b,c,d,e,f,g){var h;h=c;for(c=1;c<=a;c++)g[c]=b[c]/f,e[c]&&(g[c]=-g[c]),h-=b[c]*d[c];b=h/f;var l;if(0.01>Math.abs(b-Math.floor(b+0.5)))b=1;else{h=b-Math.floor(b);for(c=1;c<=a;c++)l=g[c]-Math.floor(g[c])-h,g[c]=0>=l?Math.floor(g[c]):Math.floor(g[c])+l/(1-h);q=Math.floor(b);r=1/(1-h);b=0}if(b)return 1;for(c=1;c<=a;c++)e[c]&&(g[c]=-g[c],q+=g[c]*d[c]);r/=f;return 0}var h,l,m,n,p;m=Array(4);var t,v,y,D;y=new Int8Array(1+a);D=Array(1+a);for(l=1;l<=
a;l++)y[l]=e[l]>=0.5*d[l];v=p=0;for(l=1;l<=a;l++)if(h=1E-9*(1+Math.abs(d[l])),!(e[l]<h||e[l]>d[l]-h||(h=k(a,b,c,d,y,Math.abs(b[l]),g),h))){t=-q-r*f;for(h=1;h<=a;h++)t+=g[h]*e[h];v<t&&(v=t,p=Math.abs(b[l]))}0.001>v&&(v=0);if(0==v)return v;m[1]=p/2;m[2]=p/4;m[3]=p/8;for(l=1;3>=l;l++)if(h=k(a,b,c,d,y,m[l],g),!h){t=-q-r*f;for(h=1;h<=a;h++)t+=g[h]*e[h];v<t&&(v=t,p=m[l])}m=0;for(l=1;l<=a;l++)h=1E-9*(1+Math.abs(d[l])),e[l]<h||e[l]>d[l]-h||(m++,D[m].C=l,D[m].xf=Math.abs(e[l]-0.5*d[l]));ma(D,m,function(a,
b){return a.xf<b.xf?-1:a.xf>b.xf?1:0});for(n=1;n<=m;n++)if(l=D[n].C,y[l]=!y[l],h=k(a,b,c,d,y,p,g),y[l]=!y[l],!h){t=-q-r*f;for(h=1;h<=a;h++)t+=g[h]*e[h];v<t&&(v=t,y[l]=!y[l])}h=k(a,b,c,d,y,p,g);return v}function d(a,b,c){var d=a.A;a=b.g;b.Eb[c]=2;b.Je=1;b.Ef[1]=c;fg(b.Ya);eg(b.Ya,c,1);for(c=d.n[c].k;null!=c;c=c.B)eg(b.Ya,a+c.f.C,-c.j);b.Df=0}function e(a){var b,c;for(b=1;b<=a.Ya.L;b++)c=a.Ya.Z[b],0==a.Yb[c]&&0==a.zb[c]&&a.c[c]==a.d[c]&&(a.Df-=a.Ya.j[b]*a.c[c],a.Ya.j[b]=0);gg(a.Ya,2.220446049250313E-16)}
function f(a){var b,c,d,e;for(b=1;b<=a.Ya.L;b++)c=a.Ya.Z[b],a.ab[c]||(d=a.Yb[c],e=0==d?a.c[c]==-s?s:a.x[c]-a.c[c]:a.x[c]-a.c[c]*a.x[d],d=a.zb[c],d=0==d?a.zb[c]==+s?s:a.d[c]-a.x[c]:a.d[c]*a.x[d]-a.x[c],a.lb[c]=e<=d?lg:mg)}function g(a){var b,c,d,e;hg(a.oa,a.Ya);a.tc=a.Df;for(b=a.oa.L;1<=b;b--)d=a.oa.Z[b],a.ab[d]||(a.lb[d]==lg?(e=a.Yb[d],0==e?a.tc-=a.oa.j[b]*a.c[d]:(c=a.oa.Ja[e],0==c&&(eg(a.oa,e,1),c=a.oa.Ja[e],a.oa.j[c]=0),a.oa.j[c]+=a.oa.j[b]*a.c[d])):a.lb[d]==mg&&(e=a.zb[d],0==e?a.tc-=a.oa.j[b]*
a.d[d]:(c=a.oa.Ja[e],0==c&&(eg(a.oa,e,1),c=a.oa.Ja[e],a.oa.j[c]=0),a.oa.j[c]+=a.oa.j[b]*a.d[d]),a.oa.j[b]=-a.oa.j[b]));for(b=1;b<=a.oa.L;b++)d=a.oa.Z[b],a.ab[d]&&(Math.abs(a.c[d])<=Math.abs(a.d[d])?(a.lb[d]=lg,a.tc-=a.oa.j[b]*a.c[d]):(a.lb[d]=mg,a.tc-=a.oa.j[b]*a.d[d],a.oa.j[b]=-a.oa.j[b]))}function h(a){var b=a.g,d=a.i,e,f,g,h,k,l,m;k=0;hg(a.G,a.oa);a.Lb=a.tc;gg(a.G,2.220446049250313E-16);for(e=1;e<=a.G.L;e++)f=a.G.Z[e],!a.ab[f]&&0<a.G.j[e]&&(a.G.j[e]=0);gg(a.G,0);h=0;for(e=1;e<=a.G.L;e++)f=a.G.Z[e],
a.ab[f]&&(h++,g=a.G.Z[h],a.G.Ja[f]=h,a.G.Ja[g]=e,a.G.Z[h]=f,a.G.Z[e]=g,f=a.G.j[h],a.G.j[h]=a.G.j[e],a.G.j[e]=f);if(0==h)return k;l=new Float64Array(1+h);g=new Float64Array(1+h);m=new Float64Array(1+h);for(e=1;e<=h;e++)f=a.G.Z[e],l[e]=a.d[f]-a.c[f],a.lb[f]==lg?g[e]=a.x[f]-a.c[f]:a.lb[f]==mg&&(g[e]=a.d[f]-a.x[f]),0>g[e]&&(g[e]=0);k=0;for(e=h+1;e<=a.G.L;e++)f=a.G.Z[e],a.lb[f]==lg?(g=a.Yb[f],g=0==g?a.x[f]-a.c[f]:a.x[f]-a.c[f]*a.x[g]):a.lb[f]==mg&&(g=a.zb[f],g=0==g?a.d[f]-a.x[f]:a.d[f]*a.x[g]-a.x[f]),
0>g&&(g=0),k-=a.G.j[e]*g;k=c(h,a.G.j,a.Lb,l,g,k,m);if(0==k)return k;for(e=1;e<=h;e++)a.G.j[e]=m[e];for(e=h+1;e<=a.G.L;e++)f=a.G.Z[e],f<=b+d&&(a.G.j[e]*=0);a.Lb=null;return k}function k(a){var b,c,d,e;for(b=1;b<=a.G.L;b++)d=a.G.Z[b],a.ab[d]&&(a.lb[d]==lg?a.Lb+=a.G.j[b]*a.c[d]:a.lb[d]==mg&&(a.Lb-=a.G.j[b]*a.d[d],a.G.j[b]=-a.G.j[b]));for(b=1;b<=a.G.L;b++)d=a.G.Z[b],a.ab[d]||(a.lb[d]==lg?(e=a.Yb[d],0==e?a.Lb+=a.G.j[b]*a.c[d]:(c=a.G.Ja[e],0==c&&(eg(a.G,e,1),c=a.G.Ja[e],a.G.j[c]=0),a.G.j[c]-=a.G.j[b]*a.c[d])):
a.lb[d]==mg&&(e=a.zb[d],0==e?a.Lb-=a.G.j[b]*a.d[d]:(c=a.G.Ja[e],0==c&&(eg(a.G,e,1),c=a.G.Ja[e],a.G.j[c]=0),a.G.j[c]+=a.G.j[b]*a.d[d]),a.G.j[b]=-a.G.j[b]))}function l(a,b){var c=a.A,d=b.g,e,f,g,h;for(f=b.G.L;1<=f;f--)if(e=b.G.Z[f],!(e>d)){for(e=c.n[e].k;null!=e;e=e.B)g=d+e.f.C,h=b.G.Ja[g],0==h&&(eg(b.G,g,1),h=b.G.Ja[g],b.G.j[h]=0),b.G.j[h]+=b.G.j[f]*e.j;b.G.j[f]=0}gg(b.G,0)}function p(a,b){var c=b.g,d=b.i,e,f,g=new Int32Array(1+d),h=new Float64Array(1+d);f=0;for(d=b.G.L;1<=d;d--)e=b.G.Z[d],f++,g[f]=
e-c,h[f]=b.G.j[d];Id(a,Ef,f,g,h,Ta,b.Lb)}function m(a,b){var c=a.A,d=b.g,e=b.i,f,g,h,k=0,l=0,m,n=0;for(f=1;f<=b.Ya.L;f++)g=b.Ya.Z[f],g<=d||b.ab[g]||0.001>Math.abs(b.Ya.j[f])||(h=b.Yb[g],m=0==h?b.c[g]==-s?s:b.x[g]-b.c[g]:b.x[g]-b.c[g]*b.x[h],h=b.zb[g],h=0==h?b.zb[g]==+s?s:b.d[g]-b.x[g]:b.d[g]*b.x[h]-b.x[g],m=m<=h?m:h,!(0.001>m)&&n<m&&(n=m,k=g));if(0==k)return 1;for(g=1;g<=d;g++)if(!b.Eb[g]){for(f=c.n[g].k;null!=f&&f.f.C!=k-d;f=f.B);if(null!=f&&0.001<=Math.abs(f.j))break}if(g>d)return 2;b.Je++;b.Ef[b.Je]=
g;b.Eb[g]=2;e=dg(d+e);eg(e,g,1);for(f=c.n[g].k;null!=f;f=f.B)eg(e,d+f.f.C,-f.j);f=b.Ya.Ja[k];c=b.Ya;d=-b.Ya.j[f]/e.j[e.Ja[k]];for(g=1;g<=e.L;g++)f=e.Z[g],n=void 0,n=c.Ja[f],n=0==n?0:c.j[n],m=e.j[g],eg(c,f,n+d*m);eg(b.Ya,k,0);return l}var q,r,n=b.g,t=b.i,y,E,C;(function(a,b){var c=a.A,d=b.g,e=b.i,f;for(f=1;f<=d;f++)b.x[f]=c.n[f].r;for(f=d+1;f<=d+e;f++)b.x[f]=c.f[f-d].r})(a,b);ha(b.lb,1,kg,n+t);for(y=1;y<=n;y++)if(!b.Eb[y]){for(d(a,b,y);;){e(b);if(ig)for(E=1;E<=n+t;E++);f(b);g(b);C=h(b);0<C&&(k(b),
l(a,b),p(a,b));for(var D=1;D<=b.oa.L;D++)E=b.oa.Z[D],b.lb[E]=kg;if(!(0==C&&b.Je<jg&&0==m(a,b)))break}for(E=1;E<=b.Je;E++)C=b.Ef[E],b.Eb[C]=0}}
function Tf(a){function b(a,b){var c;switch(ob(a,b)-Ka+gf){case gf:case lf:c=-s;break;case jf:case nf:case cf:c=Kf(a,b)}return c}function c(a,b){var c;switch(ob(a,b)-Ka+gf){case gf:case jf:c=+s;break;case lf:case nf:case cf:c=Jf(a,b)}return c}function d(a,b){var c;switch(rb(a,b)-Ka+gf){case gf:case lf:c=-s;break;case jf:case nf:case cf:c=Lf(a,b)}return c}function e(a,b){var c;switch(rb(a,b)-Ka+gf){case gf:case jf:c=+s;break;case lf:case nf:case cf:c=Of(a,b)}return c}function f(a,b){return(Ic(a,b)==
Ma?Mf:Nf)==Nf&&rb(a,b)-Ka+gf==nf&&0==Lf(a,b)&&1==Of(a,b)}function g(a,b,c,f){var g,h,k;k=0;for(h=1;h<=b;h++)if(g=c[h],0<f[h]){g=d(a,g);if(g==-s){k=-s;break}k+=f[h]*g}else if(0>f[h]){g=e(a,g);if(g==+s){k=-s;break}k+=f[h]*g}return k}function h(a,b,c,f){var g,h,k;k=0;for(h=1;h<=b;h++)if(g=c[h],0<f[h]){g=e(a,g);if(g==+s){k=+s;break}k+=f[h]*g}else if(0>f[h]){g=d(a,g);if(g==-s){k=+s;break}k+=f[h]*g}return k}function k(a,b,c,d,e,f,g,h){b!=-s&&g&&(b-=a[f]);c!=+s&&g&&(c-=a[f]);d!=-s&&(0>a[f]&&(d-=a[f]),0>
a[h]&&(d-=a[h]));e!=+s&&(0<a[f]&&(e-=a[f]),0<a[h]&&(e-=a[h]));f=0<a[h]?b==-s||e==+s?-s:(b-e)/a[h]:c==+s||d==-s?-s:(c-d)/a[h];if(0.001<f)return 2;f=0<a[h]?c==+s||d==-s?+s:(c-d)/a[h]:b==-s||e==+s?+s:(b-e)/a[h];return 0.999>f?1:0}var l=null,p,m,q,r,n,t,y,E,C,D,H,R,V,O,Q,F;x("Creating the conflict graph...");p=kb(a);m=lb(a);q=0;D=new Int32Array(1+m);H=new Int32Array(1+m);C=new Int32Array(1+m);F=new Float64Array(1+m);for(r=1;r<=p;r++)if(R=b(a,r),V=c(a,r),R!=-s||V!=+s)if(E=ub(a,r,C,F),!(500<E))for(O=g(a,
E,C,F),Q=h(a,E,C,F),t=1;t<=E;t++)if(f(a,C[t]))for(y=t+1;y<=E;y++)f(a,C[y])&&(k(F,R,V,O,Q,t,0,y)||k(F,R,V,O,Q,t,1,y))&&(n=C[t],0==D[n]&&(q++,D[n]=q,H[q]=n),n=C[y],0==D[n]&&(q++,D[n]=q,H[q]=n));if(0==q||4E3<q)return x("The conflict graph is either empty or too big"),l;l={};l.i=m;l.Cb=q;l.Dg=0;l.yf=D;l.ge=H;E=q+q;E=(E*(E-1)/2+0)/1;l.Jc=Array(E);for(n=1;n<=q;n++)ng(l,+H[n],-H[n]);for(r=1;r<=p;r++)if(R=b(a,r),V=c(a,r),R!=-s||V!=+s)if(E=ub(a,r,C,F),!(500<E))for(O=g(a,E,C,F),Q=h(a,E,C,F),t=1;t<=E;t++)if(f(a,
C[t]))for(y=t+1;y<=E;y++)if(f(a,C[y])){switch(k(F,R,V,O,Q,t,0,y)){case 1:ng(l,-C[t],+C[y]);break;case 2:ng(l,-C[t],-C[y])}switch(k(F,R,V,O,Q,t,1,y)){case 1:ng(l,+C[t],+C[y]);break;case 2:ng(l,+C[t],-C[y])}}x("The conflict graph has 2*"+l.Cb+" vertices and "+l.Dg+" edges");return l}function ng(a,b,c){var d;0<b?b=a.yf[b]:(b=a.yf[-b],b+=a.Cb);0<c?c=a.yf[c]:(c=a.yf[-c],c+=a.Cb);b<c&&(d=b,b=c,c=d);d=(b-1)*(b-2)/2+(c-1);a.Jc[d/1]|=1<<0-d%1;a.Dg++}
function Pf(a,b,c,d){function e(a,b,c){return b==c?0:b>c?f(a,b*(b-1)/2+c):f(a,c*(c-1)/2+b)}function f(a,b){return a.Jc[b/1]&1<<0-b%1}function g(a,b,c,d,f,h){var k,l,m,n,q,p,r,ca;ca=new Int32Array(a.i);if(0>=b){if(0==b&&(a.set[d++]=c[0],f+=h),f>a.gd)for(a.gd=f,a.bg=d,k=0;k<d;k++)a.oh[k+1]=a.set[k]}else for(k=b;0<=k&&!(0==d&&k<b);k--){m=c[k];if(0<d&&a.wg[m]<=a.gd-f)break;a.set[d]=m;n=f+a.Ic[m+1];h-=a.Ic[m+1];if(h<=a.gd-n)break;for(q=r=p=0;r<c+k;)l=c[r],r++,e(a,l,m)&&(ca[p]=l,p++,q+=a.Ic[l+1]);q<=a.gd-
n||g(a,p-1,ca,d+1,n,q)}}var h=lb(a),k,l,p,m=0,q,r,n;p=new Int32Array(1+2*b.Cb);q=new Int32Array(1+2*b.Cb);n=new Float64Array(1+h);for(l=1;l<=b.Cb;l++)k=b.ge[l],k=Dc(a,k),k=100*k+0.5|0,0>k&&(k=0),100<k&&(k=100),p[l]=k,p[b.Cb+l]=100-k;p=function(a,b,c,d){var f={},h,k,l,m,n,q;f.i=a;f.Ic=b;f.Jc=c;f.gd=0;f.bg=0;f.oh=d;f.wg=new Int32Array(f.i);f.set=new Int32Array(f.i);n=new Int32Array(f.i);q=new Int32Array(f.i);b=new Int32Array(f.i);c=ja();for(a=0;a<f.i;a++)for(h=q[a]=0;h<f.i;h++)e(f,a,h)&&(q[a]+=f.Ic[h+
1]);for(a=0;a<f.i;a++)n[a]=0;for(a=f.i-1;0<=a;a--){m=l=-1;for(h=0;h<f.i;h++)!n[h]&&(f.Ic[h+1]>l||f.Ic[h+1]==l&&q[h]>m)&&(l=f.Ic[h+1],m=q[h],k=h);b[a]=k;n[k]=1;for(h=0;h<f.i;h++)!n[h]&&h!=k&&e(f,k,h)&&(q[h]-=f.Ic[k+1])}for(a=k=0;a<f.i;a++)k+=f.Ic[b[a]+1],g(f,a,b,0,0,k),f.wg[b[a]]=f.gd,4.999<=la(c)&&(x("level = "+a+1+" ("+f.i+"); best = "+f.gd+""),c=ja());for(a=1;a<=f.bg;a++)d[a]++;return f.bg}(2*b.Cb,p,b.Jc,q);r=0;for(l=1;l<=p;l++)k=q[l],k<=b.Cb?(k=b.ge[k],k=Dc(a,k),r+=k):(k=b.ge[k-b.Cb],k=Dc(a,k),
r+=1-k);if(1.01<=r){for(l=a=1;l<=p;l++)k=q[l],k<=b.Cb?(k=b.ge[k],n[k]+=1):(k=b.ge[k-b.Cb],n[k]-=1,a-=1);for(k=1;k<=h;k++)0!=n[k]&&(m++,c[m]=k,d[m]=n[k]);c[0]=0;d[0]=a}return m}
function cg(a,b){var c;if(a.p.Jb==Zc){var d,e;for(d=1;d<=a.i&&!a.ad[d];d++);e=Dc(a.A,d);b(e-Math.floor(e)<Math.ceil(e)-e?Bf:Cf);c=d}else if(a.p.Jb==$c){for(d=a.i;1<=d&&!a.ad[d];d--);e=Dc(a.A,d);b(e-Math.floor(e)<Math.ceil(e)-e?Bf:Cf);c=d}else if(a.p.Jb==ad)c=og(a,b);else if(a.p.Jb==bd){c=a.A;var f=c.g,g=c.i,h=a.ad,k,l,p,m,q,r,n,t,y,E,C,D,H,R;xc(c);n=new Int32Array(1+g);R=new Float64Array(1+g);l=0;H=-1;for(k=1;k<=g;k++)if(h[k]){t=Dc(c,k);r=Bd(c,f+k,n,R);for(q=-1;1>=q;q+=2){p=Fd(c,r,n,R,q,1E-9);0!=
p&&(p=n[p]);if(0==p)p=a.A.dir==za?+s:-s;else{for(m=1;m<=r&&n[m]!=p;m++);m=R[m];y=(0>q?Math.floor(t):Math.ceil(t))-t;y/=m;p>f&&Ic(c,p-f)!=Ma&&0.001<Math.abs(y-Math.floor(y+0.5))&&(y=0<y?Math.ceil(y):Math.floor(y));p<=f?(m=zc(c,p),p=Bc(c,p)):(m=Cc(c,p-f),p=Ec(c,p-f));switch(a.A.dir){case za:if(m==G&&0>p||m==Ua&&0<p||m==Ra)p=0;break;case Ea:if(m==G&&0<p||m==Ua&&0>p||m==Ra)p=0}p*=y}0>q?e=p:E=p}if(H<Math.abs(e)||H<Math.abs(E))if(l=k,Math.abs(e)<Math.abs(E)?(d=Bf,H=Math.abs(E)):(d=Cf,H=Math.abs(e)),C=e,
D=E,H==s)break}H<1E-6*(1+0.001*Math.abs(c.aa))?l=og(a,b):(a.p.o>=mc&&(x("branch_drtom: column "+l+" chosen to branch on"),Math.abs(C)==s?x("branch_drtom: down-branch is infeasible"):x("branch_drtom: down-branch bound is "+(yc(c)+C)+""),Math.abs(D)==s?x("branch_drtom: up-branch   is infeasible"):x("branch_drtom: up-branch   bound is "+(yc(c)+D)+"")),b(d));c=l}else a.p.Jb==cd&&(c=pg(a,b));return c}
function og(a,b){var c,d,e,f,g,h;d=0;g=s;for(c=1;c<=a.i;c++)a.ad[c]&&(f=Dc(a.A,c),h=Math.floor(f)+0.5,g>Math.abs(f-h)&&(d=c,g=Math.abs(f-h),e=f<h?Bf:Cf));b(e);return d}function qg(a){a=a.i;var b,c={};c.yd=new Int32Array(1+a);c.Ud=new Float64Array(1+a);c.Id=new Int32Array(1+a);c.ye=new Float64Array(1+a);for(b=1;b<=a;b++)c.yd[b]=c.Id[b]=0,c.Ud[b]=c.ye[b]=0;return c}
function ag(a){var b,c,d=a.Fd;null!=a.N.R&&(b=a.N.R.Tc,c=a.A.f[b].r-a.N.R.tg,a=a.A.aa-a.N.R.rc,a=Math.abs(a/c),0>c?(d.yd[b]++,d.Ud[b]+=a):(d.Id[b]++,d.ye[b]+=a))}
function pg(a,b){function c(a,b,c){var d,e;xc(a);d=Ba();hb(d,a,0);Wa(d,b,B,c,c);b=new kc;b.o=lc;b.cb=Tb;b.oc=30;b.fb=1E3;b.cb=Tb;b=sc(d,b);0==b||b==rg?tc(d)==jc?e=s:uc(d)==dc?(a.dir==za?e=d.aa-a.aa:a.dir==Ea&&(e=a.aa-d.aa),e<1E-6*(1+0.001*Math.abs(a.aa))&&(e=0)):e=0:e=0;return e}function d(a,b,d){var e=a.Fd,f;if(d==Bf){if(0==e.yd[b]){d=a.A.f[b].r;a=c(a.A,b,Math.floor(d));if(a==s)return f=s;e.yd[b]=1;e.Ud[b]=a/(d-Math.floor(d))}f=e.Ud[b]/e.yd[b]}else if(d==Cf){if(0==e.Id[b]){d=a.A.f[b].r;a=c(a.A,b,
Math.ceil(d));if(a==s)return f=s;e.Id[b]=1;e.ye[b]=a/(Math.ceil(d)-d)}f=e.ye[b]/e.Id[b]}return f}function e(a){var b=a.Fd,c,d=0,e=0;for(c=1;c<=a.i;c++)Jd(a,c)&&(d++,0<b.yd[c]&&0<b.Id[c]&&e++);x("Pseudocosts initialized for "+e+" of "+d+" variables")}var f=ja(),g,h,k,l,p,m,q;null==a.Fd&&(a.Fd=qg(a));h=0;q=-1;for(g=1;g<=a.i;g++)if(Jd(a,g)){l=a.A.f[g].r;p=d(a,g,Bf);if(p==s)return h=g,k=Bf,b(k),h;m=p*(l-Math.floor(l));p=d(a,g,Cf);if(p==s)return h=g,k=Cf,b(k),h;l=p*(Math.ceil(l)-l);p=m>l?m:l;q<p&&(q=p,
h=g,k=m<=l?Bf:Cf);a.p.o>=bb&&10<=la(f)&&(e(a),f=ja())}if(0==q)return h=og(a,b);b(k);return h}
function Zf(a){var b=a.A,c=b.i,d=null,e=null,f=null,g,h,k,l,p,m,q,r;for(l=0;;){var n=null;switch(l){case 0:xc(b);if(0!=a.N.La||1!=a.N.eg){n=5;break}q=0;for(k=1;k<=c;k++)if(g=b.f[k],g.kind!=Ma&&g.type!=B)if(g.type==I&&0==g.c&&1==g.d)q++;else{a.p.o>=Wb&&x("FPUMP heuristic cannot be applied due to general integer variables");n=5;break}if(null!=n)break;if(0==q){n=5;break}a.p.o>=Wb&&x("Applying FPUMP heuristic...");e=Array(1+q);ia(e,1,q);l=0;for(k=1;k<=c;k++)g=b.f[k],g.kind==Fc&&g.type==I&&(e[++l].C=k);
d=Ba();case 1:hb(d,b,cb);if(b.za==dc){La(d,1);p=new Int32Array(1+c);m=new Float64Array(1+c);for(k=1;k<=c;k++)p[k]=k,m[k]=b.f[k].u;Ya(d,d.g,c,p,m);p=0.1*b.aa+0.9*b.ta;b.dir==za?Va(d,d.g,Ta,0,p-b.ha):b.dir==Ea&&Va(d,d.g,Sa,p-b.ha,0)}m=0;for(l=1;l<=q;l++)e[l].x=-1;case 2:if(m++,a.p.o>=Wb&&x("Pass "+m+""),r=s,p=0,1<m){null==f&&(f=sg());for(l=1;l<=q;l++)k=e[l].C,g=d.f[k],n=tg(f),0>n&&(n=0),g=Math.abs(e[l].x-g.r),0.5<g+n&&(e[l].x=1-e[l].x);n=4;break}case 3:for(l=h=1;l<=q;l++)g=d.f[e[l].C],g=0.5>g.r?0:1,
e[l].x!=g&&(h=0,e[l].x=g);if(h){for(l=1;l<=q;l++)g=d.f[e[l].C],e[l].Td=Math.abs(g.r-e[l].x);ma(e,q,function(a,b){return a.Td>b.Td?-1:a.Td<b.Td?1:0});for(l=1;l<=q&&!(5<=l&&0.35>e[l].Td||10<=l);l++)e[l].x=1-e[l].x}case 4:if(2147483647>a.p.sb&&a.p.sb-1<=1E3*la(a.hc)){n=5;break}d.dir=za;d.ha=0;for(k=1;k<=c;k++)d.f[k].u=0;for(l=1;l<=q;l++)k=e[l].C,0==e[l].x?d.f[k].u=1:(d.f[k].u=-1,d.ha+=1);h=new kc;a.p.o<=Lb?h.o=a.p.o:a.p.o<=Wb&&(h.o=fc,h.fb=1E4);l=sc(d,h);if(0!=l){a.p.o>=Lb&&x("Warning: glp_simplex returned "+
l+"");n=5;break}l=xc(d);if(l!=vc){a.p.o>=Lb&&x("Warning: glp_get_status returned "+l+"");n=5;break}a.p.o>=mc&&x("delta = "+d.aa+"");k=0.3*a.p.Ub;for(l=1;l<=q&&!(g=d.f[e[l].C],k<g.r&&g.r<1-k);l++);if(l>q){g=new Float64Array(1+c);for(k=1;k<=c;k++)g[k]=d.f[k].r,b.f[k].kind==Fc&&(g[k]=Math.floor(g[k]+0.5));d.ha=b.ha;d.dir=b.dir;for(l=1;l<=q;l++)d.f[e[l].C].c=g[e[l].C],d.f[e[l].C].d=g[e[l].C],d.f[e[l].C].type=B;for(k=1;k<=c;k++)d.f[k].u=b.f[k].u;l=sc(d,h);if(0!=l){a.p.o>=Lb&&x("Warning: glp_simplex returned "+
l+"");n=5;break}l=xc(d);if(l!=vc){a.p.o>=Lb&&x("Warning: glp_get_status returned "+l+"");n=5;break}for(k=1;k<=c;k++)b.f[k].kind!=Fc&&(g[k]=d.f[k].r);l=Kd(a,g);if(0==l){n=vf(a,a.N.bound)?1:5;break}}r==s||d.aa<=r-1E-6*(1+r)?(p=0,r=d.aa):p++;if(3>p){n=3;break}5>m&&(n=2)}if(null==n)break;l=n}}
function $f(a){function b(a,b,c){var d,e=0,f=0,g=0;for(d=a.k;null!=d;d=d.e)c[d.C]=d.j,f+=d.j*d.j;for(d=b.k;null!=d;d=d.e)e+=c[d.C]*d.j,g+=d.j*d.j;for(d=a.k;null!=d;d=d.e)c[d.C]=0;a=Math.sqrt(f)*Math.sqrt(g);4.930380657631324E-32>a&&(a=2.220446049250313E-16);return e/a}var c,d,e,f,g,h,k,l,p,m;c=a.Bd;f=Array(1+c.size);l=new Int32Array(1+a.i);p=new Float64Array(1+a.i);m=new Float64Array(1+a.i);g=0;for(d=c.head;null!=d;d=d.e)g++,f[g].Re=d,f[g].ba=0;for(g=1;g<=c.size;g++){var q=null,r=null;d=f[g].Re;h=
k=0;for(e=d.k;null!=e;e=e.e)k++,l[k]=e.C,p[k]=e.j,h+=e.j*e.j;4.930380657631324E-32>h&&(h=2.220446049250313E-16);k=Dd(a.A,k,l,p);d=Gd(a.A,k,l,p,d.type,d.cg,function(a,b,c,d,e,f){q=e;r=f});0==d?(f[g].Xc=Math.abs(q)/Math.sqrt(h),a.A.dir==za?(0>r&&(r=0),f[g].Ab=+r):(0<r&&(r=0),f[g].Ab=-r)):1==d?f[g].Xc=f[g].Ab=0:2==d&&(f[g].Xc=1,f[g].Ab=s);0.01>f[g].Ab&&(f[g].Ab=0)}ma(f,c.size,function(a,b){if(0==a.Ab&&0==b.Ab){if(a.Xc>b.Xc)return-1;if(a.Xc<b.Xc)return 1}else{if(a.Ab>b.Ab)return-1;if(a.Ab<b.Ab)return 1}return 0});
h=0==a.N.La?90:10;h>c.size&&(h=c.size);for(g=1;g<=h;g++)if(!(0.01>f[g].Ab&&0.01>f[g].Xc)){for(c=1;c<g&&!(f[c].ba&&0.9<b(f[g].Re,f[c].Re,m));c++);if(!(c<g)){d=f[g].Re;f[g].ba=1;c=La(a.A,1);null!=d.name&&Pa(a.A,c,d.name);a.A.n[c].qc=d.qc;k=0;for(e=d.k;null!=e;e=e.e)k++,l[k]=e.C,p[k]=e.j;Ya(a.A,c,k,l,p);Va(a.A,c,d.type,d.cg,d.cg)}}}
function Rf(a){function b(a){var b,c;b=0;c=s;for(a=a.head;null!=a;a=a.e)c>a.R.Zc&&(b=a.s,c=a.R.Zc);return b}function c(a){var b,c,d,e,p;b=a.ya[1].rb;e=(a.A.ta-b.bound)/b.Zc;c=0;d=s;for(b=a.head;null!=b;b=b.e)p=b.R.bound+e*b.R.Zc,a.A.dir==Ea&&(p=-p),d>p&&(c=b.s,d=p);return c}function d(a){var b,c=null,d,e;switch(a.A.dir){case za:d=+s;for(b=a.head;null!=b;b=b.e)d>b.bound&&(d=b.bound);e=0.001*(1+Math.abs(d));for(b=a.head;null!=b;b=b.e)b.bound<=d+e&&(null==c||c.R.Zc>b.R.Zc)&&(c=b);break;case Ea:d=-s;
for(b=a.head;null!=b;b=b.e)d<b.bound&&(d=b.bound);e=0.001*(1+Math.abs(d));for(b=a.head;null!=b;b=b.e)b.bound>=d-e&&(null==c||c.rc<b.rc)&&(c=b)}return c.s}var e;a.p.kc==dd?e=a.Xa.s:a.p.kc==ed?e=a.head.s:a.p.kc==fd?e=d(a):a.p.kc==gd&&(e=a.A.za==Aa?b(a):c(a));return e}
var pa=exports.GLP_MAJOR_VERSION=4,qa=exports.GLP_MINOR_VERSION=49,za=exports.GLP_MIN=1,Ea=exports.GLP_MAX=2,Ma=exports.GLP_CV=1,Fc=exports.GLP_IV=2,Gc=exports.GLP_BV=3,Ka=exports.GLP_FR=1,Sa=exports.GLP_LO=2,Ta=exports.GLP_UP=3,I=exports.GLP_DB=4,B=exports.GLP_FX=5,A=exports.GLP_BS=1,G=exports.GLP_NL=2,Ua=exports.GLP_NU=3,Ra=exports.GLP_NF=4,Na=exports.GLP_NS=5,Uc=exports.GLP_SF_GM=1,Vc=exports.GLP_SF_EQ=16,Wc=exports.GLP_SF_2N=32,Xc=exports.GLP_SF_SKIP=64,hc=exports.GLP_SF_AUTO=128,Zb=exports.GLP_SOL=
1,le=exports.GLP_IPT=2,Sc=exports.GLP_MIP=3,Aa=exports.GLP_UNDEF=1,dc=exports.GLP_FEAS=2,Ad=exports.GLP_INFEAS=3,jc=exports.GLP_NOFEAS=4,vc=exports.GLP_OPT=5,wc=exports.GLP_UNBND=6,md=exports.GLP_BF_FT=1,rd=exports.GLP_BF_BG=2,sd=exports.GLP_BF_GR=3,lc=exports.GLP_MSG_OFF=0,Lb=exports.GLP_MSG_ERR=1,fc=exports.GLP_MSG_ON=2,Wb=exports.GLP_MSG_ALL=3,mc=exports.GLP_MSG_DBG=4,Ob=exports.GLP_PRIMAL=1,Qb=exports.GLP_DUALP=2,Tb=exports.GLP_DUAL=3,nc=exports.GLP_PT_STD=17,oc=exports.GLP_PT_PSE=34,pc=exports.GLP_RT_STD=
17,qc=exports.GLP_RT_HAR=34;exports.GLP_ORD_NONE=0;exports.GLP_ORD_QMD=1;exports.GLP_ORD_AMD=2;exports.GLP_ORD_SYMAMD=3;var Zc=exports.GLP_BR_FFV=1,$c=exports.GLP_BR_LFV=2,ad=exports.GLP_BR_MFV=3,bd=exports.GLP_BR_DTH=4,cd=exports.GLP_BR_PCH=5,dd=exports.GLP_BT_DFS=1,ed=exports.GLP_BT_BFS=2,fd=exports.GLP_BT_BLB=3,gd=exports.GLP_BT_BPH=4,hd=exports.GLP_PP_NONE=0,id=exports.GLP_PP_ROOT=1,jd=exports.GLP_PP_ALL=2;exports.GLP_RF_REG=0;
var Ha=exports.GLP_RF_LAZY=1,Ja=exports.GLP_RF_CUT=2,Df=exports.GLP_RF_GMI=1,Ef=exports.GLP_RF_MIR=2,Ff=exports.GLP_RF_COV=3,Gf=exports.GLP_RF_CLQ=4,bb=exports.GLP_ON=1,cb=exports.GLP_OFF=0,Ga=exports.GLP_IROWGEN=1,Xf=exports.GLP_IBINGO=2,Yf=exports.GLP_IHEUR=3,Ia=exports.GLP_ICUTGEN=4,bg=exports.GLP_IBRANCH=5,Qf=exports.GLP_ISELECT=6,Uf=exports.GLP_IPREPRO=7,Af=exports.GLP_NO_BRNCH=0,Bf=exports.GLP_DN_BRNCH=1,Cf=exports.GLP_UP_BRNCH=2,Kb=exports.GLP_EBADB=1,Mb=exports.GLP_ESING=2,Nb=exports.GLP_ECOND=
3,rc=exports.GLP_EBOUND=4,Sb=exports.GLP_EFAIL=5,Vf=exports.GLP_EOBJLL=6,Wf=exports.GLP_EOBJUL=7,rg=exports.GLP_EITLIM=8,Qc=exports.GLP_ETMLIM=9,ac=exports.GLP_ENOPFS=10,bc=exports.GLP_ENODFS=11,Lc=exports.GLP_EROOT=12,Rc=exports.GLP_ESTOP=13,Pc=exports.GLP_EMIPGAP=14;exports.GLP_ENOFEAS=15;exports.GLP_ENOCVG=16;exports.GLP_EINSTAB=17;exports.GLP_EDATA=18;exports.GLP_ERANGE=19;exports.GLP_KKT_PE=1;exports.GLP_KKT_PB=2;exports.GLP_KKT_DE=3;exports.GLP_KKT_DB=4;exports.GLP_KKT_CS=5;
exports.GLP_MPS_DECK=1;exports.GLP_MPS_FILE=2;exports.GLP_ASN_MIN=1;exports.GLP_ASN_MAX=2;exports.GLP_ASN_MMP=3;function ug(a){var b=Math.floor(Math.log(a)/Math.log(2))+1;return Math.pow(2,0.75>=a/Math.pow(2,b)?b-1:b)}function vg(a,b){var c=Number(a);if(isNaN(c))return 2;switch(c){case Number.POSITIVE_INFINITY:case Number.NEGATIVE_INFINITY:return 1;default:return b(c),0}}
function wg(a,b){var c=Number(a);if(isNaN(c))return 2;switch(c){case Number.POSITIVE_INFINITY:case Number.NEGATIVE_INFINITY:return 1;default:return 0==c%1?(b(c),0):2}}function xg(a,b,c){var d,e;if(!(1<=a&&31>=a&&1<=b&&12>=b&&1<=c&&4E3>=c))return-1;3<=b?b-=3:(b+=9,c--);d=c/100|0;c=(146097*d/4|0)+(1461*(c-100*d)/4|0);c+=(153*b+2)/5|0;c+=a+1721119;yg(c,function(a){e=a});a!=e&&(c=-1);return c}
function yg(a,b){var c,d,e;1721426<=a&&3182395>=a&&(a-=1721119,e=(4*a-1)/146097|0,c=(4*a-1)%146097/4|0,a=(4*c+3)/1461|0,c=((4*c+3)%1461+4)/4|0,d=(5*c-3)/153|0,c=(5*c-3)%153,c=(c+5)/5|0,e=100*e+a,9>=d?d+=3:(d-=9,e++),b(c,d,e))}var Ee=1;LPF_ECOND=2;LPF_ELIMIT=3;var we=0;function Me(a,b,c,d){var e=a.i,f=a.Md,g=a.Ld,h=a.Wb;a=a.Xb;var k,l,p,m;for(k=1;k<=e;k++){m=0;l=f[k];for(p=l+g[k];l<p;l++)m+=a[l]*d[h[l]];b[k+c]+=-1*m}}
function Je(a,b,c,d){var e=a.i,f=a.Od,g=a.Nd,h=a.Wb;a=a.Xb;var k,l,p,m;for(k=1;k<=e;k++){m=0;l=f[k];for(p=l+g[k];l<p;l++)m+=a[l]*d[h[l]];b[k+c]+=-1*m}}if(we)var Le=function(a,b,c,d){var e=a.g;a=a.Cf;var f,g,h=0,k,l,p;for(f=1;f<=e;f++){k=0;for(g=p=1;g<=e;g++)l=b?a[e*(g-1)+f]*c[g]:a[e*(f-1)+g]*c[g],p<Math.abs(l)&&(p=Math.abs(l)),k+=l;g=Math.abs(k-d[f])/p;h<g&&(h=g)}1E-8<h&&x((b?"lpf_btran":"lpf_ftran")+": dmax = "+h+"; relative error too large")};exports.LPX_LP=100;exports.LPX_MIP=101;
var gf=exports.LPX_FR=110,jf=exports.LPX_LO=111,lf=exports.LPX_UP=112,nf=exports.LPX_DB=113,cf=exports.LPX_FX=114;exports.LPX_MIN=120;exports.LPX_MAX=121;exports.LPX_P_UNDEF=132;exports.LPX_P_FEAS=133;exports.LPX_P_INFEAS=134;exports.LPX_P_NOFEAS=135;exports.LPX_D_UNDEF=136;exports.LPX_D_FEAS=137;exports.LPX_D_INFEAS=138;exports.LPX_D_NOFEAS=139;var ff=exports.LPX_BS=140,kf=exports.LPX_NL=141,mf=exports.LPX_NU=142,hf=exports.LPX_NF=143,of=exports.LPX_NS=144;exports.LPX_T_UNDEF=150;
exports.LPX_T_OPT=151;var Mf=exports.LPX_CV=160,Nf=exports.LPX_IV=161;exports.LPX_I_UNDEF=170;exports.LPX_I_OPT=171;exports.LPX_I_FEAS=172;exports.LPX_I_NOFEAS=173;exports.LPX_OPT=180;exports.LPX_FEAS=181;exports.LPX_INFEAS=182;exports.LPX_NOFEAS=183;exports.LPX_UNBND=184;exports.LPX_UNDEF=185;exports.LPX_E_OK=200;exports.LPX_E_EMPTY=201;exports.LPX_E_BADB=202;exports.LPX_E_INFEAS=203;exports.LPX_E_FAULT=204;exports.LPX_E_OBJLL=205;exports.LPX_E_OBJUL=206;exports.LPX_E_ITLIM=207;
exports.LPX_E_TMLIM=208;exports.LPX_E_NOFEAS=209;exports.LPX_E_INSTAB=210;exports.LPX_E_SING=211;exports.LPX_E_NOCONV=212;exports.LPX_E_NOPFS=213;exports.LPX_E_NODFS=214;exports.LPX_E_MIPGAP=215;var zg=exports.LPX_K_MSGLEV=300,Ag=exports.LPX_K_SCALE=301,Bg=exports.LPX_K_DUAL=302,Cg=exports.LPX_K_PRICE=303;exports.LPX_K_RELAX=304;exports.LPX_K_TOLBND=305;exports.LPX_K_TOLDJ=306;exports.LPX_K_TOLPIV=307;var Dg=exports.LPX_K_ROUND=308;exports.LPX_K_OBJLL=309;exports.LPX_K_OBJUL=310;
var Eg=exports.LPX_K_ITLIM=311,Fg=exports.LPX_K_ITCNT=312;exports.LPX_K_TMLIM=313;var Gg=exports.LPX_K_OUTFRQ=314;exports.LPX_K_OUTDLY=315;var Hg=exports.LPX_K_BRANCH=316,Ig=exports.LPX_K_BTRACK=317;exports.LPX_K_TOLINT=318;exports.LPX_K_TOLOBJ=319;
var Jg=exports.LPX_K_MPSINFO=320,Kg=exports.LPX_K_MPSOBJ=321,Lg=exports.LPX_K_MPSORIG=322,Mg=exports.LPX_K_MPSWIDE=323,Ng=exports.LPX_K_MPSFREE=324,Og=exports.LPX_K_MPSSKIP=325,Pg=exports.LPX_K_LPTORIG=326,Qg=exports.LPX_K_PRESOL=327,Rg=exports.LPX_K_BINARIZE=328,Sg=exports.LPX_K_USECUTS=329,Tg=exports.LPX_K_BFTYPE=330;exports.LPX_K_MIPGAP=331;exports.LPX_C_COVER=1;exports.LPX_C_CLIQUE=2;exports.LPX_C_GOMORY=4;exports.LPX_C_MIR=8;exports.LPX_C_ALL=255;
function Kf(a,b){var c=pb(a,b);c==-s&&(c=0);return c}function Jf(a,b){var c=qb(a,b);c==+s&&(c=0);return c}function df(a,b,c){c(ob(a,b)-Ka+gf,Kf(a,b),Jf(a,b))}function Lf(a,b){var c=sb(a,b);c==-s&&(c=0);return c}function Of(a,b){var c=tb(a,b);c==+s&&(c=0);return c}function bf(a,b,c){c(rb(a,b)-Ka+gf,Lf(a,b),Of(a,b))}
function ef(a){var b=zg,c;null==a.ke&&(a.ke={},c=a.ke,c.o=3,c.scale=1,c.J=0,c.mh=1,c.yh=0.07,c.Gb=1E-7,c.tb=1E-7,c.xe=1E-9,c.round=0,c.hf=-s,c.jf=+s,c.oc=-1,c.sb=-1,c.bc=200,c.fb=0,c.Og=2,c.Pg=3,c.Ub=1E-5,c.we=1E-7,c.Xg=1,c.Yg=2,c.Zg=0,c.ah=1,c.Wg=0,c.$g=0,c.Vg=0,c.lh=0,c.sd=0,c.wh=0,c.ce=0);c=a.ke;var d=0;switch(b){case zg:d=c.o;break;case Ag:d=c.scale;break;case Bg:d=c.J;break;case Cg:d=c.mh;break;case Dg:d=c.round;break;case Eg:d=c.oc;break;case Fg:d=a.$;break;case Gg:d=c.bc;break;case Hg:d=c.Og;
break;case Ig:d=c.Pg;break;case Jg:d=c.Xg;break;case Kg:d=c.Yg;break;case Lg:d=c.Zg;break;case Mg:d=c.ah;break;case Ng:d=c.Wg;break;case Og:d=c.$g;break;case Pg:d=c.Vg;break;case Qg:d=c.lh;break;case Rg:d=c.sd;break;case Sg:d=c.wh;break;case Tg:b={};eb(a,b);switch(b.type){case md:d=1;break;case rd:d=2;break;case sd:d=3}break;default:w("lpx_get_int_parm: parm = "+b+"; invalid parameter")}return d}var ye=1,Ae=2;
function ve(){var a={};a.K=a.i=0;a.valid=0;a.Rf=a.Ye=null;a.Yd=a.Xd=null;a.Fc=a.Ec=a.pd=null;a.Af=null;a.Dc=a.Cc=a.Rc=null;a.kb=a.vb=null;a.sf=a.me=null;a.Ga=0;a.Fa=a.Ma=0;a.wb=null;a.xb=null;a.ld=a.Sb=0;a.Hd=a.md=null;a.zf=null;a.vf=a.dg=a.wf=null;a.Oe=a.Qe=a.Pe=null;a.ba=null;a.ze=null;a.Va=0;a.cc=0.1;a.xc=4;a.gc=1;a.Mb=1E-15;a.sc=1E10;a.dh=a.$f=a.Qb=0;a.Cg=a.rd=0;a.pa=0;return a}
function af(a){var b=a.i,c=a.Fc,d=a.Ec,e=a.pd,f=a.Dc,g=a.Cc,h=a.Rc,k=a.wb,l=a.xb,p=a.md,m=1,q,r;for(r=a.ld;0!=r;r=p[r])if(r<=b){q=r;if(c[q]!=m)break;e[q]=d[q];m+=e[q]}else{q=r-b;if(f[q]!=m)break;h[q]=g[q];m+=h[q]}for(;0!=r;r=p[r])r<=b?(q=r,ga(k,m,k,c[q],d[q]),ga(l,m,l,c[q],d[q]),c[q]=m,e[q]=d[q],m+=e[q]):(q=r-b,ga(k,m,k,f[q],g[q]),ga(l,m,l,f[q],g[q]),f[q]=m,h[q]=g[q],m+=h[q]);a.Fa=m}
function Ze(a,b,c){var d=a.i,e=a.Fc,f=a.Ec,g=a.pd,h=a.Rc,k=a.wb,l=a.xb,p=a.Hd,m=a.md,q=0,r;if(a.Ma-a.Fa<c&&(af(a),a.Ma-a.Fa<c))return 1;r=g[b];ga(k,a.Fa,k,e[b],f[b]);ga(l,a.Fa,l,e[b],f[b]);e[b]=a.Fa;g[b]=c;a.Fa+=c;0==p[b]?a.ld=m[b]:(c=p[b],c<=d?g[c]+=r:h[c-d]+=r,m[p[b]]=m[b]);0==m[b]?a.Sb=p[b]:p[m[b]]=p[b];p[b]=a.Sb;m[b]=0;0==p[b]?a.ld=b:m[p[b]]=b;a.Sb=b;return q}
function $e(a,b,c){var d=a.i,e=a.pd,f=a.Dc,g=a.Cc,h=a.Rc,k=a.wb,l=a.xb,p=a.Hd,m=a.md,q=0,r;if(a.Ma-a.Fa<c&&(af(a),a.Ma-a.Fa<c))return 1;r=h[b];ga(k,a.Fa,k,f[b],g[b]);ga(l,a.Fa,l,f[b],g[b]);f[b]=a.Fa;h[b]=c;a.Fa+=c;b=d+b;0==p[b]?a.ld=m[b]:(c=p[b],c<=d?e[c]+=r:h[c-d]+=r,m[p[b]]=m[b]);0==m[b]?a.Sb=p[b]:p[m[b]]=p[b];p[b]=a.Sb;m[b]=0;0==p[b]?a.ld=b:m[p[b]]=b;a.Sb=b;return q}
function Ug(a,b){var c=a.K;a.i=b;b<=c||(a.K=c=b+100,a.Rf=new Int32Array(1+c),a.Ye=new Int32Array(1+c),a.Yd=new Int32Array(1+c),a.Xd=new Int32Array(1+c),a.Fc=new Int32Array(1+c),a.Ec=new Int32Array(1+c),a.pd=new Int32Array(1+c),a.Af=new Float64Array(1+c),a.Dc=new Int32Array(1+c),a.Cc=new Int32Array(1+c),a.Rc=new Int32Array(1+c),a.kb=new Int32Array(1+c),a.vb=new Int32Array(1+c),a.sf=new Int32Array(1+c),a.me=new Int32Array(1+c),a.Hd=new Int32Array(1+c+c),a.md=new Int32Array(1+c+c),a.zf=new Float64Array(1+
c),a.vf=new Int32Array(1+c),a.dg=new Int32Array(1+c),a.wf=new Int32Array(1+c),a.Oe=new Int32Array(1+c),a.Qe=new Int32Array(1+c),a.Pe=new Int32Array(1+c),a.ba=new Int32Array(1+c),a.ze=new Float64Array(1+c))}
function Vg(a,b,c){var d=a.i,e=a.Yd,f=a.Xd,g=a.Fc,h=a.Ec,k=a.pd,l=a.Dc,p=a.Cc,m=a.Rc,q=a.kb,r=a.vb,n=a.sf,t=a.me,y=a.wb,E=a.xb,C=a.Hd,D=a.md,H=a.zf,R=a.vf,V=a.dg,O=a.wf,Q=a.Oe,F=a.Qe,W=a.Pe,X=a.ba,ca=a.ze,ka=0,P,u,z,L,v,S,M;L=1;v=a.Ga+1;for(u=1;u<=d;u++)e[u]=v,f[u]=0;for(P=1;P<=d;P++)h[P]=k[P]=0,X[P]=0;f=e=0;for(u=1;u<=d;u++){var ba=q,J=ca;z=b(c,u,ba,J);0<=z&&z<=d||w("luf_factorize: j = "+u+"; len = "+z+"; invalid column length");if(v-L<z)return ka=1;l[u]=L;p[u]=m[u]=z;e+=z;for(S=1;S<=z;S++)P=ba[S],
M=J[S],1<=P&&P<=d||w("luf_factorize: i = "+P+"; j = "+u+"; invalid row index"),X[P]&&w("luf_factorize: i = "+P+"; j = "+u+"; duplicate element not allowed"),0==M&&w("luf_factorize: i = "+P+"; j = "+u+"; zero element not allowed"),y[L]=P,E[L]=M,L++,0>M&&(M=-M),f<M&&(f=M),X[P]=1,k[P]++;for(S=1;S<=z;S++)X[ba[S]]=0}for(P=1;P<=d;P++){z=k[P];if(v-L<z)return ka=1;g[P]=L;L+=z}for(u=1;u<=d;u++)for(P=l[u],b=P+p[u]-1,k=P;k<=b;k++)P=y[k],M=E[k],c=g[P]+h[P],y[c]=u,E[c]=M,h[P]++;for(k=1;k<=d;k++)q[k]=r[k]=n[k]=
t[k]=k;a.Fa=L;a.Ma=v;a.ld=d+1;a.Sb=d;for(P=1;P<=d;P++)C[P]=P-1,D[P]=P+1;C[1]=d+d;D[d]=0;for(u=1;u<=d;u++)C[d+u]=d+u-1,D[d+u]=d+u+1;C[d+1]=0;for(k=D[d+d]=1;k<=d;k++)X[k]=0,ca[k]=0;a.dh=e;a.$f=0;a.Qb=e;a.Cg=f;a.rd=f;a.pa=-1;for(P=1;P<=d;P++)H[P]=-1;for(z=0;z<=d;z++)R[z]=0;for(P=1;P<=d;P++)z=h[P],V[P]=0,O[P]=R[z],0!=O[P]&&(V[O[P]]=P),R[z]=P;for(z=0;z<=d;z++)Q[z]=0;for(u=1;u<=d;u++)z=p[u],F[u]=0,W[u]=Q[z],0!=W[u]&&(F[W[u]]=u),Q[z]=u;return ka}
function Wg(a,b){function c(){b(D,H);return 0==D}var d=a.i,e=a.Fc,f=a.Ec,g=a.Dc,h=a.Cc,k=a.wb,l=a.xb,p=a.zf,m=a.vf,q=a.wf,r=a.Oe,n=a.Qe,t=a.Pe,y=a.cc,E=a.xc,C=a.gc,D,H,R,V,O,Q,F,W,X,ca,ka,P,u,z,L,v,S,M;D=H=0;v=s;ka=0;W=r[1];if(0!=W)return D=k[g[W]],H=W,c();V=m[1];if(0!=V)return D=V,H=k[e[V]],c();for(R=2;R<=d;R++){for(W=r[R];0!=W;W=P){V=g[W];X=V+h[W]-1;P=t[W];u=z=0;L=2147483647;for(ca=V;ca<=X;ca++)if(V=k[ca],O=e[V],Q=O+f[V]-1,!(f[V]>=L)){S=p[V];if(0>S){for(F=O;F<=Q;F++)M=l[F],0>M&&(M=-M),S<M&&(S=M);
p[V]=S}for(F=e[V];k[F]!=W;F++);M=l[F];0>M&&(M=-M);if(!(M<y*S)&&(u=V,z=W,L=f[V],L<=R))return D=u,H=z,c()}if(0!=u){if(ka++,W=(L-1)*(R-1),W<v&&(D=u,H=z,v=W),ka==E)return c()}else C&&(0==n[W]?r[R]=t[W]:t[n[W]]=t[W],0!=t[W]&&(n[t[W]]=n[W]),n[W]=t[W]=W)}for(V=m[R];0!=V;V=q[V]){O=e[V];Q=O+f[V]-1;S=p[V];if(0>S){for(F=O;F<=Q;F++)M=l[F],0>M&&(M=-M),S<M&&(S=M);p[V]=S}u=z=0;L=2147483647;for(F=O;F<=Q;F++)if(W=k[F],!(h[W]>=L)&&(M=l[F],0>M&&(M=-M),!(M<y*S)&&(u=V,z=W,L=h[W],L<=R)))return D=u,H=z,c();if(0!=u&&(ka++,
W=(R-1)*(L-1),W<v&&(D=u,H=z,v=W),ka==E))return c()}}return c()}
function Xg(a,b,c){var d=a.i,e=a.Yd,f=a.Xd,g=a.Fc,h=a.Ec,k=a.pd,l=a.Af,p=a.Dc,m=a.Cc,q=a.Rc,r=a.wb,n=a.xb,t=a.Hd,y=a.md,E=a.zf,C=a.vf,D=a.dg,H=a.wf,R=a.Oe,V=a.Qe,O=a.Pe,Q=a.ba,F=a.ze,W=a.Mb,X=a.Ye,ca=0,ka,P,u,z,L,v,S,M,ba,J,ea,fa;0==D[b]?C[h[b]]=H[b]:H[D[b]]=H[b];0!=H[b]&&(D[H[b]]=D[b]);0==V[c]?R[m[c]]=O[c]:O[V[c]]=O[c];0!=O[c]&&(V[O[c]]=V[c]);M=g[b];ba=M+h[b]-1;for(P=M;r[P]!=c;P++);fa=l[b]=n[P];r[P]=r[ba];n[P]=n[ba];h[b]--;ba--;l=p[c];J=l+m[c]-1;for(u=l;r[u]!=b;u++);r[u]=r[J];m[c]--;J--;for(P=M;P<=
ba;P++){z=r[P];Q[z]=1;F[z]=n[P];0==V[z]?R[m[z]]=O[z]:O[V[z]]=O[z];0!=O[z]&&(V[O[z]]=V[z]);v=p[z];for(S=v+m[z]-1;r[v]!=b;v++);r[v]=r[S];m[z]--}for(;l<=J;){u=r[l];0==D[u]?C[h[u]]=H[u]:H[D[u]]=H[u];0!=H[u]&&(D[H[u]]=D[u]);z=g[u];ka=z+h[u]-1;for(L=z;r[L]!=c;L++);ea=n[L]/fa;r[L]=r[ka];n[L]=n[ka];h[u]--;ka--;r[l]=r[J];m[c]--;J--;P=h[b];for(L=z;L<=ka;L++)if(z=r[L],Q[z])if(v=n[L]-=ea*F[z],0>v&&(v=-v),Q[z]=0,P--,0==v||v<W){r[L]=r[ka];n[L]=n[ka];h[u]--;L--;ka--;v=p[z];for(S=v+m[z]-1;r[v]!=u;v++);r[v]=r[S];
m[z]--}else a.rd<v&&(a.rd=v);if(h[u]+P>k[u]){if(Ze(a,u,h[u]+P))return ca=1;M=g[b];ba=M+h[b]-1;l=p[c];J=l+m[c]-1}ka=0;for(P=M;P<=ba;P++)z=r[P],Q[z]?(v=S=-ea*F[z],0>v&&(v=-v),0==v||v<W||(L=g[u]+h[u],r[L]=z,n[L]=S,h[u]++,X[++ka]=z,a.rd<v&&(a.rd=v))):Q[z]=1;for(L=1;L<=ka;L++){z=X[L];if(m[z]+1>q[z]){if($e(a,z,m[z]+10))return ca=1;M=g[b];ba=M+h[b]-1;l=p[c];J=l+m[c]-1}v=p[z]+m[z];r[v]=u;m[z]++}D[u]=0;H[u]=C[h[u]];0!=H[u]&&(D[H[u]]=u);C[h[u]]=u;E[u]=-1;if(1>a.Ma-a.Fa){af(a);if(1>a.Ma-a.Fa)return ca=1;M=g[b];
ba=M+h[b]-1;l=p[c];J=l+m[c]-1}a.Ma--;r[a.Ma]=u;n[a.Ma]=ea;f[b]++}q[c]=0;L=d+c;0==t[L]?a.ld=y[L]:y[t[L]]=y[L];0==y[L]?a.Sb=t[L]:t[y[L]]=t[L];e[b]=a.Ma;for(P=M;P<=ba;P++)if(z=r[P],Q[z]=0,F[z]=0,1==m[z]||V[z]!=z||O[z]!=z)V[z]=0,O[z]=R[m[z]],0!=O[z]&&(V[O[z]]=z),R[m[z]]=z;return ca}
function Yg(a){var b=a.i,c=a.Fc,d=a.Ec,e=a.Dc,f=a.Cc,g=a.Rc,h=a.wb,k=a.xb,l=a.Hd,p=a.md,m,q,r,n;n=0;for(m=1;m<=b;m++){q=c[m];for(r=q+d[m]-1;q<=r;q++)g[h[q]]++;n+=d[m]}a.Qb=n;if(a.Ma-a.Fa<n)return 1;for(n=1;n<=b;n++)e[n]=a.Fa,a.Fa+=g[n];for(m=1;m<=b;m++)for(q=c[m],r=q+d[m]-1;q<=r;q++)n=h[q],g=e[n]+f[n],h[g]=m,k[g]=k[q],f[n]++;for(c=b+1;c<=b+b;c++)l[c]=c-1,p[c]=c+1;l[b+1]=a.Sb;p[a.Sb]=b+1;p[b+b]=0;a.Sb=b+b;return 0}
function Zg(a){var b=a.i,c=a.Rf,d=a.Ye,e=a.Yd,f=a.Xd,g=a.wb,h=a.xb,k,l,p,m;for(k=1;k<=b;k++)d[k]=0;k=0;for(l=1;l<=b;l++){p=e[l];for(m=p+f[l]-1;p<=m;p++)d[g[p]]++;k+=f[l]}a.$f=k;if(a.Ma-a.Fa<k)return 1;for(k=1;k<=b;k++)c[k]=a.Ma,a.Ma-=d[k];for(l=1;l<=b;l++)for(p=e[l],m=p+f[l]-1;p<=m;p++)k=g[p],a=--c[k],g[a]=l,h[a]=h[p];return 0}
function xe(a,b,c,d){function e(){0<a.Va&&(a.Ga=a.Va,a.wb=new Int32Array(1+a.Ga),a.xb=new Float64Array(1+a.Ga),a.Va=0);if(Vg(a,c,d))return a.Va=a.Ga+a.Ga,!0;for(q=1;q<=b;q++){if(Wg(a,function(a,b){r=a;n=b}))return a.pa=q-1,y=ye,!1;p=g[r];m=h[n];t=f[q];f[p]=t;g[t]=p;f[q]=r;g[r]=q;t=k[q];k[m]=t;h[t]=m;k[q]=n;h[n]=q;if(Xg(a,r,n))return a.Va=a.Ga+a.Ga,!0;if(a.rd>l*a.Cg)return a.pa=q-1,y=Ae,!1}af(a);return Yg(a)||Zg(a)?(a.Va=a.Ga+a.Ga,!0):!1}var f,g,h,k,l=a.sc,p,m,q,r,n,t,y=null;1>b&&w("luf_factorize: n = "+
b+"; invalid parameter");1E8<b&&w("luf_factorize: n = "+b+"; matrix too big");a.valid=0;Ug(a,b);f=a.kb;g=a.vb;h=a.sf;k=a.me;0==a.Ga&&0==a.Va&&(a.Va=5*(b+10));for(;e(););if(null!=y)return y;a.valid=1;a.pa=b;y=0;t=3*(b+a.Qb)+2*a.$f;if(a.Ga<t)for(a.Va=a.Ga;a.Va<t;)q=a.Va,a.Va=q+q;return y}
function Ge(a,b,c){var d=a.i,e=a.Rf,f=a.Ye,g=a.Yd,h=a.Xd,k=a.kb,l=a.wb,p=a.xb,m;a.valid||w("luf_f_solve: LU-factorization is not valid");if(b)for(;1<=d;d--){if(m=k[d],a=c[m],0!=a)for(b=e[m],m=b+f[m]-1;b<=m;b++)c[l[b]]-=p[b]*a}else for(e=1;e<=d;e++)if(m=k[e],a=c[m],0!=a)for(b=g[m],m=b+h[m]-1;b<=m;b++)c[l[b]]-=p[b]*a}
function Ie(a,b,c){var d=a.i,e=a.Fc,f=a.Ec,g=a.Af,h=a.Dc,k=a.Cc,l=a.kb,p=a.me,m=a.wb,q=a.xb,r=a.ze,n,t,y;a.valid||w("luf_v_solve: LU-factorization is not valid");for(a=1;a<=d;a++)r[a]=c[a],c[a]=0;if(b)for(a=1;a<=d;a++){if(n=l[a],t=p[a],b=r[t],0!=b)for(c[n]=b/=g[n],y=e[n],n=y+f[n]-1;y<=n;y++)r[m[y]]-=q[y]*b}else for(a=d;1<=a;a--)if(n=l[a],t=p[a],b=r[n],0!=b)for(c[t]=b/=g[n],y=h[t],n=y+k[t]-1;y<=n;y++)r[m[y]]-=q[y]*b}
var $g=-1,ah=101,bh=102,ch=103,dh=104,eh=105,fh=106,gh=107,hh=108,ih=109,jh=110,kh=111,lh=112,mh=113,nh=114,oh=115,ph=116,qh=117,N=118,rh=119,sh=120,th=121,uh=122,vh=123,T=124,wh=125,xh=126,yh=127,zh=60,Ah=201,Bh=202,Ch=203,Dh=204,Eh=205,Fh=206,Gh=207,Hh=208,Ih=209,Jh=210,Kh=211,Lh=212,Mh=213,Nh=214,Oh=215,Ph=216,Qh=217,Rh=218,Sh=219,Th=220,Uh=221,Vh=222,Wh=223,Xh=224,Yh=225,Zh=226,$h=227,ai=228,bi=229,ci=230,di=231,ei=232,fi=233,gi=234,hi=235,ii=236,ji=237,ki=238,li=239,mi=240,ni=241,oi=242,pi=243,
qi=244,ri=245,si=246,ti=247,ui=248,vi=249,wi=250,xi=251,yi=252,zi=0,Ai=1,Bi=2,Ci=3,Di=4,Ei=5,Fi=301,Gi=302,Hi=303,Ii=304,Ji=305,Ki=306,Li=307,Mi=308,Ni=309,Oi=310,Pi=311,Qi=312,Ri=313,Si=314,Ti=315,Ui=316,Vi=317,Wi=318,Xi=319,Yi=320,Zi=321,$i=322,aj=323,bj=324,cj=325,dj=326,ej=327,fj=328,gj=329,hj=330,ij=331,jj=332,kj=333,lj=334,mj=335,nj=336,oj=337,pj=338,qj=339,rj=340,sj=341,tj=342,uj=343,vj=344,wj=345,xj=346,yj=347,zj=348,Aj=349,Bj=350,Cj=351,Dj=352,Ej=353,Fj=354,Gj=355,Hj=356,Ij=357,Jj=358,Kj=
359,Lj=360,Mj=361,Nj=362,Oj=363,Pj=364,Qj=365,Rj=366,Sj=367,Tj=368,Uj=369,Vj=370,Xj=371,Yj=372,Zj=373,ak=374,bk=375,ck=376,dk=377,ek=378,fk=379,gk=380,hk=381,ik=382,jk=383,kk=384,Wd=401,Xd=402,Yd=403,Zd=404,$d=405,je=412,ke=413,ee=422,fe=423;function lk(){return{index:{},S:{},set:{},t:{},H:{},a:{},loop:{}}}function mk(a){var b;b=a.b==Ah?"_|_":a.b==Eh?"'...'":a.h;a.Zb[a.lc++]=" ";a.lc==zh&&(a.lc=0);for(var c=0;c<b.length;c++)a.Zb[a.lc++]=b[c],a.lc==zh&&(a.lc=0)}
function nk(a){var b;a.l!=$g&&("\n"==a.l&&(a.bb++,a.Vc=0),b=a.cf(),0>b&&(b=$g),a.Vc++,b==$g?"\n"==a.l?a.bb--:ok(a,"final NL missing before end of file"):"\n"!=b&&(0<=" \t\n\v\f\r".indexOf(b)?b=" ":ta(b)&&(mk(a),U(a,"control character "+b+" not allowed"))),a.l=b)}function pk(a){a.h+=a.l;a.Bb++;nk(a)}
function Y(a){function b(){mk(a);U(a,"keyword s.t. incomplete")}function c(){mk(a);U(a,"cannot convert numeric literal "+a.h+" to floating-point number")}function d(){if("e"==a.l||"E"==a.l)for(pk(a),"+"!=a.l&&"-"!=a.l||pk(a),wa(a.l)||(mk(a),U(a,"numeric literal "+a.h+" incomplete"));wa(a.l);)pk(a);if(ua(a.l)||"_"==a.l)mk(a),U(a,"symbol "+a.h+a.l+"... should be enclosed in quotes")}a.Hf=a.b;a.Gf=a.Bb;a.Ff=a.h;a.If=a.value;if(a.Ue)a.Ue=0,a.b=a.Mf,a.Bb=a.Lf,a.h=a.Kf,a.value=a.Nf;else{for(;;){a.b=0;a.Bb=
0;a.h="";for(a.value=0;" "==a.l||"\n"==a.l;)nk(a);if(a.l==$g)a.b=Ah;else if("#"==a.l){for(;"\n"!=a.l&&a.l!=$g;)nk(a);continue}else if(a.nc||!ua(a.l)&&"_"!=a.l)if(!a.nc&&wa(a.l)){for(a.b=Dh;wa(a.l);)pk(a);var e=!1;if("."==a.l)if(pk(a),"."==a.l)a.Bb--,a.h=a.h.substr(0,a.h.length-1),a.Te=1,e=!0;else for(;wa(a.l);)pk(a);e||d();vg(a.h,function(b){a.value=b})&&c()}else if("'"==a.l||'"'==a.l){var f=a.l,g=!1;a.b=Eh;nk(a);e=function(){for(;;){if("\n"==a.l&&!g||a.l==$g)mk(a),U(a,"unexpected end of line; string literal incomplete");
if(a.l==f)if(nk(a),a.l==f){if(g)if(nk(a),a.l==f){nk(a);break}else a.h+='""',a.Bb+=2}else if(g)a.h+='"',a.Bb++;else break;pk(a)}};a.l==f?(nk(a),a.l==f&&(g=!0,nk(a),e())):e()}else if(a.nc||"+"!=a.l)if(a.nc||"-"!=a.l)if("*"==a.l)a.b=$h,pk(a),"*"==a.l&&(a.b=bi,pk(a));else if("/"==a.l){if(a.b=ai,pk(a),"*"==a.l){for(nk(a);;)if(a.l==$g)U(a,"unexpected end of file; comment sequence incomplete");else if("*"==a.l){if(nk(a),"/"==a.l)break}else nk(a);nk(a);continue}}else if("^"==a.l)a.b=bi,pk(a);else if("<"==
a.l)a.b=ci,pk(a),"="==a.l?(a.b=di,pk(a)):">"==a.l?(a.b=hi,pk(a)):"-"==a.l&&(a.b=yi,pk(a));else if("="==a.l)a.b=ei,pk(a),"="==a.l&&pk(a);else if(">"==a.l)a.b=gi,pk(a),"="==a.l?(a.b=fi,pk(a)):">"==a.l&&(a.b=wi,pk(a));else if("!"==a.l)a.b=Rh,pk(a),"="==a.l&&(a.b=hi,pk(a));else if("&"==a.l)a.b=ii,pk(a),"&"==a.l&&(a.b=Fh,pk(a));else if("|"==a.l)a.b=ji,pk(a),"|"==a.l&&(a.b=Sh,pk(a));else if(a.nc||"."!=a.l)if(","==a.l)a.b=li,pk(a);else if(":"==a.l)a.b=mi,pk(a),"="==a.l&&(a.b=oi,pk(a));else if(";"==a.l)a.b=
ni,pk(a);else if("("==a.l)a.b=qi,pk(a);else if(")"==a.l)a.b=ri,pk(a);else if("["==a.l)a.b=si,pk(a);else if("]"==a.l)a.b=ti,pk(a);else if("{"==a.l)a.b=ui,pk(a);else if("}"==a.l)a.b=vi,pk(a);else if("~"==a.l)a.b=xi,pk(a);else if(va(a.l)||0<="+-._".indexOf(a.l)){for(a.b=Ch;va(a.l)||0<="+-._".indexOf(a.l);)pk(a);switch(vg(a.h,function(b){a.value=b})){case 0:a.b=Dh;break;case 1:c()}}else mk(a),U(a,"character "+a.l+" not allowed");else if(a.b=ki,pk(a),a.Te)a.b=pi,a.Bb=2,a.h="..",a.Te=0;else if("."==a.l)a.b=
pi,pk(a);else{if(wa(a.l)){a.b=Dh;for(pk(a);wa(a.l);)pk(a);d();vg(a.h,function(b){a.value=b})&&c()}}else a.b=Zh,pk(a);else a.b=Yh,pk(a);else{for(a.b=Bh;va(a.l)||"_"==a.l;)pk(a);"and"==a.h?a.b=Fh:"by"==a.h?a.b=Gh:"cross"==a.h?a.b=Hh:"diff"==a.h?a.b=Ih:"div"==a.h?a.b=Jh:"else"==a.h?a.b=Kh:"if"==a.h?a.b=Lh:"in"==a.h?a.b=Mh:"Infinity"==a.h?a.b=Nh:"inter"==a.h?a.b=Oh:"less"==a.h?a.b=Ph:"mod"==a.h?a.b=Qh:"not"==a.h?a.b=Rh:"or"==a.h?a.b=Sh:"s"==a.h&&"."==a.l?(a.b=Th,pk(a),"t"!=a.l&&b(),pk(a),"."!=a.l&&b(),
pk(a)):"symdiff"==a.h?a.b=Uh:"then"==a.h?a.b=Vh:"union"==a.h?a.b=Wh:"within"==a.h&&(a.b=Xh)}break}mk(a);a.Pf=0}}function qk(a){a.Ue=1;a.Mf=a.b;a.Lf=a.Bb;a.Kf=a.h;a.Nf=a.value;a.b=a.Hf;a.Bb=a.Gf;a.h=a.Ff;a.value=a.If}function rk(a,b){return a.b==Bh&&a.h==b}function sk(a){return a.b==Fh&&"a"==a.h[0]||a.b==Gh||a.b==Hh||a.b==Ih||a.b==Jh||a.b==Kh||a.b==Lh||a.b==Mh||a.b==Oh||a.b==Ph||a.b==Qh||a.b==Rh&&"n"==a.h[0]||a.b==Sh&&"o"==a.h[0]||a.b==Uh||a.b==Vh||a.b==Wh||a.b==Xh}
function tk(a,b,c,d){var e={};e.Ta=a;e.T=0;e.a=lk();e.value={};switch(a){case Fi:e.a.Q=b.Q;break;case Gi:e.a.M=b.M;break;case Hi:e.a.index.ya=b.index.ya;e.a.index.e=b.index.e;break;case Ii:case Ji:for(a=b.S.list;null!=a;a=a.e)a.x.R=e,e.T|=a.x.T;e.a.S.S=b.S.S;e.a.S.list=b.S.list;break;case Ki:for(a=b.set.list;null!=a;a=a.e)a.x.R=e,e.T|=a.x.T;e.a.set.set=b.set.set;e.a.set.list=b.set.list;break;case Li:for(a=b.t.list;null!=a;a=a.e)a.x.R=e,e.T|=a.x.T;e.a.t.t=b.t.t;e.a.t.list=b.t.list;e.a.t.Ac=b.t.Ac;
break;case Mi:for(a=b.H.list;null!=a;a=a.e)a.x.R=e,e.T|=a.x.T;e.a.H.H=b.H.H;e.a.H.list=b.H.list;e.a.H.Ac=b.H.Ac;break;case Ni:case Oi:for(a=b.list;null!=a;a=a.e)a.x.R=e,e.T|=a.x.T;e.a.list=b.list;break;case Pi:e.a.slice=b.slice;break;case Qi:case Ri:case Si:case Ti:e.T=1;break;case Ui:case Vi:case Wi:case Xi:case Yi:case Zi:case $i:case aj:case bj:case cj:case dj:case ej:case fj:case gj:case hj:case ij:case jj:case kj:case lj:case mj:case nj:case oj:b.a.x.R=e;e.T|=b.a.x.T;e.a.a.x=b.a.x;break;case pj:case qj:case rj:case sj:case tj:case uj:case vj:case wj:case xj:case yj:case zj:case Aj:a==
Aj&&(e.T=1);case Bj:a==Bj&&(e.T=1);case Cj:case Dj:case Ej:case Fj:case Gj:case Hj:case Ij:case Jj:case Kj:case Lj:case Mj:case Nj:case Oj:case Pj:case Qj:case Rj:case Sj:case Tj:case Uj:case Vj:case Xj:b.a.x.R=e;e.T|=b.a.x.T;b.a.y.R=e;e.T|=b.a.y.T;e.a.a.x=b.a.x;e.a.a.y=b.a.y;break;case Yj:case Zj:case ak:b.a.x.R=e;e.T|=b.a.x.T;b.a.y.R=e;e.T|=b.a.y.T;null!=b.a.z&&(b.a.z.R=e,e.T|=b.a.z.T);e.a.a.x=b.a.x;e.a.a.y=b.a.y;e.a.a.z=b.a.z;break;case bk:case ck:for(a=b.list;null!=a;a=a.e)a.x.R=e,e.T|=a.x.T;
e.a.list=b.list;break;case dk:case ek:case fk:case gk:case hk:case ik:case jk:case kk:a=b.loop.domain;null!=a.code&&(a.code.R=e,e.T|=a.code.T);for(a=a.list;null!=a;a=a.e)a.code.R=e,e.T|=a.code.T;null!=b.loop.x&&(b.loop.x.R=e,e.T|=b.loop.x.T);e.a.loop.domain=b.loop.domain;e.a.loop.x=b.loop.x}e.type=c;e.q=d;e.R=null;e.valid=0;e.value={};return e}function Z(a,b,c,d){var e=lk();e.a.x=b;return tk(a,e,c,d)}function uk(a,b,c,d,e){var f=lk();f.a.x=b;f.a.y=c;return tk(a,f,d,e)}
function vk(a,b,c,d,e,f){var g=lk();g.a.x=b;g.a.y=c;g.a.z=d;return tk(a,g,e,f)}function wk(a,b){var c={},d;c.x=b;c.e=null;if(null==a)a=c;else{for(d=a;null!=d.e;d=d.e);d.e=c}return a}function xk(a){var b;for(b=0;null!=a;a=a.e)b++;return b}
function yk(a){var b,c,d,e,f,g,h,k,l,p=lk(),m=a.V[a.h];null==m&&U(a,a.h+" not defined");switch(m.type){case kh:b=m.link;k=b.name;l=0;break;case uh:c=m.link;k=c.name;l=c.q;0==c.X&&(c.X=1);break;case sh:d=m.link;k=d.name;l=d.q;break;case yh:e=m.link;k=e.name;l=e.q;break;case ch:f=m.link,k=f.name,l=f.q}Y(a);if(a.b==si){0==l&&U(a,k+" cannot be subscripted");Y(a);for(var q=null;;)if(g=zk(a),g.type==N&&(g=Z(Vi,g,T,0)),g.type!=T&&U(a,"subscript expression has invalid type"),q=wk(q,g),a.b==li)Y(a);else if(a.b==
ti)break;else U(a,"syntax error in subscript list");g=q;l!=xk(g)&&U(a,k+" must have "+l+" subscript"+(1==l?"":"s")+" rather than "+xk(g));Y(a)}else 0!=l&&U(a,k+" must be subscripted"),g=null;l=a.Ob||m.type!=yh?Di:zi;a.b==ki&&(Y(a),a.b!=Bh&&U(a,"invalid use of period"),m.type!=yh&&m.type!=ch&&U(a,k+" cannot have a suffix"),"lb"==a.h?l=Ai:"ub"==a.h?l=Bi:"status"==a.h?l=Ci:"val"==a.h?l=Di:"dual"==a.h?l=Ei:U(a,"suffix ."+a.h+" invalid"),Y(a));switch(m.type){case kh:p.index.ya=b;p.index.e=b.list;h=tk(Hi,
p,T,0);b.list=h;break;case uh:p.set.set=c;p.set.list=g;h=tk(Ki,p,fh,c.X);break;case sh:p.S.S=d;p.S.list=g;h=d.type==T?tk(Ji,p,T,0):tk(Ii,p,N,0);break;case yh:a.Ob||l!=Ci&&l!=Di&&l!=Ei||U(a,"invalid reference to status, primal value, or dual value of variable "+e.name+" above solve statement");p.t.t=e;p.t.list=g;p.t.Ac=l;h=tk(Li,p,l==zi?jh:N,0);break;case ch:a.Ob||l!=Ci&&l!=Di&&l!=Ei||U(a,"invalid reference to status, primal value, or dual value of "+(f.type==ch?"constraint":"objective")+" "+f.name+
" above solve statement"),p.H.H=f,p.H.list=g,p.H.Ac=l,h=tk(Mi,p,N,0)}return h}function Ak(a,b){var c=zk(a);c.type==T&&(c=Z(Ui,c,N,0));c.type!=N&&U(a,"argument for "+b+" has invalid type");return c}function Bk(a,b){var c=zk(a);c.type==N&&(c=Z(Vi,c,T,0));c.type!=T&&U(a,"argument for "+b+" has invalid type");return c}function Ck(a,b,c){var d={};d.name=b;d.code=c;d.value=null;d.list=null;d.e=null;if(null==a.list)a.list=d;else{for(a=a.list;null!=a.e;a=a.e);a.e=d}}
function Dk(a){var b,c=lk(),d=Array(21);ia(d,0,21);var e,f,g,h=0;e=a.Pf;Y(a);for(g=1;;g++){20<g&&U(a,"too many components within parentheses");var k=function(){b=Ek(a);if(a.b==li||1<g)b.type==N&&(b=Z(Vi,b,T,0)),b.type!=T&&U(a,"component expression has invalid type");d[g].name=null;d[g].code=b};if(a.b==Bh)if(Y(a),f=a.b,qk(a),!e||f!=li&&f!=ri||null!=a.V[a.h])k();else{for(f=1;f<g;f++)null!=d[f].name&&d[f].name==a.h&&U(a,"duplicate dummy index "+a.h+" not allowed");d[g].name=a.h;d[g].code=null;Y(a);h=
1;1==g&&a.b==ri&&U(a,d[g].name+" not defined")}else k();if(a.b==li)Y(a);else if(a.b==ri)break;else U(a,"right parenthesis missing where expected")}if(1!=g||h)if(h){c.slice={};for(f=1;f<=g;f++)Ck(c.slice,d[f].name,d[f].code);b=tk(Pi,c,xh,g)}else{c.list=null;for(f=1;f<=g;f++)c.list=wk(c.list,d[f].code);b=tk(Ni,c,xh,g)}else b=d[1].code;Y(a);h&&a.b!=Mh&&U(a,"keyword in missing where expected");e&&a.b==Mh&&!h&&(1==g?U(a,"syntax error in indexing expression"):U(a,"0-ary slice not allowed"));return b}
function Fk(a){var b,c,d,e;Y(a);a.b==vi&&U(a,"empty indexing expression not allowed");for(b={};;){e=c=null;a.b==Bh?(Y(a),d=a.b,qk(a),d==Mh&&null==a.V[a.h]&&(c={},d=a.h,Ck(c,d,null),Y(a),Y(a))):a.b==qi&&(a.Pf=1,e=Gk(a),e.Ta==Pi&&(c=e.a.slice,e=null,Y(a)));null==e&&(e=Gk(a));if(e.type!=fh){null!=c&&U(a,"domain expression has invalid type");d=a;var f=lk(),g=void 0;f.list=null;for(g=1;;g++){e.type==N&&(e=Z(Vi,e,T,0));e.type==T&&(e=Z(Xi,e,xh,1));e.type!=xh&&U(d,"member expression has invalid type");null!=
f.list&&f.list.x.q!=e.q&&U(d,"member "+(g-1)+" has "+f.list.x.q+" component"+(1==f.list.x.q?"":"s")+" while member "+g+" has "+e.q+" component"+(1==e.q?"":"s"));f.list=wk(f.list,e);if(d.b==li)Y(d);else if(d.b==vi)break;else U(d,"syntax error in literal set");e=zk(d)}e=tk(Oi,f,fh,f.list.x.q)}if(null==c)for(c={},d=1;d<=e.q;d++)Ck(c,null,null);f=0;for(d=c.list;null!=d;d=d.e)f++;f!=e.q&&U(a,f+" "+(1==f?"index":"indices")+" specified for set of dimension "+e.q);c.code=e;e=b;d=c;f=void 0;if(null==e.list)e.list=
d;else{for(f=e.list;null!=f.e;f=f.e);f.e=d}for(d=c.list;null!=d;d=d.e)null!=d.name&&(a.V[d.name]={type:kh,link:d});if(a.b==li)Y(a);else if(a.b==mi||a.b==vi)break;else U(a,"syntax error in indexing expression")}a.b==mi&&(Y(a),e=Ek(a),e.type==T&&(e=Z(Ui,e,N,0)),e.type==N&&(e=Z(Wi,e,nh,0)),e.type!=nh&&U(a,"expression following colon has invalid type"),b.code=e,a.b!=vi&&U(a,"syntax error in indexing expression"));Y(a);return b}
function Hk(a,b){var c,d;for(c=b.list;null!=c;c=c.e)for(d=c.list;null!=d;d=d.e)null!=d.name&&delete a.V[d.name]}function Ik(a){var b,c;for(b=a.a.loop.domain.list;null!=b;b=b.e)for(c=b.list;null!=c;c=c.e)null!=c.code&&(c.code.R=a)}
function Jk(a){function b(){U(a,"integrand following "+f+"{...} has invalid type")}var c,d=lk(),e,f;"sum"==a.h?e=dk:"prod"==a.h?e=ek:"min"==a.h?e=fk:"max"==a.h?e=gk:"forall"==a.h?e=hk:"exists"==a.h?e=ik:"setof"==a.h?e=jk:U(a,"operator "+a.h+" unknown");f=a.h;Y(a);d.loop.domain=Fk(a);switch(e){case dk:case ek:case fk:case gk:d.loop.x=Kk(a);d.loop.x.type==T&&(d.loop.x=Z(Ui,d.loop.x,N,0));d.loop.x.type==N||e==dk&&d.loop.x.type==jh||b();c=tk(e,d,d.loop.x.type,0);break;case hk:case ik:d.loop.x=Lk(a);d.loop.x.type==
T&&(d.loop.x=Z(Ui,d.loop.x,N,0));d.loop.x.type==N&&(d.loop.x=Z(Wi,d.loop.x,nh,0));d.loop.x.type!=nh&&b();c=tk(e,d,nh,0);break;case jk:d.loop.x=zk(a),d.loop.x.type==N&&(d.loop.x=Z(Vi,d.loop.x,T,0)),d.loop.x.type==T&&(d.loop.x=Z(Xi,d.loop.x,xh,1)),d.loop.x.type!=xh&&b(),c=tk(e,d,fh,d.loop.x.q)}Hk(a,d.loop.domain);Ik(c);return c}function Mk(a){var b=0;for(a=a.list;null!=a;a=a.e)for(var c=a.list;null!=c;c=c.e)null==c.code&&b++;return b}
function Nk(a,b){U(a,"operand preceding "+b+" has invalid type")}function Ok(a,b){U(a,"operand following "+b+" has invalid type")}function Pk(a,b,c,d){U(a,"operands preceding and following "+b+" have different dimensions "+c+" and "+d+", respectively")}
function Qk(a){var b,c;if(a.b==Dh)b=lk(),b.Q=a.value,b=tk(Fi,b,N,0),Y(a),c=b;else if(a.b==Nh)b=lk(),b.Q=s,c=tk(Fi,b,N,0),Y(a);else if(a.b==Eh)b=lk(),b.M=a.h,b=tk(Gi,b,T,0),Y(a),c=b;else if(a.b==Bh)switch(Y(a),c=a.b,qk(a),c){case si:c=yk(a);break;case qi:c=lk();var d;"abs"==a.h?b=bj:"ceil"==a.h?b=cj:"floor"==a.h?b=dj:"exp"==a.h?b=ej:"log"==a.h?b=fj:"log10"==a.h?b=gj:"sqrt"==a.h?b=hj:"sin"==a.h?b=ij:"cos"==a.h?b=jj:"atan"==a.h?b=kj:"min"==a.h?b=bk:"max"==a.h?b=ck:"round"==a.h?b=lj:"trunc"==a.h?b=mj:
"Irand224"==a.h?b=Qi:"Uniform01"==a.h?b=Ri:"Uniform"==a.h?b=Aj:"Normal01"==a.h?b=Si:"Normal"==a.h?b=Bj:"card"==a.h?b=nj:"length"==a.h?b=oj:"substr"==a.h?b=Uj:"str2time"==a.h?b=Vj:"time2str"==a.h?b=Xj:"gmtime"==a.h?b=Ti:U(a,"function "+a.h+" unknown");d=a.h;Y(a);Y(a);if(b==bk||b==ck)for(c.list=null;;)if(c.list=wk(c.list,Ak(a,d)),a.b==li)Y(a);else if(a.b==ri)break;else U(a,"syntax error in argument list for "+d);else if(b==Qi||b==Ri||b==Si||b==Ti)a.b!=ri&&U(a,d+" needs no arguments");else if(b==Aj||
b==Bj)c.a.x=Ak(a,d),a.b!=li&&(a.b==ri?U(a,d+" needs two arguments"):U(a,"syntax error in argument for "+d)),Y(a),c.a.y=Ak(a,d),a.b==li?U(a,d+" needs two argument"):a.b!=ri&&U(a,"syntax error in argument for "+d);else if(b==kj||b==lj||b==mj){c.a.x=Ak(a,d);if(a.b==li){switch(b){case kj:b=xj;break;case lj:b=yj;break;case mj:b=zj}Y(a);c.a.y=Ak(a,d)}a.b==li?U(a,d+" needs one or two arguments"):a.b!=ri&&U(a,"syntax error in argument for "+d)}else if(b==Uj)c.a.x=Bk(a,d),a.b!=li&&(a.b==ri?U(a,d+" needs two or three arguments"):
U(a,"syntax error in argument for "+d)),Y(a),c.a.y=Ak(a,d),a.b==li&&(b=ak,Y(a),c.a.z=Ak(a,d)),a.b==li?U(a,d+" needs two or three arguments"):a.b!=ri&&U(a,"syntax error in argument for "+d);else if(b==Vj)c.a.x=Bk(a,d),a.b!=li&&(a.b==ri?U(a,d+" needs two arguments"):U(a,"syntax error in argument for "+d)),Y(a),c.a.y=Bk(a,d),a.b==li?U(a,d+" needs two argument"):a.b!=ri&&U(a,"syntax error in argument for "+d);else if(b==Xj)c.a.x=Ak(a,d),a.b!=li&&(a.b==ri?U(a,d+" needs two arguments"):U(a,"syntax error in argument for "+
d)),Y(a),c.a.y=Bk(a,d),a.b==li?U(a,d+" needs two argument"):a.b!=ri&&U(a,"syntax error in argument for "+d);else{var e=c.a,f;b==nj?(f=Gk(a),f.type!=fh&&U(a,"argument for "+d+" has invalid type")):f=b==oj?Bk(a,d):Ak(a,d);e.x=f;a.b==li?U(a,d+" needs one argument"):a.b!=ri&&U(a,"syntax error in argument for "+d)}b=b==Uj||b==ak||b==Xj?tk(b,c,T,0):tk(b,c,N,0);Y(a);c=b;break;case ui:c=Jk(a);break;default:c=yk(a)}else if(a.b==qi)c=Dk(a);else if(a.b==ui)b=lk(),Y(a),a.b==vi?(b.list=null,b=tk(Oi,b,fh,1),Y(a)):
(qk(a),b.loop.domain=Fk(a),b.loop.x=null,Hk(a,b.loop.domain),b=tk(kk,b,fh,Mk(b.loop.domain)),Ik(b)),c=b;else if(a.b==Lh){Y(a);b=Ek(a);b.type==T&&(b=Z(Ui,b,N,0));b.type==N&&(b=Z(Wi,b,nh,0));b.type!=nh&&U(a,"expression following if has invalid type");a.b!=Vh&&U(a,"keyword then missing where expected");Y(a);c=Gk(a);c.type!=N&&c.type!=T&&c.type!=fh&&c.type!=jh&&U(a,"expression following then has invalid type");if(a.b!=Kh)c.type==fh&&U(a,"keyword else missing where expected"),d=null;else{Y(a);d=Gk(a);
d.type!=N&&d.type!=T&&d.type!=fh&&d.type!=jh&&U(a,"expression following else has invalid type");if(c.type==jh||d.type==jh)c.type==T&&(c=Z(Ui,c,N,0)),c.type==N&&(c=Z(Yi,c,jh,0)),d.type==T&&(d=Z(Ui,d,N,0)),d.type==N&&(d=Z(Yi,d,jh,0));if(c.type==T||d.type==T)c.type==N&&(c=Z(Vi,c,T,0)),d.type==N&&(d=Z(Vi,d,T,0));c.type!=d.type&&U(a,"expressions following then and else have incompatible types");c.q!=d.q&&U(a,"expressions following then and else have different dimensions "+c.q+" and "+d.q+", respectively")}c=
vk(Zj,b,c,d,c.type,c.q)}else sk(a)?U(a,"invalid use of reserved keyword "+a.h):U(a,"syntax error in expression");a.b==bi&&(d=a.h,c.type==T&&(c=Z(Ui,c,N,0)),c.type!=N&&Nk(a,d),Y(a),b=a.b==Yh||a.b==Zh?Rk(a):Qk(a),b.type==T&&(b=Z(Ui,b,N,0)),b.type!=N&&Ok(a,d),c=uk(wj,c,b,N,0));return c}
function Rk(a){var b;a.b==Yh?(Y(a),b=Qk(a),b.type==T&&(b=Z(Ui,b,N,0)),b.type!=N&&b.type!=jh&&Ok(a,"+"),b=Z(Zi,b,b.type,0)):a.b==Zh?(Y(a),b=Qk(a),b.type==T&&(b=Z(Ui,b,N,0)),b.type!=N&&b.type!=jh&&Ok(a,"-"),b=Z($i,b,b.type,0)):b=Qk(a);return b}
function Kk(a){for(var b,c=Rk(a);;)if(a.b==$h)c.type==T&&(c=Z(Ui,c,N,0)),c.type!=N&&c.type!=jh&&Nk(a,"*"),Y(a),b=Rk(a),b.type==T&&(b=Z(Ui,b,N,0)),b.type!=N&&b.type!=jh&&Ok(a,"*"),c.type==jh&&b.type==jh&&U(a,"multiplication of linear forms not allowed"),c=c.type==N&&b.type==N?uk(sj,c,b,N,0):uk(sj,c,b,jh,0);else if(a.b==ai)c.type==T&&(c=Z(Ui,c,N,0)),c.type!=N&&c.type!=jh&&Nk(a,"/"),Y(a),b=Rk(a),b.type==T&&(b=Z(Ui,b,N,0)),b.type!=N&&Ok(a,"/"),c=c.type==N?uk(tj,c,b,N,0):uk(tj,c,b,jh,0);else if(a.b==Jh)c.type==
T&&(c=Z(Ui,c,N,0)),c.type!=N&&Nk(a,"div"),Y(a),b=Rk(a),b.type==T&&(b=Z(Ui,b,N,0)),b.type!=N&&Ok(a,"div"),c=uk(uj,c,b,N,0);else if(a.b==Qh)c.type==T&&(c=Z(Ui,c,N,0)),c.type!=N&&Nk(a,"mod"),Y(a),b=Rk(a),b.type==T&&(b=Z(Ui,b,N,0)),b.type!=N&&Ok(a,"mod"),c=uk(vj,c,b,N,0);else break;return c}
function Sk(a){for(var b,c=Kk(a);;)if(a.b==Yh)c.type==T&&(c=Z(Ui,c,N,0)),c.type!=N&&c.type!=jh&&Nk(a,"+"),Y(a),b=Kk(a),b.type==T&&(b=Z(Ui,b,N,0)),b.type!=N&&b.type!=jh&&Ok(a,"+"),c.type==N&&b.type==jh&&(c=Z(Yi,c,jh,0)),c.type==jh&&b.type==N&&(b=Z(Yi,b,jh,0)),c=uk(pj,c,b,c.type,0);else if(a.b==Zh)c.type==T&&(c=Z(Ui,c,N,0)),c.type!=N&&c.type!=jh&&Nk(a,"-"),Y(a),b=Kk(a),b.type==T&&(b=Z(Ui,b,N,0)),b.type!=N&&b.type!=jh&&Ok(a,"-"),c.type==N&&b.type==jh&&(c=Z(Yi,c,jh,0)),c.type==jh&&b.type==N&&(b=Z(Yi,
b,jh,0)),c=uk(qj,c,b,c.type,0);else if(a.b==Ph)c.type==T&&(c=Z(Ui,c,N,0)),c.type!=N&&Nk(a,"less"),Y(a),b=Kk(a),b.type==T&&(b=Z(Ui,b,N,0)),b.type!=N&&Ok(a,"less"),c=uk(rj,c,b,N,0);else break;return c}function zk(a){for(var b,c=Sk(a);;)if(a.b==ii)c.type==N&&(c=Z(Vi,c,T,0)),c.type!=T&&Nk(a,"&"),Y(a),b=Sk(a),b.type==N&&(b=Z(Vi,b,T,0)),b.type!=T&&Ok(a,"&"),c=uk(Cj,c,b,T,0);else break;return c}
function Tk(a){var b,c,d=zk(a);a.b==pi&&(d.type==T&&(d=Z(Ui,d,N,0)),d.type!=N&&Nk(a,".."),Y(a),b=zk(a),b.type==T&&(b=Z(Ui,b,N,0)),b.type!=N&&Ok(a,".."),a.b==Gh?(Y(a),c=zk(a),c.type==T&&(c=Z(Ui,c,N,0)),c.type!=N&&Ok(a,"by")):c=null,d=vk(Yj,d,b,c,fh,1));return d}function Uk(a){for(var b,c=Tk(a);;)if(a.b==Hh)c.type!=fh&&Nk(a,"cross"),Y(a),b=Tk(a),b.type!=fh&&Ok(a,"cross"),c=uk(Pj,c,b,fh,c.q+b.q);else break;return c}
function Vk(a){for(var b,c=Uk(a);;)if(a.b==Oh)c.type!=fh&&Nk(a,"inter"),Y(a),b=Uk(a),b.type!=fh&&Ok(a,"inter"),c.q!=b.q&&Pk(a,"inter",c.q,b.q),c=uk(Oj,c,b,fh,c.q);else break;return c}
function Gk(a){for(var b,c=Vk(a);;)if(a.b==Wh)c.type!=fh&&Nk(a,"union"),Y(a),b=Vk(a),b.type!=fh&&Ok(a,"union"),c.q!=b.q&&Pk(a,"union",c.q,b.q),c=uk(Lj,c,b,fh,c.q);else if(a.b==Ih)c.type!=fh&&Nk(a,"diff"),Y(a),b=Vk(a),b.type!=fh&&Ok(a,"diff"),c.q!=b.q&&Pk(a,"diff",c.q,b.q),c=uk(Mj,c,b,fh,c.q);else if(a.b==Uh)c.type!=fh&&Nk(a,"symdiff"),Y(a),b=Vk(a),b.type!=fh&&Ok(a,"symdiff"),c.q!=b.q&&Pk(a,"symdiff",c.q,b.q),c=uk(Nj,c,b,fh,c.q);else break;return c}
function Wk(a){var b,c=-1,d="",e=Gk(a);switch(a.b){case ci:c=Dj;break;case di:c=Ej;break;case ei:c=Fj;break;case fi:c=Gj;break;case gi:c=Hj;break;case hi:c=Ij;break;case Mh:c=Qj;break;case Xh:c=Sj;break;case Rh:d=a.h;Y(a);a.b==Mh?c=Rj:a.b==Xh?c=Tj:U(a,"invalid use of "+d);d+=" ";break;default:return e}d+=a.h;switch(c){case Fj:case Ij:case Dj:case Ej:case Hj:case Gj:e.type!=N&&e.type!=T&&Nk(a,d);Y(a);b=Gk(a);b.type!=N&&b.type!=T&&Ok(a,d);e.type==N&&b.type==T&&(e=Z(Vi,e,T,0));e.type==T&&b.type==N&&
(b=Z(Vi,b,T,0));e=uk(c,e,b,nh,0);break;case Qj:case Rj:e.type==N&&(e=Z(Vi,e,T,0));e.type==T&&(e=Z(Xi,e,xh,1));e.type!=xh&&Nk(a,d);Y(a);b=Gk(a);b.type!=fh&&Ok(a,d);e.q!=b.q&&Pk(a,d,e.q,b.q);e=uk(c,e,b,nh,0);break;case Sj:case Tj:e.type!=fh&&Nk(a,d),Y(a),b=Gk(a),b.type!=fh&&Ok(a,d),e.q!=b.q&&Pk(a,d,e.q,b.q),e=uk(c,e,b,nh,0)}return e}function Xk(a){var b,c;a.b==Rh?(c=a.h,Y(a),b=Wk(a),b.type==T&&(b=Z(Ui,b,N,0)),b.type==N&&(b=Z(Wi,b,nh,0)),b.type!=nh&&Ok(a,c),b=Z(aj,b,nh,0)):b=Wk(a);return b}
function Lk(a){for(var b,c="",d=Xk(a);;)if(a.b==Fh)c=a.h,d.type==T&&(d=Z(Ui,d,N,0)),d.type==N&&(d=Z(Wi,d,nh,0)),d.type!=nh&&Nk(a,c),Y(a),b=Xk(a),b.type==T&&(b=Z(Ui,b,N,0)),b.type==N&&(b=Z(Wi,b,nh,0)),b.type!=nh&&Ok(a,c),d=uk(Jj,d,b,nh,0);else break;return d}
function Ek(a){for(var b,c=Lk(a);;)if(a.b==Sh){var d=a.h;c.type==T&&(c=Z(Ui,c,N,0));c.type==N&&(c=Z(Wi,c,nh,0));c.type!=nh&&Nk(a,d);Y(a);b=Lk(a);b.type==T&&(b=Z(Ui,b,N,0));b.type==N&&(b=Z(Wi,b,nh,0));b.type!=nh&&Ok(a,d);c=uk(Kj,c,b,nh,0)}else break;return c}
function Yk(a){function b(){U(a,"at most one := or default/data allowed")}function c(){U(a,a.h+" not a plain set")}function d(){U(a,"dimension of "+a.h+" too small")}function e(){U(a,"component number must be integer between 1 and "+k.set.X)}var f,g,h=0,k;Y(a);a.b!=Bh&&(sk(a)?U(a,"invalid use of reserved keyword "+a.h):U(a,"symbolic name missing where expected"));null!=a.V[a.h]&&U(a,a.h+" multiply declared");f={};f.name=a.h;f.Ib=null;f.q=0;f.domain=null;f.X=0;f.Bf=null;f.assign=null;f.xa=null;f.Yc=
null;f.data=0;f.O=null;Y(a);a.b==Eh&&(f.Ib=a.h,Y(a));a.b==ui&&(f.domain=Fk(a),f.q=Mk(f.domain));g=a.V[f.name]={};g.type=uh;for(g.link=f;;){if(a.b==li)Y(a);else if(a.b==ni)break;if(rk(a,"dimen")){var l;Y(a);a.b==Dh&&1<=a.value&&20>=a.value&&Math.floor(a.value)==a.value||U(a,"dimension must be integer between 1 and 20");l=a.value+0.5|0;h&&U(a,"at most one dimension attribute allowed");0<f.X&&U(a,"dimension "+l+" conflicts with dimension "+f.X+" already determined");f.X=l;h=1;Y(a)}else if(a.b==Xh||a.b==
Mh){a.b!=Mh||a.rg||(ok(a,"keyword in understood as within"),a.rg=1);Y(a);l={code:null,e:null};if(null==f.Bf)f.Bf=l;else{for(g=f.Bf;null!=g.e;g=g.e);g.e=l}l.code=Gk(a);l.code.type!=fh&&U(a,"expression following within has invalid type");0==f.X&&(f.X=l.code.q);f.X!=l.code.q&&U(a,"set expression following within must have dimension "+f.X+" rather than "+l.code.q)}else if(a.b==oi)null==f.assign&&null==f.xa&&null==f.Yc||b(),Y(a),f.assign=Gk(a),f.assign.type!=fh&&U(a,"expression following := has invalid type"),
0==f.X&&(f.X=f.assign.q),f.X!=f.assign.q&&U(a,"set expression following := must have dimension "+f.X+" rather than "+f.assign.q);else if(rk(a,"default"))null==f.assign&&null==f.xa||b(),Y(a),f.xa=Gk(a),f.xa.type!=fh&&U(a,"expression following default has invalid type"),0==f.X&&(f.X=f.xa.q),f.X!=f.xa.q&&U(a,"set expression following default must have dimension "+f.X+" rather than "+f.xa.q);else if(rk(a,"data")){var p=0;l=Array(20);null==f.assign&&null==f.Yc||b();Y(a);f.Yc=k={};a.b!=Bh&&(sk(a)?U(a,"invalid use of reserved keyword "+
a.h):U(a,"set name missing where expected"));g=a.V[a.h];null==g&&U(a,a.h+" not defined");g.type!=uh&&c();k.set=g.link;0!=k.set.q&&c();k.set==f&&U(a,"set cannot be initialized by itself");f.q>=k.set.X&&d();0==f.X&&(f.X=k.set.X-f.q);f.q+f.X>k.set.X?d():f.q+f.X<k.set.X&&U(a,"dimension of "+a.h+" too big");Y(a);a.b==qi?Y(a):U(a,"left parenthesis missing where expected");for(g=0;g<k.set.X;g++)l[g]=0;for(g=0;;)if(a.b!=Dh&&U(a,"component number missing where expected"),0!=wg(a.h,function(a){p=a})&&e(),1<=
p&&p<=k.set.X||e(),0!=l[p-1]&&U(a,"component "+p+" multiply specified"),k.Z[g++]=p,l[p-1]=1,Y(a),a.b==li)Y(a);else if(a.b==ri)break;else U(a,"syntax error in data attribute");g<k.set.X&&U(a,"there are must be "+k.set.X+" components rather than "+g);Y(a)}else U(a,"syntax error in set statement")}null!=f.domain&&Hk(a,f.domain);0==f.X&&(f.X=1);Y(a);return f}
function Zk(a){function b(){g&&U(a,"at most one binary allowed");d.type==T&&U(a,"symbolic parameter cannot be binary");d.type=ah;g=1;Y(a)}function c(){U(a,"at most one := or default allowed")}var d,e,f=0,g=0,h=0;Y(a);a.b!=Bh&&(sk(a)?U(a,"invalid use of reserved keyword "+a.h):U(a,"symbolic name missing where expected"));null!=a.V[a.h]&&U(a,a.h+" multiply declared");d={};d.name=a.h;d.Ib=null;d.q=0;d.domain=null;d.type=N;d.wd=null;d.qa=null;d.assign=null;d.xa=null;d.data=0;d.Wc=null;d.O=null;Y(a);a.b==
Eh&&(d.Ib=a.h,Y(a));a.b==ui&&(d.domain=Fk(a),d.q=Mk(d.domain));e=a.V[d.name]={};e.type=sh;for(e.link=d;;){if(a.b==li)Y(a);else if(a.b==ni)break;if(rk(a,"integer"))f&&U(a,"at most one integer allowed"),d.type==T&&U(a,"symbolic parameter cannot be integer"),d.type!=ah&&(d.type=mh),f=1,Y(a);else if(rk(a,"binary"))b();else if(rk(a,"logical"))a.Ke||(ok(a,"keyword logical understood as binary"),a.Ke=1),b();else if(rk(a,"symbolic"))h&&U(a,"at most one symbolic allowed"),d.type!=N&&U(a,"integer or binary parameter cannot be symbolic"),
null==d.wd&&null==d.qa&&null==d.assign&&null==d.xa||U(a,"keyword symbolic must precede any other parameter attributes"),d.type=T,h=1,Y(a);else if(a.b==ci||a.b==di||a.b==ei||a.b==fi||a.b==gi||a.b==hi){var k,l={};switch(a.b){case ci:l.jd=Dj;k=a.h;break;case di:l.jd=Ej;k=a.h;break;case ei:l.jd=Fj;k=a.h;break;case fi:l.jd=Gj;k=a.h;break;case gi:l.jd=Hj;k=a.h;break;case hi:l.jd=Ij,k=a.h}l.code=null;l.e=null;if(null==d.wd)d.wd=l;else{for(e=d.wd;null!=e.e;e=e.e);e.e=l}Y(a);l.code=zk(a);l.code.type!=N&&l.code.type!=
T&&U(a,"expression following "+k+" has invalid type");d.type!=T&&l.code.type==T&&(l.code=Z(Ui,l.code,N,0));d.type==T&&l.code.type!=T&&(l.code=Z(Vi,l.code,T,0))}else if(a.b==Mh||a.b==Xh){a.b!=Xh||a.qg||(ok(a,"keyword within understood as in"),a.qg=1);Y(a);l={code:null,e:null};if(null==d.qa)d.qa=l;else{for(e=d.qa;null!=e.e;e=e.e);e.e=l}l.code=Gk(a);l.code.type!=fh&&U(a,"expression following in has invalid type");1!=l.code.q&&U(a,"set expression following in must have dimension 1 rather than "+l.code.q)}else a.b==
oi?(null==d.assign&&null==d.xa||c(),Y(a),d.assign=zk(a),d.assign.type!=N&&d.assign.type!=T&&U(a,"expression following := has invalid type"),d.type!=T&&d.assign.type==T&&(d.assign=Z(Ui,d.assign,N,0)),d.type==T&&d.assign.type!=T&&(d.assign=Z(Vi,d.assign,T,0))):rk(a,"default")?(null==d.assign&&null==d.xa||c(),Y(a),d.xa=zk(a),d.xa.type!=N&&d.xa.type!=T&&U(a,"expression following default has invalid type"),d.type!=T&&d.xa.type==T&&(d.xa=Z(Ui,d.xa,N,0)),d.type==T&&d.xa.type!=T&&(d.xa=Z(Vi,d.xa,T,0))):U(a,
"syntax error in parameter statement")}null!=d.domain&&Hk(a,d.domain);Y(a);return d}
function $k(a){function b(){d&&U(a,"at most one binary allowed");e.type=ah;d=1;Y(a)}var c=0,d=0;a.Ob&&U(a,"variable statement must precede solve statement");Y(a);a.b!=Bh&&(sk(a)?U(a,"invalid use of reserved keyword "+a.h):U(a,"symbolic name missing where expected"));null!=a.V[a.h]&&U(a,a.h+" multiply declared");var e={};e.name=a.h;e.Ib=null;e.q=0;e.domain=null;e.type=N;e.P=null;e.W=null;e.O=null;Y(a);a.b==Eh&&(e.Ib=a.h,Y(a));a.b==ui&&(e.domain=Fk(a),e.q=Mk(e.domain));var f=a.V[e.name]={};f.type=yh;
for(f.link=e;;){if(a.b==li)Y(a);else if(a.b==ni)break;if(rk(a,"integer"))c&&U(a,"at most one integer allowed"),e.type!=ah&&(e.type=mh),c=1,Y(a);else if(rk(a,"binary"))b();else if(rk(a,"logical"))a.Ke||(ok(a,"keyword logical understood as binary"),a.Ke=1),b();else if(rk(a,"symbolic"))U(a,"variable cannot be symbolic");else if(a.b==fi)null!=e.P&&(e.P==e.W?U(a,"both fixed value and lower bound not allowed"):U(a,"at most one lower bound allowed")),Y(a),e.P=zk(a),e.P.type==T&&(e.P=Z(Ui,e.P,N,0)),e.P.type!=
N&&U(a,"expression following >= has invalid type");else if(a.b==di)null!=e.W&&(e.W==e.P?U(a,"both fixed value and upper bound not allowed"):U(a,"at most one upper bound allowed")),Y(a),e.W=zk(a),e.W.type==T&&(e.W=Z(Ui,e.W,N,0)),e.W.type!=N&&U(a,"expression following <= has invalid type");else if(a.b==ei){if(null!=e.P||null!=e.W)e.P==e.W?U(a,"at most one fixed value allowed"):null!=e.P?U(a,"both lower bound and fixed value not allowed"):U(a,"both upper bound and fixed value not allowed");f=a.h;Y(a);
e.P=zk(a);e.P.type==T&&(e.P=Z(Ui,e.P,N,0));e.P.type!=N&&U(a,"expression following "+f+" has invalid type");e.W=e.P}else a.b==ci||a.b==gi||a.b==hi?U(a,"strict bound not allowed"):U(a,"syntax error in variable statement")}null!=e.domain&&Hk(a,e.domain);Y(a);return e}
function al(a){function b(){U(a,"syntax error in constraint statement")}var c,d,e,f;a.Ob&&U(a,"constraint statement must precede solve statement");rk(a,"subject")?(Y(a),rk(a,"to")||U(a,"keyword subject to incomplete"),Y(a)):rk(a,"subj")?(Y(a),rk(a,"to")||U(a,"keyword subj to incomplete"),Y(a)):a.b==Th&&Y(a);a.b!=Bh&&(sk(a)?U(a,"invalid use of reserved keyword "+a.h):U(a,"symbolic name missing where expected"));null!=a.V[a.h]&&U(a,a.h+" multiply declared");var g={};g.name=a.h;g.Ib=null;g.q=0;g.domain=
null;g.type=ch;g.code=null;g.P=null;g.W=null;g.O=null;Y(a);a.b==Eh&&(g.Ib=a.h,Y(a));a.b==ui&&(g.domain=Fk(a),g.q=Mk(g.domain));c=a.V[g.name]={};c.type=ch;c.link=g;a.b!=mi&&U(a,"colon missing where expected");Y(a);c=zk(a);c.type==T&&(c=Z(Ui,c,N,0));c.type!=N&&c.type!=jh&&U(a,"expression following colon has invalid type");a.b==li&&Y(a);switch(a.b){case di:case fi:case ei:break;case ci:case gi:case hi:U(a,"strict inequality not allowed");break;case ni:U(a,"constraint must be equality or inequality");
break;default:b()}f=a.b;e=a.h;Y(a);d=zk(a);d.type==T&&(d=Z(Ui,d,N,0));d.type!=N&&d.type!=jh&&U(a,"expression following "+e+" has invalid type");a.b==li&&(Y(a),a.b==ni&&b());a.b==ci||a.b==di||a.b==ei||a.b==fi||a.b==gi||a.b==hi?(f!=ei&&a.b==f||U(a,"double inequality must be ... <= ... <= ... or ... >= ... >= ..."),c.type==jh&&U(a,"leftmost expression in double inequality cannot be linear form"),Y(a),e=zk(a),e.type==T&&(e=Z(Ui,d,N,0)),e.type!=N&&e.type!=jh&&U(a,"rightmost expression in double inequality constraint has invalid type"),
e.type==jh&&U(a,"rightmost expression in double inequality cannot be linear form")):e=null;null!=g.domain&&Hk(a,g.domain);c.type!=jh&&(c=Z(Yi,c,jh,0));d.type!=jh&&(d=Z(Yi,d,jh,0));null!=e&&(e=Z(Yi,e,jh,0));if(null==e)switch(f){case di:g.code=c;g.P=null;g.W=d;break;case fi:g.code=c;g.P=d;g.W=null;break;case ei:g.code=c,g.P=d,g.W=d}else switch(f){case di:g.code=d;g.P=c;g.W=e;break;case fi:g.code=d,g.P=e,g.W=c}a.b!=ni&&b();Y(a);return g}
function bl(a){var b,c={domain:null};c.list=b=null;Y(a);a.b==ui&&(c.domain=Fk(a));for(a.b==mi&&Y(a);;){var d={v:{}},e=function(){d.type=hh;d.v.code=Ek(a)};d.type=0;d.e=null;null==c.list?c.list=d:b.e=d;b=d;if(a.b==Bh){var f;Y(a);f=a.b;qk(a);if(f!=li&&f!=ni)e();else{e=a.V[a.h];null==e&&U(a,a.h+" not defined");d.type=e.type;switch(e.type){case kh:d.v.ya=e.link;break;case uh:d.v.set=e.link;break;case sh:d.v.S=e.link;break;case yh:d.v.t=e.link;a.Ob||U(a,"invalid reference to variable "+d.v.t.name+" above solve statement");
break;case ch:d.v.H=e.link,a.Ob||U(a,"invalid reference to "+(d.v.H.type==ch?"constraint":"objective")+" "+d.v.H.name+" above solve statement")}Y(a)}}else e();if(a.b==li)Y(a);else break}null!=c.domain&&Hk(a,c.domain);a.b!=ni&&U(a,"syntax error in display statement");Y(a);return c}
function cl(a){!a.nc&&rk(a,"end")||a.nc&&dl(a,"end")?(Y(a),a.b==ni?Y(a):ok(a,"no semicolon following end statement; missing semicolon inserted")):ok(a,"unexpected end of file; missing end statement inserted");a.b!=Ah&&ok(a,"some text detected beyond end statement; text ignored")}
function el(a,b){var c={v:{}};c.bb=a.bb;c.Vc=a.Vc;c.e=null;if(rk(a,"set"))b&&U(a,"set statement not allowed here"),c.type=uh,c.v.set=Yk(a);else if(rk(a,"param"))b&&U(a,"parameter statement not allowed here"),c.type=sh,c.v.S=Zk(a);else if(rk(a,"var"))b&&U(a,"variable statement not allowed here"),c.type=yh,c.v.t=$k(a);else if(rk(a,"subject")||rk(a,"subj")||a.b==Th)b&&U(a,"constraint statement not allowed here"),c.type=ch,c.v.H=al(a);else if(rk(a,"minimize")||rk(a,"maximize")){b&&U(a,"objective statement not allowed here");
c.type=ch;var d=c.v,e,f;rk(a,"minimize")?f=ph:rk(a,"maximize")&&(f=oh);a.Ob&&U(a,"objective statement must precede solve statement");Y(a);a.b!=Bh&&(sk(a)?U(a,"invalid use of reserved keyword "+a.h):U(a,"symbolic name missing where expected"));null!=a.V[a.h]&&U(a,a.h+" multiply declared");e={};e.name=a.h;e.Ib=null;e.q=0;e.domain=null;e.type=f;e.code=null;e.P=null;e.W=null;e.O=null;Y(a);a.b==Eh&&(e.Ib=a.h,Y(a));a.b==ui&&(e.domain=Fk(a),e.q=Mk(e.domain));f=a.V[e.name]={};f.type=ch;f.link=e;a.b!=mi&&
U(a,"colon missing where expected");Y(a);e.code=zk(a);e.code.type==T&&(e.code=Z(Ui,e.code,N,0));e.code.type==N&&(e.code=Z(Yi,e.code,jh,0));e.code.type!=jh&&U(a,"expression following colon has invalid type");null!=e.domain&&Hk(a,e.domain);a.b!=ni&&U(a,"syntax error in objective statement");Y(a);d.H=e}else if(rk(a,"table")){b&&U(a,"table statement not allowed here");c.type=wh;var d=c.v,g,h,k;Y(a);a.b!=Bh&&(sk(a)?U(a,"invalid use of reserved keyword "+a.h):U(a,"symbolic name missing where expected"));
null!=a.V[a.h]&&U(a,a.h+" multiply declared");e={v:{qa:{},Oc:{}}};e.name=a.h;Y(a);a.b==Eh?(e.Ib=a.h,Y(a)):e.Ib=null;a.b==ui?(e.type=rh,e.v.Oc.domain=Fk(a),rk(a,"OUT")||U(a,"keyword OUT missing where expected")):(e.type=lh,rk(a,"IN")||U(a,"keyword IN missing where expected"));Y(a);for(e.a=f=null;;)if(g={},a.b!=li&&a.b!=mi&&a.b!=ni||U(a,"argument expression missing where expected"),g.code=zk(a),g.code.type==N&&(g.code=Z(Vi,g.code,T,0)),g.code.type!=T&&U(a,"argument expression has invalid type"),g.e=
null,null==f?e.a=g:f.e=g,f=g,a.b==li)Y(a);else if(a.b==mi||a.b==ni)break;a.b==mi?Y(a):U(a,"colon missing where expected");switch(e.type){case lh:a.b==Bh?(g=a.V[a.h],null==g&&U(a,a.h+" not defined"),g.type!=uh&&U(a,a.h+" not a set"),e.v.qa.set=g.link,null!=e.v.qa.set.assign&&U(a,a.h+" needs no data"),0!=e.v.qa.set.q&&U(a,a.h+" must be a simple set"),Y(a),a.b==yi?Y(a):U(a,"delimiter <- missing where expected")):sk(a)?U(a,"invalid use of reserved keyword "+a.h):e.v.qa.set=null;e.v.qa.We=g=null;f=0;for(a.b==
si?Y(a):U(a,"field list missing where expected");;)if(h={},a.b!=Bh&&(sk(a)?U(a,"invalid use of reserved keyword "+a.h):U(a,"field name missing where expected")),h.name=a.h,Y(a),h.e=null,null==g?e.v.qa.We=h:g.e=h,g=h,f++,a.b==li)Y(a);else if(a.b==ti)break;else U(a,"syntax error in field list");null!=e.v.qa.set&&e.v.qa.set.X!=f&&U(a,"there must be "+e.v.qa.set.X+" field"+(1==e.v.qa.set.X?"":"s")+" rather than "+f);Y(a);for(e.v.qa.list=h=null;a.b==li;)Y(a),k={},a.b!=Bh&&(sk(a)?U(a,"invalid use of reserved keyword "+
a.h):U(a,"parameter name missing where expected")),g=a.V[a.h],null==g&&U(a,a.h+" not defined"),g.type!=sh&&U(a,a.h+" not a parameter"),k.S=g.link,k.S.q!=f&&U(a,a.h+" must have "+f+" subscript"+(1==f?"":"s")+" rather than "+k.S.q),null!=k.S.assign&&U(a,a.h+" needs no data"),Y(a),a.b==xi?(Y(a),a.b!=Bh&&(sk(a)?U(a,"invalid use of reserved keyword "+a.h):U(a,"field name missing where expected")),g=a.h,Y(a)):g=k.S.name,k.name=g,k.e=null,null==h?e.v.qa.list=k:h.e=k,h=k;break;case rh:for(e.v.Oc.list=f=null;;)if(h=
{},a.b!=li&&a.b!=ni||U(a,"expression missing where expected"),g=a.b==Bh?a.h:"",h.code=zk(a),a.b==xi&&(Y(a),a.b!=Bh&&(sk(a)?U(a,"invalid use of reserved keyword "+a.h):U(a,"field name missing where expected")),g=a.h,Y(a)),""==g&&U(a,"field name required"),h.name=g,h.e=null,null==f?e.v.Oc.list=h:f.e=h,f=h,a.b==li)Y(a);else if(a.b==ni)break;else U(a,"syntax error in output list");Hk(a,e.v.Oc.domain)}a.b!=ni&&U(a,"syntax error in table statement");Y(a);d.nd=e}else if(rk(a,"solve"))b&&U(a,"solve statement not allowed here"),
c.type=vh,d=c.v,a.Ob&&U(a,"at most one solve statement allowed"),a.Ob=1,Y(a),a.b!=ni&&U(a,"syntax error in solve statement"),Y(a),d.zh=null;else if(rk(a,"check"))c.type=bh,d=c.v,e={domain:null,code:null},Y(a),a.b==ui&&(e.domain=Fk(a)),a.b==mi&&Y(a),e.code=Ek(a),e.code.type!=nh&&U(a,"expression has invalid type"),null!=e.domain&&Hk(a,e.domain),a.b!=ni&&U(a,"syntax error in check statement"),Y(a),d.Rg=e;else if(rk(a,"display"))c.type=dh,c.v.Sg=bl(a);else if(rk(a,"printf")){c.type=th;d=c.v;g={domain:null,
zd:null};g.list=f=null;Y(a);a.b==ui&&(g.domain=Fk(a));a.b==mi&&Y(a);g.zd=zk(a);g.zd.type==N&&(g.zd=Z(Vi,g.zd,T,0));for(g.zd.type!=T&&U(a,"format expression has invalid type");a.b==li;)Y(a),e={code:null,e:null},null==g.list?g.list=e:f.e=e,f=e,e.code=Gk(a),e.code.type!=N&&e.code.type!=T&&e.code.type!=nh&&U(a,"only numeric, symbolic, or logical expression allowed");null!=g.domain&&Hk(a,g.domain);g.Ea=null;g.Mg=0;if(a.b==gi||a.b==wi)g.Mg=a.b==wi,Y(a),g.Ea=zk(a),g.Ea.type==N&&(g.Ea=Z(Vi,g.Ea,T,0)),g.Ea.type!=
T&&U(a,"file name expression has invalid type");a.b!=ni&&U(a,"syntax error in printf statement");Y(a);d.nh=g}else if(rk(a,"for")){c.type=ih;d=c.v;g={domain:null};g.list=f=null;Y(a);a.b!=ui&&U(a,"indexing expression missing where expected");g.domain=Fk(a);a.b==mi&&Y(a);if(a.b!=ui)g.list=el(a,1);else{for(Y(a);a.b!=vi;)e=el(a,1),null==f?g.list=e:f.e=e,f=e;Y(a)}Hk(a,g.domain);d.Ug=g}else a.b==Bh?(b&&U(a,"constraint statement not allowed here"),c.type=ch,c.v.H=al(a)):sk(a)?U(a,"invalid use of reserved keyword "+
a.h):U(a,"syntax error in model section");return c}function fl(a){var b,c;for(c=null;a.b!=Ah&&!rk(a,"data")&&!rk(a,"end");)b=el(a,0),null==c?a.uc=b:c.e=b,c=b}function gl(a,b){var c,d={};d.Y=b;d.e=null;if(null==a)a=d;else{for(c=a;null!=c.e;c=c.e);c.e=d}return a}function hl(a){for(var b=0;null!=a;a=a.e)b++;return b}function il(a){for(var b=0;null!=a;a=a.e)null==a.Y&&b++;return b}function jl(a){for(var b=null;0<a--;)b=gl(b,null);return b}function kl(a){return a.b==Dh||a.b==Ch||a.b==Eh}
function dl(a,b){return kl(a)&&a.h==b}function ll(a){var b;b=a.b==Dh?ml(a.value):nl(a.h);Y(a);return b}
function ol(a,b,c){var d,e;switch(a.b){case si:e=ti;break;case qi:e=ri}0==c&&U(a,b+" cannot be subscripted");Y(a);for(d=null;;)if(kl(a)?d=gl(d,ll(a)):a.b==$h?(d=gl(d,null),Y(a)):U(a,"number, symbol, or asterisk missing where expected"),a.b==li)Y(a);else if(a.b==e)break;else U(a,"syntax error in slice");if(hl(d)!=c)switch(e){case ti:U(a,b+" must have "+c+" subscript"+(1==c?"":"s")+", not "+hl(d));break;case ri:U(a,b+" has dimension "+c+", not "+hl(d))}Y(a);return d}
function pl(a,b){var c;c=a.V[b];null!=c&&c.type==uh||U(a,b+" not a set");c=c.link;null==c.assign&&null==c.Yc||U(a,b+" needs no data");c.data=1;return c}function ql(a,b,c){var d,e,f=null;for(d=null;null!=c;c=c.e)null==c.Y?(kl(a)||(e=il(c),1==e?U(a,"one item missing in data group beginning with "+rl(f)):U(a,e+" items missing in data group beginning with "+rl(f))),e=ll(a),null==f&&(f=e)):e=sl(c.Y),d=tl(d,e),null!=c.e&&a.b==li&&Y(a);ul(a,b.value.set,d)}
function vl(a,b,c,d){var e,f,g,h,k;for(e=null;a.b!=oi;)kl(a)||U(a,"number, symbol, or := missing where expected"),e=gl(e,ll(a));for(Y(a);kl(a);)for(k=ll(a),f=e;null!=f;f=f.e){var l=0;if(!dl(a,"+"))if(dl(a,"-")){Y(a);continue}else g=hl(f),1==g?U(a,"one item missing in data group beginning with "+rl(k)):U(a,g+" items missing in data group beginning with "+rl(k));h=null;for(g=c;null!=g;g=g.e)if(null==g.Y)switch(++l){case 1:h=tl(h,sl(d?f.Y:k));break;case 2:h=tl(h,sl(d?k:f.Y))}else h=tl(h,sl(g.Y));ul(a,
b.value.set,h);Y(a)}}
function wl(a){function b(){U(a,"slice currently used must specify 2 asterisks, not "+il(h))}function c(){U(a,"transpose indicator (tr) incomplete")}function d(){Y(a);dl(a,"tr")||c();2!=il(h)&&b();Y(a);a.b!=ri&&c();Y(a);a.b==mi&&Y(a);k=1;vl(a,g,h,k)}var e,f,g,h,k=0;Y(a);kl(a)||U(a,"set name missing where expected");e=pl(a,a.h);Y(a);f=null;if(a.b==si){0==e.q&&U(a,e.name+" cannot be subscripted");for(Y(a);;)if(kl(a)||U(a,"number or symbol missing where expected"),f=tl(f,ll(a)),a.b==li)Y(a);else if(a.b==
ti)break;else U(a,"syntax error in subscript list");e.q!=xl(f)&&U(a,e.name+" must have "+e.q+" subscript"+(1==e.q?"":"s")+" rather than "+xl(f));Y(a)}else 0!=e.q&&U(a,e.name+" must be subscripted");null!=yl(a,e.O,f)&&U(a,e.name+zl("[",f)+" already defined");g=Al(e.O,f);g.value.set=Bl(a,qh,e.X);for(h=jl(e.X);;)if(a.b==li&&Y(a),a.b==oi)Y(a);else if(a.b==qi)Y(a),f=dl(a,"tr"),qk(a),f?d():(h=ol(a,e.name,e.X),k=0,0==il(h)&&ql(a,g,h));else if(kl(a))ql(a,g,h);else if(a.b==mi)2!=il(h)&&b(),Y(a),vl(a,g,h,k);
else if(a.b==qi)d();else if(a.b==ni){Y(a);break}else U(a,"syntax error in set data block")}function Cl(a,b){var c;c=a.V[b];null!=c&&c.type==sh||U(a,b+" not a parameter");c=c.link;null!=c.assign&&U(a,b+" needs no data");c.data&&U(a,b+" already provided with data");c.data=1;return c}function Dl(a,b,c){null!=b.xa&&U(a,"default value for "+b.name+" already specified in model section");b.Wc=c}
function El(a,b,c){null!=yl(a,b.O,c)&&U(a,b.name+zl("[",c)+" already defined");c=Al(b.O,c);switch(b.type){case N:case mh:case ah:a.b==Dh||U(a,b.name+" requires numeric data");b=c.value;c=a.value;Y(a);b.Q=c;break;case T:c.value.Y=ll(a)}}
function Fl(a,b,c){var d,e,f=null;for(d=null;null!=c;c=c.e)null==c.Y?(kl(a)||U(a,il(c)+1+" items missing in data group beginning with "+rl(f)),e=ll(a),null==f&&(f=e)):e=sl(c.Y),d=tl(d,e),a.b==li&&Y(a);kl(a)||U(a,"one item missing in data group beginning with "+rl(f));El(a,b,d)}
function Gl(a,b,c,d){var e,f,g,h,k;for(e=null;a.b!=oi;)kl(a)||U(a,"number, symbol, or := missing where expected"),e=gl(e,ll(a));for(Y(a);kl(a);)for(k=ll(a),f=e;null!=f;f=f.e){var l=0;if(dl(a,"."))Y(a);else{h=null;for(g=c;null!=g;g=g.e)if(null==g.Y)switch(++l){case 1:h=tl(h,sl(d?f.Y:k));break;case 2:h=tl(h,sl(d?k:f.Y))}else h=tl(h,sl(g.Y));kl(a)||(g=hl(f),1==g?U(a,"one item missing in data group beginning with "+rl(k)):U(a,g+" items missing in data group beginning with "+rl(k)));El(a,b,h)}}}
function Hl(a,b){var c=null,d,e,f,g,h=0;g=null;kl(a)&&(Y(a),e=a.b,qk(a),e==mi&&(c=pl(a,a.h),0!=c.q&&U(a,c.name+" must be a simple set"),null!=c.O.head&&U(a,c.name+" already defined"),Al(c.O,null).value.set=Bl(a,qh,c.X),g=c.name,h=c.X,Y(a),Y(a)));for(e=null;a.b!=oi;)kl(a)||U(a,"parameter name or := missing where expected"),d=Cl(a,a.h),0==d.q&&U(a,a.h+" not a subscripted parameter"),0!=h&&d.q!=h&&U(a,g+" has dimension "+h+" while "+d.name+" has dimension "+d.q),null!=b&&Dl(a,d,sl(b)),e=gl(e,d),g=d.name,
h=d.q,Y(a),a.b==li&&Y(a);0==hl(e)&&U(a,"at least one parameter name required");Y(a);for(a.b==li&&Y(a);kl(a);){g=null;for(f=1;f<=h;f++)kl(a)||(d=hl(e)+h-f+1,U(a,d+" items missing in data group beginning with "+rl(g.Y))),g=tl(g,ll(a)),f<h&&a.b==li&&Y(a);null!=c&&ul(a,c.O.head.value.set,Il(g));a.b==li&&Y(a);for(f=e;null!=f;f=f.e)dl(a,".")?Y(a):(kl(a)||(d=hl(f),1==d?U(a,"one item missing in data group beginning with "+rl(g.Y)):U(a,d+" items missing in data group beginning with "+rl(g.Y))),El(a,f.Y,Il(g)),
null!=f.e&&a.b==li&&Y(a));a.b==li&&(Y(a),kl(a)||qk(a))}for(f=e;null!=f;f=f.e)f.Y=null}
function Jl(a){function b(){U(a,e.name+" not a subscripted parameter")}function c(){U(a,"slice currently used must specify 2 asterisks, not "+il(g))}function d(){U(a,"transpose indicator (tr) incomplete")}var e,f=null,g,h=0;Y(a);dl(a,"default")&&(Y(a),kl(a)||U(a,"default value missing where expected"),f=ll(a),a.b!=mi&&U(a,"colon missing where expected"));if(a.b==mi)Y(a),a.b==li&&Y(a),Hl(a,f),a.b!=ni&&U(a,"symbol, number, or semicolon missing where expected"),Y(a);else for(kl(a)||U(a,"parameter name missing where expected"),
e=Cl(a,a.h),Y(a),dl(a,"default")&&(Y(a),kl(a)||U(a,"default value missing where expected"),f=ll(a),Dl(a,e,f)),g=jl(e.q);;)if(a.b==li&&Y(a),a.b==oi)Y(a);else if(a.b==si)g=ol(a,e.name,e.q),h=0;else if(kl(a))Fl(a,e,g);else if(a.b==mi)0==e.q&&b(),2!=il(g)&&c(),Y(a),Gl(a,e,g,h);else if(a.b==qi)Y(a),dl(a,"tr")||d(),0==e.q&&b(),2!=il(g)&&c(),Y(a),a.b!=ri&&d(),Y(a),a.b==mi&&Y(a),h=1,Gl(a,e,g,h);else if(a.b==ni){Y(a);break}else U(a,"syntax error in parameter data block")}
function Kl(a){for(;a.b!=Ah&&!dl(a,"end");)dl(a,"set")?wl(a):dl(a,"param")?Jl(a):U(a,"syntax error in data section")}function Ll(a,b,c){(0<b&&0<c&&b>0.999*s-c||0>b&&0>c&&b<-0.999*s-c)&&U(a,b+" + "+c+"; floating-point overflow");return b+c}function Ml(a,b,c){(0<b&&0>c&&b>0.999*s+c||0>b&&0<c&&b<-0.999*s+c)&&U(a,b+" - "+c+"; floating-point overflow");return b-c}function Nl(a,b,c){if(b<c)return 0;0<b&&0>c&&b>0.999*s+c&&U(a,b+" less "+c+"; floating-point overflow");return b-c}
function Ol(a,b,c){1<Math.abs(c)&&Math.abs(b)>0.999*s/Math.abs(c)&&U(a,b+" * "+c+"; floating-point overflow");return b*c}function Pl(a,b,c){Math.abs(c)<aa&&U(a,b+" / "+c+"; floating-point zero divide");1>Math.abs(c)&&Math.abs(b)>0.999*s*Math.abs(c)&&U(a,b+" / "+c+"; floating-point overflow");return b/c}
function Ql(a,b,c){Math.abs(c)<aa&&U(a,b+" div "+c+"; floating-point zero divide");1>Math.abs(c)&&Math.abs(b)>0.999*s*Math.abs(c)&&U(a,b+" div "+c+"; floating-point overflow");b/=c;return 0<b?Math.floor(b):0>b?Math.ceil(b):0}function Rl(a,b){var c;if(0==a)c=0;else if(0==b)c=a;else if(c=Math.abs(a)%Math.abs(b),0!=c&&(0>a&&(c=-c),0<a&&0>b||0>a&&0<b))c+=b;return c}
function Sl(a,b,c){(0==b&&0>=c||0>b&&c!=Math.floor(c))&&U(a,b+" ** "+c+"; result undefined");0==b?a=Math.pow(b,c):((1<Math.abs(b)&&1<c&&+Math.log(Math.abs(b))>0.999*Math.log(s)/c||1>Math.abs(b)&&-1>c&&+Math.log(Math.abs(b))<0.999*Math.log(s)/c)&&U(a,b+" ** "+c+"; floating-point overflow"),a=1<Math.abs(b)&&-1>c&&-Math.log(Math.abs(b))<0.999*Math.log(s)/c||1>Math.abs(b)&&1<c&&-Math.log(Math.abs(b))>0.999*Math.log(s)/c?0:Math.pow(b,c));return a}
function Tl(a,b){b>0.999*Math.log(s)&&U(a,"exp("+b+"); floating-point overflow");return Math.exp(b)}function Ul(a,b){0>=b&&U(a,"log("+b+"); non-positive argument");return Math.log(b)}function Vl(a,b){0>=b&&U(a,"log10("+b+"); non-positive argument");return Math.log(b)/Math.LN10}function Wl(a,b){0>b&&U(a,"sqrt("+b+"); negative argument");return Math.sqrt(b)}function Xl(a,b){-1E6<=b&&1E6>=b||U(a,"sin("+b+"); argument too large");return Math.sin(b)}
function Yl(a,b){-1E6<=b&&1E6>=b||U(a,"cos("+b+"); argument too large");return Math.cos(b)}function Zl(a){return Math.atan(a)}function $l(a,b){return Math.atan2(a,b)}function am(a,b,c){c!=Math.floor(c)&&U(a,"round("+b+", "+c+"); non-integer second argument");18>=c&&(a=Math.pow(10,c),Math.abs(b)<0.999*s/a&&(b=Math.floor(b*a+0.5),0!=b&&(b/=a)));return b}
function bm(a,b,c){c!=Math.floor(c)&&U(a,"trunc("+b+", "+c+"); non-integer second argument");18>=c&&(a=Math.pow(10,c),Math.abs(b)<0.999*s/a&&(b=0<=b?Math.floor(b*a):Math.ceil(b*a),0!=b&&(b/=a)));return b}function cm(a,b,c){var d;b>=c&&U(a,"Uniform("+b+", "+c+"); invalid range");d=dm(a.Gd)/2147483648;return d=Ll(a,b*(1-d),c*d)}function em(a){var b,c;do b=-1+2*(dm(a.Gd)/2147483648),c=-1+2*(dm(a.Gd)/2147483648),b=b*b+c*c;while(1<b||0==b);return c*Math.sqrt(-2*Math.log(b)/b)}
function fm(a,b,c){return Ll(a,b,Ol(a,c,em(a)))}function ml(a){var b={};b.Q=a;b.M=null;return b}function nl(a){var b={Q:0};b.M=a;return b}function sl(a){var b={};null==a.M?(b.Q=a.Q,b.M=null):(b.Q=0,b.M=a.M);return b}function gm(a,b){var c;if(null==a.M&&null==b.M)c=a.Q<b.Q?-1:a.Q>b.Q?1:0;else if(null==a.M)c=-1;else if(null==b.M)c=1;else{c=a.M;var d=b.M;c=c==d?0:c>d?1:-1}return c}
function rl(a){var b;if(null==a.M)b=String(a.Q);else{var c,d,e=a.M;if(ua(e[0])||"_"==e[0])for(a=!1,c=1;c<e.length;c++){if(!(va(e[c])||0<="+-._".indexOf(e[c]))){a=!0;break}}else a=!0;b="";d=0;var f=function(a){255>d&&(b+=a,d++)};a&&f("'");for(c=0;c<e.length;c++)a&&"'"==e[c]&&f("'"),f(e[c]);a&&f("'");255==d&&(b=b.slice(0,252)+"...")}return b}function tl(a,b){var c,d={};d.Y=b;d.e=null;if(null==a)a=d;else{for(c=a;null!=c.e;c=c.e);c.e=d}return a}function xl(a){for(var b=0;null!=a;a=a.e)b++;return b}
function Il(a){var b,c;if(null==a)b=null;else{for(b=c={};null!=a;a=a.e)c.Y=sl(a.Y),null!=a.e&&(c=c.e={});c.e=null}return b}function hm(a,b){var c,d,e;c=a;for(d=b;null!=c;c=c.e,d=d.e)if(e=gm(c.Y,d.Y),0!=e)return e;return 0}function im(a,b){for(var c=null,d=1,e=a;d<=b;d++,e=e.e)c=tl(c,sl(e.Y));return c}
function zl(a,b){function c(a){255>f&&(g+=a);f++}var d,e,f=0,g="",h="",k=xl(b);"["==a&&0<k&&c("[");"("==a&&1<k&&c("(");for(d=b;null!=d;d=d.e)for(d!=b&&c(","),h=rl(d.Y),e=0;e<h.length;e++)c(h[e]);"["==a&&0<k&&c("]");"("==a&&1<k&&c(")");255==f&&(g=g.slice(0,252)+"...");return g}function jm(a,b){Al(a,b).value.eh=null}function ul(a,b,c){null!=yl(a,b,c)&&U(a,"duplicate tuple "+zl("(",c)+" detected");jm(b,c)}function km(a,b){var c,d;c=Bl(a,qh,b.q);for(d=b.head;null!=d;d=d.e)jm(c,Il(d.w));return c}
function lm(a,b,c,d){var e;0==d&&U(a,b+" .. "+c+" by "+d+"; zero stride not allowed");e=0<c&&0>b&&c>0.999*s+b?+s:0>c&&0<b&&c<-0.999*s+b?-s:c-b;1>Math.abs(d)&&Math.abs(e)>0.999*s*Math.abs(d)?e=0<e&&0<d||0>e&&0>d?+s:0:(e=Math.floor(e/d)+1,0>e&&(e=0));2147483646<e&&U(a,b+" .. "+c+" by "+d+"; set too large");return e+0.5|0}function mm(a,b,c,d,e){1<=e&&lm(a,b,c,d);return b+(e-1)*d}function nm(a){var b;0==a?b=null:(b={},b.u=a,b.t=null,b.e=null);return b}
function om(a){var b,c;if(null==a)b=null;else{for(b=c={};null!=a;a=a.e)c.u=a.u,c.t=a.t,null!=a.e&&(c=c.e={});c.e=null}return b}
function pm(a,b,c,d,e){var f=null,g,h=0;for(g=c;null!=g;g=g.e)null==g.t?h=Ll(a,h,Ol(a,b,g.u)):g.t.ja=Ll(a,g.t.ja,Ol(a,b,g.u));for(g=e;null!=g;g=g.e)null==g.t?h=Ll(a,h,Ol(a,d,g.u)):g.t.ja=Ll(a,g.t.ja,Ol(a,d,g.u));for(g=c;null!=g;g=g.e)null!=g.t&&0!=g.t.ja&&(a={},a.u=g.t.ja,a.t=g.t,a.e=f,f=a,g.t.ja=0);for(g=e;null!=g;g=g.e)null!=g.t&&0!=g.t.ja&&(a={},a.u=g.t.ja,a.t=g.t,a.e=f,f=a,g.t.ja=0);0!=h&&(a={},a.u=h,a.t=null,a.e=f,f=a);return f}
function qm(a,b,c){for(var d=null,e,f=0;null!=b;)e=b,b=b.e,null==e.t?f=Ll(a,f,e.u):(e.e=d,d=e);c(f);return d}function rm(a,b){switch(a){case qh:b.eh=null;break;case N:b.Q=0;break;case T:b.Y=null;break;case nh:b.sg=0;break;case xh:b.w=null;break;case fh:b.set=null;break;case gh:b.t=null;break;case jh:b.form=null;break;case eh:b.H=null}}function Bl(a,b,c){var d={};d.type=b;d.q=c;d.size=0;d.head=null;d.Xa=null;d.V=!1;d.ca=null;d.e=a.pg;null!=d.e&&(d.e.ca=d);return a.pg=d}
function sm(a,b,c){return hm(b,c)}function yl(a,b,c){if(30<b.size&&!b.V){var d={root:null};d.yg=sm;d.info=a;d.size=0;d.height=0;b.V=d;for(a=b.head;null!=a;a=a.e)qe(b.V,a.w).link=a}if(b.V){b=b.V;for(a=b.root;null!=a;){d=b.yg(b.info,c,a.key);if(0==d)break;a=0>d?a.left:a.right}c=a;a=null==c?null:c.link}else for(a=b.head;null!=a&&0!=hm(a.w,c);a=a.e);return a}function Al(a,b){var c={};c.w=b;c.e=null;c.value={};a.size++;null==a.head?a.head=c:a.Xa.e=c;a.Xa=c;null!=a.V&&(qe(a.V,c.w).link=c);return c}
function tm(a){var b;if(null!=a.Le)for(b=a.list,a=a.Le;null!=b;b=b.e,a=a.e)a:{var c=b,d=a.Y,e=void 0,f=void 0;if(null!=c.value){if(0==gm(c.value,d))break a;c.value=null}for(e=c.list;null!=e;e=e.a.index.e)for(f=e;null!=f;f=f.R)f.valid&&(f.valid=0,rm(f.type,f.value));c.value=sl(d)}}function um(a,b,c,d,e){var f,g=0;if(!vm(a,b.code,c))return 1;f=b.Le;b.Le=c;tm(b);e(a,d);b.Le=f;tm(b);return g}
function wm(a,b){if(null!=b.Kc){var c,d,e=null,f=null;c=b.Kc;b.Kc=c.e;for(d=c.list;null!=d;d=d.e)null==e?e=f={}:f=f.e={},null==d.code?(f.Y=b.w.Y,b.w=b.w.e):f.Y=xm(a,d.code);f.e=null;um(a,c,e,b,wm)&&(b.Ve=1);for(d=c.list;null!=d;d=d.e)e=e.e}else null==b.domain.code||ym(a,b.domain.code)?b.Zd(a,b.info):b.Ve=2}function zm(a,b,c,d,e){var f={};null==b?(e(a,d),f.Ve=0):(f.domain=b,f.Kc=b.list,f.w=c,f.info=d,f.Zd=e,f.Ve=0,wm(a,f));return f.Ve}
function Am(a,b){if(null!=b.Kc){var c,d,e;c=b.Kc;b.Kc=c.e;e=null;for(d=c.list;null!=d;d=d.e)null!=d.code&&(e=tl(e,xm(a,d.code)));if(c.code.Ta==Yj){var f,g,h,k;g=$(a,c.code.a.a.x);h=$(a,c.code.a.a.y);k=null==c.code.a.a.z?1:$(a,c.code.a.a.z);e=lm(a,g,h,k);d=tl(null,ml(0));for(f=1;f<=e&&b.Wf;f++)d.Y.Q=mm(a,g,h,k,f),um(a,c,d,b,Am)}else for(f=Bm(a,c.code).head;null!=f&&b.Wf;f=f.e){g=f.w;h=e;k=!1;for(d=c.list;null!=d;d=d.e){if(null!=d.code){if(0!=gm(g.Y,h.Y)){k=!0;break}h=h.e}g=g.e}k||um(a,c,f.w,b,Am)}b.Kc=
c}else if(null==b.domain.code||ym(a,b.domain.code))b.Wf=!b.Zd(a,b.info)}function Cm(a,b,c,d){var e={};null==b?d(a,c):(e.domain=b,e.Kc=b.list,e.Wf=1,e.info=c,e.Zd=d,Am(a,e))}function Dm(a,b,c){U(a,b+zl("[",c)+" out of domain")}function Em(a){var b=null;if(null!=a)for(a=a.list;null!=a;a=a.e)for(var c=a.list;null!=c;c=c.e)null==c.code&&(b=tl(b,sl(c.value)));return b}
function Fm(a,b,c,d){for(var e=b.Bf,f=1;null!=e;e=e.e,f++)for(var g=d.head;null!=g;g=g.e)if(!vm(a,e.code,g.w)){var h=zl("(",g.w);U(a,b.name+zl("[",c)+" contains "+h+" which not within specified set; see ("+f+")")}}function Gm(a,b,c){function d(){Fm(a,b,c,e);f=Al(b.O,Il(c));f.value.set=e}var e,f=yl(a,b.O,c);null!=f?e=f.value.set:null!=b.assign?(e=Bm(a,b.assign),d()):null!=b.xa?(e=Bm(a,b.xa),d()):U(a,"no value for "+b.name+zl("[",c));return e}
function Hm(a,b){null!=b.ga?Fm(a,b.set,b.ga.w,b.ga.value.set):b.oe=Gm(a,b.set,b.w)}
function Im(a,b){var c=b.Yc,d,e,f,g=Array(20);x("Generating "+b.name+"...");d=c.set;Cm(a,d.domain,d,Jm);for(d=c.set.O.head.value.set.head;null!=d;d=d.e){f=Il(d.w);for(e=0;e<c.set.X;e++)g[e]=null;for(e=0;null!=f;f=f.e)g[c.Z[e++]-1]=f;for(e=0;e<c.set.X;e++)g[e].e=g[e+1];0==b.q?f=null:(f=g[0],g[b.q-1].e=null);e=yl(a,b.O,f);null==e&&(e=Al(b.O,f),e.value.set=Bl(a,qh,b.X));f=g[b.q];g[c.set.X-1].e=null;jm(e.value.set,f)}b.data=1}
function Km(a,b,c){var d={};d.set=b;d.w=c;null!=b.Yc&&0==b.data&&Im(a,b);if(1==b.data)for(c=b.O.Xa,b.data=2,d.ga=b.O.head;null!=d.ga&&(zm(a,b.domain,d.ga.w,d,Hm)&&Dm(a,b.name,d.ga.w),d.ga!=c);d.ga=d.ga.e);d.ga=null;zm(a,d.set.domain,d.w,d,Hm)&&Dm(a,b.name,d.w);return d.oe}function Jm(a,b){var c=Em(b.domain);Km(a,b,c);return 0}
function Lm(a,b,c,d){var e,f;switch(b.type){case mh:d!=Math.floor(d)&&U(a,b.name+zl("[",c)+" = "+d+" not integer");break;case ah:0!=d&&1!=d&&U(a,b.name+zl("[",c)+" = "+d+" not binary")}e=b.wd;for(f=1;null!=e;e=e.e,f++){var g;g=$(a,e.code);var h=function(e){U(a,b.name+zl("[",c)+" = "+d+" not "+e+" "+g+"; see ("+f+")")};switch(e.jd){case Dj:d<g||h("<");break;case Ej:d<=g||h("<=");break;case Fj:d!=g&&h("=");break;case Gj:d>=g||h(">=");break;case Hj:d>g||h(">");break;case Ij:d==g&&h("<>")}}f=1;for(e=
b.qa;null!=e;e=e.e,f++)h=tl(null,ml(d)),vm(a,e.code,h)||U(a,b.name+zl("[",c)+" = "+d+" not in specified set; see ("+f+")")}function Mm(a,b,c){function d(d){Lm(a,b,c,d);e=Al(b.O,Il(c));return e.value.Q=d}var e=yl(a,b.O,c);return null!=e?e.value.Q:null!=b.assign?d($(a,b.assign)):null!=b.xa?d($(a,b.xa)):null!=b.Wc?(null!=b.Wc.M&&U(a,"cannot convert "+rl(b.Wc)+" to floating-point number"),d(b.Wc.Q)):U(a,"no value for "+b.name+zl("[",c))}
function Nm(a,b){null!=b.ga?Lm(a,b.S,b.ga.w,b.ga.value.Q):b.value=Mm(a,b.S,b.w)}function Om(a,b,c){var d={};d.S=b;d.w=c;if(1==b.data)for(c=b.O.Xa,b.data=2,d.ga=b.O.head;null!=d.ga&&(zm(a,b.domain,d.ga.w,d,Nm)&&Dm(a,b.name,d.ga.w),d.ga!=c);d.ga=d.ga.e);d.ga=null;zm(a,d.S.domain,d.w,d,Nm)&&Dm(a,b.name,d.w);return d.value}
function Pm(a,b,c,d){var e,f=1;for(e=b.wd;null!=e;e=e.e,f++){var g;g=xm(a,e.code);switch(e.jd){case Dj:0>gm(d,g)||(g=rl(g),U(a,b.name+zl("[",c)+" = "+rl(d)+" not < "+g));break;case Ej:0>=gm(d,g)||(g=rl(g),U(a,b.name+zl("[",c)+" = "+rl(d)+" not <= "+g));break;case Fj:0!=gm(d,g)&&(g=rl(g),U(a,b.name+zl("[",c)+" = "+rl(d)+" not = "+g));break;case Gj:0<=gm(d,g)||(g=rl(g),U(a,b.name+zl("[",c)+" = "+rl(d)+" not >= "+g));break;case Hj:0<gm(d,g)||(g=rl(g),U(a,b.name+zl("[",c)+" = "+rl(d)+" not > "+g));break;
case Ij:0==gm(d,g)&&(g=rl(g),U(a,b.name+zl("[",c)+" <> "+rl(d)+" not > "+g))}}f=1;for(e=b.qa;null!=e;e=e.e,f++)g=tl(null,sl(d)),vm(a,e.code,g)||U(a,b.name,zl("[",c)+" = "+rl(d)+" not in specified set; see ("+f+")")}function Qm(a,b,c){function d(d){Pm(a,b,c,d);e=Al(b.O,Il(c));e.value.Y=sl(d);return d}var e=yl(a,b.O,c);return null!=e?sl(e.value.Y):null!=b.assign?d(xm(a,b.assign)):null!=b.xa?d(xm(a,b.xa)):null!=b.Wc?sl(b.Wc):U(a,"no value for "+b.name+zl("[",c))}
function Rm(a,b){null!=b.ga?Pm(a,b.S,b.ga.w,b.ga.value.Y):b.value=Qm(a,b.S,b.w)}function Sm(a,b,c){var d={};d.S=b;d.w=c;if(1==b.data)for(c=b.O.Xa,b.data=2,d.ga=b.O.head;null!=d.ga&&(zm(a,b.domain,d.ga.w,d,Rm)&&Dm(a,b.name,d.ga.w),d.ga!=c);d.ga=d.ga.e);d.ga=null;zm(a,d.S.domain,d.w,d,Rm)&&Dm(a,b.name,d.w);return d.value}function Tm(a,b){var c=Em(b.domain);switch(b.type){case N:case mh:case ah:Om(a,b,c);break;case T:Sm(a,b,c)}return 0}
function Um(a,b){var c=b.t,d=b.w,e=yl(a,c.O,d);null!=e?d=e.value.t:(e=Al(c.O,Il(d)),d=e.value.t={},d.C=0,d.t=c,d.ga=e,d.P=null==c.P?0:$(a,c.P),d.W=null==c.W?0:c.W==c.P?d.P:$(a,c.W),d.ja=0,d.m=0,d.r=d.J=0);b.oe=d}function Vm(a,b,c){var d={};d.t=b;d.w=c;zm(a,d.t.domain,d.w,d,Um)&&Dm(a,b.name,d.w);return d.oe}
function Wm(a,b,c){var d=null,e=yl(a,b.O,c);if(null!=e)c=e.value.H;else{e=Al(b.O,Il(c));c=e.value.H={};c.ea=0;c.H=b;c.ga=e;c.form=Xm(a,b.code);if(null==b.P&&null==b.W)c.form=qm(a,c.form,function(a){d=a}),c.P=c.W=-d;else if(null!=b.P&&null==b.W)c.form=pm(a,1,c.form,-1,Xm(a,b.P)),c.form=qm(a,c.form,function(a){d=a}),c.P=-d,c.W=0;else if(null==b.P&&null!=b.W)c.form=pm(a,1,c.form,-1,Xm(a,b.W)),c.form=qm(a,c.form,function(a){d=a}),c.P=0,c.W=-d;else if(b.P==b.W)c.form=pm(a,1,c.form,-1,Xm(a,b.P)),c.form=
qm(a,c.form,function(a){d=a}),c.P=c.W=-d;else{var f=null,g=null;c.form=qm(a,c.form,function(a){d=a});qm(a,Xm(a,b.P),function(a){f=a});qm(a,Xm(a,b.W),function(a){g=a});c.P=Ml(a,f,d);c.W=Ml(a,g,d)}c.m=0;c.r=c.J=0}return c}function Ym(a,b){b.oe=Wm(a,b.H,b.w)}function Zm(a,b,c){var d={};d.H=b;d.w=c;zm(a,d.H.domain,d.w,d,Ym)&&Dm(a,b.name,d.w);return d.oe}function $m(a,b){var c=Em(b.domain);Zm(a,b,c);return 0}
function an(a,b){var c=$(a,b.code.a.loop.x);switch(b.code.Ta){case dk:b.value=Ll(a,b.value,c);break;case ek:b.value=Ol(a,b.value,c);break;case fk:b.value>c&&(b.value=c);break;case gk:b.value<c&&(b.value=c)}return 0}
function $(a,b){var c,d,e;b.T&&b.valid&&(b.valid=0,rm(b.type,b.value));if(b.valid)return b.value.Q;switch(b.Ta){case Fi:c=b.a.Q;break;case Ii:d=null;for(e=b.a.S.list;null!=e;e=e.e)d=tl(d,xm(a,e.x));c=Om(a,b.a.S.S,d);break;case Li:d=null;for(e=b.a.t.list;null!=e;e=e.e)d=tl(d,xm(a,e.x));e=Vm(a,b.a.t.t,d);switch(b.a.t.Ac){case Ai:c=null==e.t.P?-s:e.P;break;case Bi:c=null==e.t.W?+s:e.W;break;case Ci:c=e.m;break;case Di:c=e.r;break;case Ei:c=e.J}break;case Mi:d=null;for(e=b.a.H.list;null!=e;e=e.e)d=tl(d,
xm(a,e.x));e=Zm(a,b.a.H.H,d);switch(b.a.H.Ac){case Ai:c=null==e.H.P?-s:e.P;break;case Bi:c=null==e.H.W?+s:e.W;break;case Ci:c=e.m;break;case Di:c=e.r;break;case Ei:c=e.J}break;case Qi:c=bn(a.Gd);break;case Ri:c=dm(a.Gd)/2147483648;break;case Si:c=em(a);break;case Ti:c=Math.round(Date.now()/1E3);break;case Ui:e=xm(a,b.a.a.x);null==e.M?c=e.Q:vg(e.M,function(a){c=a})&&U(a,"cannot convert "+rl(e)+" to floating-point number");break;case Zi:c=+$(a,b.a.a.x);break;case $i:c=-$(a,b.a.a.x);break;case bj:c=
Math.abs($(a,b.a.a.x));break;case cj:c=Math.ceil($(a,b.a.a.x));break;case dj:c=Math.floor($(a,b.a.a.x));break;case ej:c=Tl(a,$(a,b.a.a.x));break;case fj:c=Ul(a,$(a,b.a.a.x));break;case gj:c=Vl(a,$(a,b.a.a.x));break;case hj:c=Wl(a,$(a,b.a.a.x));break;case ij:c=Xl(a,$(a,b.a.a.x));break;case jj:c=Yl(a,$(a,b.a.a.x));break;case kj:c=Zl($(a,b.a.a.x));break;case xj:c=$l($(a,b.a.a.x),$(a,b.a.a.y));break;case lj:c=am(a,$(a,b.a.a.x),0);break;case yj:c=am(a,$(a,b.a.a.x),$(a,b.a.a.y));break;case mj:c=bm(a,$(a,
b.a.a.x),0);break;case zj:c=bm(a,$(a,b.a.a.x),$(a,b.a.a.y));break;case pj:c=Ll(a,$(a,b.a.a.x),$(a,b.a.a.y));break;case qj:c=Ml(a,$(a,b.a.a.x),$(a,b.a.a.y));break;case rj:c=Nl(a,$(a,b.a.a.x),$(a,b.a.a.y));break;case sj:c=Ol(a,$(a,b.a.a.x),$(a,b.a.a.y));break;case tj:c=Pl(a,$(a,b.a.a.x),$(a,b.a.a.y));break;case uj:c=Ql(a,$(a,b.a.a.x),$(a,b.a.a.y));break;case vj:c=Rl($(a,b.a.a.x),$(a,b.a.a.y));break;case wj:c=Sl(a,$(a,b.a.a.x),$(a,b.a.a.y));break;case Aj:c=cm(a,$(a,b.a.a.x),$(a,b.a.a.y));break;case Bj:c=
fm(a,$(a,b.a.a.x),$(a,b.a.a.y));break;case nj:c=Bm(a,b.a.a.x).size;break;case oj:e=xm(a,b.a.a.x);d=null==e.M?String(e.Q):e.M;c=d.length;break;case Vj:e=xm(a,b.a.a.x);d=null==e.M?String(e.Q):e.M;e=xm(a,b.a.a.y);c=cn(a,d,null==e.M?String(e.Q):e.M);break;case Zj:c=ym(a,b.a.a.x)?$(a,b.a.a.y):null==b.a.a.z?0:$(a,b.a.a.z);break;case bk:c=+s;for(e=b.a.list;null!=e;e=e.e)d=$(a,e.x),c>d&&(c=d);break;case ck:c=-s;for(e=b.a.list;null!=e;e=e.e)d=$(a,e.x),c<d&&(c=d);break;case dk:e={};e.code=b;e.value=0;Cm(a,
b.a.loop.domain,e,an);c=e.value;break;case ek:e={};e.code=b;e.value=1;Cm(a,b.a.loop.domain,e,an);c=e.value;break;case fk:e={};e.code=b;e.value=+s;Cm(a,b.a.loop.domain,e,an);e.value==+s&&U(a,"min{} over empty set; result undefined");c=e.value;break;case gk:e={},e.code=b,e.value=-s,Cm(a,b.a.loop.domain,e,an),e.value==-s&&U(a,"max{} over empty set; result undefined"),c=e.value}b.valid=1;return b.value.Q=c}
function xm(a,b){var c;b.T&&b.valid&&(b.valid=0,rm(b.type,b.value));if(b.valid)return sl(b.value.Y);switch(b.Ta){case Gi:c=nl(b.a.M);break;case Hi:c=sl(b.a.index.ya.value);break;case Ji:var d;d=null;for(c=b.a.S.list;null!=c;c=c.e)d=tl(d,xm(a,c.x));c=Sm(a,b.a.S.S,d);break;case Vi:c=ml($(a,b.a.a.x));break;case Cj:d=xm(a,b.a.a.x);c=xm(a,b.a.a.y);c=nl((null==d.M?String(d.Q):d.M)+(null==c.M?String(c.Q):c.M));break;case Zj:c=ym(a,b.a.a.x)?xm(a,b.a.a.y):null==b.a.a.z?ml(0):xm(a,b.a.a.z);break;case Uj:case ak:var e;
c=xm(a,b.a.a.x);c=null==c.M?String(c.Q):c.M;b.Ta==Uj?(e=$(a,b.a.a.y),e!=Math.floor(e)&&U(a,"substr('...', "+e+"); non-integer second argument"),(1>e||e>c.length+1)&&U(a,"substr('...', "+e+"); substring out of range")):(e=$(a,b.a.a.y),d=$(a,b.a.a.z),e==Math.floor(e)&&d==Math.floor(d)||U(a,"substr('...', "+e+", "+d+"); non-integer second and/or third argument"),(1>e||0>d||e+d>c.length+1)&&U(a,"substr('...', "+e+", "+d+"); substring out of range"));c=nl(c.slice(e-1,e+d-1));break;case Xj:d=$(a,b.a.a.x),
c=xm(a,b.a.a.y),c=dn(a,d,null==c.M?String(c.Q):c.M),c=nl(c)}b.valid=1;b.value.Y=sl(c);return c}function en(a,b){var c=0;switch(b.code.Ta){case hk:b.value&=ym(a,b.code.a.loop.x);b.value||(c=1);break;case ik:b.value|=ym(a,b.code.a.loop.x),b.value&&(c=1)}return c}
function ym(a,b){var c,d;b.T&&b.valid&&(b.valid=0,rm(b.type,b.value));if(b.valid)return b.value.sg;switch(b.Ta){case Wi:c=0!=$(a,b.a.a.x);break;case aj:c=!ym(a,b.a.a.x);break;case Dj:b.a.a.x.type==N?c=$(a,b.a.a.x)<$(a,b.a.a.y):(c=xm(a,b.a.a.x),d=xm(a,b.a.a.y),c=0>gm(c,d));break;case Ej:b.a.a.x.type==N?c=$(a,b.a.a.x)<=$(a,b.a.a.y):(c=xm(a,b.a.a.x),d=xm(a,b.a.a.y),c=0>=gm(c,d));break;case Fj:b.a.a.x.type==N?c=$(a,b.a.a.x)==$(a,b.a.a.y):(c=xm(a,b.a.a.x),d=xm(a,b.a.a.y),c=0==gm(c,d));break;case Gj:b.a.a.x.type==
N?c=$(a,b.a.a.x)>=$(a,b.a.a.y):(c=xm(a,b.a.a.x),d=xm(a,b.a.a.y),c=0<=gm(c,d));break;case Hj:b.a.a.x.type==N?c=$(a,b.a.a.x)>$(a,b.a.a.y):(c=xm(a,b.a.a.x),d=xm(a,b.a.a.y),c=0<gm(c,d));break;case Ij:b.a.a.x.type==N?c=$(a,b.a.a.x)!=$(a,b.a.a.y):(c=xm(a,b.a.a.x),d=xm(a,b.a.a.y),c=0!=gm(c,d));break;case Jj:c=ym(a,b.a.a.x)&&ym(a,b.a.a.y);break;case Kj:c=ym(a,b.a.a.x)||ym(a,b.a.a.y);break;case Qj:c=fn(a,b.a.a.x);c=vm(a,b.a.a.y,c);break;case Rj:c=fn(a,b.a.a.x);c=!vm(a,b.a.a.y,c);break;case Sj:d=Bm(a,b.a.a.x);
c=1;for(d=d.head;null!=d;d=d.e)if(!vm(a,b.a.a.y,d.w)){c=0;break}break;case Tj:d=Bm(a,b.a.a.x);c=1;for(d=d.head;null!=d;d=d.e)if(vm(a,b.a.a.y,d.w)){c=0;break}break;case hk:c={};c.code=b;c.value=1;Cm(a,b.a.loop.domain,c,en);c=c.value;break;case ik:c={},c.code=b,c.value=0,Cm(a,b.a.loop.domain,c,en),c=c.value}b.valid=1;return b.value.sg=c}
function fn(a,b){var c;b.T&&b.valid&&(b.valid=0,rm(b.type,b.value));if(b.valid)return Il(b.value.w);switch(b.Ta){case Ni:c=null;for(var d=b.a.list;null!=d;d=d.e)c=tl(c,xm(a,d.x));break;case Xi:c=tl(null,xm(a,b.a.a.x))}b.valid=1;b.value.w=Il(c);return c}function gn(a,b){var c;switch(b.code.Ta){case jk:c=fn(a,b.code.a.loop.x);null==yl(a,b.value,c)&&jm(b.value,c);break;case kk:jm(b.value,Em(b.code.a.loop.domain))}return 0}
function Bm(a,b){var c,d;b.T&&b.valid&&(b.valid=0,rm(b.type,b.value));if(b.valid)return km(a,b.value.set);switch(b.Ta){case Ki:c=null;for(d=b.a.set.list;null!=d;d=d.e)c=tl(c,xm(a,d.x));c=km(a,Km(a,b.a.set.set,c));break;case Oi:c=Bl(a,qh,b.q);for(d=b.a.list;null!=d;d=d.e)ul(a,c,fn(a,d.x));break;case Lj:d=Bm(a,b.a.a.x);for(c=Bm(a,b.a.a.y).head;null!=c;c=c.e)null==yl(a,d,c.w)&&jm(d,Il(c.w));c=d;break;case Mj:var e=Bm(a,b.a.a.x);d=Bm(a,b.a.a.y);c=Bl(a,qh,e.q);for(e=e.head;null!=e;e=e.e)null==yl(a,d,e.w)&&
jm(c,Il(e.w));break;case Nj:d=Bm(a,b.a.a.x);c=Bm(a,b.a.a.y);for(var f=Bl(a,qh,d.q),e=d.head;null!=e;e=e.e)null==yl(a,c,e.w)&&jm(f,Il(e.w));for(e=c.head;null!=e;e=e.e)null==yl(a,d,e.w)&&jm(f,Il(e.w));c=f;break;case Oj:e=Bm(a,b.a.a.x);d=Bm(a,b.a.a.y);c=Bl(a,qh,e.q);for(e=e.head;null!=e;e=e.e)null!=yl(a,d,e.w)&&jm(c,Il(e.w));break;case Pj:e=Bm(a,b.a.a.x);d=Bm(a,b.a.a.y);var g,h;c=Bl(a,qh,e.q+d.q);for(e=e.head;null!=e;e=e.e)for(f=d.head;null!=f;f=f.e){g=Il(e.w);for(h=f.w;null!=h;h=h.e)g=tl(g,sl(h.Y));
jm(c,g)}break;case Yj:d=$(a,b.a.a.x);c=$(a,b.a.a.y);e=null==b.a.a.z?1:$(a,b.a.a.z);f=Bl(a,qh,1);g=lm(a,d,c,e);for(h=1;h<=g;h++)jm(f,tl(null,ml(mm(a,d,c,e,h))));c=f;break;case Zj:c=ym(a,b.a.a.x)?Bm(a,b.a.a.y):Bm(a,b.a.a.z);break;case jk:d={};d.code=b;d.value=Bl(a,qh,b.q);Cm(a,b.a.loop.domain,d,gn);c=d.value;break;case kk:d={},d.code=b,d.value=Bl(a,qh,b.q),Cm(a,b.a.loop.domain,d,gn),c=d.value}b.valid=1;b.value.set=km(a,c);return c}function hn(){}
function vm(a,b,c){var d,e,f;switch(b.Ta){case Ki:f=null;for(e=b.a.set.list;null!=e;e=e.e)f=tl(f,xm(a,e.x));b=Km(a,b.a.set.set,f);f=im(c,b.q);d=null!=yl(a,b,f);break;case Oi:d=0;f=im(c,b.q);for(e=b.a.list;null!=e&&!(c=fn(a,e.x),d=0==hm(f,c));e=e.e);break;case Lj:d=vm(a,b.a.a.x,c)||vm(a,b.a.a.y,c);break;case Mj:d=vm(a,b.a.a.x,c)&&!vm(a,b.a.a.y,c);break;case Nj:f=vm(a,b.a.a.x,c);a=vm(a,b.a.a.y,c);d=f&&!a||!f&&a;break;case Oj:d=vm(a,b.a.a.x,c)&&vm(a,b.a.a.y,c);break;case Pj:if(d=vm(a,b.a.a.x,c)){for(f=
1;f<=b.a.a.x.q;f++)c=c.e;d=vm(a,b.a.a.y,c)}break;case Yj:f=$(a,b.a.a.x);e=$(a,b.a.a.y);b=null==b.a.a.z?1:$(a,b.a.a.z);lm(a,f,e,b);if(null!=c.Y.M){d=0;break}c=c.Y.Q;if(0<b&&!(f<=c&&c<=e)||0>b&&!(e<=c&&c<=f)){d=0;break}d=mm(a,f,e,b,((c-f)/b+0.5|0)+1)==c;break;case Zj:d=ym(a,b.a.a.x)?vm(a,b.a.a.y,c):vm(a,b.a.a.z,c);break;case jk:U(a,"implementation restriction; in/within setof{} not allowed");break;case kk:f=im(c,b.q),d=0==zm(a,b.a.loop.domain,f,null,hn)}return d}
function jn(a,b){switch(b.code.Ta){case dk:var c;c=Xm(a,b.code.a.loop.x);for(null==b.value?b.value=c:b.Xa.e=c;null!=c;c=c.e)b.Xa=c}return 0}
function Xm(a,b){var c;b.T&&b.valid&&(b.valid=0,rm(b.type,b.value));if(b.valid)return om(b.value.form);switch(b.Ta){case Li:var d=null;for(c=b.a.t.list;null!=c;c=c.e)d=tl(d,xm(a,c.x));c=Vm(a,b.a.t.t,d);d={u:1};d.t=c;d.e=null;c=d;break;case Yi:c=nm($(a,b.a.a.x));break;case Zi:c=pm(a,0,nm(0),1,Xm(a,b.a.a.x));break;case $i:c=pm(a,0,nm(0),-1,Xm(a,b.a.a.x));break;case pj:c=pm(a,1,Xm(a,b.a.a.x),1,Xm(a,b.a.a.y));break;case qj:c=pm(a,1,Xm(a,b.a.a.x),-1,Xm(a,b.a.a.y));break;case sj:c=b.a.a.x.type==N?pm(a,
$(a,b.a.a.x),Xm(a,b.a.a.y),0,nm(0)):pm(a,$(a,b.a.a.y),Xm(a,b.a.a.x),0,nm(0));break;case tj:c=pm(a,Pl(a,1,$(a,b.a.a.y)),Xm(a,b.a.a.x),0,nm(0));break;case Zj:c=ym(a,b.a.a.x)?Xm(a,b.a.a.y):null==b.a.a.z?nm(0):Xm(a,b.a.a.z);break;case dk:c={};c.code=b;c.value=nm(0);c.Xa=null;Cm(a,b.a.loop.domain,c,jn);c=c.value;for(var e,f=0,d=c;null!=d;d=d.e)null==d.t?f=Ll(a,f,d.u):d.t.ja=Ll(a,d.t.ja,d.u);e=c;c=null;for(d=e;null!=d;d=e)e=d.e,null==d.t&&0!=f?(d.u=f,f=0,d.e=c,c=d):null!=d.t&&0!=d.t.ja&&(d.u=d.t.ja,d.t.ja=
0,d.e=c,c=d)}b.valid=1;b.value.form=om(c);return c}var kn=exports.mpl_tab_num_args=function(a){return a.ff},ln=exports.mpl_tab_get_arg=function(a,b){return a.a[b]};exports.mpl_tab_get_args=function(a){return a.a};
var mn=exports.mpl_tab_num_flds=function(a){return a.Wa},nn=exports.mpl_tab_get_name=function(a,b){return a.name[b]},on=exports.mpl_tab_get_type=function(a,b){return a.type[b]},pn=exports.mpl_tab_get_num=function(a,b){return a.Q[b]},qn=exports.mpl_tab_get_str=function(a,b){return a.M[b]},rn=exports.mpl_tab_set_num=function(a,b,c){a.type[b]="N";a.Q[b]=c},sn=exports.mpl_tab_set_str=function(a,b,c){a.type[b]="S";a.M[b]=c};
function tn(a,b){var c=a.Mc,d,e,f;f=0;for(d=b.v.Oc.list;null!=d;d=d.e)switch(f++,d.code.type){case N:c.type[f]="N";c.Q[f]=$(a,d.code);c.M[f][0]="\x00";break;case T:e=xm(a,d.code),null==e.M?(c.type[f]="N",c.Q[f]=e.Q,c.M[f][0]="\x00"):(c.type[f]="S",c.Q[f]=0,c.M[f]=e.M)}c=a.Mc;c.link.writeRecord(c)&&U(a,"error on writing data to table "+a.ib.v.nd.name);return 0}function un(a,b){ym(a,b.code)||U(a,"check"+zl("[",Em(b.domain))+" failed");return 0}
function vn(a,b,c){var d=c.value.set;wn(a,b.name+zl("[",c.w)+(null==d.head?" is empty":":"));for(b=d.head;null!=b;b=b.e)wn(a,"   "+zl("(",b.w))}function xn(a,b,c){switch(b.type){case N:case mh:case ah:wn(a,b.name+zl("[",c.w)+" = "+c.value.Q);break;case T:wn(a,b.name+zl("[",c.w)+" = "+rl(c.value.Y))}}
function yn(a,b,c,d){d==zi||d==Di?wn(a,b.name+zl("[",c.w)+".val = "+c.value.t.r):d==Ai?wn(a,b.name+zl("[",c.w)+".lb = "+(null==c.value.t.t.P?-s:c.value.t.P)):d==Bi?wn(a,b.name+zl("[",c.w)+".ub = "+(null==c.value.t.t.W?+s:c.value.t.W)):d==Ci?wn(a,b.name+zl("[",c.w)+".status = "+c.value.t.m):d==Ei&&wn(a,b.name+zl("[",c.w)+".dual = "+c.value.t.J)}
function zn(a,b,c,d){d==zi||d==Di?wn(a,b.name+zl("[",c.w)+".val = "+c.value.H.r):d==Ai?wn(a,b.name+zl("[",c.w)+".lb = "+(null==c.value.H.H.P?-s:c.value.H.P)):d==Bi?wn(a,b.name+zl("[",c.w)+".ub = "+(null==c.value.H.H.W?+s:c.value.H.W)):d==Ci?wn(a,b.name+zl("[",c.w)+".status = "+c.value.H.m):d==Ei&&wn(a,b.name+zl("[",c.w)+".dual = "+c.value.H.J)}
function An(a,b){for(var c,d=b.list;null!=d;d=d.e)if(d.type==kh)c=d.v.ya,wn(a,c.name+" = "+rl(c.value));else if(d.type==uh){var e=d.v.set;null!=e.assign?Cm(a,e.domain,e,Jm):(null!=e.Yc&&0==e.data&&Im(a,e),null!=e.O.head&&Km(a,e,e.O.head.w));null==e.O.head&&wn(a,e.name+" has empty content");for(c=e.O.head;null!=c;c=c.e)vn(a,e,c)}else if(d.type==sh)for(e=d.v.S,null!=e.assign?Cm(a,e.domain,e,Tm):null!=e.O.head&&(e.type!=T?Om(a,e,e.O.head.w):Sm(a,e,e.O.head.w)),null==e.O.head&&wn(a,e.name+" has empty content"),
c=e.O.head;null!=c;c=c.e)xn(a,e,c);else if(d.type==yh)for(e=d.v.t,null==e.O.head&&wn(a,e.name+" has empty content"),c=e.O.head;null!=c;c=c.e)yn(a,e,c,zi);else if(d.type==ch)for(e=d.v.H,null==e.O.head&&wn(a,e.name+" has empty content"),c=e.O.head;null!=c;c=c.e)zn(a,e,c,zi);else if(d.type==hh)if(e=d.v.code,e.Ta==Ii||e.Ta==Ji||e.Ta==Ki||e.Ta==Li||e.Ta==Mi){c=a;var f={value:{}},g=void 0;f.w=null;for(g=e.a.S.list||e.a.t.list;null!=g;g=g.e)f.w=tl(f.w,xm(c,g.x));switch(e.Ta){case Ii:f.value.Q=Om(c,e.a.S.S,
f.w);xn(c,e.a.S.S,f);break;case Ji:f.value.Y=Sm(c,e.a.S.S,f.w);xn(c,e.a.S.S,f);break;case Ki:f.value.set=Km(c,e.a.set.set,f.w);vn(c,e.a.set.set,f);break;case Li:f.value.t=Vm(c,e.a.t.t,f.w);yn(c,e.a.t.t,f,e.a.t.Ac);break;case Mi:f.value.H=Zm(c,e.a.H.H,f.w),zn(c,e.a.H.H,f,e.a.H.Ac)}}else switch(c=a,e.type){case N:e=$(c,e);wn(c,String(e));break;case T:e=xm(c,e);wn(c,rl(e));break;case nh:e=ym(c,e);wn(c,e?"true":"false");break;case xh:e=fn(c,e);wn(c,zl("(",e));break;case fh:e=Bm(c,e);0==e.head&&wn(c,"set is empty");
for(e=e.head;null!=e;e=e.e)wn(c,"   "+zl("(",e.w));break;case jh:for(f=void 0,e=Xm(c,e),null==e&&wn(c,"linear form is empty"),f=e;null!=f;f=f.e)null==f.t?wn(c,"   "+f.u):wn(c,"   "+f.u+" "+f.t.t.name+zl("[",f.t.ga.w))}return 0}function Bn(a,b){null==a.Hg?"\n"==b?(a.he(a.dd,a.le),a.dd=""):a.dd+=b:a.Hg(b)}function Cn(a,b){for(var c=0;c<b.length;c++)Bn(a,b[c])}
function Dn(a,b){var c,d,e,f,g,h=xm(a,b.zd);d=null==h.M?String(h.Q):h.M;c=b.list;for(f=0;f<d.length;f++)if("%"==d[f])if(e=f++,"%"==d[f])Bn(a,"%");else{if(null==c)break;for(;"-"==d[f]||"+"==d[f]||" "==d[f]||"#"==d[f]||"0"==d[f];)f++;for(;wa(d[f]);)f++;if("."==d[f])for(f++;wa(d[f]);)f++;if("d"==d[f]||"i"==d[f]||"e"==d[f]||"E"==d[f]||"f"==d[f]||"F"==d[f]||"g"==d[f]||"G"==d[f]){switch(c.code.type){case N:g=$(a,c.code);break;case T:h=xm(a,c.code);null!=h.M&&U(a,"cannot convert "+rl(h)+" to floating-point number");
g=h.Q;break;case nh:g=ym(a,c.code)?1:0}"d"==d[f]||"i"==d[f]?(-2147483647<=g&&2147483647>=g||U(a,"cannot convert "+g+" to integer"),Cn(a,xa(d.slice(e,f+1),Math.floor(g+0.5)|0))):Cn(a,xa(d.slice(e,f+1),g))}else if("s"==d[f]){switch(c.code.type){case N:g=String($(a,c.code));break;case nh:g=ym(a,c.code)?"T":"F";break;case T:h=xm(a,c.code),g=null==h.M?String(h.Q):h.M}Cn(a,xa(d.slice(e,f+1),g))}else U(a,"format specifier missing or invalid");c=c.e}else"\\"==d[f]?(f++,"t"==d[f]?Bn(a,"\t"):"n"==d[f]?Bn(a,
"\n"):"\x00"==d[f]?U(a,"invalid use of escape character \\ in format control string"):Bn(a,d[f])):Bn(a,d[f]);return 0}function En(a,b){for(var c=a.ib,d=b.list;null!=d;d=d.e)Fn(a,d);a.ib=c;return 0}
function Fn(a,b){a.ib=b;switch(b.type){case ch:x("Generating "+b.v.H.name+"...");var c=b.v.H;Cm(a,c.domain,c,$m);break;case wh:switch(b.v.nd.type){case lh:x("Reading "+b.v.nd.name+"...");break;case rh:x("Writing "+b.v.nd.name+"...")}var c=b.v.nd,d,e,f,g;a.Mc=f={};f.id=0;f.link=null;f.ff=0;f.a=null;f.Wa=0;f.name=null;f.type=null;f.Q=null;f.M=null;for(d=c.a;null!=d;d=d.e)f.ff++;f.a=Array(1+f.ff);for(g=1;g<=f.ff;g++)f.a[g]=null;g=0;for(d=c.a;null!=d;d=d.e)g++,e=xm(a,d.code),e=null==e.M?String(e.Q):e.M,
f.a[g]=e;switch(c.type){case lh:g=c.v.qa.set;null!=g&&(g.data&&U(a,g.name+" already provided with data"),Al(g.O,null).value.set=Bl(a,qh,g.X),g.data=1);for(e=c.v.qa.list;null!=e;e=e.e)e.S.data&&U(a,e.S.name+" already provided with data"),e.S.data=1;for(e=c.v.qa.We;null!=e;e=e.e)f.Wa++;for(e=c.v.qa.list;null!=e;e=e.e)f.Wa++;f.name=Array(1+f.Wa);f.type=Array(1+f.Wa);f.Q=new Float64Array(1+f.Wa);f.M=Array(1+f.Wa);g=0;for(e=c.v.qa.We;null!=e;e=e.e)g++,f.name[g]=e.name,f.type[g]="?",f.Q[g]=0,f.M[g]="";
for(e=c.v.qa.list;null!=e;e=e.e)g++,f.name[g]=e.name,f.type[g]="?",f.Q[g]=0,f.M[g]="";for(Gn(a,"R");;){for(g=1;g<=f.Wa;g++)f.type[g]="?";g=a;d=g.Mc;d=d.link.readRecord(d);0<d&&U(g,"error on reading data from table "+g.ib.v.nd.name);if(d)break;for(g=1;g<=f.Wa;g++)"?"==f.type[g]&&U(a,"field "+f.name[g]+" missing in input table");d=null;g=0;for(e=c.v.qa.We;null!=e;e=e.e)switch(g++,f.type[g]){case "N":d=tl(d,ml(f.Q[g]));break;case "S":d=tl(d,nl(f.M[g]))}null!=c.v.qa.set&&ul(a,c.v.qa.set.O.head.value.set,
Il(d));for(e=c.v.qa.list;null!=e;e=e.e){var h;g++;null!=yl(a,e.S.O,d)&&U(a,e.S.name+zl("[",d)+" already defined");h=Al(e.S.O,Il(d));switch(e.S.type){case N:case mh:case ah:"N"!=f.type[g]&&U(a,e.S.name+" requires numeric data");h.value.Q=f.Q[g];break;case T:switch(f.type[g]){case "N":h.value.Y=ml(f.Q[g]);break;case "S":h.value.Y=nl(f.M[g])}}}}a.Mc=null;break;case rh:for(d=c.v.Oc.list;null!=d;d=d.e)f.Wa++;f.name=Array(1+f.Wa);f.type=Array(1+f.Wa);f.Q=new Float64Array(1+f.Wa);f.M=Array(1+f.Wa);g=0;for(d=
c.v.Oc.list;null!=d;d=d.e)g++,f.name[g]=d.name,f.type[g]="?",f.Q[g]=0,f.M[g]="";Gn(a,"W");Cm(a,c.v.Oc.domain,c,tn);c=a.Mc;c.link.flush(c);a.Mc=null}break;case bh:x("Checking (line "+b.bb+")...");c=b.v.Rg;Cm(a,c.domain,c,un);break;case dh:wn(a,"Display statement at line "+b.bb);c=b.v.Sg;Cm(a,c.domain,c,An);break;case th:c=b.v.nh;null==c.Ea?a.le=null:(f=xm(a,c.Ea),a.le=null==f.M?f.Q:f.M);Cm(a,c.domain,c,Dn);break;case ih:c=b.v.Ug,Cm(a,c.domain,c,En)}}
function Hn(a){var b;for(b=a.uc;null!=b;b=b.e)switch(b.type){case uh:b.v.set.O=Bl(a,fh,b.v.set.q);break;case sh:switch(b.v.S.type){case N:case mh:case ah:b.v.S.O=Bl(a,N,b.v.S.q);break;case T:b.v.S.O=Bl(a,T,b.v.S.q)}break;case yh:b.v.t.O=Bl(a,gh,b.v.t.q);break;case ch:b.v.H.O=Bl(a,eh,b.v.H.q)}}function In(a,b,c){a.bb=0;a.Vc=0;a.l="\n";a.b=0;a.Bb=0;a.h="";a.value=0;a.Hf=Ah;a.Gf=0;a.Ff="";a.If=0;a.Te=0;a.Ue=0;a.Mf=0;a.Lf=0;a.Kf="";a.Nf=0;ha(a.Zb,0," ",zh);a.lc=0;a.cf=c;a.bf=b||"input";nk(a);Y(a)}
function Jn(a,b,c){null==c?a.he=function(a){x(a)}:(a.he=c,a.jh=b);a.dd=""}function wn(a,b){a.he(b,a.le)}function Kn(a){0<a.dd.length&&(a.he(a.dd,a.le),a.dd="")}
function U(a,b){var c;switch(a.D){case 1:case 2:c=Error(a.bf+":"+a.bb+": "+b);c.line=a.bb;c.column=a.Vc;for(var d;0<a.lc;)a.lc--,d=a.Zb[0],ga(a.Zb,0,a.Zb,1,zh-1),a.Zb[zh-1]=d;x("Context: "+a.bb+" > "+(" "==a.Zb[0]?"":"...")+a.Zb.join("").trim());break;case 3:d=null==a.ib?0:a.ib.bb;var e=null==a.ib?0:a.ib.Vc;c=Error(d+": "+b);c.line=d;c.column=e}a.D=4;throw c;}
function ok(a,b){switch(a.D){case 1:case 2:x(a.bf+":"+a.bb+": warning: "+b);break;case 3:x(a.Yf+":"+(null==a.ib?0:a.ib.bb)+": warning: "+b)}}
var Ld=exports.mpl_initialize=function(){var a={bb:0,Vc:0,l:0,b:0,Bb:0,h:"",value:0,Hf:0,Gf:0,Ff:"",If:0,Te:0,Ue:0,Mf:0,Lf:0,Kf:"",Nf:0};a.Zb=Array(zh);ha(a.Zb,0," ",zh);a.lc=0;a.nc=0;a.V={};a.uc=null;a.Pf=0;a.rg=0;a.qg=0;a.Ke=0;a.Ob=0;a.pg=null;a.Ah="";a.Bh="";a.Gd=sg();a.Of=0;a.ib=null;a.Mc=null;a.g=0;a.i=0;a.n=null;a.f=null;a.cf=null;a.bf=null;a.he=null;a.jh=null;a.Hg=null;a.le=null;a.D=0;a.Yf=null;a.xh="";return a},Nd=exports.mpl_read_model=function(a,b,c,d){function e(){x(a.bb+" line"+(1==a.bb?
"":"s")+" were read");a.cf=null;return a.D}0!=a.D&&w("mpl_read_model: invalid call sequence");null==c&&w("mpl_read_model: no input specified");a.D=1;x("Reading model section from "+b+" ...");In(a,b,c);fl(a);null==a.uc&&U(a,"empty model section not allowed");a.Yf=a.bf;Hn(a);if(rk(a,"data")){if(d)return ok(a,"data section ignored"),e();a.nc=1;Y(a);a.b!=ni&&U(a,"semicolon missing where expected");Y(a);a.D=2;x("Reading data section from "+b+" ...");Kl(a)}cl(a);return e()},Pd=exports.mpl_read_data=function(a,
b,c){1!=a.D&&2!=a.D&&w("mpl_read_data: invalid call sequence");null==c&&w("mpl_read_data: no input specified");a.D=2;x("Reading data section from "+b+" ...");a.nc=1;In(a,b,c);dl(a,"data")&&(Y(a),a.b!=ni&&U(a,"semicolon missing where expected"),Y(a));Kl(a);cl(a);x(a.bb+" line"+(1==a.bb?"":"s")+" were read");a.cf=null;return a.D},Rd=exports.mpl_generate=function(a,b,c,d){1!=a.D&&2!=a.D&&w("mpl_generate: invalid call sequence");a.D=3;a.ve=d;Jn(a,b,c);for(b=a.uc;null!=b&&(Fn(a,b),a.ib.type!=vh);b=b.e);
a.ib=b;Kn(a);for(b=a.uc;null!=b;b=b.e)if(b.type==yh)for(c=b.v.t,c=c.O.head;null!=c;c=c.e);for(b=a.uc;null!=b;b=b.e)if(b.type==ch)for(c=b.v.H,c=c.O.head;null!=c;c=c.e)for(c.value.H.ea=++a.g,d=c.value.H.form;null!=d;d=d.e)d.t.ga.value.t.C=-1;for(b=a.uc;null!=b;b=b.e)if(b.type==yh)for(c=b.v.t,c=c.O.head;null!=c;c=c.e)0!=c.value.t.C&&(c.value.t.C=++a.i);a.n=Array(1+a.g);for(d=1;d<=a.g;d++)a.n[d]=null;for(b=a.uc;null!=b;b=b.e)if(b.type==ch)for(c=b.v.H,c=c.O.head;null!=c;c=c.e)d=c.value.H.ea,a.n[d]=c.value.H;
for(d=1;d<=a.g;d++);a.f=Array(1+a.i);for(d=1;d<=a.i;d++)a.f[d]=null;for(b=a.uc;null!=b;b=b.e)if(b.type==yh)for(c=b.v.t,c=c.O.head;null!=c;c=c.e)d=c.value.t.C,0!=d&&(a.f[d]=c.value.t);for(d=1;d<=a.i;d++);x("Model has been successfully generated");return a.D},Sd=exports.mpl_get_prob_name=function(a){return a.Yf},Td=exports.mpl_get_num_rows=function(a){3!=a.D&&w("mpl_get_num_rows: invalid call sequence");return a.g},be=exports.mpl_get_num_cols=function(a){3!=a.D&&w("mpl_get_num_cols: invalid call sequence");
return a.i},Ud=exports.mpl_get_row_name=function(a,b){3!=a.D&&w("mpl_get_row_name: invalid call sequence");1<=b&&b<=a.g||w("mpl_get_row_name: i = "+b+"; row number out of range");var c=a.n[b].H.name,c=c+zl("[",a.n[b].ga.w).slice(0,255);255==c.length&&(c=c.slice(0,252)+"...");return c},ie=exports.mpl_get_row_kind=function(a,b){var c;3!=a.D&&w("mpl_get_row_kind: invalid call sequence");1<=b&&b<=a.g||w("mpl_get_row_kind: i = "+b+"; row number out of range");switch(a.n[b].H.type){case ch:c=411;break;
case ph:c=je;break;case oh:c=ke}return c},Vd=exports.mpl_get_row_bnds=function(a,b,c){var d;3!=a.D&&w("mpl_get_row_bnds: invalid call sequence");1<=b&&b<=a.g||w("mpl_get_row_bnds: i = "+b+"; row number out of range");d=a.n[b];a=null==d.H.P?-s:d.P;b=null==d.H.W?+s:d.W;a==-s&&b==+s?(d=Wd,a=b=0):b==+s?(d=Xd,b=0):a==-s?(d=Yd,a=0):d=d.H.P!=d.H.W?Zd:$d;c(a,b);return d},he=exports.mpl_get_mat_row=function(a,b,c,d){var e=0;3!=a.D&&w("mpl_get_mat_row: invalid call sequence");1<=b&&b<=a.g||w("mpl_get_mat_row: i = "+
b+"; row number out of range");for(a=a.n[b].form;null!=a;a=a.e)e++,null!=c&&(c[e]=a.t.C),null!=d&&(d[e]=a.u);return e},ae=exports.mpl_get_row_c0=function(a,b){var c;3!=a.D&&w("mpl_get_row_c0: invalid call sequence");1<=b&&b<=a.g||w("mpl_get_row_c0: i = "+b+"; row number out of range");c=a.n[b];return null==c.H.P&&null==c.H.W?-c.P:0},ce=exports.mpl_get_col_name=function(a,b){3!=a.D&&w("mpl_get_col_name: invalid call sequence");1<=b&&b<=a.i||w("mpl_get_col_name: j = "+b+"; column number out of range");
var c=a.f[b].t.name,c=c+zl("[",a.f[b].ga.w);255==c.length&&(c=c.slice(0,252)+"...");return c},de=exports.mpl_get_col_kind=function(a,b){var c;3!=a.D&&w("mpl_get_col_kind: invalid call sequence");1<=b&&b<=a.i||w("mpl_get_col_kind: j = "+b+"; column number out of range");switch(a.f[b].t.type){case N:c=421;break;case mh:c=ee;break;case ah:c=fe}return c},ge=exports.mpl_get_col_bnds=function(a,b,c){var d;3!=a.D&&w("mpl_get_col_bnds: invalid call sequence");1<=b&&b<=a.i||w("mpl_get_col_bnds: j = "+b+"; column number out of range");
d=a.f[b];a=null==d.t.P?-s:d.P;b=null==d.t.W?+s:d.W;a==-s&&b==+s?(d=Wd,a=b=0):b==+s?(d=Xd,b=0):a==-s?(d=Yd,a=0):d=d.t.P!=d.t.W?Zd:$d;c(a,b);return d},me=exports.mpl_has_solve_stmt=function(a){3!=a.D&&w("mpl_has_solve_stmt: invalid call sequence");return a.Ob},ne=exports.mpl_put_row_soln=function(a,b,c,d,e){a.n[b].m=c;a.n[b].r=d;a.n[b].J=e},oe=exports.mpl_put_col_soln=function(a,b,c,d,e){a.f[b].m=c;a.f[b].r=d;a.f[b].J=e},pe=exports.mpl_postsolve=function(a){(3!=a.D||a.Of)&&w("mpl_postsolve: invalid call sequence");
var b;a.Of=1;for(b=a.ib;null!=b;b=b.e)Fn(a,b);a.ib=null;Kn(a);x("Model has been successfully processed");return a.D},Ln="Monday Tuesday Wednesday Thursday Friday Saturday Sunday".split(" "),Mn="January February March April May June July August September October November December".split(" ");function Nn(a){for(var b="";0<a;)b+="^",a--;return b}function On(a,b,c,d,e,f){x("Input string passed to str2time:");x(b);x(Nn(c+1));x("Format string passed to str2time:\n");x(d);x(Nn(e+1));U(a,f)}
function cn(a,b,c){function d(){On(a,b,n,c,t,"time zone offset value incomplete or invalid")}function e(){On(a,b,n,c,t,"time zone offset value out of range")}function f(){b[n]!=c[t]&&On(a,b,n,c,t,"character mismatch");n++}var g,h,k,l,p,m,q,r,n,t;h=k=l=p=m=q=-1;r=2147483647;for(t=n=0;t<c.length;t++)if("%"==c[t])if(t++,"b"==c[t]||"h"==c[t]){var y;for(0<=k&&On(a,b,n,c,t,"month multiply specified");" "==b[n];)n++;for(k=1;12>=k;k++){y=Mn[k-1];var E=!1;for(g=0;2>=g;g++)if(n[g].toUpperCase()!=y[g].toUpperCase()){E=
!0;break}if(!E){n+=3;for(g=3;"\x00"!=y[g]&&b[n].toUpperCase()==y[g].toUpperCase();g++)n++;break}}12<k&&On(a,b,n,c,t,"abbreviated month name missing or invalid")}else if("d"==c[t]){for(0<=l&&On(a,b,n,c,t,"day multiply specified");" "==b[n];)n++;"0"<=b[n]&&"9">=b[n]||On(a,b,n,c,t,"day missing or invalid");l=b[n++]-0;"0"<=b[n]&&"9">=b[n]&&(l=10*l+(b[n++]-0));1<=l&&31>=l||On(a,b,n,c,t,"day out of range")}else if("H"==c[t]){for(0<=p&&On(a,b,n,c,t,"hour multiply specified");" "==b[n];)n++;"0"<=b[n]&&"9">=
b[n]||On(a,b,n,c,t,"hour missing or invalid");p=b[n++]-0;"0"<=b[n]&&"9">=b[n]&&(p=10*p+(b[n++]-0));0<=p&&23>=p||On(a,b,n,c,t,"hour out of range")}else if("m"==c[t]){for(0<=k&&On(a,b,n,c,t,"month multiply specified");" "==b[n];)n++;"0"<=b[n]&&"9">=b[n]||On(a,b,n,c,t,"month missing or invalid");k=b[n++]-0;"0"<=b[n]&&"9">=b[n]&&(k=10*k+(b[n++]-0));1<=k&&12>=k||On(a,b,n,c,t,"month out of range")}else if("M"==c[t]){for(0<=m&&On(a,b,n,c,t,"minute multiply specified");" "==b[n];)n++;"0"<=b[n]&&"9">=b[n]||
On(a,b,n,c,t,"minute missing or invalid");m=b[n++]-0;"0"<=b[n]&&"9">=b[n]&&(m=10*m+(b[n++]-0));0<=m&&59>=m||On(a,b,n,c,t,"minute out of range")}else if("S"==c[t]){for(0<=q&&On(a,b,n,c,t,"second multiply specified");" "==b[n];)n++;"0"<=b[n]&&"9">=b[n]||On(a,b,n,c,t,"second missing or invalid");q=b[n++]-0;"0"<=b[n]&&"9">=b[n]&&(q=10*q+(b[n++]-0));0<=q&&60>=q||On(a,b,n,c,t,"second out of range")}else if("y"==c[t]){for(0<=h&&On(a,b,n,c,t,"year multiply specified");" "==b[n];)n++;"0"<=b[n]&&"9">=b[n]||
On(a,b,n,c,t,"year missing or invalid");h=b[n++]-0;"0"<=b[n]&&"9">=b[n]&&(h=10*h+(b[n++]-0));h+=69<=h?1900:2E3}else if("Y"==c[t]){for(0<=h&&On(a,b,n,c,t,"year multiply specified");" "==b[n];)n++;"0"<=b[n]&&"9">=b[n]||On(a,b,n,c,t,"year missing or invalid");h=0;for(g=1;4>=g&&"0"<=b[n]&&"9">=b[n];g++)h=10*h+(b[n++]-0);1<=h&&4E3>=h||On(a,b,n,c,t,"year out of range")}else if("z"==c[t]){var C;for(2147483647!=r&&On(a,b,n,c,t,"time zone offset multiply specified");" "==b[n];)n++;if("Z"==b[n])C=p=m=0,n++;
else{"+"==b[n]?(C=1,n++):"-"==b[n]?(C=-1,n++):On(a,b,n,c,t,"time zone offset sign missing");p=0;for(g=1;2>=g;g++)"0"<=b[n]&&"9">=b[n]||d(),p=10*p+(b[n++]-0);23<p&&e();":"==b[n]&&(n++,"0"<=b[n]&&"9">=b[n]||d());m=0;if("0"<=b[n]&&"9">=b[n]){for(g=1;2>=g;g++)"0"<=b[n]&&"9">=b[n]||d(),m=10*m+(b[n++]-0);59<m&&e()}}r=C*(60*p+m)}else"%"==c[t]?f():On(a,b,n,c,t,"invalid conversion specifier");else" "!=c[t]&&f();0>h&&(h=1970);0>k&&(k=1);0>l&&(l=1);0>p&&(p=0);0>m&&(m=0);0>q&&(q=0);2147483647==r&&(r=0);g=xg(l,
k,h);return 60*(60*(24*(g-xg(1,1,1970))+p)+m)+q-60*r}function Pn(a,b,c){x("Format string passed to time2str:");x(b);x(Nn(c));U(a,"invalid conversion specifier")}function Qn(a){return(a+xg(1,1,1970))%7+1}function Rn(a){a=xg(1,1,a)-xg(1,1,1970);switch(Qn(a)){case 1:a+=0;break;case 2:a-=1;break;case 3:a-=2;break;case 4:a-=3;break;case 5:a+=3;break;case 6:a+=2;break;case 7:a+=1}Qn(a);return a}
function dn(a,b,c){var d,e=0,f=0,g=0,h,k,l,p="",m;-62135596800<=b&&64092211199>=b||U(a,"time2str("+b+",...); argument out of range");b=Math.floor(b+0.5);h=Math.abs(b)/86400;d=Math.floor(h);0>b&&(d=h==Math.floor(h)?-d:-(d+1));yg(d+xg(1,1,1970),function(a,b,c){g=a;f=b;e=c});k=b-86400*d|0;h=k/60;k%=60;b=h/60;h%=60;for(l=0;l<c.length;l++)"%"==c[l]?(l++,"a"==c[l]?m=Ln[Qn(d)-1].slice(0,3):"A"==c[l]?m=Ln[Qn(d)-1]:"b"==c[l]||"h"==c[l]?m=Mn[f-1].slice(0,3):"B"==c[l]?m=Mn[f-1]:"C"==c[l]?m=String(Math.floor(e/
100)):"d"==c[l]?m=String(g):"D"==c[l]?m=f+"/"+g+"/"+e%100:"e"==c[l]?m=String(g):"F"==c[l]?xa(m,e+"-"+f+"-"+g):"g"==c[l]?(m=d<Rn(e)?e-1:d<Rn(e+1)?e:e+1,m=String(m%100)):"G"==c[l]?(m=d<Rn(e)?e-1:d<Rn(e+1)?e:e+1,m=String(m)):"H"==c[l]?m=String(b):"I"==c[l]?m=String(0==b?12:12>=b?b:b-12):"j"==c[l]?m=String(xg(g,f,e)-xg(1,1,e)+1):"k"==c[l]?m=String(b):"l"==c[l]?m=String(0==b?12:12>=b?b:b-12):"m"==c[l]?m=String(f):"M"==c[l]?m=String(h):"p"==c[l]?m=11>=b?"AM":"PM":"P"==c[l]?m=11>=b?"am":"pm":"r"==c[l]?m=
(0==b?12:12>=b?b:b-12)+":"+h+":"+k+" "+(11>=b?"AM":"PM"):"R"==c[l]?m=b+":"+h:"S"==c[l]?m=String(k):"T"==c[l]?m=b+":"+h+":"+k:"u"==c[l]?m=String(Qn(d)):"U"==c[l]?(m=xg(1,1,e)-xg(1,1,1970),m+=7-Qn(m),m=String((d+7-m)/7)):"V"==c[l]?(m=d<Rn(e)?d-Rn(e-1):d<Rn(e+1)?d-Rn(e):d-Rn(e+1),m=String(m/7+1)):"w"==c[l]?m=String(Qn(d)%7):"W"==c[l]?(m=xg(1,1,e)-xg(1,1,1970),m+=(8-Qn(m))%7,m=String((d+7-m)/7)):"y"==c[l]?m=String(e%100):"Y"==c[l]?m=String(e):"%"==c[l]?m="%":Pn(a,c,l)):m=c[l],p+=m;return p}var Sn={};
function Gn(a,b){var c=a.Mc,d=Sn[c.a[1].toLowerCase()];d?c.link=new d(c,b,a.ve):U(a,"Invalid table driver '"+c.a[1]+"'");null==c.link&&U(a,"error on opening table "+a.ib.v.nd.name)}var Tn=exports.mpl_tab_drv_register=function(a,b){Sn[a.toLowerCase()]=b};
function Un(a,b,c){this.mode=b;this.Ea=null;this.count=0;this.l="\n";this.Hb=0;this.pb="";this.Wa=0;this.Oa=[];this.ve=c;this.ng=0;this.Ae=1;this.og=2;this.Be=3;2>kn(a)&&w("csv_driver: file name not specified\n");this.Ea=ln(a,2);if("R"==b){c?(this.data=c(a.a,b),this.cursor=0):w("csv_driver: unable to open "+this.Ea);this.Eg=0;for(Vn(this);;){Vn(this);if(this.Hb==this.Ae)break;this.Hb!=this.Be&&w(this.Ea+":"+this.count+": invalid field name\n");this.Wa++;for(b=mn(a);1<=b&&nn(a,b)!=this.pb;b--);this.Oa[this.Wa]=
b}for(b=mn(a);1<=b&&"RECNO"!=nn(a,b);b--);this.Oa[0]=b}else if("W"==b){this.data="";c=mn(a);for(b=1;b<=c;b++)this.data+=nn(a,b)+(b<c?",":"\n");this.count++}}
function Vn(a){if(-1==a.l)a.Hb=a.ng,a.pb="EOF";else if("\n"==a.l){if(a.Hb=a.Ae,a.pb="EOR",Wn(a),","==a.l&&w(a.Ea+":"+a.count+": empty field not allowed\n"),"\n"==a.l&&w(a.Ea+":"+a.count+": empty record not allowed\n"),"#"==a.l&&1==a.count)for(;"#"==a.l;){for(;"\n"!=a.l;)Wn(a);Wn(a);a.Eg++}}else if(","==a.l&&Wn(a),"'"==a.l||'"'==a.l){var b=a.l;a.pb="";a.Hb=a.Be;for(Wn(a);;){if(a.l==b&&(Wn(a),a.l!=b))if(","==a.l||"\n"==a.l)break;else w(a.Ea+":"+a.count+": invalid field");a.pb+=a.l;Wn(a)}0==a.pb.length&&
w(a.Ea+":"+a.count+": empty field not allowed")}else{a.pb="";for(a.Hb=a.og;","!=a.l&&"\n"!=a.l;)"'"!=a.l&&'"'!=a.l||w(a.Ea+":"+a.count+": invalid use of single or double quote within field"),a.pb+=a.l,Wn(a);0==a.pb.length&&w(a.Ea+":"+a.count+": empty field not allowed");vg(a.pb,function(){})&&(a.Hb=a.Be)}}function Wn(a){var b;for("\n"==a.l&&a.count++;;)if(b=a.cursor<a.data.length?a.data[a.cursor++]:-1,"\r"!=b){"\n"!=b&&ta(b)&&w(a.Ea+":"+a.count+": invalid control character "+b);break}a.l=b}
Un.prototype.readRecord=function(a){var b;0<this.Oa[0]&&rn(a,this.Oa[0],this.count-this.Eg-1);for(b=1;b<=this.Wa;b++){Vn(this);if(this.Hb==this.ng)return-1;if(this.Hb==this.Ae){var c=this.Wa-b+1;1==c?w(this.Ea+":"+this.count+": one field missing"):w(this.Ea+":"+this.count+": "+c+" fields missing")}else if(this.Hb==this.og){if(0<this.Oa[b]){var d=0;vg(this.pb,function(a){d=a});rn(a,this.Oa[b],d)}}else this.Hb==this.Be&&0<this.Oa[b]&&sn(a,this.Oa[b],this.pb)}Vn(this);this.Hb!=this.Ae&&w(this.Ea+":"+
this.count+": too many fields");return 0};Un.prototype.writeRecord=function(a){var b,c,d,e;c=mn(a);for(b=1;b<=c;b++){switch(on(a,b)){case "N":this.data+=pn(a,b);break;case "S":this.data+='"';d=qn(a,b);for(e=0;d.length>e;e++)this.data='"'==d[e]?this.data+'""':this.data+d[e];this.data+='"'}this.data+=b<c?",":"\n"}this.count++;return 0};Un.prototype.flush=function(a){this.ve(a.a,this.mode,this.data)};Tn("CSV",Un);
function Xn(a,b,c){this.mode=b;this.Ea=null;2>kn(a)&&w("json driver: file name not specified");this.Ea=ln(a,2);if("R"==b)for(this.Oa={},c?(this.data=c(a.a,b),"string"==typeof this.data&&(this.data=JSON.parse(this.data)),this.cursor=1):w("json driver: unable to open "+this.Ea),a=0,b=this.data[0];a<b.length;a++)this.Oa[b[a]]=a;else if("W"==b){this.ve=c;c=[];this.data=[c];var d=mn(a);for(b=1;b<=d;b++)c.push(nn(a,b))}}
Xn.prototype.writeRecord=function(a){var b,c=mn(a),d=[];for(b=1;b<=c;b++)switch(on(a,b)){case "N":d.push(pn(a,b));break;case "S":d.push(qn(a,b))}this.data.push(d);return 0};Xn.prototype.readRecord=function(a){var b=this.data[this.cursor++];if(null==b)return-1;for(var c=1;c<=mn(a);c++){var d=this.Oa[nn(a,c)];if(null!=d)switch(d=b[d],typeof d){case "number":rn(a,c,d);break;case "boolean":rn(a,c,Number(d));break;case "string":sn(a,c,d);break;default:w("Unexpected data type "+d+" in "+this.Ea)}}return 0};
Xn.prototype.flush=function(a){this.ve(a.a,this.mode,this.data)};Tn("JSON",Xn);function Xb(){var a={$b:0};a.wc=a.gh=a.hh=0;a.name=a.eb=null;a.ha=0;a.ee=a.de=0;a.Db=a.Pc=null;a.Kb=a.td=null;a.top=null;a.g=a.i=a.L=0;a.uf=a.Sd=null;a.da=a.ue=0;a.nf=a.xg=a.Kg=a.zg=0;a.la=null;a.Aa=null;a.ka=null;a.Pa=null;return a}function Yn(a,b,c){0==c?(b.ca=null,b.e=a.Db,null==b.e?a.Pc=b:b.e.ca=b,a.Db=b):(b.ca=a.Pc,b.e=null,null==b.ca?a.Db=b:b.ca.e=b,a.Pc=b)}
function Zn(a,b){null==b.ca?a.Db=b.e:b.ca.e=b.e;null==b.e?a.Pc=b.ca:b.e.ca=b.ca}function $n(a,b){b.ja||(b.ja=1,Zn(a,b),Yn(a,b,0))}function ao(a,b,c){0==c?(b.ca=null,b.e=a.Kb,null==b.e?a.td=b:b.e.ca=b,a.Kb=b):(b.ca=a.td,b.e=null,null==b.ca?a.Kb=b:b.ca.e=b,a.td=b)}function bo(a,b){null==b.ca?a.Kb=b.e:b.ca.e=b.e;null==b.e?a.td=b.ca:b.e.ca=b.ca}function co(a,b){b.ja||(b.ja=1,bo(a,b),ao(a,b,0))}function eo(a){var b={};b.ea=++a.ee;b.name=null;b.c=-s;b.d=+s;b.k=null;b.ja=0;Yn(a,b,1);return b}
function fo(a){var b={};b.C=++a.de;b.name=null;b.Ra=0;b.c=b.d=b.u=0;b.k=null;b.ja=0;b.qb={};b.ub={};ao(a,b,1);return b}function go(a,b,c){var d={};d.n=a;d.f=b;d.j=c;d.ua=null;d.B=a.k;d.ra=null;d.I=b.k;null!=d.B&&(d.B.ua=d);null!=d.I&&(d.I.ra=d);a.k=b.k=d}function ho(a,b){var c;c={};c.Zd=b;c.info={};c.link=a.top;a.top=c;return c.info}function io(a){for(var b;null!=a.k;)b=a.k,a.k=b.B,null==b.ra?b.f.k=b.I:b.ra.I=b.I,null!=b.I&&(b.I.ra=b.ra)}function jo(a,b){io(b);Zn(a,b)}
function ko(a,b){for(var c;null!=b.k;)c=b.k,b.k=c.I,null==c.ua?c.n.k=c.B:c.ua.B=c.B,null!=c.B&&(c.B.ua=c.ua);bo(a,b)}
function Yb(a,b,c){var d=cb,e=cb,f=b.g,g=b.i,h,k,l;a.$b=b.dir;a.$b==za?l=1:a.$b==Ea&&(l=-1);a.wc=f;a.gh=g;a.hh=b.L;d&&null!=b.name&&(a.name=b.name);d&&null!=b.eb&&(a.eb=b.eb);a.ha=l*b.ha;h=Array(1+f);for(k=1;k<=f;k++){var p=b.n[k],m;h[k]=m=eo(a);d&&null!=p.name&&(m.name=p.name);if(e){var q=p.ma;p.type==Ka?(m.c=-s,m.d=+s):p.type==Sa?(m.c=p.c*q,m.d=+s):p.type==Ta?(m.c=-s,m.d=p.d*q):p.type==I?(m.c=p.c*q,m.d=p.d*q):p.type==B&&(m.c=m.d=p.c*q)}else p.type==Ka?(m.c=-s,m.d=+s):p.type==Sa?(m.c=p.c,m.d=+s):
p.type==Ta?(m.c=-s,m.d=p.d):p.type==I?(m.c=p.c,m.d=p.d):p.type==B&&(m.c=m.d=p.c)}for(f=1;f<=g;f++)if(m=b.f[f],k=fo(a),d&&null!=m.name&&(k.name=m.name),c==Sc&&(k.Ra=Number(m.kind==Fc)),e)for(p=m.va,m.type==Ka?(k.c=-s,k.d=+s):m.type==Sa?(k.c=m.c/p,k.d=+s):m.type==Ta?(k.c=-s,k.d=m.d/p):m.type==I?(k.c=m.c/p,k.d=m.d/p):m.type==B&&(k.c=k.d=m.c/p),k.u=l*m.u*p,m=m.k;null!=m;m=m.I)go(h[m.n.ea],k,m.n.ma*m.j*p);else for(m.type==Ka?(k.c=-s,k.d=+s):m.type==Sa?(k.c=m.c,k.d=+s):m.type==Ta?(k.c=-s,k.d=m.d):m.type==
I?(k.c=m.c,k.d=m.d):m.type==B&&(k.c=k.d=m.c),k.u=l*m.u,m=m.k;null!=m;m=m.I)go(h[m.n.ea],k,m.j);a.da=c;a.ue=e}
function cc(a,b){var c,d,e,f,g,h,k;db(b);Ca(b,a.name);Da(b,a.eb);Fa(b,a.$b);a.$b==za?h=1:a.$b==Ea&&(h=-1);Xa(b,0,h*a.ha);for(c=a.Db;null!=c;c=c.e)c.ja=e=La(b,1),Pa(b,e,c.name),d=c.c==-s&&c.d==+s?Ka:c.d==+s?Sa:c.c==-s?Ta:c.c!=c.d?I:B,Va(b,e,d,c.c,c.d);g=new Int32Array(1+b.g);k=new Float64Array(1+b.g);for(c=a.Kb;null!=c;c=c.e){e=Oa(b,1);Qa(b,e,c.name);Hc(b,e,c.Ra?Fc:Ma);d=c.c==-s&&c.d==+s?Ka:c.d==+s?Sa:c.c==-s?Ta:c.c!=c.d?I:B;Wa(b,e,d,c.c,c.d);Xa(b,e,h*c.u);f=0;for(d=c.k;null!=d;d=d.I)f++,g[f]=d.n.ja,
k[f]=d.j;Za(b,e,f,g,k)}a.g=b.g;a.i=b.i;a.L=b.L;a.uf=new Int32Array(1+a.g);a.Sd=new Int32Array(1+a.i);c=a.Db;for(e=0;null!=c;c=c.e)a.uf[++e]=c.ea;c=a.Kb;for(e=0;null!=c;c=c.e)a.Sd[++e]=c.C;a.name=a.eb=null;a.ha=0;a.Db=a.Pc=null;a.Kb=a.td=null}
function Ub(a,b){var c,d,e,f;a.$b==za?d=1:a.$b==Ea&&(d=-1);a.da==Zb?(a.nf=b.na,a.xg=b.sa):a.da==le?a.Kg=b.df:a.da==Sc&&(a.zg=b.za);if(a.da==Zb){null==a.la&&(a.la=new Int8Array(1+a.ee));for(f=1;f<=a.ee;f++)a.la[f]=0;null==a.ka&&(a.ka=new Int8Array(1+a.de));for(c=1;c<=a.de;c++)a.ka[c]=0}null==a.Pa&&(a.Pa=new Float64Array(1+a.de));for(c=1;c<=a.de;c++)a.Pa[c]=s;if(a.da!=Sc)for(null==a.Aa&&(a.Aa=new Float64Array(1+a.ee)),f=1;f<=a.ee;f++)a.Aa[f]=s;if(a.da==Zb){for(f=1;f<=a.g;f++)c=b.n[f],e=a.uf[f],a.la[e]=
c.m,a.Aa[e]=d*c.J;for(c=1;c<=a.i;c++)d=b.f[c],e=a.Sd[c],a.ka[e]=d.m,a.Pa[e]=d.r}else if(a.da==le){for(f=1;f<=a.g;f++)c=b.n[f],e=a.uf[f],a.Aa[e]=d*c.mc;for(c=1;c<=a.i;c++)d=b.f[c],e=a.Sd[c],a.Pa[e]=d.dc}else if(a.da==Sc)for(c=1;c<=a.i;c++)d=b.f[c],e=a.Sd[c],a.Pa[e]=d.Sa;for(e=a.top;null!=e;e=e.link)e.Zd(a,e.info)}
function Vb(a,b){var c,d,e,f;a.$b==za?e=1:a.$b==Ea&&(e=-1);if(a.da==Zb){b.valid=0;b.na=a.nf;b.sa=a.xg;b.aa=b.ha;b.some=0;for(d=1;d<=b.g;d++)c=b.n[d],c.m=a.la[d],c.J=a.ue?e*a.Aa[d]*c.ma:e*a.Aa[d],c.m==A?c.J=0:c.m==G?c.r=c.c:c.m==Ua?c.r=c.d:c.m==Ra?c.r=0:c.m==Na&&(c.r=c.c);for(d=1;d<=b.i;d++)c=b.f[d],c.m=a.ka[d],c.r=a.ue?a.Pa[d]*c.va:a.Pa[d],c.m==A?c.J=0:c.m==G?c.r=c.c:c.m==Ua?c.r=c.d:c.m==Ra?c.r=0:c.m==Na&&(c.r=c.c),b.aa+=c.u*c.r;for(d=1;d<=b.g;d++)if(c=b.n[d],c.m==A){f=0;for(e=c.k;null!=e;e=e.B)f+=
e.j*e.f.r;c.r=f}for(d=1;d<=b.i;d++)if(c=b.f[d],c.m!=A){f=c.u;for(e=c.k;null!=e;e=e.I)f-=e.j*e.n.J;c.J=f}}else if(a.da==le){b.df=a.Kg;b.ae=b.ha;for(d=1;d<=b.g;d++)c=b.n[d],c.mc=a.ue?e*a.Aa[d]*c.ma:e*a.Aa[d];for(d=1;d<=b.i;d++)c=b.f[d],c.dc=a.ue?a.Pa[d]*c.va:a.Pa[d],b.ae+=c.u*c.dc;for(d=1;d<=b.g;d++){c=b.n[d];f=0;for(e=c.k;null!=e;e=e.B)f+=e.j*e.f.dc;c.dc=f}for(d=1;d<=b.i;d++){c=b.f[d];f=c.u;for(e=c.k;null!=e;e=e.I)f-=e.j*e.n.mc;c.mc=f}}else if(a.da==Sc){b.za=a.zg;b.ta=b.ha;for(d=1;d<=b.i;d++)c=b.f[d],
c.Sa=a.Pa[d],b.ta+=c.u*c.Sa;for(d=1;d<=b.g;d++){c=b.n[d];f=0;for(e=c.k;null!=e;e=e.B)f+=e.j*e.f.Sa;c.Sa=f}}}function lo(a,b){ho(a,function(a,b){a.da==Zb&&(a.la[b.s]=A);a.da!=Sc&&(a.Aa[b.s]=0);return 0}).s=b.ea;jo(a,b)}
function mo(a,b){var c,d;c=ho(a,function(a,b){if(a.da==Zb)if(a.ka[b.F]==A||a.ka[b.F]==G||a.ka[b.F]==Ua)a.ka[b.F]=a.ka[b.F];else return 1;a.Pa[b.F]=b.Ng+a.Pa[b.F];return 0});c.F=b.C;c.Ng=b.c;a.ha+=b.u*b.c;for(d=b.k;null!=d;d=d.I)c=d.n,c.c==c.d?c.d=c.c-=d.j*b.c:(c.c!=-s&&(c.c-=d.j*b.c),c.d!=+s&&(c.d-=d.j*b.c));b.d!=+s&&(b.d-=b.c);b.c=0}
function no(a,b){var c,d;c=ho(a,function(a,b){a.da==Zb&&(a.ka[b.F]=Na);a.Pa[b.F]=b.ph;return 0});c.F=b.C;c.ph=b.c;a.ha+=b.u*b.c;for(d=b.k;null!=d;d=d.I)c=d.n,c.c==c.d?c.d=c.c-=d.j*b.c:(c.c!=-s&&(c.c-=d.j*b.c),c.d!=+s&&(c.d-=d.j*b.c));ko(a,b)}
function oo(a,b){var c,d,e;d=1E-9+1E-12*Math.abs(b.c);b.d-b.c>d||(ho(a,function(a,b){if(a.da==Zb)if(a.la[b.s]==A)a.la[b.s]=A;else if(a.la[b.s]==Na)a.la[b.s]=0<=a.Aa[b.s]?G:Ua;else return 1;return 0}).s=b.ea,c=0.5*(b.d+b.c),e=Math.floor(c+0.5),Math.abs(c-e)<=d&&(c=e),b.c=b.d=c)}
function po(a,b){var c,d,e,f;f=1E-9+1E-12*Math.abs(b.c);if(b.d-b.c>f)return 0;c=ho(a,function(a,b){var c,d;if(a.da==Zb)if(a.ka[b.F]==A)a.ka[b.F]=A;else if(a.ka[b.F]==Na){d=b.l;for(c=b.k;null!=c;c=c.e)d-=c.j*a.Aa[c.Oa];a.ka[b.F]=0<=d?G:Ua}else return 1;return 0});c.F=b.C;c.l=b.u;c.k=null;if(a.da==Zb)for(d=b.k;null!=d;d=d.I)e={},e.Oa=d.n.ea,e.j=d.j,e.e=c.k,c.k=e;c=0.5*(b.d+b.c);d=Math.floor(c+0.5);Math.abs(c-d)<=f&&(c=d);b.c=b.d=c;return 1}
function qo(a,b){if(0.001<b.c||-0.001>b.d)return 1;b.c=-s;b.d=+s;lo(a,b);return 0}function ro(a,b){function c(){e.m=G;b.d=b.c}function d(){e.m=Ua;b.c=b.d}var e;if(0.001<b.u&&b.c==-s||-0.001>b.u&&b.d==+s)return 1;e=ho(a,function(a,b){a.da==Zb&&(a.ka[b.F]=b.m);return 0});e.F=b.C;b.c==-s&&b.d==+s?(e.m=Ra,b.c=b.d=0):b.d==+s?c():b.c==-s?d():b.c!=b.d?2.220446049250313E-16<=b.u?c():-2.220446049250313E-16>=b.u?d():Math.abs(b.c)<=Math.abs(b.d)?c():d():e.m=Na;no(a,b);return 0}
function so(a,b){var c;if(a.Ra)if(c=Math.floor(b+0.5),1E-5>=Math.abs(b-c))b=c;else return 2;if(a.c!=-s){c=a.Ra?1E-5:1E-5+1E-8*Math.abs(a.c);if(b<a.c-c)return 1;if(b<a.c+0.001*c)return a.d=a.c,0}if(a.d!=+s){c=a.Ra?1E-5:1E-5+1E-8*Math.abs(a.d);if(b>a.d+c)return 1;if(b>a.d-0.001*c)return a.c=a.d,0}a.c=a.d=b;return 0}
function to(a,b){var c,d,e;e=b.k;d=e.f;c=so(d,b.c/e.j);if(0!=c)return c;c=ho(a,function(a,b){var c,d;if(a.da==Zb){if(a.ka[b.F]!=Na)return 1;a.la[b.s]=Na;a.ka[b.F]=A}if(a.da!=Sc){d=b.l;for(c=b.k;null!=c;c=c.e)d-=c.j*a.Aa[c.Oa];a.Aa[b.s]=d/b.Da}return 0});c.s=b.ea;c.F=d.C;c.Da=e.j;c.l=d.u;c.k=null;if(a.da!=Sc)for(e=d.k;null!=e;e=e.I)e.n!=b&&(d={},d.Oa=e.n.ea,d.j=e.j,d.e=c.k,c.k=d);jo(a,b);return 0}
function uo(a,b){var c;a.Ra&&(c=Math.floor(b+0.5),b=1E-5>=Math.abs(b-c)?c:Math.ceil(b));if(a.c!=-s&&(c=a.Ra?0.001:0.001+1E-6*Math.abs(a.c),b<a.c+c))return 0;if(a.d!=+s){c=a.Ra?1E-5:1E-5+1E-8*Math.abs(a.d);if(b>a.d+c)return 4;if(b>a.d-0.001*c)return a.c=a.d,3}c=a.c==-s?2:a.Ra&&b>a.c+0.5?2:b>a.c+0.3*(1+Math.abs(a.c))?2:1;a.c=b;return c}
function vo(a,b){var c;a.Ra&&(c=Math.floor(b+0.5),b=1E-5>=Math.abs(b-c)?c:Math.floor(b));if(a.d!=+s&&(c=a.Ra?0.001:0.001+1E-6*Math.abs(a.d),b>a.d-c))return 0;if(a.c!=-s){c=a.Ra?1E-5:1E-5+1E-8*Math.abs(a.c);if(b<a.c-c)return 4;if(b<a.c+0.001*c)return a.d=a.c,3}c=a.d==+s?2:a.Ra&&b<a.d-0.5?2:b<a.d-0.3*(1+Math.abs(a.d))?2:1;a.d=b;return c}
function wo(a,b){var c,d,e,f,g,h;e=b.k;d=e.f;0<e.j?(g=b.c==-s?-s:b.c/e.j,c=b.d==+s?+s:b.d/e.j):(g=b.d==+s?-s:b.d/e.j,c=b.c==-s?+s:b.c/e.j);if(g==-s)g=0;else if(g=uo(d,g),4==g)return 4;if(c==+s)h=0;else if(3==g)h=0;else if(h=vo(d,c),4==h)return 4;if(!g&&!h)return b.c=-s,b.d=+s,lo(a,b),0;c=ho(a,function(a,b){var c,d;if(a.da==Sc)return 0;d=b.l;for(c=b.k;null!=c;c=c.e)d-=c.j*a.Aa[c.Oa];if(a.da==Zb){c=function(){b.Vf?(a.la[b.s]=0<b.Da?G:Ua,a.ka[b.F]=A,a.Aa[b.s]=d/b.Da):(a.la[b.s]=A,a.Aa[b.s]=0);return 0};
var e=function(){b.gg?(a.la[b.s]=0<b.Da?Ua:G,a.ka[b.F]=A,a.Aa[b.s]=d/b.Da):(a.la[b.s]=A,a.Aa[b.s]=0);return 0};if(a.ka[b.F]==A)a.la[b.s]=A,a.Aa[b.s]=0;else if(a.ka[b.F]==G)c();else if(a.ka[b.F]==Ua)e();else if(a.ka[b.F]==Na){if(1E-7<d&&(0<b.Da&&b.c!=-s||0>b.Da&&b.d!=+s||!b.Vf))return a.ka[b.F]=G,c();if(-1E-7>d&&(0<b.Da&&b.d!=+s||0>b.Da&&b.c!=-s||!b.gg))return a.ka[b.F]=Ua,e();if(b.c!=-s&&b.d==+s)a.la[b.s]=G;else if(b.c==-s&&b.d!=+s)a.la[b.s]=Ua;else if(b.c!=-s&&b.d!=+s)a.la[b.s]=b.Da*a.Pa[b.F]<=0.5*
(b.c+b.d)?G:Ua;else return 1;a.ka[b.F]=A;a.Aa[b.s]=d/b.Da}else return 1}a.da==le&&(a.Aa[b.s]=2.220446049250313E-16<d&&b.Vf||-2.220446049250313E-16>d&&b.gg?d/b.Da:0);return 0});c.s=b.ea;c.F=d.C;c.Da=e.j;c.l=d.u;c.c=b.c;c.d=b.d;c.Vf=g;c.gg=h;c.k=null;if(a.da!=Sc)for(d=d.k;null!=d;d=d.I)d!=e&&(f={},f.Oa=d.n.ea,f.j=d.j,f.e=c.k,c.k=f);jo(a,b);return g>=h?g:h}
function xo(a,b){var c,d,e,f;e=b.k;d=e.n;c=ho(a,function(a,b){var c,d;if(a.da==Zb){if(a.la[b.s]==A||a.la[b.s]==Ra)a.ka[b.F]=a.la[b.s];else if(a.la[b.s]==G)a.ka[b.F]=0<b.Da?Ua:G;else if(a.la[b.s]==Ua)a.ka[b.F]=0<b.Da?G:Ua;else return 1;a.la[b.s]=Na}a.da!=Sc&&(a.Aa[b.s]+=b.l/b.Da);c=b.qd;for(d=b.k;null!=d;d=d.e)c-=d.j*a.Pa[d.Oa];a.Pa[b.F]=c/b.Da;return 0});c.s=d.ea;c.F=b.C;c.Da=e.j;c.qd=d.c;c.l=b.u;c.k=null;for(e=d.k;null!=e;e=e.B)e.f!=b&&(f={},f.Oa=e.f.C,f.j=e.j,f.e=c.k,c.k=f,e.f.u-=e.j/c.Da*c.l);
a.ha+=c.qd/c.Da*c.l;0<c.Da?(d.c=b.d==+s?-s:c.qd-c.Da*b.d,d.d=b.c==-s?+s:c.qd-c.Da*b.c):(d.c=b.c==-s?-s:c.qd-c.Da*b.c,d.d=b.d==+s?+s:c.qd-c.Da*b.d);ko(a,b)}
function yo(a,b){function c(){e.m=G;f.d=f.c}function d(){e.m=Ua;f.c=f.d}var e,f,g,h,k,l;g=b.k;f=g.n;k=f.c;if(k!=-s)for(h=f.k;null!=h;h=h.B)if(h!=g)if(0<h.j){if(h.f.d==+s){k=-s;break}k-=h.j*h.f.d}else{if(h.f.c==-s){k=-s;break}k-=h.j*h.f.c}l=f.d;if(l!=+s)for(h=f.k;null!=h;h=h.B)if(h!=g)if(0<h.j){if(h.f.c==-s){l=+s;break}l-=h.j*h.f.c}else{if(h.f.d==+s){l=+s;break}l-=h.j*h.f.d}h=0<g.j?k==-s?-s:k/g.j:l==+s?-s:l/g.j;k=0<g.j?l==+s?+s:l/g.j:k==-s?+s:k/g.j;if(b.c!=-s&&(l=1E-9+1E-12*Math.abs(b.c),h<b.c-l)||
b.d!=+s&&(l=1E-9+1E-12*Math.abs(b.d),k>b.d+l))return 1;b.c=-s;b.d=+s;e=ho(a,function(a,b){if(a.da==Zb)if(a.la[b.s]==A)a.la[b.s]=A;else if(a.la[b.s]==Na)a.la[b.s]=b.m;else return 1;return 0});e.s=f.ea;e.m=-1;g=b.u/g.j;if(2.220446049250313E-16<g)if(f.c!=-s)c();else{if(1E-5<g)return 2;d()}else if(-2.220446049250313E-16>g)if(f.d!=+s)d();else{if(-1E-5>g)return 2;c()}else f.d==+s?c():f.c==-s?d():Math.abs(f.c)<=Math.abs(f.d)?c():d();return 0}
function zo(a,b,c){var d,e=null,f,g,h;d=1;for(g=b.k;null!=g;g=g.B)d<Math.abs(g.j)&&(d=Math.abs(g.j));for(g=b.k;null!=g;g=g.B)if(Math.abs(g.j)<1E-7*d)return 1;d=ho(a,function(a,b){var c,d,e,f,g;if(a.da==Sc)return 0;if(a.da==Zb){if(a.la[b.s]!=A)return 1;for(c=b.k;null!=c;c=c.e){if(a.ka[c.C]!=Na)return 1;a.ka[c.C]=c.m}}for(c=b.k;null!=c;c=c.e){e=c.l;for(d=c.k;null!=d;d=d.e)e-=d.j*a.Aa[d.Oa];c.l=e}d=null;f=0;for(c=b.k;null!=c;c=c.e)if(e=c.l,g=Math.abs(e/c.Jc),c.m==G)0>e&&f<g&&(d=c,f=g);else if(c.m==Ua)0<
e&&f<g&&(d=c,f=g);else return 1;null!=d&&(a.da==Zb&&(a.la[b.s]=b.m,a.ka[d.C]=A),a.Aa[b.s]=d.l/d.Jc);return 0});d.s=b.ea;d.m=b.c==b.d?Na:0==c?G:Ua;d.k=null;for(g=b.k;null!=g;g=g.B)if(f=g.f,a.da!=Sc&&(e={},e.C=f.C,e.m=-1,e.Jc=g.j,e.l=f.u,e.k=null,e.e=d.k,d.k=e),0==c&&0>g.j||0!=c&&0<g.j?(a.da!=Sc&&(e.m=G),f.d=f.c):(a.da!=Sc&&(e.m=Ua),f.c=f.d),a.da!=Sc)for(f=f.k;null!=f;f=f.I)f!=g&&(h={},h.Oa=f.n.ea,h.j=f.j,h.e=e.k,e.k=h);b.c=-s;b.d=+s;return 0}
function Ao(a){var b,c=0,d,e;d=0;for(b=a.k;null!=b;b=b.B)if(0<b.j){if(b.f.c==-s){d=-s;break}d+=b.j*b.f.c}else{if(b.f.d==+s){d=-s;break}d+=b.j*b.f.d}e=0;for(b=a.k;null!=b;b=b.B)if(0<b.j){if(b.f.d==+s){e=+s;break}e+=b.j*b.f.d}else{if(b.f.c==-s){e=+s;break}e+=b.j*b.f.c}if(a.c!=-s&&(b=0.001+1E-6*Math.abs(a.c),a.c-b>e)||a.d!=+s&&(b=0.001+1E-6*Math.abs(a.d),a.d+b<d))return 51;a.c!=-s&&(b=1E-9+1E-12*Math.abs(a.c),a.c-b>d&&(c=a.c+b<=e?c|1:c|2));a.d!=+s&&(b=1E-9+1E-12*Math.abs(a.d),a.d+b<e&&(c=a.d-b>=d?c|
16:c|32));return c}function Bo(a,b,c){a.da==Zb&&(a=ho(a,function(a,b){if(a.da!=Zb)return 1;a.la[b.s]=a.la[b.s]==A?A:b.m;return 0}),a.s=b.ea,a.m=b.d==+s?G:b.c==-s?Ua:b.c!=b.d?0==c?Ua:G:Na);0==c?b.c=-s:1==c&&(b.d=+s)}
function Co(a){var b,c,d,e,f,g,h,k,l,p,m;k=l=p=m=0;for(d=a.td;null!=d;d=d.ca)if(d.Ra&&d.c!=d.d&&(0!=d.c||1!=d.d))if(-1E6>d.c||1E6<d.d||4095<d.d-d.c)k++;else if(l++,0!=d.c&&mo(a,d),e=d.d|0,1!=e){g=2;for(c=4;e>=c;)g++,c+=c;p+=g;b=ho(a,function(a,b){var c,d,e=a.Pa[b.F];c=1;for(d=2;c<b.i;c++,d+=d)e+=d*a.Pa[b.C+(c-1)];a.Pa[b.F]=e;return 0});b.F=d.C;b.C=0;b.i=g;e<c-1?(c=eo(a),m++,c.c=-s,c.d=e):c=null;d.d=1;null!=c&&go(c,d,1);h=1;for(c=2;h<g;h++,c+=c)for(e=fo(a),e.Ra=1,e.c=0,e.d=1,e.u=c*d.u,0==b.C&&(b.C=
e.C),f=d.k;null!=f;f=f.I)go(f.n,e,c*f.j)}0<l&&x(l+" integer variable(s) were replaced by "+p+" binary ones");0<m&&x(m+" row(s) were added due to binarization");0<k&&x("Binarization failed for "+k+" integer variable(s)")}function Do(a,b){var c,d,e;d=null;for(c=a.k;null!=c;c=c.B)e={},e.fa=b*c.j,e.jc=c.f,e.e=d,d=e;return d}
function Eo(a,b,c){var d,e,f;for(d=a;null!=d;d=d.e);e=0;for(d=a;null!=d;d=d.e)if(1!=d.fa)if(-1==d.fa)e++;else break;if(null==d&&b==1-e)return 1;for(d=a;null!=d;d=d.e)0>d.fa&&(b-=d.fa);for(d=a;null!=d;d=d.e)if(Math.abs(d.fa)>b)return 0;e=null;for(d=a;null!=d;d=d.e)if(null==e||Math.abs(e.fa)>Math.abs(d.fa))e=d;f=null;for(d=a;null!=d;d=d.e)d!=e&&(null==f||Math.abs(f.fa)>Math.abs(d.fa))&&(f=d);if(Math.abs(e.fa)+Math.abs(f.fa)<=b+(0.001+1E-6*Math.abs(b)))return 0;b=1;for(d=a;null!=d;d=d.e)0<d.fa?d.fa=
1:(d.fa=-1,b-=1);c(b);return 2}function Fo(a,b){var c,d,e,f,g=0,h;for(f=0;1>=f;f++){if(0==f){if(b.d==+s)continue;e=Do(b,1);h=+b.d}else{if(b.c==-s)continue;e=Do(b,-1);h=-b.c}c=Eo(e,h,function(a){h=a});if(1==f&&1==c||2==c){g++;if(b.c==-s||b.d==+s)c=null;else for(c=eo(a),0==f?(c.c=b.c,c.d=+s):(c.c=-s,c.d=b.d),d=b.k;null!=d;d=d.B)go(c,d.f,d.j);io(b);b.c=-s;for(b.d=h;null!=e;e=e.e)go(b,e.jc,e.fa);null!=c&&(b=c)}}return g}
function Go(a,b,c){var d,e;for(d=a;null!=d;d=d.e);e=0;for(d=a;null!=d;d=d.e)if(1!=d.fa)if(-1==d.fa)e++;else break;if(null==d&&b==1-e)return 1;for(d=a;null!=d;d=d.e)0>d.fa&&(b-=d.fa);if(0.001>b)return 0;e=1E-9+1E-12*Math.abs(b);for(d=a;null!=d;d=d.e)if(Math.abs(d.fa)<b-e)return 0;b=1;for(d=a;null!=d;d=d.e)0<d.fa?d.fa=1:(d.fa=-1,b-=1);c(b);return 2}
function Ho(a,b){var c,d,e,f,g=0,h;for(f=0;1>=f;f++){if(0==f){if(b.c==-s)continue;e=Do(b,1);h=+b.c}else{if(b.d==+s)continue;e=Do(b,-1);h=-b.d}c=Go(e,h,function(a){h=a});if(1==f&&1==c||2==c){g++;if(b.c==-s||b.d==+s)c=null;else for(c=eo(a),0==f?(c.c=-s,c.d=b.d):(c.c=b.c,c.d=+s),d=b.k;null!=d;d=d.B)go(c,d.f,d.j);io(b);b.c=h;for(b.d=+s;null!=e;e=e.e)go(b,e.jc,e.fa);null!=c&&(b=c)}}return g}
function Io(a,b,c){var d,e=0,f,g;f=0;for(d=a;null!=d;d=d.e)if(0<d.fa){if(d.jc.c==-s)return e;f+=d.fa*d.jc.c}else{if(d.jc.d==+s)return e;f+=d.fa*d.jc.d}for(d=a;null!=d;d=d.e)d.jc.Ra&&0==d.jc.c&&1==d.jc.d&&(0<d.fa?(a=f,b-d.fa<a&&a<b&&(g=b-a,0.001<=g&&d.fa-g>=0.01*(1+d.fa)&&(d.fa=g,e++))):(a=f-d.fa,b<a&&a<b-d.fa&&(g=d.fa+(a-b),-0.001>=g&&g-d.fa>=0.01*(1-d.fa)&&(d.fa=g,f+=a-b,b=a,e++))));c(b);return e}
function Jo(a,b){var c,d,e,f,g=Array(2),h;for(f=g[0]=g[1]=0;1>=f;f++){if(0==f){if(b.c==-s)continue;e=Do(b,1);h=+b.c}else{if(b.d==+s)continue;e=Do(b,-1);h=-b.d}g[f]=Io(e,h,function(a){h=a});if(0<g[f]){if(b.c==-s||b.d==+s)c=null;else for(c=eo(a),0==f?(c.c=-s,c.d=b.d):(c.c=b.c,c.d=+s),d=b.k;null!=d;d=d.B)go(c,d.f,d.j);io(b);b.c=h;b.d=+s;for(d=e;null!=d;d=d.e)go(b,d.jc,d.fa);null!=c&&(b=c)}}return g[0]+g[1]}
function Ko(a,b,c){function d(){for(f=b.k;null!=f;f=g){e=f.f;g=f.B;for(h=e.k;null!=h;h=h.I)$n(a,h.n);no(a,e)}lo(a,b);return 0}var e,f,g,h,k;if(null==b.k){k=qo(a,b);if(0==k)return 0;if(1==k)return ac}if(null==b.k.B)if(e=b.k.f,b.c==b.d){k=to(a,b);if(0==k){for(f=e.k;null!=f;f=f.I)$n(a,f.n);no(a,e);return 0}if(1==k||2==k)return ac}else{k=wo(a,b);if(0<=k&&3>=k){co(a,e);if(2<=k)for(f=e.k;null!=f;f=f.I)$n(a,f.n);3==k&&no(a,e);return 0}if(4==k)return ac}k=Ao(b);if(51==k)return ac;if(0==(k&15))b.c!=-s&&Bo(a,
b,0);else if(1!=(k&15)&&2==(k&15)&&0==zo(a,b,0))return d();if(0==(k&240))b.d!=+s&&Bo(a,b,1);else if(16!=(k&240)&&32==(k&240)&&0==zo(a,b,1))return d();if(b.c==-s&&b.d==+s){for(f=b.k;null!=f;f=f.B)co(a,f.f);lo(a,b);return 0}return a.da==Sc&&c&&0>Lo(a,b,1)?ac:0}
function Lo(a,b,c){var d,e,f,g,h,k=0,l;h=!1;e=1;for(d=b.k;null!=d;d=d.B)d.f.qb.qb=-s,d.f.ub.ub=+s,e<Math.abs(d.j)&&(e=Math.abs(d.j));g=1E-6*e;if(b.c!=-s){e=null;for(d=b.k;null!=d;d=d.B)if(0<d.j&&d.f.d==+s||0>d.j&&d.f.c==-s)if(null==e)e=d;else{h=!0;break}if(!h){h=b.c;for(d=b.k;null!=d;d=d.B)d!=e&&(h=0<d.j?h-d.j*d.f.d:h-d.j*d.f.c);if(null==e)for(d=b.k;null!=d;d=d.B)d.j>=+g?d.f.qb.qb=d.f.d+h/d.j:d.j<=-g&&(d.f.ub.ub=d.f.c+h/d.j);else e.j>=+g?e.f.qb.qb=h/e.j:e.j<=-g&&(e.f.ub.ub=h/e.j)}}h=!1;if(b.d!=+s){e=
null;for(d=b.k;null!=d;d=d.B)if(0<d.j&&d.f.c==-s||0>d.j&&d.f.d==+s)if(null==e)e=d;else{h=!0;break}if(!h){h=b.d;for(d=b.k;null!=d;d=d.B)d!=e&&(h=0<d.j?h-d.j*d.f.c:h-d.j*d.f.d);if(null==e)for(d=b.k;null!=d;d=d.B)d.j>=+g?d.f.ub.ub=d.f.c+h/d.j:d.j<=-g&&(d.f.qb.qb=d.f.d+h/d.j);else e.j>=+g?e.f.ub.ub=h/e.j:e.j<=-g&&(e.f.qb.qb=h/e.j)}}for(e=b.k;null!=e;)for(d=e.f,e=e.B,g=0;1>=g;g++){f=d.c;l=d.d;if(0==g){if(d.qb.qb==-s)continue;h=uo(d,d.qb.qb)}else{if(d.ub.ub==+s)continue;h=vo(d,d.ub.ub)}if(0==h||1==h)d.c=
f,d.d=l;else if(2==h||3==h){k++;if(c)for(f=d.k;null!=f;f=f.I)f.n!=b&&$n(a,f.n);if(3==h){no(a,d);break}}else if(4==h)return-1}return k}function Mo(a,b){var c,d,e;if(null==b.k){e=ro(a,b);if(0==e)return 0;if(1==e)return bc}if(null==b.k.I){c=b.k.n;var f=function(){xo(a,b);if(c.c==-s&&c.d==+s){for(d=c.k;null!=d;d=d.B)co(a,d.f);lo(a,c)}else $n(a,c);return 0};if(c.c==c.d){if(!b.Ra)return f()}else if(!b.Ra){e=yo(a,b);if(0==e)return f();if(1!=e&&2==e)return bc}}return 0}
function $b(a,b){var c,d,e;for(c=a.Db;null!=c;c=d)d=c.e,c.c==-s&&c.d==+s&&lo(a,c);for(c=a.Db;null!=c;c=d)d=c.e,c.c!=-s&&c.d!=+s&&c.c<c.d&&oo(a,c);for(c=a.Kb;null!=c;c=d)d=c.e,c.c==c.d&&no(a,c);for(c=a.Kb;null!=c;c=d)d=c.e,c.c!=-s&&c.d!=+s&&c.c<c.d&&(e=po(a,c),0!=e&&1==e&&no(a,c));for(c=a.Db;null!=c;c=c.e)c.ja=1;for(c=a.Kb;null!=c;c=c.e)c.ja=1;for(d=1;d;){for(d=0;;){c=a.Db;if(null==c||!c.ja)break;d=a;e=c;e.ja&&(e.ja=0,Zn(d,e),Yn(d,e,1));c=Ko(a,c,b);if(0!=c)return c;d=1}for(;;){c=a.Kb;if(null==c||!c.ja)break;
d=a;e=c;e.ja&&(e.ja=0,bo(d,e),ao(d,e,1));c=Mo(a,c);if(0!=c)return c;d=1}}if(a.da==Sc&&!b)for(c=a.Db;null!=c;c=c.e)if(0>Lo(a,c,0))return c=ac;return 0}
function Tc(a,b){var c,d,e,f,g;c=$b(a,1);if(0!=c)return c;b.sd&&Co(a);g=0;for(c=a.Pc;null!=c;c=d)if(d=c.ca,(c.c!=-s||c.d!=+s)&&c.c!=c.d&&null!=c.k&&null!=c.k.B){for(f=c.k;null!=f&&(e=f.f,e.Ra&&0==e.c&&1==e.d);f=f.B);null==f&&(g+=Fo(a,c))}0<g&&x(g+" hidden packing inequaliti(es) were detected");g=0;for(c=a.Pc;null!=c;c=d)if(d=c.ca,(c.c!=-s||c.d!=+s)&&c.c!=c.d&&null!=c.k&&null!=c.k.B&&null!=c.k.B.B){for(f=c.k;null!=f&&(e=f.f,e.Ra&&0==e.c&&1==e.d);f=f.B);null==f&&(g+=Ho(a,c))}0<g&&x(g+" hidden covering inequaliti(es) were detected");
g=0;for(c=a.Pc;null!=c;c=d)d=c.ca,c.c!=c.d&&(g+=Jo(a,c));0<g&&x(g+" constraint coefficient(s) were reduced");return 0}function No(a){var b,c;b=1;for(c=32;55>=c;b++,c++)a.nb[b]=a.nb[b]-a.nb[c]&2147483647;for(c=1;55>=b;b++,c++)a.nb[b]=a.nb[b]-a.nb[c]&2147483647;a.Qf=54;return a.nb[55]}function sg(){var a={},b;a.nb=Array(56);a.nb[0]=-1;for(b=1;55>=b;b++)a.nb[b]=0;a.Qf=0;Md(a,1);return a}
function Md(a,b){var c,d,e=1;b=d=b-0&2147483647;a.nb[55]=d;for(c=21;c;c=(c+21)%55)a.nb[c]=e,e=d-e&2147483647,b=b&1?1073741824+(b>>1):b>>1,e=e-b&2147483647,d=a.nb[c];No(a);No(a);No(a);No(a);No(a)}function dm(a){return 0<=a.nb[a.Qf]?a.nb[a.Qf--]:No(a)}function bn(a){var b;do b=dm(a);while(2147483648<=b);return b%16777216}function tg(a){a=dm(a)/2147483647;return-0.3*(1-a)+0.7*a}var De=1,Fe=2,We=1,Se=2,Ce=0,Ue=1E-10;function Te(a,b,c){return(b-1)*a.K+c-b*(b-1)/2}
function Oo(a,b,c){var d;0==b?(b=1,d=0):Math.abs(a)<=Math.abs(b)?(a=-a/b,d=1/Math.sqrt(1+a*a),b=d*a):(a=-b/a,b=1/Math.sqrt(1+a*a),d=b*a);c(b,d)}
function Ve(a,b,c){for(var d=a.i,e=a.Nb,f=a.v,g,h,k,l,p,m;b<d;b++)l=Te(a,b,b),h=(b-1)*a.K+1,p=(d-1)*a.K+1,Math.abs(f[l])<Ue&&Math.abs(c[b])<Ue&&(f[l]=c[b]=0),0!=c[b]&&Oo(f[l],c[b],function(a,r){g=b;for(k=l;g<=d;g++,k++){var n=f[k],t=c[g];f[k]=a*n-r*t;c[g]=r*n+a*t}g=1;k=h;for(m=p;g<=d;g++,k++,m++)n=e[k],t=e[m],e[k]=a*n-r*t,e[m]=r*n+a*t});Math.abs(c[d])<Ue&&(c[d]=0);f[Te(a,d,d)]=c[d]}
Ce&&(Le=function(a,b){var c=a.i,d=a.Nb,e=a.v,f=a.s,g=a.l,h,k,l,p,m=0;for(h=1;h<=c;h++)for(k=1;k<=c;k++){p=0;for(l=1;l<=c;l++)p+=d[(h-1)*a.K+l]*g[(l-1)*a.K+k];l=f[k];l=h<=l?e[Te(a,h,l)]:0;p=Math.abs(p-l)/(1+Math.abs(l));m<p&&(m=p)}1E-8<m&&x(b+": dmax = "+m+"; relative error too large")});
function Ke(a,b,c,d){a.pa<a.i&&w("scf_solve_it: singular matrix");if(b){b=a.i;var e=a.Nb,f=a.v,g=a.s,h=a.ig,k,l,p;for(k=1;k<=b;k++)h[k]=c[g[k]+d];for(k=1;k<=b;k++)for(l=Te(a,k,k),p=h[k]/=f[l],g=k+1,l++;g<=b;g++,l++)h[g]-=f[l]*p;for(g=1;g<=b;g++)c[g+d]=0;for(k=1;k<=b;k++)for(p=h[k],g=1,l=(k-1)*a.K+1;g<=b;g++,l++)c[g+d]+=e[l]*p}else{b=a.i;e=a.Nb;f=a.v;h=a.s;k=a.ig;for(var m,g=1;g<=b;g++){m=0;l=1;for(p=(g-1)*a.K+1;l<=b;l++,p++)m+=e[p]*c[l+d];k[g]=m}for(g=b;1<=g;g--){m=k[g];l=b;for(p=Te(a,g,b);l>g;l--,
p--)m-=f[p]*k[l];k[g]=m/f[p]}for(g=1;g<=b;g++)c[h[g]+d]=k[g]}}
var gc=exports.glp_scale_prob=function(a,b){function c(a,b){var c,d,e;d=1;for(c=a.n[b].k;null!=c;c=c.B)if(e=Math.abs(c.j),e=e*c.n.ma*c.f.va,null==c.ua||d>e)d=e;return d}function d(a,b){var c,d,e;d=1;for(c=a.n[b].k;null!=c;c=c.B)if(e=Math.abs(c.j),e=e*c.n.ma*c.f.va,null==c.ua||d<e)d=e;return d}function e(a,b){var c,d,e;d=1;for(c=a.f[b].k;null!=c;c=c.I)if(e=Math.abs(c.j),e=e*c.n.ma*c.f.va,null==c.ra||d>e)d=e;return d}function f(a,b){var c,d,e;d=1;for(c=a.f[b].k;null!=c;c=c.I)if(e=Math.abs(c.j),e=e*
c.n.ma*c.f.va,null==c.ra||d<e)d=e;return d}function g(a){var b,d,e;for(b=d=1;b<=a.g;b++)if(e=c(a,b),1==b||d>e)d=e;return d}function h(a){var b,c,e;for(b=c=1;b<=a.g;b++)if(e=d(a,b),1==b||c<e)c=e;return c}function k(a,b){var c,e,g;for(e=0;1>=e;e++)if(e==b)for(c=1;c<=a.g;c++)g=d(a,c),zb(a,c,Cb(a,c)/g);else for(c=1;c<=a.i;c++)g=f(a,c),Ab(a,c,Db(a,c)/g)}function l(a){var b,e,f;for(b=e=1;b<=a.g;b++)if(f=d(a,b)/c(a,b),1==b||e<f)e=f;return e}function p(a){var b,c,d;for(b=c=1;b<=a.i;b++)if(d=f(a,b)/e(a,b),
1==b||c<d)c=d;return c}function m(a){var b,k,m=0,y;k=l(a)>p(a);for(b=1;15>=b;b++){y=m;m=h(a)/g(a);if(1<b&&m>0.9*y)break;y=a;for(var E=k,C=void 0,D=C=void 0,H=void 0,D=0;1>=D;D++)if(D==E)for(C=1;C<=y.g;C++)H=c(y,C)*d(y,C),zb(y,C,Cb(y,C)/Math.sqrt(H));else for(C=1;C<=y.i;C++)H=e(y,C)*f(y,C),Ab(y,C,Db(y,C)/Math.sqrt(H))}}b&~(Uc|Vc|Wc|Xc|hc)&&w("glp_scale_prob: flags = "+b+"; invalid scaling options");b&hc&&(b=Uc|Vc|Xc);(function(a,b){function c(a,b,d,e){return a+": min|aij| = "+b+"  max|aij| = "+d+"  ratio = "+
e+""}var d,e;x("Scaling...");Eb(a);d=g(a);e=h(a);x(c(" A",d,e,e/d));if(0.1<=d&&10>=e&&(x("Problem data seem to be well scaled"),b&Xc))return;b&Uc&&(m(a),d=g(a),e=h(a),x(c("GM",d,e,e/d)));b&Vc&&(k(a,l(a)>p(a)),d=g(a),e=h(a),x(c("EQ",d,e,e/d)));if(b&Wc){for(d=1;d<=a.g;d++)zb(a,d,ug(Cb(a,d)));for(d=1;d<=a.i;d++)Ab(a,d,ug(Db(a,d)));d=g(a);e=h(a);x(c("2N",d,e,e/d))}})(a,b)};
function Pb(a,b){function c(a,b,c,d){var e=a.g,f=a.Ca,g=a.Ba,h=a.Ia;a=a.head[b];if(a<=e)e=1,c[1]=a,d[1]=1;else for(b=f[a-e],e=f[a-e+1]-b,ga(c,1,g,b,e),ga(d,1,h,b,e),c=1;c<=e;c++)d[c]=-d[c];return e}function d(a){var b=od(a.U,a.g,c,a);a.valid=0==b;return b}function e(a,b,c){var d=a.g,e;if(c<=d){var f=Array(2);e=Array(2);f[1]=c;e[1]=1;b=Ne(a.U,b,1,f,0,e)}else{var g=a.Ca,f=a.Ba,h=a.Ia;e=a.jb;var k;k=g[c-d];c=g[c-d+1];g=0;for(d=k;d<c;d++)e[++g]=-h[d];b=Ne(a.U,b,g,f,k-1,e)}a.valid=0==b;return b}function f(a,
b,c){var d=a.g,e=a.jb,f=a.jb,g=a.g,h=a.Ca,k=a.Ba,l=a.Ia,m=a.head,n,p,q;ga(f,1,b,1,g);for(b=1;b<=g;b++)if(q=c[b],0!=q)if(n=m[b],n<=g)f[n]-=q;else for(p=h[n-g],n=h[n-g+1];p<n;p++)f[k[p]]+=l[p]*q;wd(a.U,e);for(a=1;a<=d;a++)c[a]+=e[a]}function g(a,b,c){var d=a.g,e=a.jb,f=a.jb,g=a.g,h=a.Ca,k=a.Ba,l=a.Ia,m=a.head,n,p,q,K;for(n=1;n<=g;n++){p=m[n];K=b[n];if(p<=g)K-=c[p];else for(q=h[p-g],p=h[p-g+1];q<p;q++)K+=l[q]*c[k[q]];f[n]=K}yd(a.U,e);for(a=1;a<=d;a++)c[a]+=e[a]}function h(a,b,c){var d=a.g,e=a.De,f=a.Kd,
g=a.Ce,h=a.Ee,k;if(c<=d)k=e[c]+f[c]++,g[k]=b,h[k]=1;else{k=a.Ca;var l=a.Ba;a=a.Ia;var m;m=k[c-d];c=k[c-d+1];for(d=m;d<c;d++)k=l[d],k=e[k]+f[k]++,g[k]=b,h[k]=-a[d]}}function k(a,b,c){var d=a.g,e=a.De,f=a.Kd,g=a.Ce,h=a.Ee,k;if(c<=d){for(d=k=e[c];g[d]!=b;d++);k+=--f[c];g[d]=g[k];h[d]=h[k]}else{k=a.Ca;a=a.Ba;var l,m;m=k[c-d];for(c=k[c-d+1];m<c;m++){l=a[m];for(d=k=e[l];g[d]!=b;d++);k+=--f[l];g[d]=g[k];h[d]=h[k]}}}function l(a,b){var c=a.c,d=a.d,e=a.m,f,g;f=a.head[a.g+b];switch(e[b]){case G:g=c[f];break;
case Ua:g=d[f];break;case Ra:g=0;break;case Na:g=c[f]}return g}function p(a,b){var c=a.g,d=a.i,e=a.Ca,g=a.Ba,h=a.Ia,k=a.head,m=a.Gc,n,p,q,K;for(n=1;n<=c;n++)m[n]=0;for(n=1;n<=d;n++)if(p=k[c+n],K=l(a,n),0!=K)if(p<=c)m[p]-=K;else for(q=e[p-c],p=e[p-c+1];q<p;q++)m[g[q]]+=K*h[q];ga(b,1,m,1,c);wd(a.U,b);f(a,m,b)}function m(a){var b=a.i,c=a.Qa,d=a.Hc,e;e=a.g;var f=a.u,h=a.head,k=a.Gc,l;for(l=1;l<=e;l++)k[l]=f[h[l]];ga(d,1,k,1,e);yd(a.U,d);g(a,k,d);for(e=1;e<=b;e++){f=a.g;l=a.u;k=h=void 0;h=a.head[f+e];
k=l[h];if(h<=f)k-=d[h];else{l=a.Ca;for(var m=a.Ba,n=a.Ia,p=void 0,q=void 0,p=void 0,p=l[h-f],q=l[h-f+1];p<q;p++)k+=n[p]*d[m[p]]}c[e]=k}}function q(a){var b=a.g,c=a.i,d=a.head,e=a.hd,f=a.gamma,g;a.Rb=1E3;ha(e,1,0,b+c);for(a=1;a<=c;a++)g=d[b+a],e[g]=1,f[a]=1}function r(a,b){var c=a.i,d=a.m,e=a.Qa,f=a.gamma,g,h,k,l;l=h=0;for(g=1;g<=c;g++){k=e[g];switch(d[g]){case G:if(k>=-b)continue;break;case Ua:if(k<=+b)continue;break;case Ra:if(-b<=k&&k<=+b)continue;break;case Na:continue}k=k*k/f[g];l<k&&(h=g,l=k)}a.F=
h}function n(a){var b=a.g,c=a.yb,d=a.Ua,e=a.Ua,f,g;g=a.head[b+a.F];for(f=1;f<=b;f++)e[f]=0;if(g<=b)e[g]=-1;else{var h=a.Ca;f=a.Ba;var k=a.Ia,l;l=h[g-b];for(g=h[g-b+1];l<g;l++)e[f[l]]=k[l]}wd(a.U,d);e=0;for(f=1;f<=b;f++)0!=d[f]&&(c[++e]=f);a.Tb=e}function t(a){var b=a.g,c=a.yb,d=a.Ua,e=a.Hc,g,h;h=a.head[b+a.F];for(g=1;g<=b;g++)e[g]=0;if(h<=b)e[h]=-1;else{var k=a.Ca;g=a.Ba;var l=a.Ia,m;m=k[h-b];for(h=k[h-b+1];m<h;m++)e[g[m]]=l[m]}f(a,e,d);e=0;for(g=1;g<=b;g++)0!=d[g]&&(c[++e]=g);a.Tb=e}function y(a,
b){var c=a.Tb,d=a.yb,e=a.Ua,f,g,h;g=0;for(f=1;f<=c;f++)h=Math.abs(e[d[f]]),g<h&&(g=h);a.rh=g;h=b*(1+0.01*g);for(g=0;g<c;)f=d[c],Math.abs(e[f])<h?c--:(g++,d[c]=d[g],d[g]=f);a.sh=g}function E(a,b){var c=a.g,d=a.type,e=a.c,f=a.d,g=a.u,h=a.head,k=a.D,l=a.Ha,m=a.F,n=a.yb,p=a.Ua,q=a.sh,K,r,v,u,t,y,oa,z,C;oa=0<a.Qa[m]?-1:1;K=h[c+m];d[K]==I?(m=-1,r=0,C=f[K]-e[K],t=1):(r=m=0,C=s,t=0);for(v=1;v<=q;v++){c=n[v];K=h[c];u=oa*p[c];if(0<u)if(1==k&&0>g[K])y=b*(1+L*Math.abs(e[K])),z=(e[K]+y-l[c])/u,K=G;else if(1==
k&&0<g[K])continue;else if(d[K]==Ta||d[K]==I||d[K]==B)y=b*(1+L*Math.abs(f[K])),z=(f[K]+y-l[c])/u,K=Ua;else continue;else if(1==k&&0<g[K])y=b*(1+L*Math.abs(f[K])),z=(f[K]-y-l[c])/u,K=Ua;else if(1==k&&0>g[K])continue;else if(d[K]==Sa||d[K]==I||d[K]==B)y=b*(1+L*Math.abs(e[K])),z=(e[K]-y-l[c])/u,K=G;else continue;0>z&&(z=0);if(C>z||C==z&&t<Math.abs(u))m=c,r=K,C=z,t=Math.abs(u)}if(!(0==b||0>=m||0==C))for(y=C,r=m=0,C=s,t=0,v=1;v<=q;v++){c=n[v];K=h[c];u=oa*p[c];if(0<u)if(1==k&&0>g[K])z=(e[K]-l[c])/u,K=G;
else if(1==k&&0<g[K])continue;else if(d[K]==Ta||d[K]==I||d[K]==B)z=(f[K]-l[c])/u,K=Ua;else continue;else if(1==k&&0<g[K])z=(f[K]-l[c])/u,K=Ua;else if(1==k&&0>g[K])continue;else if(d[K]==Sa||d[K]==I||d[K]==B)z=(e[K]-l[c])/u,K=G;else continue;0>z&&(z=0);z<=y&&t<Math.abs(u)&&(m=c,r=K,C=z,t=Math.abs(u))}a.s=m;a.nf=0<m&&d[h[m]]==B?Na:r;a.th=oa*C}function C(a,b){var c=a.g,d=a.s,e;for(e=1;e<=c;e++)b[e]=0;b[d]=1;yd(a.U,b)}function D(a,b){var c=a.g,d=a.s,e=a.Hc,f;for(f=1;f<=c;f++)e[f]=0;e[d]=1;g(a,e,b)}function H(a,
b){var c=a.g,d=a.i,e=a.De,f=a.Kd,g=a.Ce,h=a.Ee,k=a.Vb,l=a.mb,m,n,p,q;for(m=1;m<=d;m++)l[m]=0;for(m=1;m<=c;m++)if(q=b[m],0!=q)for(n=e[m],p=n+f[m];n<p;n++)l[g[n]]-=q*h[n];c=0;for(m=1;m<=d;m++)0!=l[m]&&(k[++c]=m);a.Bc=c}function R(a){var b=a.Ha,c=a.F,d=a.Tb,e=a.yb,f=a.Ua,g=a.s,h=a.th;0<g&&(b[g]=l(a,c)+h);if(0!=h)for(c=1;c<=d;c++)a=e[c],a!=g&&(b[a]+=f[a]*h)}function V(a){var b=a.u,c=a.head,d=a.Tb,e=a.yb,f=a.Ua,g,h;h=b[c[a.g+a.F]];for(g=1;g<=d;g++)a=e[g],h+=b[c[a]]*f[a];return h}function O(a){var b=a.Qa,
c=a.F,d=a.Bc,e=a.Vb;a=a.mb;var f,g,h;h=b[c]/=a[c];for(g=1;g<=d;g++)f=e[g],f!=c&&(b[f]-=a[f]*h)}function Q(a){var b=a.g,c=a.type,d=a.Ca,e=a.Ba,f=a.Ia,g=a.head,h=a.hd,k=a.gamma,l=a.F,m=a.Tb,n=a.yb,p=a.Ua,q=a.s,K=a.Bc,r=a.Vb,v=a.mb,u=a.Hc,t,y,oa,z,C,D;a.Rb--;z=C=h[g[b+l]]?1:0;for(t=1;t<=b;t++)u[t]=0;for(y=1;y<=m;y++)t=n[y],h[g[t]]?(u[t]=t=p[t],z+=t*t):u[t]=0;yd(a.U,u);m=v[l];for(y=1;y<=K;y++)if(a=r[y],a!=l){t=v[a]/m;n=g[b+a];if(n<=b)D=u[n];else for(D=0,oa=d[n-b],p=d[n-b+1];oa<p;oa++)D-=f[oa]*u[e[oa]];
p=k[a]+t*t*z+2*t*D;t=(h[n]?1:0)+C*t*t;k[a]=p>=t?p:t;2.220446049250313E-16>k[a]&&(k[a]=2.220446049250313E-16)}c[g[q]]==B?k[l]=1:(k[l]=z/(m*m),2.220446049250313E-16>k[l]&&(k[l]=2.220446049250313E-16))}function F(a){var b=a.g,c=a.head,d=a.m,e=a.F,f=a.s;a=a.nf;var g;if(0>f)switch(d[e]){case G:d[e]=Ua;break;case Ua:d[e]=G}else g=c[f],c[f]=c[b+e],c[b+e]=g,d[e]=a}function W(a,b){var c=a.g,d=a.i,e=a.type,f=a.c,g=a.d,h=a.u,k=a.head,l=a.Ha,m,n=0,p;b*=0.9;for(m=1;m<=c+d;m++)h[m]=0;for(d=1;d<=c;d++){m=k[d];if(e[m]==
Sa||e[m]==I||e[m]==B)p=b*(1+L*Math.abs(f[m])),l[d]<f[m]-p&&(h[m]=-1,n++);if(e[m]==Ta||e[m]==I||e[m]==B)p=b*(1+L*Math.abs(g[m])),l[d]>g[m]+p&&(h[m]=1,n++)}return n}function X(a){var b=a.g,c=a.i,d=a.u,e=a.eb;a=a.$a;var f;for(f=1;f<=b;f++)d[f]=0;for(f=1;f<=c;f++)d[b+f]=a*e[f]}function ca(a,b){var c=a.g,d=a.type,e=a.c,f=a.d,g=a.u,h=a.head,k=a.D,l=a.Ha,m,n,p;for(m=1;m<=c;m++)if(n=h[m],1==k&&0>g[n]){if(p=b*(1+L*Math.abs(e[n])),l[m]>e[n]+p)return 1}else if(1==k&&0<g[n]){if(p=b*(1+L*Math.abs(f[n])),l[m]<
f[n]-p)return 1}else{if(d[n]==Sa||d[n]==I||d[n]==B)if(p=b*(1+L*Math.abs(e[n])),l[m]<e[n]-p)return 1;if(d[n]==Ta||d[n]==I||d[n]==B)if(p=b*(1+L*Math.abs(f[n])),l[m]>f[n]+p)return 1}return 0}function ka(a,b){var c=a.g,d=a.c,e=a.d,f=a.u,g=a.head,h=a.Ha,k,l,m;for(k=1;k<=c;k++)if(l=g[k],0>f[l]){if(m=b*(1+L*Math.abs(d[l])),h[k]<d[l]-m)return 1}else if(0<f[l]&&(m=b*(1+L*Math.abs(e[l])),h[k]>e[l]+m))return 1;return 0}function P(a){var b=a.g,c=a.i,d=a.eb,e=a.head,f=a.Ha,g,h,k;k=d[0];for(g=1;g<=b;g++)h=e[g],
h>b&&(k+=d[h-b]*f[g]);for(f=1;f<=c;f++)h=e[b+f],h>b&&(k+=d[h-b]*l(a,f));return k}function u(a,b,c){var d=a.g,e=a.type,f=a.c,g=a.d,h=a.D,k=a.head,l=a.Ha,m,n;if(!(b.o<fc||0<b.fb&&1E3*la(a.hc)<b.fb||a.$==a.be||!c&&0!=a.$%b.bc)){m=n=0;for(b=1;b<=d;b++)c=k[b],(e[c]==Sa||e[c]==I||e[c]==B)&&l[b]<f[c]&&(n+=f[c]-l[b]),(e[c]==Ta||e[c]==I||e[c]==B)&&l[b]>g[c]&&(n+=l[b]-g[c]),e[c]==B&&m++;x((1==h?" ":"*")+a.$+": obj = "+P(a)+"  infeas = "+n+" ("+m+")");a.be=a.$}}function z(a,b,c,d,e){var f=a.g,g=a.i,h=a.$a,k=
a.head,l=a.m,m=a.Ha,n=a.Qa;b.valid=1;a.valid=0;b.U=a.U;a.U=null;ga(b.head,1,k,1,f);b.na=c;b.sa=d;b.aa=P(a);b.$=a.$;b.some=e;for(a=1;a<=f;a++)c=k[a],c<=f?(c=b.n[c],c.m=A,c.bind=a,c.r=m[a]/c.ma):(c=b.f[c-f],c.m=A,c.bind=a,c.r=m[a]*c.va),c.J=0;for(m=1;m<=g;m++)if(c=k[f+m],c<=f){c=b.n[c];c.m=l[m];c.bind=0;switch(l[m]){case G:c.r=c.c;break;case Ua:c.r=c.d;break;case Ra:c.r=0;break;case Na:c.r=c.c}c.J=n[m]*c.ma/h}else{c=b.f[c-f];c.m=l[m];c.bind=0;switch(l[m]){case G:c.r=c.c;break;case Ua:c.r=c.d;break;
case Ra:c.r=0;break;case Na:c.r=c.c}c.J=n[m]/c.va/h}}var L=0.1,v,S=2,M=0,ba=0,J=0,ea,fa,sa;v=function(a){var b=a.g,c=a.i;a=a.L;var d={};d.g=b;d.i=c;d.type=new Int8Array(1+b+c);d.c=new Float64Array(1+b+c);d.d=new Float64Array(1+b+c);d.u=new Float64Array(1+b+c);d.eb=new Float64Array(1+c);d.Ca=new Int32Array(1+c+1);d.Ba=new Int32Array(1+a);d.Ia=new Float64Array(1+a);d.head=new Int32Array(1+b+c);d.m=new Int8Array(1+c);d.De=new Int32Array(1+b+1);d.Kd=new Int32Array(1+b);d.Ce=null;d.Ee=null;d.Ha=new Float64Array(1+
b);d.Qa=new Float64Array(1+c);d.hd=new Int8Array(1+b+c);d.gamma=new Float64Array(1+c);d.yb=new Int32Array(1+b);d.Ua=new Float64Array(1+b);d.Vb=new Int32Array(1+c);d.mb=new Float64Array(1+c);d.jb=new Float64Array(1+b);d.Gc=new Float64Array(1+b);d.Hc=new Float64Array(1+b);d.jg=new Float64Array(1+b);return d}(a);(function(a,b){var c=a.g,d=a.i,e=a.type,f=a.c,g=a.d,k=a.u,l=a.eb,m=a.Ca,n=a.Ba,p=a.Ia,q=a.head,K=a.m,r=a.hd,v=a.gamma,t,u;for(t=1;t<=c;t++)u=b.n[t],e[t]=u.type,f[t]=u.c*u.ma,g[t]=u.d*u.ma,k[t]=
0;for(t=1;t<=d;t++)u=b.f[t],e[c+t]=u.type,f[c+t]=u.c/u.va,g[c+t]=u.d/u.va,k[c+t]=u.u*u.va;l[0]=b.ha;ga(l,1,k,c+1,d);e=0;for(t=1;t<=d;t++)e<Math.abs(l[t])&&(e=Math.abs(l[t]));0==e&&(e=1);switch(b.dir){case za:a.$a=1/e;break;case Ea:a.$a=-1/e}1>Math.abs(a.$a)&&(a.$a*=1E3);for(t=l=1;t<=d;t++)for(m[t]=l,e=b.f[t].k;null!=e;e=e.I)n[l]=e.n.ea,p[l]=e.n.ma*e.j*e.f.va,l++;m[d+1]=l;ga(q,1,b.head,1,c);m=0;for(t=1;t<=c;t++)u=b.n[t],u.m!=A&&(m++,q[c+m]=t,K[m]=u.m);for(t=1;t<=d;t++)u=b.f[t],u.m!=A&&(m++,q[c+m]=
c+t,K[m]=u.m);a.valid=1;b.valid=0;a.U=b.U;b.U=null;q=a.g;K=a.i;m=a.Ca;n=a.Ba;p=a.De;t=a.Kd;for(l=1;l<=q;l++)t[l]=1;for(l=1;l<=K;l++)for(f=m[l],e=m[l+1];f<e;f++)t[n[f]]++;for(l=p[1]=1;l<=q;l++)t[l]>K&&(t[l]=K),p[l+1]=p[l]+t[l];a.Ce=new Int32Array(p[q+1]);a.Ee=new Float64Array(p[q+1]);q=a.g;K=a.i;m=a.head;n=a.m;ha(a.Kd,1,0,q);for(p=1;p<=K;p++)n[p]!=Na&&(t=m[q+p],h(a,p,t));a.D=0;a.hc=ja();a.Sf=a.$=b.$;a.be=-1;a.Rb=0;ha(r,1,0,c+d);for(t=1;t<=d;t++)v[t]=1})(v,a);for(b.o>=mc&&x("Objective scale factor = "+
v.$a+"");;){if(0==S){sa=d(v);if(0!=sa)return b.o>=Lb&&(x("Error: unable to factorize the basis matrix ("+sa+")"),x("Sorry, basis recovery procedure not implemented yet")),a.U=v.U,v.U=null,a.na=a.sa=Aa,a.aa=0,a.$=v.$,a.some=0,sa=Sb;S=v.valid=1;M=ba=0}if(0==M&&(p(v,v.Ha),M=1,0==v.D&&(0<W(v,b.Gb)?v.D=1:(X(v),v.D=2),ba=0,u(v,b,1)),ca(v,b.Gb))){b.o>=Lb&&x("Warning: numerical instability (primal simplex, phase "+(1==v.D?"I":"II")+")");S=v.D=0;J=5;continue}1!=v.D||ka(v,b.Gb)||(v.D=2,X(v),ba=0,u(v,b,1));
0==ba&&(m(v),ba=1);switch(b.fd){case oc:0==v.Rb&&q(v)}if(2147483647>b.oc&&v.$-v.Sf>=b.oc){if(1!=M||2==v.D&&1!=ba){1!=M&&(M=0);2==v.D&&1!=ba&&(ba=0);continue}u(v,b,1);b.o>=Wb&&x("ITERATION LIMIT EXCEEDED; SEARCH TERMINATED");switch(v.D){case 1:ea=Ad;X(v);m(v);break;case 2:ea=dc}r(v,b.tb);fa=0==v.F?dc:Ad;z(v,a,ea,fa,0);return sa=rg}if(2147483647>b.sb&&1E3*la(v.hc)>=b.sb){if(1!=M||2==v.D&&1!=ba){1!=M&&(M=0);2==v.D&&1!=ba&&(ba=0);continue}u(v,b,1);b.o>=Wb&&x("TIME LIMIT EXCEEDED; SEARCH TERMINATED");
switch(v.D){case 1:ea=Ad;X(v);m(v);break;case 2:ea=dc}r(v,b.tb);fa=0==v.F?dc:Ad;z(v,a,ea,fa,0);return sa=Qc}u(v,b,0);r(v,b.tb);if(0==v.F){if(1!=M||1!=ba){1!=M&&(M=0);1!=ba&&(ba=0);continue}u(v,b,1);switch(v.D){case 1:b.o>=Wb&&x("PROBLEM HAS NO FEASIBLE SOLUTION");ea=jc;X(v);m(v);r(v,b.tb);fa=0==v.F?dc:Ad;break;case 2:b.o>=Wb&&x("OPTIMAL SOLUTION FOUND"),ea=fa=dc}z(v,a,ea,fa,0);return sa=0}n(v);J&&t(v);y(v,b.xe);var K=v.Qa[v.F],oa=V(v);if(Math.abs(K-oa)>1E-5*(1+Math.abs(oa))||!(0>K&&0>oa||0<K&&0<oa))if(b.o>=
mc&&x("d1 = "+K+"; d2 = "+oa+""),1!=ba||!J){1!=ba&&(ba=0);J=5;continue}v.Qa[v.F]=0<K?0<oa?oa:2.220446049250313E-16:0>oa?oa:-2.220446049250313E-16;switch(b.ne){case pc:E(v,0);break;case qc:E(v,0.3*b.Gb)}if(0==v.s){if(1!=M||1!=ba||!J){1!=M&&(M=0);1!=ba&&(ba=0);J=1;continue}u(v,b,1);switch(v.D){case 1:b.o>=Lb&&x("Error: unable to choose basic variable on phase I");a.U=v.U;v.U=null;a.na=a.sa=Aa;a.aa=0;a.$=v.$;a.some=0;sa=Sb;break;case 2:b.o>=Wb&&x("PROBLEM HAS UNBOUNDED SOLUTION"),z(v,a,dc,jc,v.head[v.g+
v.F]),sa=0}return sa}if(0<v.s&&(K=v.Ua[v.s],oa=1E-5*(1+0.01*v.rh),Math.abs(K)<oa&&(b.o>=mc&&x("piv = "+K+"; eps = "+oa+""),!J))){J=5;continue}0<v.s&&(K=v.jg,C(v,K),J&&D(v,K),H(v,K));if(0<v.s&&(K=v.Ua[v.s],oa=v.mb[v.F],Math.abs(K-oa)>1E-8*(1+Math.abs(K))||!(0<K&&0<oa||0>K&&0>oa))){b.o>=mc&&x("piv1 = "+K+"; piv2 = "+oa+"");if(1!=S||!J){1!=S&&(S=0);J=5;continue}0==v.mb[v.F]&&(v.Bc++,v.Vb[v.Bc]=v.F);v.mb[v.F]=K}R(v);M=2;0<v.s&&(O(v),ba=2,1==v.D&&(K=v.head[v.s],v.Qa[v.F]-=v.u[K],v.u[K]=0));if(0<v.s)switch(b.fd){case oc:0<
v.Rb&&Q(v)}0<v.s&&(sa=e(v,v.s,v.head[v.g+v.F]),S=0==sa?2:v.valid=0);0<v.s&&(k(v,v.F,v.head[v.g+v.F]),v.type[v.head[v.s]]!=B&&h(v,v.F,v.head[v.s]));F(v);v.$++;0<J&&J--}}
function Rb(a,b){function c(a,b,c,d){var e=a.g,f=a.Ca,g=a.Ba,h=a.Ia;a=a.head[b];if(a<=e)e=1,c[1]=a,d[1]=1;else for(b=f[a-e],e=f[a-e+1]-b,ga(c,1,g,b,e),ga(d,1,h,b,e),c=1;c<=e;c++)d[c]=-d[c];return e}function d(a){var b=od(a.U,a.g,c,a);a.valid=0==b;return b}function e(a,b,c){var d=a.g,e;if(c<=d){var f=Array(2);e=Array(2);f[1]=c;e[1]=1;b=Ne(a.U,b,1,f,0,e)}else{var g=a.Ca,f=a.Ba,h=a.Ia;e=a.jb;var k;k=g[c-d];c=g[c-d+1];g=0;for(d=k;d<c;d++)e[++g]=-h[d];b=Ne(a.U,b,g,f,k-1,e)}a.valid=0==b;return b}function f(a,
b,c){var d=a.g,e=a.jb,f=a.jb,g=a.g,h=a.Ca,k=a.Ba,l=a.Ia,m=a.head,n,p,q;ga(f,1,b,1,g);for(b=1;b<=g;b++)if(q=c[b],0!=q)if(n=m[b],n<=g)f[n]-=q;else for(p=h[n-g],n=h[n-g+1];p<n;p++)f[k[p]]+=l[p]*q;wd(a.U,e);for(a=1;a<=d;a++)c[a]+=e[a]}function g(a,b,c){var d=a.g,e=a.jb,f=a.jb,g=a.g,h=a.Ca,k=a.Ba,l=a.Ia,m=a.head,n,p,q,r;for(n=1;n<=g;n++){p=m[n];r=b[n];if(p<=g)r-=c[p];else for(q=h[p-g],p=h[p-g+1];q<p;q++)r+=l[q]*c[k[q]];f[n]=r}yd(a.U,e);for(a=1;a<=d;a++)c[a]+=e[a]}function h(a,b){var c=a.c,d=a.d,e=a.m,
f,g;f=a.head[a.g+b];switch(e[b]){case G:g=c[f];break;case Ua:g=d[f];break;case Ra:g=0;break;case Na:g=c[f]}return g}function k(a,b){var c=a.g,d=a.i,e=a.Ca,g=a.Ba,k=a.Ia,l=a.head,m=a.Gc,n,p,q,r;for(n=1;n<=c;n++)m[n]=0;for(n=1;n<=d;n++)if(p=l[c+n],r=h(a,n),0!=r)if(p<=c)m[p]-=r;else for(q=e[p-c],p=e[p-c+1];q<p;q++)m[g[q]]+=r*k[q];ga(b,1,m,1,c);wd(a.U,b);f(a,m,b)}function l(a){var b=a.i,c=a.Qa,d=a.Hc,e;e=a.g;var f=a.u,h=a.head,k=a.Gc,l;for(l=1;l<=e;l++)k[l]=f[h[l]];ga(d,1,k,1,e);yd(a.U,d);g(a,k,d);for(e=
1;e<=b;e++){f=a.g;l=a.u;k=h=void 0;h=a.head[f+e];k=l[h];if(h<=f)k-=d[h];else{l=a.Ca;for(var m=a.Ba,n=a.Ia,p=void 0,q=void 0,p=void 0,p=l[h-f],q=l[h-f+1];p<q;p++)k+=n[p]*d[m[p]]}c[e]=k}}function p(a){var b=a.g,c=a.i,d=a.head,e=a.hd,f=a.gamma;a.Rb=1E3;ha(e,1,0,b+c);for(a=1;a<=b;a++)c=d[a],e[c]=1,f[a]=1}function m(a,b){var c=a.g,d=a.type,e=a.c,f=a.d,g=a.head,h=a.Ha,k=a.gamma,l,m,n,p,q,r,t;q=p=n=0;for(l=1;l<=c;l++){m=g[l];t=0;if(d[m]==Sa||d[m]==I||d[m]==B)r=b*(1+P*Math.abs(e[m])),h[l]<e[m]-r&&(t=e[m]-
h[l]);if(d[m]==Ta||d[m]==I||d[m]==B)r=b*(1+P*Math.abs(f[m])),h[l]>f[m]+r&&(t=f[m]-h[l]);0!=t&&(m=k[l],2.220446049250313E-16>m&&(m=2.220446049250313E-16),m=t*t/m,q<m&&(n=l,p=t,q=m))}a.s=n;a.Se=p}function q(a,b){var c=a.g,d=a.s,e;for(e=1;e<=c;e++)b[e]=0;b[d]=1;yd(a.U,ea)}function r(a,b){var c=a.g,d=a.s,e=a.Hc,f;for(f=1;f<=c;f++)e[f]=0;e[d]=1;g(a,e,b)}function n(a,b){var c=a.g,d,e;e=0;for(d=1;d<=c;d++)0!=b[d]&&e++;if(0.2<=e/c){c=a.g;d=a.i;e=a.Ca;var f=a.Ba,g=a.Ia,h=a.head,k=a.m,l=a.Vb,m=a.mb,n,p,q,r,
t;r=0;for(n=1;n<=d;n++)if(k[n]==Na)m[n]=0;else{p=h[c+n];if(p<=c)t=-b[p];else for(q=e[p-c],p=e[p-c+1],t=0;q<p;q++)t+=b[f[q]]*g[q];0!=t&&(l[++r]=n);m[n]=t}a.Bc=r}else{f=a.g;c=a.i;g=a.lg;h=a.kg;k=a.mg;l=a.bind;m=a.m;d=a.Vb;e=a.mb;for(r=1;r<=c;r++)e[r]=0;for(n=1;n<=f;n++)if(p=b[n],0!=p)for(r=l[n]-f,1<=r&&m[r]!=Na&&(e[r]-=p),r=g[n],q=g[n+1],t=r;t<q;t++)r=l[f+h[t]]-f,1<=r&&m[r]!=Na&&(e[r]+=p*k[t]);f=0;for(r=1;r<=c;r++)0!=e[r]&&(d[++f]=r);a.Bc=f}}function t(a,b){var c=a.Bc,d=a.Vb,e=a.mb,f,g,h;g=0;for(f=
1;f<=c;f++)h=Math.abs(e[d[f]]),g<h&&(g=h);a.uh=g;h=b*(1+0.01*g);for(g=0;g<c;)f=d[c],Math.abs(e[f])<h?c--:(g++,d[c]=d[g],d[g]=f);a.vh=g}function y(a,b){var c=a.m,d=a.Qa,e=a.Vb,f=a.mb,g=a.vh,h,k,l,m,n,p,q,r,t;p=0<a.Se?1:-1;l=0;r=s;n=0;for(k=1;k<=g;k++){h=e[k];m=p*f[h];if(0<m)if(c[h]==G||c[h]==Ra)q=(d[h]+b)/m;else continue;else if(c[h]==Ua||c[h]==Ra)q=(d[h]-b)/m;else continue;0>q&&(q=0);if(r>q||r==q&&n<Math.abs(m))l=h,r=q,n=Math.abs(m)}if(0!=b&&0!=l&&0!=r)for(t=r,l=0,r=s,n=0,k=1;k<=g;k++){h=e[k];m=p*
f[h];if(0<m)if(c[h]==G||c[h]==Ra)q=d[h]/m;else continue;else if(c[h]==Ua||c[h]==Ra)q=d[h]/m;else continue;0>q&&(q=0);q<=t&&n<Math.abs(m)&&(l=h,r=q,n=Math.abs(m))}a.F=l;a.bh=p*r}function E(a){var b=a.g,c=a.yb,d=a.Ua,e=a.Ua,f,g;g=a.head[b+a.F];for(f=1;f<=b;f++)e[f]=0;if(g<=b)e[g]=-1;else{var h=a.Ca;f=a.Ba;var k=a.Ia,l;l=h[g-b];for(g=h[g-b+1];l<g;l++)e[f[l]]=k[l]}wd(a.U,d);e=0;for(f=1;f<=b;f++)0!=d[f]&&(c[++e]=f);a.Tb=e}function C(a){var b=a.g,c=a.yb,d=a.Ua,e=a.Hc,g,h;h=a.head[b+a.F];for(g=1;g<=b;g++)e[g]=
0;if(h<=b)e[h]=-1;else{var k=a.Ca;g=a.Ba;var l=a.Ia,m;m=k[h-b];for(h=k[h-b+1];m<h;m++)e[g[m]]=l[m]}f(a,e,d);e=0;for(g=1;g<=b;g++)0!=d[g]&&(c[++e]=g);a.Tb=e}function D(a){var b=a.Qa,c=a.Bc,d=a.Vb,e=a.mb,f=a.F;a=a.bh;var g,h;b[f]=a;if(0!=a)for(h=1;h<=c;h++)g=d[h],g!=f&&(b[g]-=e[g]*a)}function H(a){var b=a.Ha,c=a.s,d=a.F,e=a.Tb,f=a.yb,g=a.Ua,k;k=a.Se/g[c];b[c]=h(a,d)+k;if(0!=k)for(d=1;d<=e;d++)a=f[d],a!=c&&(b[a]+=g[a]*k)}function R(a){var b=a.g,c=a.type,d=a.head,e=a.hd,f=a.gamma,g=a.s,h=a.Bc,k=a.Vb,
l=a.mb,m=a.F,n=a.Tb,p=a.yb,q=a.Ua,r=a.Hc,t,u,v,y,z,C;a.Rb--;z=C=e[d[g]]?1:0;for(t=1;t<=b;t++)r[t]=0;for(y=1;y<=h;y++)if(u=k[y],v=d[b+u],e[v])if(u=l[u],z+=u*u,v<=b)r[v]+=u;else{var D=a.Ca;t=a.Ba;var F=a.Ia,E;E=D[v-b];for(v=D[v-b+1];E<v;E++)r[t[E]]-=u*F[E]}wd(a.U,r);a=q[g];for(y=1;y<=n;y++)t=p[y],v=d[t],t!=g&&c[d[t]]!=Ka&&(u=q[t]/a,h=f[t]+u*u*z+2*u*r[t],u=(e[v]?1:0)+C*u*u,f[t]=h>=u?h:u,2.220446049250313E-16>f[t]&&(f[t]=2.220446049250313E-16));c[d[b+m]]==Ka?f[g]=1:(f[g]=z/(a*a),2.220446049250313E-16>
f[g]&&(f[g]=2.220446049250313E-16));v=d[g];if(c[v]==B&&e[v])for(e[v]=0,y=1;y<=n;y++){t=p[y];if(t==g){if(c[d[b+m]]==Ka)continue;u=1/q[g]}else{if(c[d[t]]==Ka)continue;u=q[t]/q[g]}f[t]-=u*u;2.220446049250313E-16>f[t]&&(f[t]=2.220446049250313E-16)}}function V(a){var b=a.g,c=a.type,d=a.head,e=a.bind,f=a.m,g=a.s,h=a.Se;a=a.F;var k;k=d[g];d[g]=d[b+a];d[b+a]=k;e[d[g]]=g;e[d[b+a]]=b+a;f[a]=c[k]==B?Na:0<h?G:Ua}function O(a,b){var c=a.g,d=a.i,e=a.ac,f=a.head,g=a.Qa,h,k;for(h=1;h<=d;h++)if(k=f[c+h],g[h]<-b&&
(e[k]==Sa||e[k]==Ka)||g[h]>+b&&(e[k]==Ta||e[k]==Ka))return 1;return 0}function Q(a){var b=a.g,c=a.i,d=a.type,e=a.c,f=a.d,g=a.ac,h=a.head,k=a.m;a=a.Qa;var l;for(l=1;l<=b+c;l++)switch(g[l]){case Ka:d[l]=I;e[l]=-1E3;f[l]=1E3;break;case Sa:d[l]=I;e[l]=0;f[l]=1;break;case Ta:d[l]=I;e[l]=-1;f[l]=0;break;case I:case B:d[l]=B,e[l]=f[l]=0}for(e=1;e<=c;e++)l=h[b+e],k[e]=d[l]==B?Na:0<=a[e]?G:Ua}function F(a){var b=a.g,c=a.i,d=a.type,e=a.c,f=a.d,g=a.bd,h=a.cd,k=a.head,l=a.m,m=a.Qa;ga(d,1,a.ac,1,b+c);ga(e,1,g,
1,b+c);ga(f,1,h,1,b+c);for(a=1;a<=c;a++)switch(g=k[b+a],d[g]){case Ka:l[a]=Ra;break;case Sa:l[a]=G;break;case Ta:l[a]=Ua;break;case I:l[a]=2.220446049250313E-16<=m[a]?G:-2.220446049250313E-16>=m[a]?Ua:Math.abs(e[g])<=Math.abs(f[g])?G:Ua;break;case B:l[a]=Na}}function W(a,b){var c=a.i,d=a.m,e=a.Qa,f;for(f=1;f<=c;f++)if(e[f]<-b&&(d[f]==G||d[f]==Ra)||e[f]>+b&&(d[f]==Ua||d[f]==Ra))return 1;return 0}function X(a){var b=a.g,c=a.i,d=a.eb,e=a.head,f=a.Ha,g,k,l;l=d[0];for(g=1;g<=b;g++)k=e[g],k>b&&(l+=d[k-
b]*f[g]);for(f=1;f<=c;f++)k=e[b+f],k>b&&(l+=d[k-b]*h(a,f));return l}function ca(a,b,c){var d=a.g,e=a.i,f=a.u,g=a.ac,k=a.head,l=a.m,m=a.D,n=a.Ha,p=a.Qa;if(!(b.o<fc||0<b.fb&&1E3*la(a.hc)<b.fb||a.$==a.be||!c&&0!=a.$%b.bc)){b=0;if(1==m){for(l=1;l<=d;l++)b-=f[k[l]]*n[l];for(n=1;n<=e;n++)b-=f[k[d+n]]*h(a,n)}else for(n=1;n<=e;n++)0>p[n]&&(l[n]==G||l[n]==Ra)&&(b-=p[n]),0<p[n]&&(l[n]==Ua||l[n]==Ra)&&(b+=p[n]);e=0;for(l=1;l<=d;l++)g[k[l]]==B&&e++;1==a.D?x(" "+a.$+":  infeas = "+b+" ("+e+")"):x("|"+a.$+": obj = "+
X(a)+"  infeas = "+b+" ("+e+")");a.be=a.$}}function ka(a,b,c,d,e){var f=a.g,g=a.i,h=a.$a,k=a.head,l=a.m,m=a.Ha,n=a.Qa;b.valid=1;a.valid=0;b.U=a.U;a.U=null;ga(b.head,1,k,1,f);b.na=c;b.sa=d;b.aa=X(a);b.$=a.$;b.some=e;for(a=1;a<=f;a++)c=k[a],c<=f?(c=b.n[c],c.m=A,c.bind=a,c.r=m[a]/c.ma):(c=b.f[c-f],c.m=A,c.bind=a,c.r=m[a]*c.va),c.J=0;for(m=1;m<=g;m++)if(c=k[f+m],c<=f){c=b.n[c];c.m=l[m];c.bind=0;switch(l[m]){case G:c.r=c.c;break;case Ua:c.r=c.d;break;case Ra:c.r=0;break;case Na:c.r=c.c}c.J=n[m]*c.ma/h}else{c=
b.f[c-f];c.m=l[m];c.bind=0;switch(l[m]){case G:c.r=c.c;break;case Ua:c.r=c.d;break;case Ra:c.r=0;break;case Na:c.r=c.c}c.J=n[m]/c.va/h}}var P=0.1,u,z=2,L=0,v=0,S=0,M,ba,J;u=function(a){var b=a.g,c=a.i;a=a.L;var d={};d.g=b;d.i=c;d.type=new Int8Array(1+b+c);d.c=new Float64Array(1+b+c);d.d=new Float64Array(1+b+c);d.u=new Float64Array(1+b+c);d.ac=new Int8Array(1+b+c);d.bd=new Float64Array(1+b+c);d.cd=new Float64Array(1+b+c);d.eb=new Float64Array(1+c);d.Ca=new Int32Array(1+c+1);d.Ba=new Int32Array(1+a);
d.Ia=new Float64Array(1+a);d.lg=new Int32Array(1+b+1);d.kg=new Int32Array(1+a);d.mg=new Float64Array(1+a);d.head=new Int32Array(1+b+c);d.bind=new Int32Array(1+b+c);d.m=new Int8Array(1+c);d.Ha=new Float64Array(1+b);d.Qa=new Float64Array(1+c);d.hd=new Int8Array(1+b+c);d.gamma=new Float64Array(1+b);d.Vb=new Int32Array(1+c);d.mb=new Float64Array(1+c);d.yb=new Int32Array(1+b);d.Ua=new Float64Array(1+b);d.jb=new Float64Array(1+b);d.Gc=new Float64Array(1+b);d.Hc=new Float64Array(1+b);d.jg=new Float64Array(1+
b);return d}(a);(function(a,b){var c=a.g,d=a.i,e=a.type,f=a.c,g=a.d,h=a.u,k=a.ac,l=a.bd,m=a.cd,n=a.eb,p=a.Ca,q=a.Ba,r=a.Ia,t=a.lg,u=a.kg,v=a.mg,y=a.head,z=a.bind,C=a.m,D=a.hd,F=a.gamma,E,H;for(E=1;E<=c;E++)H=b.n[E],e[E]=H.type,f[E]=H.c*H.ma,g[E]=H.d*H.ma,h[E]=0;for(E=1;E<=d;E++)H=b.f[E],e[c+E]=H.type,f[c+E]=H.c/H.va,g[c+E]=H.d/H.va,h[c+E]=H.u*H.va;ga(k,1,e,1,c+d);ga(l,1,f,1,c+d);ga(m,1,g,1,c+d);n[0]=b.ha;ga(n,1,h,c+1,d);e=0;for(E=1;E<=d;E++)e<Math.abs(n[E])&&(e=Math.abs(n[E]));0==e&&(e=1);switch(b.dir){case za:a.$a=
1/e;break;case Ea:a.$a=-1/e}1>Math.abs(a.$a)&&(a.$a*=1E3);for(E=1;E<=d;E++)h[c+E]*=a.$a;for(E=h=1;E<=d;E++)for(p[E]=h,n=b.f[E].k;null!=n;n=n.I)q[h]=n.n.ea,r[h]=n.n.ma*n.j*n.f.va,h++;p[d+1]=h;for(E=h=1;E<=c;E++)for(t[E]=h,n=b.n[E].k;null!=n;n=n.B)u[h]=n.f.C,v[h]=n.n.ma*n.j*n.f.va,h++;t[c+1]=h;ga(y,1,b.head,1,c);p=0;for(E=1;E<=c;E++)H=b.n[E],H.m!=A&&(p++,y[c+p]=E,C[p]=H.m);for(E=1;E<=d;E++)H=b.f[E],H.m!=A&&(p++,y[c+p]=c+E,C[p]=H.m);for(p=1;p<=c+d;p++)z[y[p]]=p;a.valid=1;b.valid=0;a.U=b.U;b.U=null;a.D=
0;a.hc=ja();a.Sf=a.$=b.$;a.be=-1;a.Rb=0;ha(D,1,0,c+d);for(E=1;E<=c;E++)F[E]=1})(u,a);for(b.o>=mc&&x("Objective scale factor = "+u.$a+"");;){if(0==z){J=d(u);if(0!=J)return b.o>=Lb&&(x("Error: unable to factorize the basis matrix ("+J+")"),x("Sorry, basis recovery procedure not implemented yet")),a.U=u.U,u.U=null,a.na=a.sa=Aa,a.aa=0,a.$=u.$,a.some=0,J=Sb;z=u.valid=1;L=v=0}if(0==v&&(l(u),v=1,0==u.D&&(0!=O(u,0.9*b.tb)?(u.D=1,Q(u)):(u.D=2,F(u)),L=u.Rb=0),0!=W(u,b.tb))){b.o>=Lb&&x("Warning: numerical instability (dual simplex, phase "+
(1==u.D?"I":"II")+")");if(b.cb==Qb)return ka(u,a,Aa,Aa,0),J=Sb;z=u.D=0;S=5;continue}1==u.D&&0==O(u,b.tb)&&(ca(u,b,1),u.D=2,1!=v&&(l(u),v=1),F(u),L=u.Rb=0);0==L&&(k(u,u.Ha),2==u.D&&(u.Ha[0]=X(u)),L=1);switch(b.fd){case oc:0==u.Rb&&p(u)}if(2==u.D&&0>u.$a&&b.hf>-s&&u.Ha[0]<=b.hf){if(1!=L||1!=v){1!=L&&(L=0);1!=v&&(v=0);continue}ca(u,b,1);b.o>=Wb&&x("OBJECTIVE LOWER LIMIT REACHED; SEARCH TERMINATED");ka(u,a,Ad,dc,0);return J=Vf}if(2==u.D&&0<u.$a&&b.jf<+s&&u.Ha[0]>=b.jf){if(1!=L||1!=v){1!=L&&(L=0);1!=v&&
(v=0);continue}ca(u,b,1);b.o>=Wb&&x("OBJECTIVE UPPER LIMIT REACHED; SEARCH TERMINATED");ka(u,a,Ad,dc,0);return J=Wf}if(2147483647>b.oc&&u.$-u.Sf>=b.oc){if(2==u.D&&1!=L||1!=v){2==u.D&&1!=L&&(L=0);1!=v&&(v=0);continue}ca(u,b,1);b.o>=Wb&&x("ITERATION LIMIT EXCEEDED; SEARCH TERMINATED");switch(u.D){case 1:ba=Ad;F(u);k(u,u.Ha);break;case 2:ba=dc}ka(u,a,Ad,ba,0);return J=rg}if(2147483647>b.sb&&1E3*la(u.hc)>=b.sb){if(2==u.D&&1!=L||1!=v){2==u.D&&1!=L&&(L=0);1!=v&&(v=0);continue}ca(u,b,1);b.o>=Wb&&x("TIME LIMIT EXCEEDED; SEARCH TERMINATED");
switch(u.D){case 1:ba=Ad;F(u);k(u,u.Ha);break;case 2:ba=dc}ka(u,a,Ad,ba,0);return J=Qc}ca(u,b,0);m(u,b.Gb);if(0==u.s){if(1!=L||1!=v){1!=L&&(L=0);1!=v&&(v=0);continue}ca(u,b,1);switch(u.D){case 1:b.o>=Wb&&x("PROBLEM HAS NO DUAL FEASIBLE SOLUTION");F(u);k(u,u.Ha);M=Ad;ba=jc;break;case 2:b.o>=Wb&&x("OPTIMAL SOLUTION FOUND"),M=ba=dc}ka(u,a,M,ba,0);return J=0}var ea=u.jg;q(u,ea);S&&r(u,ea);n(u,ea);t(u,b.Gb);switch(b.ne){case pc:y(u,0);break;case qc:y(u,0.3*b.tb)}if(0==u.F){if(1!=L||1!=v||!S){1!=L&&(L=
0);1!=v&&(v=0);S=1;continue}ca(u,b,1);switch(u.D){case 1:b.o>=Lb&&x("Error: unable to choose basic variable on phase I");a.U=u.U;u.U=null;a.na=a.sa=Aa;a.aa=0;a.$=u.$;a.some=0;J=Sb;break;case 2:b.o>=Wb&&x("PROBLEM HAS NO FEASIBLE SOLUTION"),ka(u,a,jc,dc,u.head[u.s]),J=0}return J}var fa=u.mb[u.F],sa=1E-5*(1+0.01*u.uh);if(Math.abs(fa)<sa&&(b.o>=mc&&x("piv = "+fa+"; eps = "+sa+""),!S)){S=5;continue}E(u);S&&C(u);fa=u.Ua[u.s];sa=u.mb[u.F];if(Math.abs(fa-sa)>1E-8*(1+Math.abs(fa))||!(0<fa&&0<sa||0>fa&&0>
sa)){b.o>=mc&&x("piv1 = "+fa+"; piv2 = "+sa+"");if(1!=z||!S){1!=z&&(z=0);S=5;continue}0==u.Ua[u.s]&&(u.Tb++,u.yb[u.Tb]=u.s);u.Ua[u.s]=sa}H(u);2==u.D&&(u.Ha[0]+=u.Qa[u.F]/u.$a*(u.Se/u.Ua[u.s]));L=2;D(u);v=2;switch(b.fd){case oc:0<u.Rb&&R(u)}J=e(u,u.s,u.head[u.g+u.F]);z=0==J?2:u.valid=0;V(u);u.$++;0<S&&S--}};
}(typeof exports === 'object' && exports || this));
/**
 * Number of combinations of k items among n
 * @param{number}
 * @param{number}
 * @return{number}
 */  
function nchoosek(n,k) {
	if ( k > n || k < 0 || n < 0) 
		return 0;

	var i;
	var res = 1;
	for ( i=n-k+1; i <= n; i++)
		res *= i;
	for (i=2; i <= k; i++)
		res /= i;		
	return res;
}

//////////////////////////////////////////////
//  Multivariate Gaussian random vectors
//////////////////////////////////////////////
function mvnrnd(mu, Sigma, N) {
	if ( arguments.length < 3 )
		var N = 1; 
		
	var X = randn(N,mu.length);
	
	if ( issymmetric(Sigma) )
		var L = chol(Sigma);
	else 
		var L = Sigma; // L directly provided instead of Sigma
	
	return add(mul(ones(N),transpose(mu)), mul(X, transpose(L) ));
}

//////////////////////////////////////////////
// Generic class for Distributions
/////////////////////////////////////////////
function Distribution (distrib, arg1, arg2 ) {
	
	if ( arguments.length < 1 ) {
		error("Error in new Distribution(name): name is undefined.");
		return undefined;
	}
	
	if (typeof(distrib) == "string") 
		distrib = eval(distrib);

	this.type = "Distribution:" + distrib.name;

	this.distribution = distrib.name;

	// Functions that depend on the distrib:
	this.construct = distrib.prototype.construct; 

	this.estimate = distrib.prototype.estimate; 
	this.sample = distrib.prototype.sample; 
	this.pdf = distrib.prototype.pdf;
	if( distrib.prototype.pmf )
		this.pmf = distrib.prototype.pmf;  
	
	if( distrib.prototype.logpdf )
		this.logpdf = distrib.prototype.logpdf;  
	else
		this.logpdf = function ( x ) { return log(this.pdf(x)); };
		
//	this.cdf = distrib.prototype.cdf; 
	
	// Initialization depending on distrib
	this.construct(arg1, arg2);
}

Distribution.prototype.construct = function ( params ) {
	// Read params and create the required fields for a specific algorithm
	
}

Distribution.prototype.pdf = function ( x ) {
	// return value of PDF at x
}

Distribution.prototype.sample = function ( N ) {
	// Return N samples
}

Distribution.prototype.estimate = function ( X ) {
	// Estimate dsitribution from the N-by-d matrix X
	// !! this function should also update this.mean and this.variance
}


Distribution.prototype.info = function () {
	// Print information about the distribution
	
	var str = "{<br>";
	var i;
	var Functions = new Array();
	for ( i in this) {
		switch ( type( this[i] ) ) {
			case "string":
			case "boolean":
			case "number":
				str += i + ": " + this[i] + "<br>";
				break;
			case "vector":
				str += i + ": " + printVector(this[i]) + "<br>";
				break;
			case "matrix":
				str += i + ": matrix of size " + this[i].m + "-by-" + this[i].n + "<br>";
				break;
			case "function": 
				Functions.push( i );
				break;
			default:
				str += i + ": " + typeof(this[i]) + "<br>";
				break;			
		}
	}
	str += "<i>Functions: " + Functions.join(", ") + "</i><br>";
	str += "}";
	return str;
}


///////////////////////////////
///  Uniform 
///////////////////////////////
function Uniform ( params ) {
	var that = new Distribution ( Uniform, params ) ;
	return that;
}


Uniform.prototype.construct = function ( a, b ) {
	// Read params and create the required fields for a Uniform distribution
	if ( typeof(a) == "undefined" ) {
		// default to continuous uniform in [-1,1];
		this.isDiscrete = false;
		this.a = -1;
		this.b = 1;
		this.dimension = 1;
	
		this.px = 0.5;
		this.mean = 0;
		this.variance = 1/3;
		this.std = Math.sqrt(this.variance);	
	}
	else {
		if ( typeof(b) == "undefined" ) {
			this.isDiscrete = true; 
			if ( typeof(a) == "number") 
				this.values = range(a);
			else 
				this.values = a; 
			this.dimension = 1;	
			this.mean = ( min(this.values) + max(this.values) ) / 2;
			this.variance = (this.values.length * this.values.length - 1 ) / 12;
			this.std = Math.sqrt(this.variance);
		}
		else {
			this.isDiscrete = false; 
			this.a = a;
			this.b = b;
			this.dimension = size(a,1);
		
			this.px = 1 / prod(sub(b,a)); 
			this.mean = mul(0.5, add(a, b));
			var b_a = sub(b,a);
			this.variance = entrywisediv( entrywisemul(b_a,b_a), 12);
			this.std = sqrt(this.variance);
		}
	}
}

Uniform.prototype.pdf = function ( x ) {
	// return value of PDF at x
	const tx = type(x);
	var p = undefined;	
	if (this.isDiscrete) {
		var pdfscalar = function ( s, values ) {
			return ( values.indexOf(s) < 0 ) ? 0 : (1/values.length) ;
		};

		if ( tx == "number" ) {
			p = pdfscalar(x, this.values);
		}
		else if ( tx == "vector" ) {
			p = zeros(x.length);
			for ( var i=0; i < x.length; i++) 
				p[i] = pdfscalar(x[i], this.values);		
		}
		else if ( tx == "matrix" ) {
			p = zeros(x.m, x.n);
			for ( var i=0; i < x.m*x.n; i++)
				p.val[i] = pdfscalar(x.val[i], this.values);
		}
	}
	else {
		var pdfscalar = function ( s , l, u, px) {
			return ( s >= l && s <= u ) ? px : 0;
		};
		
		if ( tx == "number" ) {
			if ( this.dimension == 1 )
				p = pdfscalar(x, this.a, this.b, this.px);
		}
		else if ( tx == "vector" ) {
			if ( this.dimension == 1 ) {
				p = zeros(x.length);
				for ( var i=0; i < x.length; i++)
					p[i] = pdfscalar(x[i], this.a, this.b, this.px);
			}
			else if ( this.dimension == x.length ) {
				p = pdfscalar(x[0], this.a[0], this.b[0], this.px);
				var k = 1;
				while ( k < x.length && p != 0 ) {
					p *= pdfscalar(x[k], this.a[k], this.b[k], this.px);
					k++;
				}
			}
		}
		else if ( tx == "matrix" ) {
			if ( this.dimension == 1 ) {
				p = zeros(x.m, x.n);
				for ( var i=0; i < x.m*x.n; i++)
					p.val[i] = pdfscalar(x.val[i], this.a, this.b, this.px);
			}
			else if ( this.dimension == x.n ) {
				p = zeros(x.m);
				for ( var i=0; i < x.m; i++) {
					p[i] = pdfscalar(x.val[i*x.n], this.a[0], this.b[0], this.px);
					var k = 1;
					while ( k < x.n && p[i] != 0 ) {
						p[i] *= pdfscalar(x.val[i*x.n+k], this.a[k], this.b[k], this.px);
						k++;
					}
				}
			}
		}
	}
	return p;
}
Uniform.prototype.sample = function ( N ) {
	// Return N samples
	if ( typeof(N) == "undefined" )
		var N = 1;
		
	if ( this.isDiscrete ) {
		var s = zeros(N); 
		for(var i=0; i < N; i++) {
			var r = Math.random(); 
			var k = 1;
			var n = this.values.length;
			while ( r > k / n )
				k++;
			s[i] = this.values[k-1];
		}
		if ( N == 1)
			return s[0];
		else
			return s;
	}
	else {
		if ( this.dimension == 1 )
			return add(entrywisemul(this.b-this.a, rand(N)), this.a); 
		else {
			return add(entrywisemul(outerprod(ones(N), sub(this.b,this.a)), rand(N, this.dimension)), outerprod(ones(N),this.a) ); 
		}
	}
}

Uniform.prototype.estimate = function ( X ) {
	// Estimate dsitribution from the N-by-d matrix X
	const tX = type(X);
	
	// Detect if X contains discrete or continuous values
	if ( tX == "matrix" )
		var x = X.val;
	else
		var x = X;
		
	var i = 0;
	while ( i < x.length && Math.round(x[i]) == x[i] )
		i++;
	if ( i < x.length ) 
		this.isDiscrete = false;
	else
		this.isDiscrete = true;
		
	// Estimate
	if ( this.isDiscrete) {
		for ( i = 0; i < x.length; i++ ) {
			var xi = Math.round(x[i]);
			if ( this.values.indexOf(xi) < 0 ) 
				this.values.push(xi);		
		}
		this.dimension = 1;	
		this.mean = ( min(this.values) + max(this.values) ) / 2;
		this.variance = (this.values.length * this.values.length - 1 ) / 12;
		this.std = Math.sqrt(this.variance);
	}
	else {
		if ( tX == "matrix" ) {
			this.a = min(X,1).val; 
			this.b = max(X).val; 
			this.dimension = this.a.length;
		}
		else {
			this.a = minVector(X);
			this.b = maxVector(X);
			this.dimension = 1;
		}
		this.mean = mul(0.5, add(this.a, this.b));
		var b_a = sub(this.b,this.a);
		this.variance = entrywisediv( entrywisemul(b_a,b_a), 12);
		this.std = sqrt(this.variance);
		this.px = 1 / prod(sub(this.b,this.a)); 		
	}	
	return this;
}


///////////////////////////////
///  Gaussian 
/// (with independent components in multiple dimension)
///////////////////////////////
function Gaussian ( params ) {
	var that = new Distribution ( Gaussian, params ) ;
	return that;
}


Gaussian.prototype.construct = function ( mean, variance ) {
	// Read params and create the required fields for a specific algorithm
	if ( typeof(mean) == "undefined" ) 
		var mu = 1;
		
	else if ( type(mean) == "matrix") 
		var mu = mean.val;
	else
		var mu = mean;
		
	var dim = size(mu,1) ;

	if ( typeof(variance) == "undefined") {
		if ( dim == 1)
			var variance = 1;
		else
			var variance = ones(dim);
	}

	this.mean = mu;
	this.variance = variance;
	this.std = sqrt(this.variance);
	this.dimension = dim;
}

Gaussian.prototype.pdf = function ( x ) {
	// return value of PDF at x
	if ( this.dimension == 1 ) {
		if ( typeof(x) == "number") {
			var diff = x - this.mean;
			return Math.exp(-diff*diff / (2*this.variance)) / (this.std * Math.sqrt(2*Math.PI) );
		}
		else {
			var diff = sub(x, this.mean);
			return entrywisediv ( exp( entrywisediv(entrywisemul( diff, diff), -2* this.variance) ), this.std * Math.sqrt(2*Math.PI) ) ;
		} 
	}
	else {  
		if ( type(x) == "vector") {
			if (x.length != this.dimension ) {
				error ( "Error in Gaussian.pdf(x): x.length = " + x.length + " != " + this.dimension + " = Gaussian.dimension.");
				return undefined;
			}
			var diff = subVectors(x, this.mean );
			var u = -0.5 * dot( diff, divVectors(diff, this.variance) );
			return Math.exp(u) /  ( Math.pow(2*Math.PI, 0.5*this.dimension) * Math.sqrt(prodVector(this.variance)) );
		}
		else {
			if (x.n != this.dimension ) {
				error ( "Error in Gaussian.pdf(X): X.n = " + x.n + " != " + this.dimension + " = Gaussian.dimension.");
				return undefined;
			}

			var p = zeros(x.m); 
			var denominator = Math.pow(2*Math.PI, 0.5*this.dimension) * Math.sqrt(prodVector(this.variance)) ;
			for ( var i=0; i < x.m; i++) {
				var diff = subVectors(x.row(i), this.mean );
				var u = -0.5 * dot( diff, divVectors(diff, this.variance) );
				p[i] = Math.exp(u) / denominator;		
			}
			return p;
		}
	}
}

Gaussian.prototype.sample = function ( N ) {
	// Return N samples
	if ( typeof(N) == "undefined")
		var N = 1;

	if ( N == 1 ) 
		var X = add(entrywisemul(this.std, randn(this.dimension)), this.mean);
	else {
		var N1 = ones(N);
		var X = add(entrywisemul(outerprod(N1, this.std), randn(N,this.dimension)), outerprod(N1,this.mean));
	}
	return X;
}

Gaussian.prototype.estimate = function ( X ) {
	// Estimate dsitribution from the N-by-d matrix X
	if ( type ( X ) == "matrix" ) {
		this.mean = mean(X,1).val;
		this.variance = variance(X,1).val;
		this.std = undefined;
		this.dimension = X.n;
	}
	else {
		this.mean = mean(X);
		this.variance = variance(X);
		this.std = Math.sqrt(this.variance);
		this.dimension = 1;
	}
	return this;
}
///////////////////////////////
///  Gaussian 
/// (with independent components in multiple dimension)
///////////////////////////////
function mvGaussian ( params ) {
	var that = new Distribution ( mvGaussian, params ) ;
	return that;
}


mvGaussian.prototype.construct = function ( mean, covariance ) {
	// Read params and create the required fields for a specific algorithm
	if ( typeof(mean) == "undefined" ) 
		var mu = 1;
		
	else if ( type(mean) == "matrix") 
		var mu = mean.val;
	else
		var mu = mean;
		
	var dim = size(mu,1) ;

	if ( typeof(covariance) == "undefined") {
		if ( dim == 1)
			var covariance = 1;
		else
			var covariance = eye(dim);
	}

	this.mean = mu;
	this.variance = covariance;
	this.dimension = dim;
	
	this.L = chol(this.variance);
	if ( typeof(this.L) == "undefined" )
		error("Error in new Distribution (mvGaussian, mu, Sigma): Sigma is not positive definite");
	
	this.det = det(this.variance);
}

mvGaussian.prototype.pdf = function ( x ) {
	// return value of PDF at x
	if ( this.dimension == 1 ) {
		if ( typeof(x) == "number") {
			var diff = x - this.mean;
			return Math.exp(-diff*diff / (2*this.variance)) / (Math.sqrt(2*this.variance*Math.PI) );
		}
		else {
			var diff = sub(x, this.mean);
			return entrywisediv ( exp( entrywisediv(entrywisemul( diff, diff), -2* this.variance) ), Math.sqrt(2*this.variance*Math.PI) ) ;
		}
	}
	else {  
		if ( type(x) == "vector") {
			if (x.length != this.dimension ) {
				error ( "Error in mvGaussian.pdf(x): x.length = " + x.length + " != " + this.dimension + " = mvGaussian.dimension.");
				return undefined;
			}
			var diff = subVectors(x, this.mean );
			var u = -0.5 * dot( diff, cholsolve(this.L, diff) );
			return Math.exp(u) /   Math.sqrt( Math.pow(2*Math.PI, this.dimension) * this.det ) ;
		}
		else {
			if (x.n != this.dimension ) {
				error ( "Error in Gaussian.pdf(X): X.n = " + x.n + " != " + this.dimension + " = Gaussian.dimension.");
				return undefined;
			}

			var p = zeros(x.m); 
			var denominator = Math.sqrt( Math.pow(2*Math.PI, this.dimension) * this.det ) ;
			for ( var i=0; i < x.m; i++) {
				var diff = subVectors(x.row(i), this.mean );
				var u = -0.5 * dot( diff, cholsolve(this.L, diff) );
				p[i] = Math.exp(u) / denominator;		
			}
			return p;
		}
	}
}

mvGaussian.prototype.sample = function ( N ) {
	// Return N samples
	if ( typeof(N) == "undefined")
		var N = 1;
		
	var X = add(mul(randn(N,this.dimension), transpose(this.L)), outerprod(ones(N),this.mean));
	
	if ( N == 1) 
		return X.val;
	else
		return X;
}

mvGaussian.prototype.estimate = function ( X ) {
	// Estimate dsitribution from the N-by-d matrix X
	if ( type ( X ) == "matrix" ) {
		this.mean = mean(X,1).val;
		this.variance = cov(X); 
		this.dimension = X.n;
		this.L = chol(this.variance);
		if ( typeof(this.L) == "undefined" )
			error("Error in mvGaussian.estimate(X): covariance estimate is not positive definite");
	
		this.det = det(this.variance);
		return this;
	}
	else {
		error("mvGaussian.estimate( X ) needs a matrix X");
	}
}



///////////////////////////////
///  Bernoulli 
///////////////////////////////
function Bernoulli ( params ) {
	var that = new Distribution ( Bernoulli, params ) ;
	return that;
}


Bernoulli.prototype.construct = function ( mean ) {
	// Read params and create the required fields for a specific algorithm
	if ( typeof(mean) == "undefined" ) 
		var mean = 0.5;

	var dim = size(mean,1); 

	this.mean = mean;
	this.variance = entrywisemul(mean, sub(1, mean)) ;
	this.std = sqrt(this.variance);
	this.dimension = dim;	
}

Bernoulli.prototype.pdf = Bernoulli.prototype.pmf = function ( x ) {
	// return value of PDF at x
	const tx = type(x);
	
	var pdfscalar = function ( s, mu ) {
		if ( s == 1 ) 
			return mu;
		else if ( s == 0)
			return (1-mu);
		else
			return 0;
	};
	
	if ( this.dimension == 1 ) {
		if ( tx == "number" ) {
			return pdfscalar(x, this.mean);
		}
		else if ( tx == "vector") {
			var p = zeros(x.length);
			for(var i = 0; i < x.length ; i++){
				p[i] = pdfscalar(x[i], this.mean);
			}
			return p;
		}
		else if ( tx == "matrix") {
			var P = zeros(x.m, x.n);
			var mn = x.m*x.n;
			for(var k = 0; k < mn ; k++){
				P.val[k] = pdfscalar(x.val[k], this.mean);
			}
			return P;
		}
	}
	else {
		switch( tx ) {
		case "vector":
			var p = pdfscalar(x[0], this.mean[0]);
			for (var k = 1; k < this.dimension; k++)
				p *= pdfscalar(x[k], this.mean[k]);
			break;
			
		case "spvector":
			var p = 1;
			for (var j=0; j < x.ind[0] ; j++)
				p *= (1-this.mean[j]);
			for (var k =0; k < x.val.length - 1; k++) {
				p *= this.mean[x.ind[k]];
				for (var j=x.ind[k]+1; j < x.ind[k+1] ; j++)
					p *= (1-this.mean[j]);
			}
			p *= this.mean[x.ind[k]];
			for (var j=x.ind[k]+1; j < this.dimension ; j++)
				p *= (1-this.mean[j]);			
			break;
			
		case "matrix":
			var p = zeros(x.m); 
			for (var i=0; i < x.m; i++) {
				p[i] = pdfscalar(x.val[i*x.n], this.mean[0]);
				for (var k = 1; k < x.n; k++)
					p[i] *= pdfscalar(x.val[i*x.n + k], this.mean[k]);			
			}
			break;
		case "spmatrix":
			var p = ones(x.m);
			for (var i=0; i < x.m; i++) {
				var xr = x.row(i);	// could be faster without this...
				for (var j=0; j < xr.ind[0] ; j++)
					p[i] *= (1-this.mean[j]);
				for (var k =0; k < xr.val.length - 1; k++) {
					p[i] *= this.mean[xr.ind[k]];
					for (var j=xr.ind[k]+1; j < xr.ind[k+1] ; j++)
						p[i] *= (1-this.mean[j]);
				}
				p[i] *= this.mean[xr.ind[k]];
				for (var j=xr.ind[k]+1; j < this.dimension ; j++)
					p[i] *= (1-this.mean[j]);	
			}				
			break;
		default:
			var p = undefined;
			break;			
		}
		return p;
	}
	
}

Bernoulli.prototype.logpdf = Bernoulli.prototype.logpmf = function ( x ) {
	// return value of logPDF at x
	const tx = type(x);
	
	var logpdfscalar = function ( s, mu ) {
		if ( s == 1 ) 
			return Math.log(mu);
		else if ( s == 0)
			return Math.log(1-mu);
		else
			return -Infinity;
	};
	
	if ( this.dimension == 1 ) {
		if ( tx == "number" ) {
			return logpdfscalar(x, this.mean);
		}
		else if ( tx == "vector") {
			var p = zeros(x.length);
			for(var i = 0; i < x.length ; i++){
				p[i] = logpdfscalar(x[i], this.mean);
			}
			return p;
		}
		else if ( tx == "matrix") {
			var P = zeros(x.m, x.n);
			var mn = x.m*x.n;
			for(var k = 0; k < mn ; k++){
				P.val[k] = logpdfscalar(x.val[k], this.mean);
			}
			return P;
		}
	}
	else {
		switch( tx ) {
		case "vector":
			var p = 0;
			for (var k = 0; k < this.dimension; k++)
				p += logpdfscalar(x[k], this.mean[k]);
			break;
			
		case "spvector":
			var p = 0;
			for (var j=0; j < x.ind[0] ; j++)
				p += Math.log(1-this.mean[j]);
			for (var k =0; k < x.val.length - 1; k++) {
				p += Math.log(this.mean[x.ind[k]]);
				for (var j=x.ind[k]+1; j < x.ind[k+1] ; j++)
					p += Math.log(1-this.mean[j]);
			}
			p += Math.log(this.mean[x.ind[k]]);
			for (var j=x.ind[k]+1; j < this.dimension ; j++)
				p += Math.log(1-this.mean[j]);			
			break;
			
		case "matrix":
			var p = zeros(x.m); 
			for (var i=0; i < x.m; i++) {
				for (var k = 0; k < x.n; k++)
					p[i] += logpdfscalar(x.val[i*x.n + k], this.mean[k]);			
			}
			break;
		case "spmatrix":
			var p = zeros(x.m); 
			for (var i=0; i < x.m; i++) {
				var xr = x.row(i);	// could be faster without this...
				for (var j=0; j < xr.ind[0] ; j++)
					p[i] += Math.log(1-this.mean[j]);
				for (var k =0; k < xr.val.length - 1; k++) {
					p[i] += Math.log(this.mean[xr.ind[k]]);
					for (var j=xr.ind[k]+1; j < xr.ind[k+1] ; j++)
						p[i] += Math.log(1-this.mean[j]);
				}
				p[i] += Math.log(this.mean[xr.ind[k]]);
				for (var j=xr.ind[k]+1; j < this.dimension ; j++)
					p[i] += Math.log(1-this.mean[j]);						
			}
			break;
		default:
			var p = undefined;
			break;			
		}
		return p;
	}
	
}

Bernoulli.prototype.sample = function ( N ) {
	// Return N samples
	if ( typeof(N) == "undefined" || N == 1 ) {
		return isLower(rand(this.dimension) , this.mean);
	}
	else {
		return isLower(rand(N, this.dimension) , outerprod(ones(N), this.mean) );		
	}
}


Bernoulli.prototype.estimate = function ( X ) {
	// Estimate dsitribution from the N-by-d matrix X
	switch ( type ( X ) ) {
	case "matrix":
	case "spmatrix":
		this.mean = mean(X,1).val;
		this.variance = entrywisemul(this.mean, sub(1, this.mean)) ;
		this.std = sqrt(this.variance);
		this.dimension = X.n;
		break;
	case "vector":
	case "spvector":
		this.dimension = 1;
		this.mean = mean(X) ;
		this.variance = this.mean * (1-this.mean);
		this.std = Math.sqrt(this.variance);
		break;
	default:
		error("Error in Bernoulli.estimate( X ): X must be a (sp)matrix or (sp)vector.");
		break;
	}
	return this;
}


///////////////////////////////
///  Poisson 
///////////////////////////////
function Poisson ( params ) {
	var that = new Distribution ( Poisson, params ) ;
	return that;
}


Poisson.prototype.construct = function ( mean ) {
	// Read params and create the required fields for a specific algorithm
	if ( typeof(mean) == "undefined" ) 
		var mean = 5;

	var dim = size(mean,1); 

	this.mean = mean;
	this.variance = this.mean;
	this.std = sqrt(this.variance);
	this.dimension = dim;	
}

Poisson.prototype.pdf = Poisson.prototype.pmf = function ( x ) {
	// return value of PDF at x
	const tx = type(x);
	
	var pdfscalar = function ( s, lambda ) {
		if ( s < 0 || Math.round(s) != s ) 
			return 0;
		else if ( s == 0)
			return 1;
		else {
			var u = lambda;
			for ( var k = 2; k <= s; k++ )
				u *= lambda / k;
			return Math.exp(-lambda) * u;
		}
	};
	
	if ( this.dimension == 1 ) {
		if ( tx == "number" ) {
			return pdfscalar(x, this.mean);
		}
		else if ( tx == "vector") {
			var p = zeros(x.length);
			for(var i = 0; i < x.length ; i++){
				p[i] = pdfscalar(x[i], this.mean);
			}
			return p;
		}
		else if ( tx == "matrix") {
			var P = zeros(x.m, x.n);
			var mn = x.m*x.n;
			for(var k = 0; k < mn ; k++){
				P.val[k] = pdfscalar(x.val[k], this.mean);
			}
			return p;
		}
	}
	else {
		if ( tx == "vector" ) {
			var p = pdfscalar(x[0], this.mean[0]);
			for (var k =0; k < this.dimension; k++)
				p *= pdfscalar(x[k], this.mean[k]);
			
			return p;
		}
		else if ( tx == "matrix") {
			var p = zeros(x.m); 
			for (var i=0; i < x.m; i++) {
				p[i] = pdfscalar(x.val[i*x.n], this.mean[0]);
				for (var k =0; k < x.n; k++)
					p[i] *= pdfscalar(x.val[i*x.n + k], this.mean[k]);			
			}
			return p;			
		}
	}
	
}

Poisson.prototype.sample = function ( N ) {
	// Return N samples
	var samplescalar = function (lambda) {
		var x = Math.random();
		var n = 0;
		const exp_lambda = Math.exp(-lambda);
		while (x > exp_lambda) {
			x *= Math.random();
			n++;
		}
		return n;
	};
	
	if ( typeof(N) == "undefined" || N == 1 ) {
		if ( this.dimension == 1 )
			return samplescalar(this.mean);
		else {
			var s = zeros(this.dimension);
			for ( k=0; k < this.dimension; k++)
				s[k] = samplescalar(this.mean[k]);
			return s;
		}
	}
	else {
		if ( this.dimension == 1 ) {
			var S = zeros(N);
			for ( var i=0; i < N; i++) 
				S[i] =  samplescalar(this.mean);
			return S;
		}
		else {
			var S = zeros(N, this.dimension);
			for ( var i=0; i < N; i++) {
				for ( k=0; k < this.dimension; k++)
					S[i*this.dimension + k] = samplescalar(this.mean[k]);
			}
			return S;			
		}
	}
}


Poisson.prototype.estimate = function ( X ) {
	// Estimate dsitribution from the N-by-d matrix X
	if ( type ( X ) == "matrix" ) {
		this.mean = mean(X,1).val;
		this.variance = this.mean;
		this.std = sqrt(this.variance);
		this.dimension = X.n;
	}
	else { // X is a vector samples 
		this.dimension = 1;
		this.mean = mean(X) ;
		this.variance = this.mean;
		this.std = Math.sqrt(this.variance);
	}
	return this;
}

const Complex_I = new Complex(0, 1);

/**
 * @constructor
 * @struct
 */
function Complex(a, b, polar) {
	/** @const */ this.type = "Complex";
	
	if ( typeof(a) == "undefined") {
		this.re = 0.0;
		this.im = 0.0;
	}
	else if ( a instanceof Complex ) {
		this.re = a.re;
		this.im = a.im;
	}
	else if ( typeof(a) == "number" && !polar ) {
		this.re = a;
		this.im = b;
	}
	else {
		this.re = a * Math.cos(b);
		this.im = a * Math.sin(b);
	}
}

Complex.prototype.toString = function () {
	return this.re + (this.im >= 0 ? " + " : " - ") + Math.abs(this.im) + "i";
}
Complex.prototype.info = function () {
	return this.re + (this.im >= 0 ? " + " : " - ") + Math.abs(this.im) + "i";
}
/**
 * @param {Complex}
 * @param {Complex}
 * @return {Complex} 
 */
function addComplex(a,b) {
	var z = new Complex(a);
	z.re += b.re; 
	z.im += b.im;
	return z;
}
/**
 * @param {Complex}
 * @param {number}
 * @return {Complex} 
 */
function addComplexReal(a,b) {
	var z = new Complex(a);
	z.re += b;
	return z;
}
/**
 * @param {Complex}
 * @param {Complex}
 * @return {Complex} 
 */
function subComplex(a,b) {
	var z = new Complex(a);
	z.re -= b.re;
	z.im -= b.im;
	return z;
}
/**
 * @param {Complex}
 * @return {Complex} 
 */
function minusComplex(a) {
	return new Complex(-a.re, -a.im);
}

function mulComplex(a,b) {
	return new Complex(a.re*b.re - a.im*b.im, a.im * b.re + a.re*b.im);
}
function mulComplexReal(a,b) {
	return new Complex(a.re*b, a.im * b);
}
function divComplex(a,b) {
	var denom = b.re*b.re + b.im*b.im;
	return new Complex( (a.re*b.re + a.im*b.im) / denom, (a.im * b.re - a.re*b.im) / denom );
}

function conj(z) {
	if (z instanceof Complex)
		return new Complex(z.re, -z.im);
	else if (z instanceof ComplexVector) {
		var r = new ComplexVector(z);
		for (var i=0; i < z.length; i++)
			r.im[i] = -r.im[i];
		return r;
	}	
	else if (z instanceof ComplexMatrix) {
		var r = new ComplexMatrix(z);
		for (var i=0; i < z.length; i++)
			r.im[i] = -r.im[i];
		return r;
	}		
	else 
		return new Complex(z);	// for a real
}

function modulus(z) {
	if ( z instanceof Complex ) 
		return Math.sqrt(z.re*z.re + z.im*z.im);
	else if (z instanceof ComplexVector)
		return sqrt(addVectors( entrywisemulVector(z.re, z.re), entrywisemulVector(z.im, z.im) )); 
	else if (z instanceof ComplexVector)
		return new Matrix(z.m, z.n, sqrt(addVectors( entrywisemulVector(z.re, z.re), entrywisemulVector(z.im, z.im) ) , true)); 
}
var absComplex = modulus;

function expComplex(z) {
	return new Complex(Math.exp(z.re), z.im, true); 	
}



/**
 * @constructor
 * @struct
 */
function ComplexVector(a, b, dontcopy) {
	/** @const */ this.type = "ComplexVector";
	
	if ( arguments.length == 0 ) {
		// dummy call, probably in renewObject 
		// while loading data from a file
	}
	else if ( a instanceof ComplexVector) {
		/** @const */ this.length = a.length;
		this.re = vectorCopy(a.re);
		this.im = vectorCopy(a.im);
	}
	else if (typeof(a) == "number") {
		/** @const */ this.length = a;
		this.re = new Float64Array(a);
		this.im = new Float64Array(a);		
	}
	else if ( a instanceof Float64Array && b instanceof Float64Array ) {
		/** @const */ this.length = a.length;
		if ( typeof(dontcopy) == "undefined" || !dontcopy ){
			this.re = vectorCopy(a);
			this.im = vectorCopy(b);
		}
		else {
			this.re = a;
			this.im = b;
		}
	}
	else {
		error("Bad arguments to new ComplexVector()");
	}
}

/**
 * @constructor
 * @struct
 */
function ComplexMatrix(a, b, values, valuesimag) {
	/** @const */ this.type = "ComplexMatrix";
		
	if ( arguments.length == 0 ) {
		// dummy call, probably in renewObject 
		// while loading data from a file
	}
	else if ( a instanceof ComplexMatrix) {
		/** @const */ this.length = a.length;
		/** @const */ this.m = a.m;
		/** @const */ this.n = a.n;
		/** @const */ this.size = [a.m, a.n]; 
		this.re = vectorCopy(a.re);
		this.im = vectorCopy(a.im);
	}
	else if (typeof(a) == "number" && typeof(b) == "number") {
		/** @const */ this.length = a;
		/** @const */ this.m = a;
		/** @const */ this.n = b;
		/** @const */ this.size = [a, b]; 
		if ( typeof(values) == "undefined") {
			this.re = new Float64Array(a*b);
			this.im = new Float64Array(a*b);
		}
		else if ( values instanceof ComplexVector ) {
			this.re = vectorCopy(values.re);
			this.im = vectorCopy(values.im);
		}
		else if ( values instanceof Float64Array && typeof(valuesimag) != "undefined" &&  valuesimag instanceof Float64Array) {
			this.re = values;
			this.im = valuesimag;	// !! no copy!
		}
	}
	else if ( a instanceof Matrix && b instanceof Matrix) {
		/** @const */ this.length = a.length;
		/** @const */ this.m = a.m;
		/** @const */ this.n = a.n;
		/** @const */ this.size = [a.m, a.n]; 
		this.re = vectorCopy(a.val);
		this.im = vectorCopy(b.val);
	}
	else 
		error("Bad arguments to new ComplexMatrix()");
}


ComplexVector.prototype.toString = function () {
	return "[" + this.type + " of size " + this.length + "]";
}
ComplexMatrix.prototype.toString = function () {
	return "[" + this.type + " of size " + this.m + " x " + this.n + "]";
}
ComplexVector.prototype.get = function (i) {
	return new Complex(this.re[i], this.im[i]);
}
ComplexMatrix.prototype.get = function (i,j) {
	return new Complex(this.re[i*this.n + j], this.im[i*this.n + j]);
}
ComplexVector.prototype.set = function (i, z) {
	if ( typeof(z) == "number" )  {
		this.re[i] = z;
		this.im[i] =	0;
	}
	else {
		this.re[i] = z.re;
		this.im[i] = z.im;
	}
}
ComplexMatrix.prototype.set = function (i, j, z) {
	if ( typeof(z) == "number" )  {
		this.re[i*this.n + j] = z;
		this.im[i*this.n + j] =	0;
	}
	else {
		this.re[i*this.n + j] = z.re;
		this.im[i*this.n + j] = z.im;
	}
}
ComplexVector.prototype.getSubVector = function (rowsrange) {
	const n = rowsrange.length;
	var res = new ComplexVector( n );
	for (var i = 0; i< n; i++) {
		res.re[i] = this.re[rowsrange[i]];
		res.im[i] = this.im[rowsrange[i]];
	}
	return res;
}
ComplexVector.prototype.setVectorScalar = function (rowsrange, B) {
	var i;
	for (i = 0; i< rowsrange.length; i++) 
		A.set ( rowsrange[i], B);
}
ComplexVector.prototype.setVectorVector = function (rowsrange, B) {
	var i;
	for (i = 0; i< rowsrange.length; i++) 
		A.set(rowsrange[i], B[i]);
}



function real(z) {
	if (z instanceof Complex) 
		return z.re;
	else if (z instanceof ComplexVector)
		return vectorCopy(z.re);
	else if (z instanceof ComplexMatrix)
		return new Matrix(z.m, z.n, z.re);
	else
		return copy(z);		
}
function imag(z) {
	if (z instanceof Complex) 
		return z.im;
	else if (z instanceof ComplexVector)
		return vectorCopy(z.im);
	else if (z instanceof ComplexMatrix)
		return new Matrix(z.m, z.n, z.im);
	else
		return 0;		
}

/**
 * @param {MatrixComplex} 
 */
function transposeComplexMatrix ( A ) {
	// Hermitian transpose = conjugate transpose
	const m = A.m;
	const n = A.n;
	if ( m > 1 ) {
		var i;
		var j;
		var res = new ComplexMatrix( n,m);
		var Aj = 0;
		for ( j=0; j< m;j++) {
			var ri = 0;
			for ( i=0; i < n ; i++) {
				res.re[ri + j] = A.re[Aj + i];
				res.im[ri + j] = -A.im[Aj + i];
				ri += m;
			}
			Aj += n;
		}
		return res;
	}
	else {
		return new ComplexVector(A.re,minusVector(A.im));
	}
}
/**
 * @param {MatrixComplex} 
 */
ComplexMatrix.prototype.transpose = function ( ) {
	// simple Transpose without conjugate
	const m = A.m;
	const n = A.n;
	if ( m > 1 ) {
		var i;
		var j;
		var res = new ComplexMatrix( n,m);
		var Aj = 0;
		for ( j=0; j< m;j++) {
			var ri = 0;
			for ( i=0; i < n ; i++) {
				res.re[ri + j] = A.re[Aj + i];
				res.im[ri + j] = A.im[Aj + i];
				ri += m;
			}
			Aj += n;
		}
		return res;
	}
	else {
		return new ComplexVector(A.re,A.im);
	}
}


/**
 * @param {ComplexVector}
 * @param {ComplexVector}
 * @return {ComplexVector} 
 */
function addComplexVectors(a, b) {
	var z = new ComplexVector(a);
	const n = a.length;
	for ( var i=0; i< n; i++) {
		z.re[i] += b.re[i];
		z.im[i] += b.im[i];
	}
	return z;
}
/**
 * @param {ComplexVector}
 * @param {ComplexVector}
 * @return {ComplexVector} 
 */
function subComplexVectors(a, b) {
	var z = new ComplexVector(a);
	const n = a.length;
	for ( var i=0; i< n; i++) {
		z.re[i] -= b.re[i];
		z.im[i] -= b.im[i];
	}
	return z;
}

/**
 * @param {ComplexMatrix}
 * @param {ComplexMatrix}
 * @return {ComplexMatrix} 
 */
function addComplexMatrices(a, b) {
	var z = new ComplexMatrix(a);
	const mn = a.m * a.n;
	for ( var i=0; i< mn; i++) {
		z.re[i] += b.re[i];
		z.im[i] += b.im[i];
	}
	return z;
}

/**
 * @param {ComplexMatrix}
 * @param {ComplexMatrix}
 * @return {ComplexMatrix} 
 */
function subComplexMatrices(a, b) {
	var z = new ComplexMatrix(a);
	const mn = a.m * a.n;
	for ( var i=0; i< mn; i++) {
		z.re[i] -= b.re[i];
		z.im[i] -= b.im[i];
	}
	return z;
}
/**
 * @param {ComplexVector}
 * @param {Float64Array}
 * @return {ComplexVector} 
 */
function addComplexVectorVector(a, b) {
	var z = new ComplexVector(a);
	const n = a.length;
	for ( var i=0; i< n; i++) {
		z.re[i] += b[i];
	}
	return z;
}
/**
 * @param {ComplexVector}
 * @param {Float64Array}
 * @return {ComplexVector} 
 */
function subComplexVectorVector(a, b) {
	var z = new ComplexVector(a);
	const n = a.length;
	for ( var i=0; i< n; i++) {
		z.re[i] -= b[i];		
	}
	return z;
}
/**
 * @param {ComplexMatrix}
 * @param {Matrix}
 * @return {ComplexMatrix} 
 */
function addComplexMatrixMatrix(a, b) {
	var z = new ComplexMatrix(a);
	const n = a.m * a.n;
	for ( var i=0; i< n; i++) {
		z.re[i] += b.val[i];
	}
	return z;
}
/**
 * @param {ComplexMatrix}
 * @param {Matrix}
 * @return {ComplexMatrix} 
 */
function subComplexMatrixMatrix(a, b) {
	var z = new ComplexMatrix(a);
	const n = a.m * a.n;
	for ( var i=0; i< n; i++) {
		z.re[i] -= b.val[i];
	}
	return z;
}

/**
 * @param {number}
 * @param {ComplexVector}
 * @return {ComplexVector} 
 */
function addScalarComplexVector(a, b) {
	var z = new ComplexVector(b);
	const n = b.length;
	for ( var i=0; i< n; i++) {
		z.re[i] += a;
	}
	return z;
}
/**
 * @param {number}
 * @param {ComplexVector}
 * @return {ComplexVector} 
 */
function subScalarComplexVector(a, b) {
	var z = minusComplexVector(b);
	const n = b.length;
	for ( var i=0; i< n; i++) {
		z.re[i] += a;
	}
	return z;
}

/**
 * @param {number}
 * @param {ComplexMatrix}
 * @return {ComplexMatrix} 
 */
function addScalarComplexMatrix(a, b) {
	var z = new ComplexMatrix(b);
	const n = b.m * b.n;
	for ( var i=0; i< n; i++) {
		z.re[i] += a;
	}
	return z;
}



/**
 * @param {ComplexVector}
 * @param {ComplexVector}
 * @return {ComplexVector} 
 */
function entrywisemulComplexVectors(a, b) {
	const n = a.length;
	var z = new ComplexVector(n);
	for ( var i=0; i< n; i++) {
		z.re[i] = a.re[i] * b.re[i] - a.im[i] * b.im[i];
		z.im[i] = a.im[i] * b.re[i] + a.re[i] * b.im[i];
	}
	return z;
}
/**
 * @param {ComplexVector}
 * @param {ComplexVector}
 * @return {ComplexVector} 
 */
function entrywisedivComplexVectors(a, b) {
	const n = a.length;
	var z = new ComplexVector(n);
	for ( var i=0; i< n; i++) {
		var bre = b.re[i];
		var bim = b.im[i]; 
		var denom = bre*bre + bim*bim;
		z.re[i] = (a.re[i]*bre + a.im[i]*bim) / denom;
		z.im[i] = (a.im[i]*bre - a.re[i]*bim) / denom;		
	}
	return z;
}
/**
 * @param {ComplexMatrix}
 * @param {ComplexMatrix}
 * @return {ComplexMatrix} 
 */
function entrywisemulComplexMatrices(a, b) {
	const n = a.m * a.n;
	var z = new ComplexMatrix(a.m, a.n);
	for ( var i=0; i< n; i++) {
		z.re[i] = a.re[i] * b.re[i] - a.im[i] * b.im[i];
		z.im[i] = a.im[i] * b.re[i] + a.re[i] * b.im[i];
	}
	return z;
}
/**
 * @param {ComplexMatrix}
 * @param {ComplexMatrix}
 * @return {ComplexMatrix} 
 */
function entrywisedivComplexMatrices(a, b) {
	const n = a.m * a.n;
	var z = new ComplexMatrix(a.m, a.n);
	for ( var i=0; i< n; i++) {
		var bre = b.re[i];
		var bim = b.im[i]; 
		var denom = bre*bre + bim*bim;
		z.re[i] = (a.re[i]*bre + a.im[i]*bim) / denom;
		z.im[i] = (a.im[i]*bre - a.re[i]*bim) / denom;		
	}
	return z;
}

/**
 * @param {ComplexVector}
 * @param {Float64Array}
 * @return {ComplexVector} 
 */
function entrywisemulComplexVectorVector(a, b) {
	const n = a.length;
	var z = new ComplexVector(n);
	for ( var i=0; i< n; i++) {
		z.re[i] = a.re[i] * b[i];
		z.im[i] = a.im[i] * b[i];
	}
	return z;
}
/**
 * @param {ComplexMatrix}
 * @param {Matrix}
 * @return {ComplexMatrix} 
 */
function entrywisemulComplexMatrixMatrix(a, b) {
	const n = a.m * a.n;
	var z = new ComplexMatrix(a.m, a.n);
	for ( var i=0; i< n; i++) {
		z.re[i] = a.re[i] * b.val[i];
		z.im[i] = a.im[i] * b.val[i];
	}
	return z;
}

/**
 * @param {ComplexVector}
 * @return {ComplexVector} 
 */
function minusComplexVector(a) {
	const n = a.length;
	var z = new ComplexVector(n);
	for ( var i=0; i< n; i++) {
		z.re[i] = -a.re[i];
		z.im[i] = -a.im[i];
	}
	return z;
}
/**
 * @param {ComplexMatrix}
 * @return {ComplexMatrix} 
 */
function minusComplexMatrix(a) {
	var z = new ComplexMatrix(a.m, a.n);
	const n = a.m * a.n;
	for ( var i=0; i< n; i++) {
		z.re[i] = -a.re[i];
		z.im[i] = -a.im[i];
	}
	return z;
}
/**
 * @param {ComplexVector}
 * @return {number} 
 */
function sumComplexVector(a) {
	var z = new Complex();
	const n = a.length;
	for ( var i=0; i< n; i++) {
		z.re += a.re[i];
		z.im += a.im[i];
	}
	return z;
}
/**
 * @param {ComplexMatrix}
 * @return {number} 
 */
function sumComplexMatrix(a) {
	var z = new Complex();
	const n = a.m * a.n;
	for ( var i=0; i< n; i++) {
		z.re += a.re[i];
		z.im += a.im[i];
	}
	return z;
}
/**
 * @param {ComplexVector}
 * @return {number} 
 */
function norm1ComplexVector(a) {
	var r = 0.0;
	const n = a.length;
	for ( var i=0; i< n; i++) {
		r += Math.sqrt(a.re[i] * a.re[i] + a.im[i]*a.im[i]);		
	}
	return r;
}
/**
 * @param {ComplexVector}
 * @return {number} 
 */
function norm2ComplexVector(a) {
	var r = 0.0;
	const n = a.length;
	for ( var i=0; i< n; i++) {
		r += a.re[i] * a.re[i] + a.im[i]*a.im[i];
	}
	return Math.sqrt(r);
}
/**
 * @param {ComplexMatrix}
 * @return {number} 
 */
function normFroComplexMatrix(a) {
	var r = 0.0;
	const n = a.m * a.n;
	for ( var i=0; i< n; i++) {
		r += a.re[i] * a.re[i] + a.im[i]*a.im[i];
	}
	return Math.sqrt(r);
}
/**
 * @param {ComplexVector}
 * @param {ComplexVector}
 * @return {Complex} 
 */
function dotComplexVectors(a, b) {
	// = b^H a = conj(b)^T a
	var z = new Complex(); 
	const n = a.length;
	for ( var i=0; i< n; i++) {
		z.re += a.re[i] * b.re[i] + a.im[i] * b.im[i];
		z.im += a.im[i] * b.re[i] - a.re[i] * b.im[i]
	}
	return z;
}
/**
 * @param {ComplexVector}
 * @param {Float64Array}
 * @return {Complex} 
 */
function dotComplexVectorVector(a, b) {
	// = b^T a
	var z = new Complex(); 
	const n = a.length;
	for ( var i=0; i< n; i++) {
		z.re += a.re[i] * b[i];
		z.im += a.im[i] * b[i];
	}
	return z;
}
/**
 * @param {number}
 * @param {ComplexVector}
 * @return {ComplexVector} 
 */
function mulScalarComplexVector(a, b) {
	var re = mulScalarVector(a, b.re);
	var im = mulScalarVector(a, b.im);
	return new ComplexVector(re,im, true);
}
/**
 * @param {Complex}
 * @param {ComplexVector}
 * @return {ComplexVector} 
 */
function mulComplexComplexVector(a, b) {
	const n = b.length;
	var z = new ComplexVector(n);
	var are = a.re;
	var aim = a.im; 
	for ( var i=0; i< n; i++) {
		z.re[i] = are * b.re[i] - aim * b.im[i];
		z.im[i] = aim * b.re[i] + are * b.im[i];
	}
	return z;
}
/**
 * @param {Complex}
 * @param {Float64Array}
 * @return {ComplexVector} 
 */
function mulComplexVector(a, b) {
	const n = b.length;
	var z = new ComplexVector(n);
	var are = a.re;
	var aim = a.im; 
	for ( var i=0; i< n; i++) {
		z.re[i] = are * b[i];
		z.im[i] = aim * b[i];
	}
	return z;
}
/**
 * @param {number}
 * @param {ComplexMatrix}
 * @return {ComplexMatrix} 
 */
function mulScalarComplexMatrix(a, b) {
	var re = mulScalarVector(a, b.re);
	var im = mulScalarVector(a, b.im);
	return new ComplexMatrix(b.m, b.n, re, im);
}
/**
 * @param {Complex}
 * @param {ComplexMatrix}
 * @return {ComplexMatrix} 
 */
function mulComplexComplexMatrix(a, b) {
	const n = b.m*b.n;
	var z = new ComplexMatrix(b.m,b.n);
	var are = a.re;
	var aim = a.im; 
	for ( var i=0; i< n; i++) {
		z.re[i] = are * b.re[i] - aim * b.im[i];
		z.im[i] = aim * b.re[i] + are * b.im[i];
	}
	return z;
}
/**
 * @param {Complex}
 * @param {Matrix}
 * @return {ComplexMatrix} 
 */
function mulComplexMatrix(a, b) {
	const n = b.m * b.n;
	var z = new ComplexMatrix(b.m, b.n);
	var are = a.re;
	var aim = a.im; 
	for ( var i=0; i< n; i++) {
		z.re[i] = are * b.val[i];
		z.im[i] = aim * b.val[i];
	}
	return z;
}
/**
 * @param {ComplexMatrix}
 * @param {Float64Array}
 * @return {ComplexVector} 
 */
function mulComplexMatrixVector(a, b) {
	const m = a.m;
	const n = a.n;
	var z = new ComplexVector(m); 
	var ai = 0;
	for ( var i=0; i< m; i++) {
		for ( j=0; j < n ; j++) {
			z.re[i] += a.re[ai+j] * b[j];
			z.im[i] += a.im[ai+j] * b[j];
		}
		ai += n;
	}
	return z;
}
/**
 * @param {ComplexMatrix}
 * @param {ComplexVector}
 * @return {ComplexVector} 
 */
function mulComplexMatrixComplexVector(a, b) {
	const m = a.m;
	const n = a.n;
	var z = new ComplexVector(m); 
	var ai = 0;
	for ( var i=0; i< m; i++) {
		for ( j=0; j < n ; j++) {
			z.re[i] += a.re[ai+j] * b.re[j] - a.im[ai+j] * b.im[j];
			z.im[i] += a.im[ai+j] * b.re[j] + a.re[ai+j] * b.im[j];
		}
		ai += n;
	}
	return z;
}

/**
 * @param {ComplexMatrix}
 * @param {ComplexMatrix}
 * @return {ComplexMatrix} 
 */
function mulComplexMatrices(A, B) {
	const m = A.length;
	const n = B.n;
	const n2 = B.length;
	
	var Are = A.re; 
	var Aim = A.im;
	var Bre = B.re;
	var Bim = B.im;
	
	var Cre = new Float64Array(m*n);
	var Cim = new Float64Array(m*n);	
	var aik;
	var Aik = 0;
	var Ci = 0;
	for (var i=0;i < m ; i++) {		
		var bj = 0;
		for (var k=0; k < n2; k++ ) {
			aikre = Are[Aik];
			aikim = Aim[Aik];
			for (var j =0; j < n; j++) {
				Cre[Ci + j] += aikre * Bre[bj] - aikim * Bim[bj];
				Cim[Ci + j] += aikre * Bim[bj] + aikim * Bre[bj];
				bj++;
			}	
			Aik++;					
		}
		Ci += n;
	}
	return  new ComplexMatrix(m,n,Cre, Cim);
}
/**
 * @param {ComplexMatrix}
 * @param {Matrix}
 * @return {ComplexMatrix} 
 */
function mulComplexMatrixMatrix(A, B) {
	const m = A.m;
	const n = B.n;
	const n2 = B.m;
	
	var Are = A.re; 
	var Aim = A.im;
	var Bre = B.val;
	
	var Cre = new Float64Array(m*n);
	var Cim = new Float64Array(m*n);	
	var aik;
	var Aik = 0;
	var Ci = 0;
	for (var i=0;i < m ; i++) {		
		var bj = 0;
		for (var k=0; k < n2; k++ ) {
			aikre = Are[Aik];
			aikim = Aim[Aik];
			for (var j =0; j < n; j++) {
				Cre[Ci + j] += aikre * Bre[bj];
				Cim[Ci + j] += aikim * Bre[bj];
				bj++;
			}	
			Aik++;					
		}
		Ci += n;
	}
	return  new ComplexMatrix(m,n,Cre, Cim);
}



/**
 * @param {Float64Array|ComplexVector}
 * @return {ComplexVector} 
 */
function fft(x) {
	const n = x.length;
	const s = Math.log2(n);
	const m = n/2;
	
	if ( s % 1 != 0 ) {
		error("fft(x) only implemented for x.length = 2^m. Use dft(x) instead.");
		return undefined;
	}

	var X = new ComplexVector(x,zeros(n));
		
	// bit reversal:	
	var j = 0;
	for (var i = 0; i < n-1 ; i++) {
		if (i < j) {
			// swap(X[i], X[j])
			var Xi = X.re[i];
			X.re[i] = X.re[j];
			X.re[j] = Xi;
			Xi = X.im[i];
			X.im[i] = X.im[j];
			X.im[j] = Xi;
		}
		
		var k = m;
		while (k <= j) {
			j -= k;
			k /= 2;
		}
		j += k;
	}
	
	// FFT:
	var l2 = 1;
	var c = new Complex(-1,0);
	var u = new Complex();
	for (var l = 0; l < s; l++) {
		var l1 = l2;
		l2 *= 2;
		u.re = 1;
		u.im = 0;
      	for (var j = 0; j < l1; j++) {
        	for (var i = j; i < n; i += l2) {
		        var i1 = i + l1;
		        //var t1 = mulComplex(u, X.get(i1) );
		        var t1re = u.re * X.re[i1] - u.im * X.im[i1]; // t1 = u * X[i1]
		        var t1im = u.im * X.re[i1] + u.re * X.im[i1];

		        X.re[i1] = X.re[i] - t1re;
		        X.im[i1] = X.im[i] - t1im;
		        	        
		        X.re[i] += t1re;
		        X.im[i] += t1im;
	        }

			u = mulComplex(u, c);
		}

		c.im = -Math.sqrt((1.0 - c.re) / 2.0);
		c.re = Math.sqrt((1.0 + c.re) / 2.0);
	}
	return X;
}
/**
 * @param {ComplexVector}
 * @return {ComplexVector|Float64Array} 
 */
function ifft(x) {
	const n = x.length;
	const s = Math.log2(n);
	const m = n/2;
	
	if ( s % 1 != 0 ) {
		error("ifft(x) only implemented for x.length = 2^m. Use idft(x) instead.");
		return undefined;
	}
	
	
	var X = new ComplexVector(x,zeros(n));
		
	// bit reversal:	
	var j = 0;
	for (var i = 0; i < n-1 ; i++) {
		if (i < j) {
			// swap(X[i], X[j])
			var Xi = X.re[i];
			X.re[i] = X.re[j];
			X.re[j] = Xi;
			Xi = X.im[i];
			X.im[i] = X.im[j];
			X.im[j] = Xi;
		}
		
		var k = m;
		while (k <= j) {
			j -= k;
			k /= 2;
		}
		j += k;
	}
	
	// iFFT:
	var l2 = 1;
	var c = new Complex(-1,0);
	var u = new Complex();
	for (var l = 0; l < s; l++) {
		var l1 = l2;
		l2 *= 2;
		u.re = 1;
		u.im = 0;
      	for (var j = 0; j < l1; j++) {
        	for (var i = j; i < n; i += l2) {
		        var i1 = i + l1;
		        //var t1 = mulComplex(u, X.get(i1) );
		        var t1re = u.re * X.re[i1] - u.im * X.im[i1]; // t1 = u * X[i1]
		        var t1im = u.im * X.re[i1] + u.re * X.im[i1];

		        X.re[i1] = X.re[i] - t1re;
		        X.im[i1] = X.im[i] - t1im;
		        	        
		        X.re[i] += t1re;
		        X.im[i] += t1im;
	        }

			u = mulComplex(u, c);
		}

		c.im = Math.sqrt((1.0 - c.re) / 2.0);		
		c.re = Math.sqrt((1.0 + c.re) / 2.0);
	}
	var isComplex = false;
	for(var i=0; i < n; i++) {
		X.re[i] /= n;
		X.im[i] /= n;
		if ( Math.abs(X.im[i]) > 1e-6 )
			isComplex = true;
	}
	if (isComplex)
		return X;
	else
		return X.re;
}

function dft(x) {
	// DFT of a real signal
	if ( typeof(x) == "number")
		return new Complex(x, 0); 
	
	const n = x.length;
	if ( n == 1) 
		return new Complex(x[0], 0); 
	else if ( Math.log2(n) % 1 == 0 )
		return fft(x);
	else {
		var X = new ComplexVector(n);
		var thet = 0.0;
		for ( var i=0; i < n; i++) {
			var theta = 0.0;
			for ( var t=0; t < n; t++)  {
				// theta = -2 pi i * t / n;
				X.re[i] += x[t] * Math.cos(theta);
				X.im[i] += x[t] * Math.sin(theta);
				theta += thet; 
			}
			thet -= 2*Math.PI / n;
		}
		return X;
	}
}
function idft(X) {
	// Only recovers real part 
	/*
importScripts("src/experimental/complex.js")
t = 0:512
x = sin(t)
X = dft(x)
plot(modulus(X))
s = idft(X)
plot(s)	
	*/
	if ( !(X instanceof ComplexVector) ) {
		if ( X instanceof Complex)
			return X.re;	
		else if (typeof(X) == "number")
			return X;
		else if ( X instanceof Float64Array)
			return idft(new ComplexVector(X, zeros(X.length), true)); 
		else
			return undefined;
	}
	const n = X.length;
	if ( n == 1) 
		return X.re[0];
	else if ( Math.log2(n) % 1 == 0 )
		return ifft(X);
	else {
		var x = new Float64Array(n);
		var thet = 0.0;
		for ( var t=0; t < n; t++) {
			var theta = 0.0;
			var re = 0.0;
			//var im = 0.0;
			for ( var i=0; i < n; i++)  {
				// theta = 2 pi i * t / n;
				re += X.re[i] * Math.cos(theta) - X.im[i] * Math.sin(theta);
				// im += X[i].im * Math.sin(theta) + X[i].re * Math.cos(theta); // not used for real signals
				theta += thet; 
			}
			x[t] = re / n;
			thet += 2*Math.PI / n;
		}
		return x;
	}
}

function spectrum(x) {
	if ( x instanceof Float64Array ) {
		return absComplex(dft(x));
	}
	else 
		return undefined;
}
/*
	Library for plotting functions 
	
	You need to include 
	
		 <canvas id="plotcanvas" width="600" height="300" style="border: 1px solid black;">>   </canvas> 
		 
	
	Usage:
	
		setScalePlot ( minX, maxX, Nsamples, scaleY)	// scaleY is a factor of scaleX
		
		plot( f [, color_index ] ) 

	To clear the plot: 
		clearPlot();
*/


//////////////////////////////
// Cross-browsers compatibility:
/*
	Chrome : turn off hardware acceleration to get mousemove events!
*/

/* Array.fill : 
if (!Array.prototype.fill) {
  Array.prototype.fill = function(value) {
  	if (this == null) {
      throw new TypeError("this is null or not defined");
    }
    if ( typeof( value ) == "object") 
    	throw new TypeError("Array.fill:: the value is not valid => only simple values allowed");
    
    
    var O = Object(this);
    for ( var i= 0; i < this.length; i++) {
    	O[i] = eval(value);
    }
    return O;	
  }

}

*/

////////////////////////////
// class Diagram
//
// functions take lengths in % of width and height
/////////////////////////////
function Diagram(canvasId) {
	if(typeof(canvasId) === 'undefined' ) 
		canvasId = "diagram";

	this.canvasId = canvasId; 
		
	this.shapes = new Array();
	this.selectedShape = -1; // for mousemove
	this.selectedShapes = new Array();	// for user
	
	this.mousexprev = -1;
	this.mouseyprev = -1;

	////// Cross browser support ////
	var ctx = document.getElementById(this.canvasId).getContext("2d");
	if ( !ctx.setLineDash ) {
		ctx.setLineDash = function () {};
	}
}

Diagram.prototype.rect = function (x,y,w, h, color, txt, txtcolor, opacity ) {
	if(typeof(opacity) === 'undefined')
		var opacity = 0.6;
	if(typeof(txtcolor) === 'undefined')
		var txtcolor = 0;
	if(typeof(txt) === 'undefined')
		var txt = "";
	if(typeof(color) === 'undefined')
		var color = 1;
	
	
	this.shapes.push( ["rect",  x, y, w, h, color, txt, txtcolor, opacity  ] ) ;
	
	this.redraw();
}
Diagram.prototype.circle = function (x,y,w, h, color, txt, txtcolor, opacity ) {
	if(typeof(opacity) === 'undefined')
		var opacity = 0.6;
	if(typeof(txtcolor) === 'undefined')
		var txtcolor = 0;
	if(typeof(txt) === 'undefined')
		var txt = "";
	if(typeof(color) === 'undefined')
		var color = 1;
	
	
	this.shapes.push( ["circle",  x, y, w, h, color, txt, txtcolor, opacity  ] ) ;
	
	this.redraw();
}
Diagram.prototype.image = function (x,y,w, h, imagename , txt, txtcolor, opacity) {
	if(typeof(opacity) === 'undefined')
		var opacity = 0.6;
	if(typeof(txtcolor) === 'undefined')
		var txtcolor = 0;
	if(typeof(txt) === 'undefined')
		var txt = "";
	
	var t = this;
	var imageIndex = this.shapes.length;
	var image = new Image() ;
	image.src = imagename;	
	image.onload = function() {		
		t.shapes[imageIndex][9] = true;
		t.redraw(); 
	}
 
	this.shapes.push( ["image", x,y,w,h,image, txt, txtcolor, opacity, false ] ); 
}

Diagram.prototype.redraw = function () {
	var canvas = document.getElementById(this.canvasId);
	var ctx = canvas.getContext("2d");
	ctx.clearRect(0,0,canvas.width, canvas.height);
	
	var n;
	var shape;
	var x;
	var y;
	var w;
	var h;
	var color;
	var txt;
	var txtcolor;
	var opacity;
	var res;
	
	// Draw shapes
	for ( n = 0; n < this.shapes.length; n++) {
		shape = this.shapes[n][0];
		x = this.shapes[n][1];
		y = this.shapes[n][2];
		w = this.shapes[n][3];
		h = this.shapes[n][4];
		color = this.shapes[n][5];
		txt = this.shapes[n][6];
		txtcolor = this.shapes[n][7];
		opacity = this.shapes[n][8];
		
		if ( shape == "rect" ) {

			setcolortransparent(ctx, color, opacity);
		
			
			var cornerSize = 15;
			ctx.beginPath();
			ctx.moveTo ( x * canvas.width , y * canvas.height + cornerSize);
			ctx.quadraticCurveTo( x * canvas.width, y * canvas.height, x * canvas.width + cornerSize, y * canvas.height );
			// quadraticCurve = bezier curve ( control poitn, destination)
			ctx.lineTo ( (x+w) * canvas.width - cornerSize, y * canvas.height);
			ctx.quadraticCurveTo( (x+w) * canvas.width , y * canvas.height, (x+w) * canvas.width, y * canvas.height + cornerSize);
			ctx.lineTo ( (x+w) * canvas.width , (y+h) * canvas.height - cornerSize);
			ctx.quadraticCurveTo( (x+w) * canvas.width, (y+h) * canvas.height, (x+w) * canvas.width - cornerSize, (y+h) * canvas.height );
			ctx.lineTo ( x * canvas.width + cornerSize , (y+h) * canvas.height);
			ctx.quadraticCurveTo( x * canvas.width, (y+h) * canvas.height, x * canvas.width , (y+h) * canvas.height - cornerSize );

			ctx.closePath();
			ctx.fill();
			
			//ctx.fillRect( x * canvas.width, y * canvas.height, w * canvas.width, h * canvas.height ) ;
	
			
			// deal with selection
			if ( n == this.selectedShape  || this.selectedShapes.indexOf( n ) >= 0 ) {
				setcolortransparent(ctx, 5, 0.3);
				ctx.fillRect( (x-0.005) * canvas.width, (y-0.005) * canvas.height, (w+0.01) * canvas.width, (h+0.01) * canvas.height ) ;
			}
	
		}
		else if ( shape == "circle" ) {
			setcolortransparent(ctx, color, opacity);
		
			ctx.beginPath();
			ctx.moveTo ( (x+w/2) * canvas.width , y * canvas.height);
			ctx.quadraticCurveTo( (x+w) * canvas.width, y * canvas.height, (x+w) * canvas.width, (y+h/2) * canvas.height );
			ctx.quadraticCurveTo( (x+w) * canvas.width, (y+h) * canvas.height, (x+w/2) * canvas.width, (y+h) * canvas.height );
			ctx.quadraticCurveTo( x * canvas.width, (y+h) * canvas.height, x * canvas.width, (y+h/2) * canvas.height );
			ctx.quadraticCurveTo( x * canvas.width, y * canvas.height, (x+w/2) * canvas.width, y * canvas.height );
			
			ctx.fill();
			
			// deal with selection
			if ( n == this.selectedShape  || this.selectedShapes.indexOf( n ) >= 0 ) {
				setcolortransparent(ctx, 5, 0.3);
				ctx.fillRect( (x-0.005) * canvas.width, (y-0.005) * canvas.height, (w+0.01) * canvas.width, (h+0.01) * canvas.height ) ;
			}
			
		}
				else if ( shape == "point" ) {
			setcolortransparent(ctx, color, opacity);
		
			ctx.beginPath();
			ctx.arc(x * canvas.width , y * canvas.height , w * canvas.width, 0, 2 * Math.PI , true);
			ctx.closePath();
				
			ctx.fill();
			
			// deal with selection
			if ( n == this.selectedShape  || this.selectedShapes.indexOf( n ) >= 0 ) {
				setcolortransparent(ctx, 5, 0.3);
				ctx.fillRect( (x-0.005) * canvas.width, (y-0.005) * canvas.height, (w+0.01) * canvas.width, (h+0.01) * canvas.height ) ;
			}
			
		}
		else if ( shape == "label" ) {
			setcolortransparent(ctx, color, opacity);
			var lbl = document.getElementById(this.shapes[n][9]);
			lbl.style.left = x * canvas.width;
			lbl.style.top = y * canvas.height;
			lbl.style.visibility = "visible"; 
			
		}
		else if ( shape == "arrow" ) {
			setcolortransparent(ctx, color, opacity);
					
			var arrowSize = 15;
			
			ctx.save();
			ctx.translate(x * canvas.width , y * canvas.height);
			ctx.rotate(Math.PI * (this.shapes[n][9] / 180) );
			
			ctx.beginPath();
			ctx.moveTo ( 0,0);
			ctx.lineTo ( (w) * canvas.width,0);
			ctx.lineTo ( (w) * canvas.width, 0 - arrowSize*0.3);
			ctx.lineTo ( (w) * canvas.width + arrowSize, ( h/2) * canvas.height);
			ctx.lineTo ( (w) * canvas.width, (h) * canvas.height + arrowSize*0.3);			
			ctx.lineTo ( (w) * canvas.width , (h) * canvas.height);
			ctx.lineTo ( 0 , (h) * canvas.height);
			
			ctx.closePath();
			ctx.fill();
			
			ctx.restore();
			
		}
		else if ( shape == "image" ) {
			if ( this.shapes[n][9] ) {
				// iamge is ready
				ctx.drawImage(this.shapes[n][5], x*canvas.width, y*canvas.height, w * canvas.width, h * canvas.height);			
				// deal with selection
				if ( n == this.selectedShape || this.selectedShapes.indexOf( n ) >= 0 ) {
					setcolortransparent(ctx, 3, 0.3);
					ctx.fillRect( (x-0.005) * canvas.width, (y-0.005) * canvas.height, (w+0.01) * canvas.width, (h+0.01) * canvas.height ) ;
				}
			}
		}
		 
		if( txt != "" ) { 
			var words = txt.split("*");
			ctx.textAlign = "center";	// center of text appear at x position
			var txtsize = Math.floor(50 * w) ;
			ctx.font = txtsize + "pt sans-serif";
			setcolor(ctx, txtcolor);
		
			if ( words.length == 1 ) {
				ctx.fillText( txt, (x + w/2) * canvas.width , (y + h/2) * canvas.height ) ;
			}
			else { 
				for (var i = 0; i< words.length; i++) {
					ctx.fillText( words[i], (x + w/2) * canvas.width , (y + h/2 ) * canvas.height - (words.length/2 - i - 0.5)* (1.5 * txtsize)) ;
				}
			}
		}
		
	}
	
}

Diagram.prototype.mouseselect = function (event) {
	var canvas= document.getElementById(this.canvasId);
	var rect = canvas.getBoundingClientRect();
	var x = event.clientX - rect.left;	// mouse coordinates relative to plot
	var y = event.clientY - rect.top;
	
	if ( Math.abs(x - this.mousexprev) >= 1 || Math.abs(y - this.mouseyprev) >= 1 ) {
		this.mousexprev = x;
		this.mouseyprev = y;
		
		// Find shape... starting from last one added which is on top of others...
		var i = this.shapes.length - 1;
		while ( i >= 0 && this.isInShape(x,y,this.shapes[i] ) == false )
			i--;
	
		if ( i >= 0 ) {
			if ( i != this.selectedShape ) {	
				// new hit on shape i 
				this.selectedShape = i;
				this.redraw();
		
				this.onSelect();
			}
		}	
		else if ( this.selectedShape >= 0 ) {
			this.onDeselect();
			this.selectedShape = -1;
			this.redraw();
		}
	}
}

Diagram.prototype.isInShape = function (x, y, shape) {
	var canvas = document.getElementById(this.canvasId);
	if(shape[0] == "rect") {
		if ( x > shape[1] * canvas.width && x < ( shape[1] + shape[3] ) * canvas.width && y > shape[2] * canvas.height && y < (shape[2]+shape[4]) * canvas.height)
			return true;
		else 
			return false;
	}
	else if ( shape[0] == "circle" ) {
		if ( x > shape[1] * canvas.width && x < ( shape[1] + shape[3] ) * canvas.width && y > shape[2] * canvas.height && y < (shape[2]+shape[4]) * canvas.height)
			return true;
		else 
			return false;
	}
	else if ( shape[0] == "arrow" ) {
		return false;
	}
	else 
		return false;
}

Diagram.prototype.onSelect = function () {
	// empty selection event handler
}

Diagram.prototype.onDeselect = function () {
	// empty selection event handler
}

Diagram.prototype.select = function ( n ) {
	if ( typeof(n) == "number" ) {
		if ( this.selectedShapes.indexOf( n ) < 0 )  {
			this.selectedShapes.push ( n );	
			this.redraw();
		}
	}
	else {
		for ( var i=0; i < n.length; i++ ) {
			if ( this.selectedShapes.indexOf( n[i] ) < 0 )  {
				this.selectedShapes.push ( n[i] );					
			}
		}
		this.redraw();
	}
}
Diagram.prototype.deselect = function ( n ) {
	if ( typeof(n) == "number" ) {
		var idx = this.selectedShapes.indexOf( n );
		if ( idx >= 0 ) {
			this.selectedShapes.splice ( idx , 1 );	
			this.redraw();
		}
	}
	else {
		var idx;
		for ( var i=0; i < n.length; i++ ) {
			idx = this.selectedShapes.indexOf( n[i] );
			if ( idx >= 0 ) {
				this.selectedShapes.splice ( idx , 1 );	
			}
		}
		this.redraw();
	}
}
Diagram.prototype.selectall = function ( n ) {
	for( var i = 0; i < this.shapes.length; i++)
		this.selectedShapes.push( i);
	this.redraw();
}
Diagram.prototype.deselectall = function ( ) {
	while (this.selectedShapes.length > 0)
		this.selectedShapes.pop();
	this.redraw();
	
}

////////////////////////////
// Define Object class "Plot" to be assigned to a canvas
/////////////////////////////
function Plot(canvasId) {
	if(typeof(canvasId) === 'undefined' ) 
		canvasId = "plotcanvas";

	this.canvasId = canvasId; 
		
	this.minX = 0;
	this.maxX = 10;
	this.Nsamples = 1000;
	this.scaleX = 1;
	this.scaleY = 1;
	this.minY = 0;
	this.maxY = 1.5;	
	 
	this.fcts = new Array();
	this.lines= new Array();
	this.areas= new Array();
	this.points= new Array(); 	
	this.paths= new Array();

	this.legend = "topright";

	var canvas = document.getElementById(this.canvasId);
	this.buffer = document.createElement('canvas');
	this.buffer.width  = canvas.width;
	this.buffer.height = canvas.height;
	
	this.viewX = 0;
	this.viewY = 0;
	
	////// Cross browser support ////
	//var ctx = document.getElementById(this.canvasId).getContext("2d");
	var ctx = this.buffer.getContext("2d");
	if ( !ctx.setLineDash ) {
		ctx.setLineDash = function () {};
	}
}


Plot.prototype.addPoint = function(x,y,color_idx,radius, opacity) {
	if(typeof(color_idx) === 'undefined')
		color_idx = 0;
	if(typeof(radius) === 'undefined')
		radius = 5;
	if(typeof(opacity) === 'undefined')
		opacity = 1.1;
		
	this.points.push([x,y,color_idx,radius,opacity] );
}

Plot.prototype.plotAxis = function() {
	//var canvas = document.getElementById(this.canvasId);
	var canvas = this.buffer; 
  if (canvas.getContext) {
	var ctx = canvas.getContext("2d");
	ctx.fillStyle="white";
	ctx.fillRect (0,0 , canvas.width, canvas.height);
	ctx.strokeStyle = "black";			
	
	if (this.minY < 0 && this.maxY > 0) {
		// X-axis		
		var y0 = canvas.height - (-this.minY * this.scaleY);
		ctx.beginPath();
		ctx.moveTo(0, y0);
		ctx.lineTo(canvas.width, y0 );
		ctx.closePath();
		ctx.stroke();
		
		// ticks		 
		var tickspace = Math.ceil( (this.maxX - this.minX) / 10);
		for (var x = -tickspace; x>this.minX; x -= tickspace ) {
			var xx = (x - this.minX) * this.scaleX ;
			ctx.beginPath();
			ctx.moveTo(xx,y0 - 5 );
			ctx.lineTo(xx, y0 + 5 );
			ctx.stroke();		
		}
		for (var x = tickspace; x < this.maxX ; x+=tickspace ) {		
			var xx = (x - this.minX) * this.scaleX ;
			ctx.beginPath();
			ctx.moveTo(xx,y0 - 5 );
			ctx.lineTo(xx, y0 + 5 );
			ctx.stroke();		
		}
	}
	
	if (this.minX < 0 && this.maxX > 0) {
		// Y-axis
		var x0 = -this.minX * this.scaleX;
		ctx.beginPath();
		ctx.moveTo(x0 ,0);
		ctx.lineTo(x0 ,canvas.height);
		ctx.closePath();
		ctx.stroke();
		
		// ticks		 
		var tickspace = Math.ceil( (this.maxY - this.minY) / 10);
		for (var y = -tickspace; y>this.minY; y -= tickspace ) {
			var yy = (y - this.minY) * this.scaleY ;
			ctx.beginPath();
			ctx.moveTo(x0 -5 ,canvas.height-yy );
			ctx.lineTo(x0 + 5, canvas.height-yy );
			ctx.stroke();		
		}
		for (var y = tickspace; y<this.maxY; y += tickspace ) {
			var yy = (y - this.minY) * this.scaleY ;
			ctx.beginPath();
			ctx.moveTo(x0 -5 , canvas.height-yy );
			ctx.lineTo(x0 + 5, canvas.height- yy );
			ctx.stroke();	
		}		
	}
  }
}


Plot.prototype.replot = function (  ) {
	
	var x1;
	var x2;
	var y1;
	var y2;
	var opacity;
	var radius;
	var x;
	var y;
	
	var f;
	var legend;
	var color_idx;
	var dashed;
	var fillareaTo;
	var nlegend = 0;
	var res;

	var canvas = this.buffer;  
//	var canvas=document.getElementById(this.canvasId);
	if (canvas.getContext) {
		var ctx = canvas.getContext("2d");
		
		this.plotAxis();
		
		// use shadow but not on axis
		ctx.shadowColor = '#999';
      	ctx.shadowBlur = 3;
      	ctx.shadowOffsetX = 3;
      	ctx.shadowOffsetY = 3;
      
		
		const minX = this.minX;
		const minY = this.minY;		
		const scaleX = this.scaleX;
		const scaleY = this.scaleY;
		const height = canvas.height;
		
		var xplot = function (x) {
			return (x-minX ) * scaleX ;
		}
		var yplot = function (y) {
			return height - (y-minY)*scaleY ;
		}


	
		// Plot areas
		for (var n=0; n < this.areas.length; n++)	{
			res = this.areas[n];
			x1 = res[0];
			y1 = res[1];
			x2 = res[2];
			y2 = res[3];
			color_idx = res[4];
			opacity = res[5];
		
			if(color_idx == -1) {
				color_idx = n+1;
			}
			setcolortransparent(ctx, color_idx, opacity);
			var rectwidth = Math.abs(x2-x1);
			var rectheight = Math.abs(y2 -y1);
			var rectx = Math.min(x1,x2);
			var recty = Math.max(y1,y2);
			ctx.fillRect(( rectx-this.minX ) * this.scaleX , canvas.height - ( recty - this.minY) * this.scaleY , rectwidth * this.scaleX ,  rectheight * this.scaleY );

		}

		// Plot lines
		ctx.lineWidth="3";
		var cp = Infinity;
		for (var n=0; n < this.lines.length; n++)	{
			res = this.lines[n];
			
			if ( ( res[0] >= this.minX && res[0] <= this.maxX && res[1] >= this.minY && res[1] <= this.maxY ) //start in plot
				|| (( res[2] >= this.minX && res[2] <= this.maxX && res[3] >= this.minY && res[3] <= this.maxY ))  // end in plot
				|| ( res[0] < this.minX && res[2] > this.maxX && ((res[1] >= this.minY && res[1] <= this.maxY) || (res[3] >= this.minY && res[3] <= this.maxY))  )	// overflow on x axis but y inside plot
				|| ( res[2] < this.minX && 0 > this.maxX && ((res[1] >= this.minY && res[1] <= this.maxY) || (res[3] >= this.minY && res[3] <= this.maxY))  )	
				|| ( res[1] < this.minY && res[3] > this.maxY && ((res[0] >= this.minX && res[0] <= this.maxY) || (res[2] >= this.minX && res[2] <= this.maxX))  )// y-axis	
				|| ( res[3] < this.minY && res[1] > this.maxY && ((res[0] >= this.minX && res[0] <= this.maxX) || (res[2] >= this.minX && res[2] <= this.maxX))  )			
				) {
			
				x1 = xplot(res[0]);
				y1 = yplot(res[1]);
				x2 = xplot(res[2]);
				y2 = yplot(res[3]);

				if ( Math.abs(x2-x1)>1 || Math.abs(y2-y1) > 1 )  {
					color_idx = res[4];
					dashed = res[5];
	
					if(color_idx == -1) {
						color_idx = n+1;
					}
					
					if ( color_idx != cp )
						setcolor(ctx, color_idx);
		
					if (dashed) {
						ctx.setLineDash([5]);
						ctx.lineWidth="1";
					}
					
					ctx.beginPath();		
					ctx.moveTo(x1 , y1);
					ctx.lineTo(x2 ,y2);
					ctx.stroke();
					
					if (dashed) {
						ctx.setLineDash([1, 0]);
						ctx.lineWidth="3";
					}
					
					cp = color_idx;
				}
			}
		}	
		ctx.lineWidth="1";
		
		// Plot points 
		var xp = Infinity;
		var yp = Infinity;
		var cp = Infinity;
		var op = -1;
		for (var n=0; n < this.points.length; n++)	{
			res = this.points[n];
			
			if ( res[0] >= this.minX && res[0] <= this.maxX && res[1] >= this.minY && res[1] <= this.maxY) {
				
				x = xplot(res[0]);
				y = yplot(res[1]);
				if ( Math.abs(x-xp)>1 || Math.abs(y-yp) > 1  ) {
					color_idx = res[2];
					radius = res[3];
					opacity = res[4];
	
					if ( op != opacity || cp != color_idx) {
						if ( opacity > 1.0 ) 
							setcolor(ctx, color_idx);
						else 	
							setcolortransparent(ctx, color_idx, opacity);
					}
					
					ctx.beginPath();
					ctx.arc( x , y , radius, 0, 2 * Math.PI , true);
					ctx.closePath();
					ctx.fill();
				
					xp = x;
					yp = y;
					cp = color_idx;
					op = opacity;
				}
			}
		}
	
		// Plot paths (sets of point-lines with all the same style, e.g.,  for lalolab functions)
		for (var n=0; n < this.paths.length; n++) {
			res = this.paths[n];
			color_idx = res[1];
			radius = res[2];
			opacity = res[3];
			dashed = res[4];
			var marker = (opacity > 0 );
			if ( opacity > 1.0 ) 
				setcolor(ctx, color_idx);
			else 	
				setcolortransparent(ctx, color_idx, opacity);
		
			if (dashed) {
				ctx.setLineDash([5]);
				ctx.lineWidth="1";
			}
			else{
				ctx.lineWidth="3";
			}
			ctx.beginPath();

			x = xplot(res[0][0][0]);
			y = yplot(res[0][0][1]);

			ctx.arc( x , y , radius, 0, 2 * Math.PI , true);	
			ctx.moveTo(x,y);				

			for ( var i=1; i < res[0].length; i++) {
				x = xplot(res[0][i][0]);
				y = yplot(res[0][i][1]);
		
				if ( x >= 0 && x <= canvas.width && y >= 0 && y <= canvas.height ) {
					if( marker )
						ctx.arc( x , y , radius, 0, 2 * Math.PI , true);	
					ctx.lineTo(x,y);				
				}
			}
			//ctx.closePath();
			ctx.stroke();
			//ctx.fill();
			
			ctx.setLineDash([1, 0]);
			ctx.lineWidth="1";
		}
		
			// Plot functions
		for(var n=0; n < this.fcts.length; n++)	{

			res = this.fcts[n];
			f = res[0];
			legend = res[1];
			color_idx = res[2];
			dashed = res[3];
			fillareaTo = res[4];
		
	
			if(color_idx == -1) {
				color_idx = n+1;
			}
		
			setcolor(ctx, color_idx);

			if (dashed) {
				ctx.setLineDash([5]);
				ctx.lineWidth="1";
			}
			else{
				ctx.lineWidth="3";
			}
	

		
			if ( fillareaTo !== false ) {
				ctx.beginPath();
				ctx.moveTo(canvas.width, canvas.height - (fillareaTo  - this.minY)* this.scaleY);
				ctx.lineTo(0, canvas.height - (fillareaTo  - this.minY)* this.scaleY );
				//ctx.moveTo(0,canvas.height/2);
			}
			else {
				ctx.moveTo(0,canvas.height/2);		
				ctx.beginPath();
			}

			for(var x=this.minX; x < this.maxX; x += (this.maxX-this.minX) / this.Nsamples ) {
				var y = f(x);
				var yp = canvas.height - ( y - this.minY) * this.scaleY ;
				if (yp >= 0 && yp <= canvas.height) 
					ctx.lineTo(xplot(x) , yp );
				else
					ctx.moveTo(xplot(x) , yp);
	
			}
			ctx.stroke();
			if ( fillareaTo !== false ) {
				ctx.closePath();
				setcolortransparent(ctx, color_idx, 0.5); 
				ctx.fill();
			}
			ctx.setLineDash([1, 0]);
			ctx.lineWidth="1";
		
			// Add legend: 
			if ( this.legend != "" && legend != "") {
				setcolor(ctx, color_idx); 
				if ( this.legend == "topright") 
					ctx.strokeText(legend, canvas.width - 100, 20*(nlegend+1));
				else if ( this.legend == "topleft") 
					ctx.strokeText(legend, 10, 20*(nlegend+1));
				else if ( this.legend == "bottomright") 
					ctx.strokeText(legend, canvas.width - 100, canvas.height - 20*(nlegend+1));
				else if ( this.legend == "bottomleft") 
					ctx.strokeText(legend,10, canvas.height - 20*(nlegend+1));
			
				nlegend++;
			}

		}
	}
	
	// Copy buffer to viewport
	var viewcanvas = document.getElementById(this.canvasId);
	var ctx = viewcanvas.getContext("2d");
	ctx.drawImage(this.buffer, this.viewX, this.viewY, viewcanvas.width,viewcanvas.height,0,0, viewcanvas.width,viewcanvas.height);
}


Plot.prototype.plot = function ( f, legend, color_idx, dashed , fillareaTo ) {
	if (typeof(fillareaTo) === 'undefined')
		fillareaTo = false;
 
	if (typeof(dashed) === 'undefined')
		dashed = false; 
	if (typeof(color_idx) === 'undefined')
		color_idx = -1; 
	if (typeof(legend) === 'undefined') {
		if (dashed)
			legend = "";
		else
			legend = f.name; 
	}
	this.fcts.push([f, legend, color_idx,dashed, fillareaTo]);
	this.replot();
}


Plot.prototype.plot_line = function ( x1,y1,x2,y2, color_idx, dashed  ) {
	if (typeof(dashed) === 'undefined')
		dashed = false; 
	if (typeof(color_idx) === 'undefined')
		color_idx = -1; 
	this.lines.push([x1,y1,x2,y2, color_idx,dashed]);
	//this.replot();
}
Plot.prototype.plot_area = function ( x1,y1,x2,y2, color_idx, opacity  ) {
	if (typeof(opacity) === 'undefined')
		opacity = 1.0; 
	if (typeof(color_idx) === 'undefined')
		color_idx = -1; 
	this.areas.push([x1,y1,x2,y2, color_idx,opacity]);
	this.replot();
}
Plot.prototype.plot_path = function ( x,y, color_idx, radius, opacity, dashed  ) {
	if (typeof(dashed) === 'undefined')
		var dashed = false; 
	if (typeof(color_idx) === 'undefined')
		var color_idx = -1; 
	if (typeof(opacity) === 'undefined')
		var opacity = 1;
	if (typeof(radius) === 'undefined')
		var radius = 5;
	this.paths.push([x,y, color_idx,radius, opacity, dashed]);
	//this.replot();
}

Plot.prototype.clear = function () {
 var canvas = document.getElementById(this.canvasId);
  if (canvas.getContext) {
	var ctx = canvas.getContext("2d");
	
	this.plotAxis();
	
	// Empty list of functions to plot:
	while(this.fcts.length > 0) {
    	this.fcts.pop();
	}
	
	while(this.lines.length > 0) {
    	this.lines.pop();
	}
	
	while(this.areas.length > 0) {
    	this.areas.pop();
	}
	while(this.points.length > 0) {
    	this.points.pop();
	}
  }
}

Plot.prototype.setScalePlot = function  ( minX, maxX, Nsamples, scaleY) {
	this.minX = minX;
	this.maxX = maxX;
	this.Nsamples = Nsamples;
	
	var canvas = document.getElementById(this.canvasId);
	this.scaleX = canvas.width / (maxX - minX) ; 
	this.scaleY = this.scaleX * scaleY;
		
	this.maxY = (canvas.height/2) / this.scaleY ;
	this.minY = -this.maxY;// centered view 
	
	//this.clear();
	
	this.originalminX = this.minX;
	this.originalmaxX = this.maxX;
	this.originalminY = this.minY;
	this.originalmaxY = this.maxY;	
}

Plot.prototype.view = function  ( minX, maxX, minY, maxY) {
	this.minX = minX;
	this.maxX = maxX;
	this.minY = minY;
	this.maxY = maxY;
	
	var canvas = this.buffer;
	this.scaleX = canvas.width / (maxX - minX) ; 
	this.scaleY = canvas.height / (maxY - minY) ;
	this.replot(); 	
}

Plot.prototype.translate = function  ( dx, dy ) {
	var canvas = document.getElementById(this.canvasId);
	var newX = this.viewX - dx;
	var newY = this.viewY - dy;
	if ( newX >= 0 && newX < this.buffer.width - canvas.width && newY >= 0 && newY < this.buffer.height - canvas.height ) {
	
		this.viewX = newX;
		this.viewY = newY;
	
		var ctx = canvas.getContext("2d");
		ctx.clearRect (0, 0 , canvas.width, canvas.height);
		ctx.drawImage(this.buffer, this.viewX, this.viewY, canvas.width,canvas.height,0,0, canvas.width,canvas.height);
	}
}
Plot.prototype.zoom = function  ( zx, zy, x, y) {
	var viewcanvas = document.getElementById(this.canvasId);
	var canvas = this.buffer;
	
	if ( zy > 0 )
		canvas.height *= zy; 
	else
		canvas.height = viewcanvas.height; 
	if ( zx > 0 )
		canvas.width *= zx;
	else
		canvas.width = viewcanvas.width; 
		
	// do not zoom out further than original 
	if ( canvas.width < viewcanvas.width )
		canvas.width = viewcanvas.width; 
	if( canvas.height < viewcanvas.height )
		canvas.height = viewcanvas.height;

	// do not zoo in too much
	if ( canvas.width > 10000)
		canvas.width = 10000; 
	if( canvas.height > 10000 )
		canvas.height > 10000;
	
	var sx = this.scaleX;
	var sy = this.scaleY;
	this.scaleX = canvas.width / (this.maxX - this.minX) ; 
	this.scaleY = canvas.height / (this.maxY - this.minY) ;

	// zoom center is (x,y)
	if ( arguments.length < 4 ) {
		var x = viewcanvas.width/2;
		var y = viewcanvas.height/2;// by default viewport center is fixed during zoom
	}
	
	this.viewX = ((this.viewX + x) * this.scaleX / sx) - x;
	this.viewY = ((this.viewY + y) * this.scaleY / sy) - y;	
	if ( this.viewX < 0 )
		this.viewX = 0;
	if (this.viewY < 0 )
		this.viewY = 0; 
	if ( this.viewX > canvas.width - viewcanvas.width ) 
		this.viewX =  canvas.width - viewcanvas.width ;
	if ( this.viewY > canvas.height - viewcanvas.height ) 
		this.viewY =  canvas.height - viewcanvas.height ;

	if( sx != this.scaleX || sy != this.scaleY )
		this.replot(); 
}
Plot.prototype.resetzoom = function  ( ) {
	var viewcanvas = document.getElementById(this.canvasId);
	var canvas = this.buffer;
	this.viewX = 0;
	this.viewY = 0;
	canvas.height = viewcanvas.height; 
	canvas.width = viewcanvas.width; 
	this.scaleX = viewcanvas.width / (this.maxX - this.minX) ; 
	this.scaleY = viewcanvas.height / (this.maxY - this.minY) ;
	this.replot(); 	
}

Plot.prototype.pick_point = function(e) {
	if(e.button == 0) {
		e.preventDefault();	
		var canvas = document.getElementById(this.canvasId);
	
		var rect = canvas.getBoundingClientRect();

		var xmouse = e.clientX - rect.left;	// mouse coordinates relative to plot
		var ymouse = e.clientY - rect.top;

		var x = xmouse / this.scaleX + this.minX;
		var y = (canvas.height  - ymouse ) / this.scaleY + this.minY;
		
		return [x,y];
	}
	else 
		return false; // not correct button
}


Plot.prototype.proximityX = function (x, x0, epsilon) {
	if (typeof(epsilon) === 'undefined')
		epsilon = (this.maxX - this.minX) / 20;
		
	return ( Math.abs(x - x0) < epsilon ) ;
}


Plot.prototype.plotmathjax = function(stringindex, x, y) {
			
	var canvas = document.getElementById(this.canvasId);
	if (canvas.getContext) {
		var ctx = canvas.getContext("2d");

		var label = document.getElementById("jaxstring"+stringindex);
		label.style.top = canvas.height/2 - ( y * this.scaleY ) + canvas.offsetTop;
		label.style.left = (x - this.minX) * this.scaleX + canvas.offsetLeft;	
		label.style.visibility = "visible"; 
	}
}
	 
Plot.prototype.jpeg = function() {
	var canvas = document.getElementById(this.canvasId);
	
	var image = canvas.toDataURL("image/jpeg");
	
	document.location.href = image.replace("image/jpeg", "image/octet-stream");
}


Plot.prototype.zoomoriginal = function () {
	this.view(this.originalminX,this.originalmaxX,this.originalminY,this.originalmaxY);	
}

Plot.prototype.mousestartmove = function ( e ) {
	var canvas = document.getElementById(this.canvasId);
	if ( e.button == 0 ) {
		this.MOVING = true;
		var rect = canvas.getBoundingClientRect();
		this.xprev = e.clientX - rect.left;	// mouse coordinates relative to plot
		this.yprev = e.clientY - rect.top;
	}
	else {
		this.MOVING = false;
	}
}
Plot.prototype.mousestopmove = function ( e ) {
	this.MOVING = false;
}
Plot.prototype.mouseposition = function ( e ) {

	var canvas = document.getElementById(this.canvasId);
	var rect = canvas.getBoundingClientRect();

	var xmouse = e.clientX - rect.left;	
	var ymouse = e.clientY - rect.top;

	if ( this.MOVING ) {
		var dx = this.xprev - xmouse ;
		var dy = ymouse - this.yprev;
		if ( Math.abs( dx ) > 1 || Math.abs( dy ) > 1 ) {			
			//this.view(this.minX+dx/this.scaleX,this.maxX+dx/this.scaleX, this.minY+dy/this.scaleY, this.maxY+dy/this.scaleY);
			this.translate(dx, dy);
		}
		this.xprev = xmouse;
		this.yprev = ymouse;		
	}
	else {		
		var x = xmouse / this.scaleX + this.minX;
		var y = (canvas.height  - ymouse ) / this.scaleY + this.minY;	
		return "x = " + x.toFixed(3) + ", y = " + y.toFixed(3);	
	}
}



////////////////////////////
// Define Object class "ColorPlot" for (x,y) plots with z giving the point color
/////////////////////////////
function ColorPlot(canvasId) {
	if(typeof(canvasId) === 'undefined' ) 
		canvasId = "plotcanvas";

	this.canvasId = canvasId; 
		
	this.minX = 0;
	this.maxX = 10;
	this.scaleX = 1;
	this.scaleY = 1;
	this.minY = 0;
	this.maxY = 1.5;	
	this.minZ = 0;
	this.maxZ = 1;
		 
	this.x = new Array();
	this.y= new Array();
	this.z= new Array();
	
	this.cmap = this.colormap();
	
	var canvas = document.getElementById(this.canvasId);
	this.buffer = document.createElement('canvas');
	this.buffer.width  = canvas.width;
	this.buffer.height = canvas.height;
	
	this.viewX = 0;
	this.viewY = 0;

}

ColorPlot.prototype.colormap = function (cmapname) {
	switch(cmapname) {
	
	default:
    var cmap = [
		[0, 0, 143],
		[0, 0, 159],
		[0, 0, 175],
		[0, 0, 191],
		[0, 0, 207],
		[0, 0, 223],
		[0, 0, 239],
		[0, 0, 255],
		[0, 15, 255],
		[0, 31, 255],
		[0, 47, 255],
		[0, 63, 255],
		[0, 79, 255],
		[0, 95, 255],
		[0, 111, 255],
		[0, 127, 255],
		[0, 143, 255],
		[0, 159, 255],
		[0, 175, 255],
		[0, 191, 255],
		[0, 207, 255],
		[0, 223, 255],
		[0, 239, 255],
		[0, 255, 255],
		[15, 255, 239],
		[31, 255, 223],
		[47, 255, 207],
		[63, 255, 191],
		[79, 255, 175],
		[95, 255, 159],
		[111, 255, 143],
		[127, 255, 127],
		[143, 255, 111],
		[159, 255, 95],
		[175, 255, 79],
		[191, 255, 63],
		[207, 255, 47],
		[223, 255, 31],
		[239, 255, 15],
		[255, 255, 0],
		[255, 239, 0],
		[255, 223, 0],
		[255, 207, 0],
		[255, 191, 0],
		[255, 175, 0],
		[255, 159, 0],
		[255, 143, 0],
		[255, 127, 0],
		[255, 111, 0],
		[255, 95, 0],
		[255, 79, 0],
		[255, 63, 0],
		[255, 47, 0],
		[255, 31, 0],
		[255, 15, 0],
		[255, 0, 0],
		[239, 0, 0],
		[223, 0, 0],
		[207, 0, 0],
		[191, 0, 0],
		[175, 0, 0],
		[159, 0, 0],
		[143, 0, 0],
		[127, 0, 0]];
	break;
	}
	return cmap;
}
ColorPlot.prototype.addPoint = function(x,y,z) {
	this.x.push(x);
	this.y.push(y);
	this.z.push(z);
}

ColorPlot.prototype.plotAxis = function() {
	var canvas = this.buffer;	
  if (canvas.getContext) {
	var ctx = canvas.getContext("2d");
	ctx.fillStyle="white";
	ctx.fillRect (0,0 , canvas.width, canvas.height);
	ctx.strokeStyle = "black";			
	
	if (this.minY < 0 && this.maxY > 0) {
		// X-axis		
		var y0 = canvas.height - (-this.minY * this.scaleY);
		ctx.beginPath();
		ctx.moveTo(0, y0);
		ctx.lineTo(canvas.width, y0 );
		ctx.closePath();
		ctx.stroke();
		
		// ticks		
		var tickspace = Math.ceil( (this.maxX - this.minX) / 10);
		for (var x = -tickspace; x>this.minX; x -= tickspace ) {
			var xx = (x - this.minX) * this.scaleX ;
			ctx.beginPath();
			ctx.moveTo(xx,y0 - 5 );
			ctx.lineTo(xx, y0 + 5 );
			ctx.stroke();		
		}
		for (var x = tickspace; x < this.maxX ; x+=tickspace ) {		
			var xx = (x - this.minX) * this.scaleX ;
			ctx.beginPath();
			ctx.moveTo(xx,y0 - 5 );
			ctx.lineTo(xx, y0 + 5 );
			ctx.stroke();		
		}
	}
	
	if (this.minX < 0 && this.maxX > 0) {
		// Y-axis
		var x0 = -this.minX * this.scaleX;
		ctx.beginPath();
		ctx.moveTo(x0 ,0);
		ctx.lineTo(x0 ,canvas.height);
		ctx.closePath();
		ctx.stroke();
		
		// ticks
		for (var y = Math.ceil(this.minY); y < this.maxY; y++ ) {
			var yy = canvas.height - (y -this.minY) * this.scaleY;
			ctx.beginPath();
			ctx.moveTo(x0-5,yy);
			ctx.lineTo(x0+5,yy);
			ctx.stroke();		
		}
	}
  }
}

ColorPlot.prototype.replot = function (  ) {
	var x,y,z;
	var canvas=this.buffer;
	if (canvas.getContext) {
		var ctx = canvas.getContext("2d");

		this.plotAxis();
	  
	  	// use shadow but not on axis
		ctx.shadowColor = '#999';
      	ctx.shadowBlur = 3;
      	ctx.shadowOffsetX = 3;
      	ctx.shadowOffsetY = 3;
      
		// Plot points 
		var xp = Infinity;
		var yp = Infinity;
		var zp = Infinity;		
		for (var i=0; i < this.x.length; i++)	{
	
			if ( this.x[i] >= this.minX && this.x[i] <= this.maxX && this.y[i] >= this.minY && this.y[i] <= this.maxY) {
				
				x = (this.x[i]-this.minX ) * this.scaleX ;
				y =  canvas.height - (this.y[i] - this.minY) * this.scaleY ;
				z = Math.floor( (this.z[i] - this.minZ) * this.scaleZ);
				if ( z >= this.cmap.length )
					z = this.cmap.length-1;
				if ( z < 0)
					z = 0;
				if ( Math.abs(x-xp)>1 || Math.abs(y-yp) > 1 || z != zp ) {

					if ( z != zp )
						ctx.fillStyle = "rgb(" + this.cmap[z][0] + "," + this.cmap[z][1] + "," + this.cmap[z][2]+ ")";			

					ctx.beginPath();
					ctx.arc( x , y , 5, 0, 2 * Math.PI , true);
					ctx.closePath();
					ctx.fill();		
			
					zp = z;		
					xp = x;
					yp = y;
				}
			}
		}
	
	}
	
	// Copy buffer to viewport
	var viewcanvas = document.getElementById(this.canvasId);
	var ctx = viewcanvas.getContext("2d");
	ctx.drawImage(this.buffer, this.viewX, this.viewY, viewcanvas.width,viewcanvas.height,0,0, viewcanvas.width,viewcanvas.height);
}

ColorPlot.prototype.clear = function () {
	this.plotAxis();
	this.x = new Array();
	this.y = new Array();
	this.z = new Array();
}

ColorPlot.prototype.setScale = function  ( minX, maxX, minY, maxY, minZ, maxZ) {
	this.minX = minX;
	this.maxX = maxX;
	this.minY = minY;
	this.maxY = maxY;
	this.minZ = minZ;
	this.maxZ = maxZ;
	
	var canvas = document.getElementById(this.canvasId);
	this.scaleX = canvas.width / (maxX - minX) ; 
	this.scaleY = canvas.height / (maxY - minY);
	this.scaleZ = this.cmap.length / (maxZ - minZ) ;
	
	//this.clear();
	
	this.originalminX = this.minX;
	this.originalmaxX = this.maxX;
	this.originalminY = this.minY;
	this.originalmaxY = this.maxY;	
}

ColorPlot.prototype.view = function  ( minX, maxX, minY, maxY) {
	this.minX = minX;
	this.maxX = maxX;
	this.minY = minY;
	this.maxY = maxY;
	
	var canvas = this.buffer;
	this.scaleX = canvas.width / (maxX - minX) ; 
	this.scaleY = canvas.height / (maxY - minY) ;
	this.replot(); 	
}

ColorPlot.prototype.translate = function  ( dx, dy ) {
	var canvas = document.getElementById(this.canvasId);
	var newX = this.viewX - dx;
	var newY = this.viewY - dy;
	if ( newX >= 0 && newX < this.buffer.width - canvas.width && newY >= 0 && newY < this.buffer.height - canvas.height ) {
	
		this.viewX = newX;
		this.viewY = newY;
	
		var ctx = canvas.getContext("2d");
		ctx.clearRect (0, 0 , canvas.width, canvas.height);
		ctx.drawImage(this.buffer, this.viewX, this.viewY, canvas.width,canvas.height,0,0, canvas.width,canvas.height);
	}
}
ColorPlot.prototype.zoom = function  ( zx, zy, x, y) {
	var viewcanvas = document.getElementById(this.canvasId);
	var canvas = this.buffer;
	
	if ( zy > 0 )
		canvas.height *= zy; 
	else
		canvas.height = viewcanvas.height; 
	if ( zx > 0 )
		canvas.width *= zx;
	else
		canvas.width = viewcanvas.width; 
		
	// do not zoom out further than original 
	if ( canvas.width < viewcanvas.width )
		canvas.width = viewcanvas.width; 
	if( canvas.height < viewcanvas.height )
		canvas.height = viewcanvas.height;

	// do not zoo in too much
	if ( canvas.width > 10000)
		canvas.width = 10000; 
	if( canvas.height > 10000 )
		canvas.height > 10000;
	
	var sx = this.scaleX;
	var sy = this.scaleY;
	this.scaleX = canvas.width / (this.maxX - this.minX) ; 
	this.scaleY = canvas.height / (this.maxY - this.minY) ;

	// zoom center is (x,y)
	if ( arguments.length < 4 ) {
		var x = viewcanvas.width/2;
		var y = viewcanvas.height/2;// by default viewport center is fixed during zoom
	}
	
	this.viewX = ((this.viewX + x) * this.scaleX / sx) - x;
	this.viewY = ((this.viewY + y) * this.scaleY / sy) - y;	
	if ( this.viewX < 0 )
		this.viewX = 0;
	if (this.viewY < 0 )
		this.viewY = 0; 
	if ( this.viewX > canvas.width - viewcanvas.width ) 
		this.viewX =  canvas.width - viewcanvas.width ;
	if ( this.viewY > canvas.height - viewcanvas.height ) 
		this.viewY =  canvas.height - viewcanvas.height ;

	if( sx != this.scaleX || sy != this.scaleY )
		this.replot(); 
}
ColorPlot.prototype.resetzoom = function  ( ) {
	var viewcanvas = document.getElementById(this.canvasId);
	var canvas = this.buffer;
	this.viewX = 0;
	this.viewY = 0;
	canvas.height = viewcanvas.height; 
	canvas.width = viewcanvas.width; 
	this.scaleX = viewcanvas.width / (this.maxX - this.minX) ; 
	this.scaleY = viewcanvas.height / (this.maxY - this.minY) ;
	this.replot(); 	
}

ColorPlot.prototype.jpeg = function() {
	var canvas = document.getElementById(this.canvasId);
	
	var image = canvas.toDataURL("image/jpeg");
	
	document.location.href = image.replace("image/jpeg", "image/octet-stream");
}


ColorPlot.prototype.zoomoriginal = function () {
	this.view(this.originalminX,this.originalmaxX,this.originalminY,this.originalmaxY);	
}

ColorPlot.prototype.mousestartmove = function ( e ) {
	var canvas = document.getElementById(this.canvasId);
	if ( e.button == 0 ) {
		this.MOVING = true;
		var rect = canvas.getBoundingClientRect();
		this.xprev = e.clientX - rect.left;	// mouse coordinates relative to plot
		this.yprev = e.clientY - rect.top;
	}
	else {
		this.MOVING = false;
	}
}
ColorPlot.prototype.mousestopmove = function ( e ) {
	this.MOVING = false;
}
ColorPlot.prototype.mouseposition = function ( e ) {
	var canvas = document.getElementById(this.canvasId);
	var rect = canvas.getBoundingClientRect();

	var xmouse = e.clientX - rect.left;	
	var ymouse = e.clientY - rect.top;

	if ( this.MOVING ) {
		var dx = this.xprev - xmouse ;
		var dy = ymouse - this.yprev;
		if ( Math.abs( dx ) > 1 || Math.abs( dy ) > 1 ) {			
			this.translate(dx,dy);
		}
		this.xprev = xmouse;
		this.yprev = ymouse;		
	}
	else {		
		var x = xmouse / this.scaleX + this.minX;
		var y = (canvas.height  - ymouse ) / this.scaleY + this.minY;	
		return "x = " + x.toFixed(3) + ", y = " + y.toFixed(3);	
	}
}


/////////////////////////////////
// Define Object class "Plot2D"
function Plot2D(canvasId, tableId) {
	
	if(typeof(canvasId) === 'undefined' ) 
		this.canvasId = "plotcanvas2D";
	else
		this.canvasId = canvasId;
		
	if(typeof(tableId) === 'undefined' ) 
		this.tableId = "";	// No data table by default
	else
		this.tableId = tableId;

	this.minX1 = -10;
	this.maxX1 = 10;
	this.minX2 = -10;
	this.maxX2 = 10;
	this.scaleX1 ;
	this.scaleX2 ;
	this.NsamplesX1 = 500;
	this.NsamplesX2 = 500;

	// Training set 2D
	this.Xapp = new Array();
	this.Yapp = new Array();
	this.m = 0;
	
	////// Cross browser support ////
	var ctx = document.getElementById(this.canvasId).getContext("2d");
	if ( !ctx.setLineDash ) {
		ctx.setLineDash = function () {};
	}

}
	 


Plot2D.prototype.clear = function () {
	var canvas = document.getElementById(this.canvasId);
	if (canvas.getContext) {
		var ctx = canvas.getContext("2d");
		
		/* put this into setscale2D : */
		this.scaleX1 = canvas.width / (this.maxX1 - this.minX1); 
		this.scaleX2 = canvas.height / (this.maxX2 - this.minX2);
	
		this.NsamplesX1 = canvas.width / 4;
		this.NsamplesX2 = canvas.height / 4;		
	
		/////
		
		ctx.fillStyle = "white";
		ctx.fillRect (0,0 , canvas.width, canvas.height);

		ctx.strokeStyle = "black";	
		ctx.lineWidth = "1";		
	
		if (this.minX2 < 0 && this.maxX2 > 0) {
	
			// X1-axis
			ctx.beginPath();
			ctx.moveTo(0,canvas.height + this.minX2  * this.scaleX2);
			ctx.lineTo(canvas.width,canvas.height + this.minX2  * this.scaleX2);
			ctx.closePath();
			ctx.stroke();
		}
	
		if (this.minX1 < 0 && this.maxX1 > 0) {
			// X2-axis
			ctx.beginPath();
			ctx.moveTo(( -this.minX1 ) * this.scaleX1 ,0);
			ctx.lineTo(( -this.minX1 ) * this.scaleX1 ,canvas.height);
			ctx.closePath();
			ctx.stroke();
		
		}
	
	}
	
	//this.clearData();
}

Plot2D.prototype.clearData = function () {
	if( this.tableId  != "" )
		document.getElementById(this.tableId).innerHTML = "<tr> <td> x1 </td><td> x2 </td><td> y </td></tr> ";
		
	while(this.Yapp.length > 0) {
		this.Yapp.pop();
		this.Xapp.pop();
	}
	this.m = 0;
}

Plot2D.prototype.levelcurve = function (f, level ) {

	var canvas = document.getElementById(this.canvasId);
	if (canvas.getContext) {
		var ctx = canvas.getContext("2d");
		
		var started = false; 

		ctx.fillStyle = "rgb(0,0,200)";
		ctx.strokeStyle = "rgb(0,0,200)";
		//ctx.lineWidth="3";
		//ctx.beginPath();
		
		var Y = new Array();
		var i = 0;
		var j = 0;
		
		// Compute function values
		for(var x1=this.minX1; x1 < this.maxX1; x1 += (this.maxX1-this.minX1) / this.NsamplesX1 ) {
			Y[i] = new Array(); 
			for(var x2=this.minX2; x2 < this.maxX2; x2 += (this.maxX2-this.minX2) / this.NsamplesX2 ) {
				var x = [x1, x2];
				Y[i][j] =  f(x) ;
				j++;
			}
			i++;
		}			

		// Draw level curve
		var i = 0;
		var j = 0;
		for(var x1=this.minX1; x1 < this.maxX1; x1 += (this.maxX1-this.minX1) / this.NsamplesX1 ) {
			for(var x2=this.minX2; x2 < this.maxX2; x2 += (this.maxX2-this.minX2) / this.NsamplesX2 ) {
		
				if ( ( j > 0 && Y[i][j] >= level && Y[i][j-1] <= level ) 
					|| ( j > 0 && Y[i][j] <= level && Y[i][j-1] >= level )  
					|| ( i > 0 && Y[i][j] <= level && Y[i-1][j] >= level )  
					|| ( i > 0 && Y[i][j] >= level && Y[i-1][j] <= level )  )	{
				
					/*
					if ( !started ){						
						 ctx.moveTo(( x1-this.minX1 ) * this.scaleX1, canvas.height/2 - ( x2 * this.scaleX2 ));
						 started = true;
					}
					else
						ctx.lineTo(( x1-this.minX1 ) * this.scaleX1 , canvas.height/2 - ( x2 * this.scaleX2 ));
					*/
					ctx.fillRect (( x1-this.minX1 ) * this.scaleX1 - 2, canvas.height - ( ( x2 - this.minX2) * this.scaleX2 ) - 2, 4, 4);
					
				}
				j++;
			}
			
			i++;
		}
//		ctx.closePath();
		//ctx.stroke();
	
	}
}


Plot2D.prototype.colormap = function(f) {

	var canvas = document.getElementById(this.canvasId);
	if (canvas.getContext) {
		var ctx = canvas.getContext("2d");
		
		var started = false; 

		var maxf = -Infinity;
		var minf = +Infinity;
		var Y = new Array();
		var i = 0;
		var j = 0;
		
		// Compute function values
		for(var x1=this.minX1; x1 < this.maxX1; x1 += (this.maxX1-this.minX1) / this.NsamplesX1 ) {
			Y[i] = new Array(); 
			for(var x2=this.minX2; x2 < this.maxX2; x2 += (this.maxX2-this.minX2) / this.NsamplesX2 ) {
				var x = [x1, x2];
				Y[i][j] =  f(x) ;
				if(Y[i][j] > maxf ) {
					maxf = Y[i][j];
				}
				if(Y[i][j] < minf ) {
					minf = Y[i][j];
				}
				j++;
			}
			i++;
		}			
		
		
		var colorScale = 255 / (maxf - minf); 

		// Draw colormap
		var i = 0;
		var j = 0;
		for(var x1=this.minX1; x1 < this.maxX1; x1 += (this.maxX1-this.minX1) / this.NsamplesX1 ) {
			for(var x2=this.minX2; x2 < this.maxX2; x2 += (this.maxX2-this.minX2) / this.NsamplesX2 ) {
				if (Math.abs(Y[i][j] ) < 0.00001  ) {
					ctx.fillStyle = "black";
				}
				
				else if (Y[i][j] < 0 ) {
					ctx.fillStyle = "rgba(0,0," + (255 - Math.floor((Y[i][j] - minf) * colorScale )) + ", 0.9)";					
				}
				else {
					//ctx.fillStyle = "rgba(" + Math.floor((Y[i][j] - minf) * colorScale ) + ",0,255,0.5)";
					ctx.fillStyle = "rgba(" + Math.floor((Y[i][j] - minf) * colorScale ) + ",0,0, 0.9)";
				}
				ctx.fillRect (( x1-this.minX1 ) * this.scaleX1 - 2, canvas.height - ( ( x2 - this.minX2) * this.scaleX2 )- 2, 4, 4);		
				//margin
				if (Math.abs(Y[i][j] ) < 1 ) {
					ctx.fillStyle = "rgba(200,200,200,0.5)";
					ctx.fillRect (( x1-this.minX1 ) * this.scaleX1 - 2, canvas.height - ( ( x2 - this.minX2) * this.scaleX2 )- 2, 4, 4);	
				}			
				
				j++;
			}			
			i++;
		}
	
	}
}

Plot2D.prototype.point = function (x1, x2, color_idx, opacity,  radius ) {

	if (typeof(opacity) === 'undefined')
		opacity = 1.1; 
	if (typeof(radius) === 'undefined')
		radius = 5; 
	

	var canvas = document.getElementById(this.canvasId);
	if (canvas.getContext) {
		var ctx = canvas.getContext("2d");
		
		if (opacity < 1.0 ) 
			setcolortransparent(ctx, color_idx, opacity);
		else
			setcolor(ctx, color_idx);
		
		ctx.beginPath();
		ctx.arc( ( x1-this.minX1 ) * this.scaleX1 , canvas.height - ( x2 - this.minX2) * this.scaleX2, radius, 0, 2 * Math.PI , true);
		// arc( x, y, radius, agnlestart, angleend, sens)
	
		ctx.closePath();
		ctx.fill();
	}
}


Plot2D.prototype.pointmouse = function  (event ) {

	if(event.button == 0) {
		event.preventDefault();	
	
		var canvas = document.getElementById(this.canvasId);
		if (canvas.getContext) {
			var ctx = canvas.getContext("2d");
			var rect = canvas.getBoundingClientRect();

			var x = event.clientX - rect.left;	// mouse coordinates relative to plot
			var y = event.clientY - rect.top;
			var color_idx = parseInt(document.getElementById("selectcolor").value);
			
			// Add to training set
			var etiquette = color_idx; 
			var x1 = x / this.scaleX1 + this.minX1;
			var x2 =  (canvas.height  - y) / this.scaleX2 + this.minX2;
			// plot point		

			this.point(x1,x2,color_idx );	
		
			this.Xapp[this.m] = new Array(); 
			this.Xapp[this.m][0] = x1;
			this.Xapp[this.m][1] = x2; 
			this.Yapp[this.m] = etiquette; 
			this.m++;
		
		
			if ( this.tableId != "" ) {
				// add to table of points
				var t = document.getElementById(this.tableId); 
				t.innerHTML += "<tr><td>"+ x1.toFixed(2) + "</td><td>" + x2.toFixed(2) + "</td><td>" + etiquette + "</td></tr>";
			}
		}
	}
}

Plot2D.prototype.plot_data = function () {
	if (this.m != this.Yapp.length )
		this.m = this.Yapp.length;
		
   	for(var i=0;i < this.m ;i++) {
		this.point (this.Xapp[i][0], this.Xapp[i][1], this.Yapp[i] );
	}
}

Plot2D.prototype.plot_vector = function(start_x1,start_x2, end_x1,end_x2, vectorname, veccolor) {
	if(typeof(veccolor) === 'undefined') {
		veccolor = 0;
	}
	
	start_x1 = (start_x1 - this.minX1) * this.scaleX1;
	end_x1 = (end_x1 - this.minX1) * this.scaleX1;	
	start_x2 = (start_x2 - this.minX2) * this.scaleX2;
	end_x2 = (end_x2 - this.minX2) * this.scaleX2;	
	
	var theta1 = Math.atan((end_x2 - start_x2)/(end_x1 - start_x1)); // angle entre vecteur et axe X1
	var theta2 = Math.atan((end_x1 - start_x1) /(end_x2 - start_x2)); // angle entre vecteur et axe X2	
	
	var arrowsize = 10;
	var arrow1_x1 = end_x1 ; 
	var arrow1_x2 = end_x2 ; 
	
	var arrow2_x1 = end_x1 ;
	var arrow2_x2 = end_x2 ;
	
	if ( end_x2 >= start_x2) {
		arrow1_x1 -= arrowsize*Math.sin(theta2 - Math.PI/12);
		arrow1_x2 -= arrowsize*Math.cos(theta2 - Math.PI/12);
	}
	else {
		arrow1_x1 += arrowsize*Math.sin(theta2 - Math.PI/12);
		arrow1_x2 += arrowsize*Math.cos(theta2 - Math.PI/12);
	}		
	if ( end_x1 >= start_x1 ) {
		arrow2_x1 -= arrowsize*Math.cos(theta1 - Math.PI/12);	
		arrow2_x2 -= arrowsize*Math.sin(theta1 - Math.PI/12);			
	}
	else {
		arrow2_x1 += arrowsize*Math.cos(theta1 - Math.PI/12);	
		arrow2_x2 += arrowsize*Math.sin(theta1 - Math.PI/12);		
	}
	
	var canvas = document.getElementById(this.canvasId);
	if (canvas.getContext) {
		var ctx = canvas.getContext("2d");
		
		ctx.lineWidth="1";
		setcolor(ctx,veccolor);
		
		ctx.beginPath();
		ctx.moveTo(start_x1,canvas.height - start_x2);
		ctx.lineTo(end_x1,canvas.height - end_x2);
		ctx.lineTo(arrow1_x1,canvas.height - arrow1_x2);
		ctx.lineTo(arrow2_x1,canvas.height - arrow2_x2);
		ctx.lineTo(end_x1,canvas.height - end_x2);
		ctx.stroke();
		ctx.fill();

		if(typeof(vectorname) !== 'undefined') {
			ctx.lineWidth="1";
			var dx =5;
			if ( end_x1 < start_x1)
				dx = -15;

			ctx.strokeText(vectorname, end_x1 + dx,canvas.height - end_x2);
		}
	}
}


Plot2D.prototype.plot_line = function(start_x1,start_x2, end_x1,end_x2, linename, linecolor, dashed, linewidth) {
	if(typeof(linecolor) === 'undefined') {
		linecolor = 0;
	}
	if(typeof(dashed) === 'undefined') {
		dashed = false;
	}
	if(typeof(linewidth) === 'undefined') {
		linewidth = 1;
	}
	
	start_x1 = (start_x1 - this.minX1) * this.scaleX1;
	end_x1 = (end_x1 - this.minX1) * this.scaleX1;	
	start_x2 = (start_x2 - this.minX2) * this.scaleX2;
	end_x2 = (end_x2 - this.minX2) * this.scaleX2;	
	
	var canvas = document.getElementById(this.canvasId);
	if (canvas.getContext) {
		var ctx = canvas.getContext("2d");
		
		ctx.lineWidth=""+linewidth;
		setcolor(ctx,linecolor);
		if (dashed) {
			ctx.setLineDash([5]);
			//ctx.lineWidth="1";
		}
		ctx.beginPath();
		ctx.moveTo(start_x1,canvas.height - start_x2);
		ctx.lineTo(end_x1,canvas.height - end_x2);
		ctx.stroke();
		ctx.setLineDash([1, 0]);
		
		if(typeof(linename) !== 'undefined') {
			if ( linename != "" ) {
				ctx.lineWidth="1";
				ctx.strokeText(linename, (end_x1 + start_x1)/2 - 10 ,canvas.height - 10 - (end_x2+start_x2)/2);
			}
		}
	}
}
Plot2D.prototype.plot_classifier = function (w, b, coloridx, disappear) {
	if (typeof(disappear) === 'undefined')
		var disappear = false; 
	if (typeof(coloridx) === 'undefined')
		var coloridx = 0; 

	var x1 = this.minX1;
	var x2 = this.maxX1;
	var y1;
	var y2;
	
	if (w[1] != 0) {
		y1 = (-b - w[0]*x1) / w[1];
		y2 = (-b - w[0]*x2) / w[1];
	}
	else {
		x1 = -b / w[0];
		x2 = -b / w[0];
		y1 = this.minX2;
		y2 = this.maxX2;
	}
	
	var canvas = document.getElementById(plot.canvasId);
	if (canvas.getContext) {
		var ctx = canvas.getContext("2d");
	
		ctx.lineWidth="3";
		if ( disappear ) 
			ctx.strokeStyle = "grey";
		else
			setcolor(ctx, coloridx);
			
		ctx.setLineDash([1, 0]);
		ctx.beginPath();		
		ctx.moveTo(( x1-this.minX1 ) * this.scaleX1 , canvas.height/2 - ( y1 * this.scaleX2 ));
		ctx.lineTo(( x2-this.minX1 ) * this.scaleX1 , canvas.height/2 - ( y2 * this.scaleX2 ));
		ctx.stroke();


	}

	
}

Plot2D.prototype.coord2datavector = function(x1,x2) {
	var canvas = document.getElementById(this.canvasId); 
	var x = [0,0] ;
	x[0] = ( x1 / this.scaleX1 ) + this.minX1 ;
	x[1] = (-( x2-canvas.height) / this.scaleX2 ) + this.minX2;
	return x;
}
Plot2D.prototype.plotmathjax = function(stringindex, x, y) {
			
	var canvas = document.getElementById(this.canvasId);
	if (canvas.getContext) {
		var ctx = canvas.getContext("2d");

		var label = document.getElementById("jaxstring"+stringindex);
		label.style.top = canvas.height - ( y - this.minX2) * this.scaleX2  + canvas.offsetTop;
		label.style.left = (x - this.minX1) * this.scaleX1 + canvas.offsetLeft;	
		label.style.visibility = "visible"; 
	}
}
Plot2D.prototype.clearmathjax = function(stringindex) {
	var label = document.getElementById("jaxstring"+stringindex);
	label.style.visibility = "hidden"; 
	
}
	 
Plot2D.prototype.text = function (x1,x2,txt) {
	var canvas = document.getElementById(this.canvasId);
	if (canvas.getContext) {
		var ctx = canvas.getContext("2d");
		ctx.lineWidth="0.5"; 
		ctx.strokeStyle = "black";
		ctx.strokeText(txt,  ( x1-this.minX1 ) * this.scaleX1 , canvas.height - ( x2 - this.minX2) * this.scaleX2);
	}
}

///////////////////////////////
/// Plot 3D ///////////////////
///////////////////////////////
function Plot3D(canvasId) {
	
	if(typeof(canvasId) === 'undefined' ) 
		this.canvasId = "plotcanvas3D";
	else
		this.canvasId = canvasId;

	var canvas =  document.getElementById(this.canvasId);

	this.minX1 = -10;
	this.maxX1 = 10;
	this.minX2 = -10;
	this.maxX2 = 10;
	this.minX3 = -10;
	this.maxX3 = 10;
	this.scaleX1 ;
	this.scaleX2 ;
	this.scaleX3 ;
	this.NsamplesX1 = 50;
	this.NsamplesX2 = 50;
	this.NsamplesX3 = 50;	

	this.axisNameX1 = "x1";
	this.axisNameX2 = "x2";
	this.axisNameX3 = "x3";

	// Training set 3D
	this.X = new Array();
	this.Y = new Array();
	
	// other stuff to plot
	this.lines = new Array();
	this.planes = new Array();
	this.spheres = new Array();
	
	// 2D Graphics
	this.view2D = new Array();
	this.viewminX1 = -10;
	this.viewmaxX1 = 10;
	this.viewminX2 = -10;
	this.viewmaxX2 = 10;
	this.viewscaleX1 = canvas.width / (this.viewmaxX1 - this.viewminX1);
	this.viewscaleX2 = canvas.width / (this.viewmaxX2 - this.viewminX2);
	
	this.angleX = 0.0;//- Math.PI/6; // rotations around axis
	this.angleY = 0.0;
	this.angleZ = 0.0;// - Math.PI/8;

	this.cameraDistance = 20;

	// Mouse animation
	this.ROTATING = false;
	this.mouseX = 0;
	this.mouseY = 0;

	// automatic animation
	this.animation = null; 
	this.animateAuto = 0; 	// if 0: do not relaunch animation after mouse released 
							// if > 0: samplingrate of animation
	
	////// Cross browser support ////
	var ctx = document.getElementById(this.canvasId).getContext("2d");
	if ( !ctx.setLineDash ) {
		ctx.setLineDash = function () {};
	}
	
	if(window.addEventListener)
        canvas.addEventListener('DOMMouseScroll', this.mousezoom, false);//firefox
 
    //for IE/OPERA etc
    canvas.onmousewheel = this.mousezoom;

}


Plot3D.prototype.test = function() {
	this.X.push([5,0,0]);
	this.X.push([0,5,0]);
	this.X.push([0,0,5]);
	this.Y.push(1);
	this.Y.push(2);
	this.Y.push(3);
	this.X.push([2,0,0]);
	this.X.push([0,-6,0]);
	this.X.push([0,0,2]);
	this.Y.push(1);
	this.Y.push(2);
	this.Y.push(3);
	
	this.X.push([5,5,5]);
	this.Y.push(3);
	
	
	this.sphere([5,-5, 1], 50, "", 1) ;
	this.sphere([-5,5, -3], 30, "", 3) ;
	
	this.replot();
	this.animateAuto = 100;
	this.animate(50);
}
Plot3D.prototype.computeRanges = function () {

	var i;
	for (i=0;i<this.Y.length ; i++) {
		var norm = Math.sqrt( this.X[i][0]*this.X[i][0] + this.X[i][1]*this.X[i][1] + this.X[i][2]*this.X[i][2] ) 
		if ( norm > this.maxX2 ) {
			this.maxX2 = norm;
			this.minX2 = -norm;
		}
	}	
}	

Plot3D.prototype.replot = function() {
	// Compute 2D coordinates from 3D ones
	
	
	var x1;
	var x2;
	var distance;
	var opacity;
	var radius;
	var res;
	
	var i;	
	var maxDistance = this.cameraDistance + this.maxX2 - this.minX2; 

	this.clear();
	
	// plotorigin
	this.point2D(0, 0, 0 , 1.0, 3 ) ; 
	
	// plot axis
	this.line([ -1, 0, 0], [10, 0,0] , this.axisNameX1);
	this.line([ 0, -1, 0], [0, 10 ,0] ,this.axisNameX2);
	this.line([ 0, 0, -1], [0, 0,10] , this.axisNameX3);
	
	// plot points
	for (i=0;i<this.Y.length ; i++) {
	
		res = this.project(this.X[i] );
		x1 = res[0];
		x2 = res[1];
		distance = res[2];
	
		
		if ( distance < maxDistance ) 
			opacity = ( distance / maxDistance ) ;
		else
			opacity = 1.0;
			
		radius = Math.floor(2 + (1 - opacity) * 10);
				
		this.point2D(x1, x2, this.Y[i] , opacity, radius ) ; 
	}
	
	// plot lines
	for (i=0;i<this.lines.length; i++) {
		this.line(this.lines[i][0],this.lines[i][1],this.lines[i][2],this.lines[i][3]);
	}
	
	// plot planes
	for (i=0;i<this.planes.length; i++) {
		this.drawplane(this.planes[i][0],this.planes[i][1],this.planes[i][2],this.planes[i][3]);
	}
	
	// plot spheres 
	//  plot the most distant ones first !!! 
	var distances = new Array();
	for (i=0;i<this.spheres.length; i++) {	
		var res = this.project( this.spheres[i][0] ); 
		distances[i] = res[2];
	}
	for (var n=0;n<this.spheres.length; n++) {
		var idx = 0;
		for ( i=1; i< this.spheres.length; i++) {
			if ( distances[i] > distances[idx] )
				idx = i;
		}
		this.drawsphere( this.spheres[idx][0], this.spheres[idx][1], this.spheres[idx][2], this.spheres[idx][3] );
		distances[idx] = -1;			
	}
}
Plot3D.prototype.clear = function(  ) {
	var canvas = document.getElementById(this.canvasId);
	if (canvas.getContext) {
		var ctx = canvas.getContext("2d");
		ctx.clearRect(0,0,canvas.width,canvas.height);
	}
}
Plot3D.prototype.clear_data = function(  ) {
	while (this.Y.length > 0) {
		this.Y.pop();
		this.X.pop();
	}
}
Plot3D.prototype.clear_planes = function(  ) {
	while(this.planes.length > 0) {
		this.planes.pop();
	}
}

Plot3D.prototype.rotateX = function( deltaangle ) {
	this.angleX += deltaangle; 
	this.replot();
}

Plot3D.prototype.rotateY = function( deltaangle ) {
	this.angleY += deltaangle; 
	this.replot();
}
Plot3D.prototype.rotateZ = function( deltaangle , do_replot) {
	if ( typeof(do_replot) == "undefined" )
		var do_replot = true;
		
	this.angleZ += deltaangle; 
	if ( do_replot )
		this.replot();
}

Plot3D.prototype.mouserotation = function(e) {

	if ( this.ROTATING ) {
		e.preventDefault();
		var dx = e.clientX - this.mouseX;	
		var dy = e.clientY - this.mouseY;	
		this.mouseX = e.clientX;
		this.mouseY = e.clientY;
		
		if ( Math.abs(dx) > 0.2 ) 
			this.rotateZ(dx / 20, !(Math.abs(dy) > 0.2) );
		if ( Math.abs(dy) > 0.2 ) 
			this.rotateX(dy / 20);
	}
}
Plot3D.prototype.mousedown = function(e) {
	e.preventDefault();
	this.ROTATING = true;
	this.mouseX = e.clientX;
	this.mouseY = e.clientY;
	
	this.animateStop();
}

Plot3D.prototype.mouseup = function(e) {
	e.preventDefault();
	this.ROTATING = false;
	if ( this.animateAuto > 0 ) {
		this.animate( this.animateAuto );
	}
}
Plot3D.prototype.mousezoom = function(e) {
	// !!! use plot3 instead of this due to event handler...
	
	var delta = 0;
 
    if (!e) 
    	e = window.event;
 	
 	e.preventDefault();
	
    // normalize the delta
    if (e.wheelDelta) {
         // IE and Opera
        delta = e.wheelDelta / 30;
    } 
    else if (e.detail) { 
        delta = -e.detail ;
    }
 
	plot3.cameraDistance -= delta ;
	
	if ( plot3.cameraDistance < 5 ) {
		plot3.cameraDistance = 5;
	}
	else if ( plot3.cameraDistance > 100 ) 
		plot3.cameraDistance = 100;
	
	plot3.replot();
}

Plot3D.prototype.project = function ( x3D ) {
	/*
		x3D : points in World coordinate system
		Camera / view coordinate system initialized like World system
		Camera is fixed to (0,cameraDistance,0) in camera system
		
		1. rotate World in camera system
		2. project camera system to 2D XZ plane since camera on Y-axis
		3. distance to camera = cameraDistance + Y 
		
	
	*/
	
	// 1. rotation
	var tmpX = new Array(3); 
	// rotation around X-axis:
	tmpX[0] = x3D[0]; // does not change X-coordinate
	tmpX[1] = Math.cos(this.angleX) * x3D[1] - Math.sin(this.angleX) * x3D[2];
	tmpX[2] = Math.sin(this.angleX) * x3D[1] + Math.cos(this.angleX) * x3D[2];	
	
	// rotation around Y-axis:
	var tmpY = new Array(3); 
	tmpY[0] = Math.cos(this.angleY) * tmpX[0] - Math.sin(this.angleY) * tmpX[2];
	tmpY[1] = tmpX[1];
	tmpY[2] = Math.sin(this.angleY) * tmpX[0] + Math.cos(this.angleY) * tmpX[2];	

	// rotation around Z-axis:
	var tmpZ = new Array(3); 
	tmpZ[0] = Math.cos(this.angleZ) * tmpY[0] - Math.sin(this.angleZ) * tmpY[1];
	tmpZ[1] = Math.sin(this.angleZ) * tmpY[0] + Math.cos(this.angleZ) * tmpY[1];	
	tmpZ[2] = tmpY[2];
	
	// Scaling
	var scale = ( this.cameraDistance/20 ) ;
	tmpZ[0] /= scale;
	tmpZ[1] /= scale;
	tmpZ[2] /= scale;		
	
	// Project to 2D plane 	
	var x1 = tmpZ[0];
	var x2 = tmpZ[2]; 
	var distance = this.cameraDistance + tmpZ[1];

	return [x1,x2, distance];
}

Plot3D.prototype.line = function( start, end, linename, linecolor, dashed, linewidth ) {
	var start_x1;
	var start_x2;

	var res = this.project(start);
	start_x1 = res[0];
	start_x2 = res[1];
	
	var end_x1;
	var end_x2;

	res = this.project(end);
	end_x1 = res[0];
	end_x2 = res[1];
	
	this.line2D(start_x1, start_x2, end_x1, end_x2, linename, linecolor, dashed, linewidth);
}
Plot3D.prototype.plot_line = function( start, end, linename, color ) {
	if (typeof(color) === 'undefined')
		var color = 0; 

	this.lines.push([start, end, linename, color]);
	this.line( start, end, linename, color );
}
Plot3D.prototype.plane = function( start, end, polyname, color ) {
	if (typeof(color) === 'undefined')
		var color = 3; 
	if (typeof(polyname) === 'undefined')
		var polyname = "";
	
	this.planes.push([start, end, polyname, color]);
	this.drawplane( start, end, polyname, color );
}
Plot3D.prototype.drawplane = function( start, end, polyname, color ) {
	var res;
	var corner1 = new Array(3);// 2 other corners
	var corner2 = new Array(3);
	corner1[0] = start[0];
	corner1[1] = end[1];
	corner1[2] = start[2];
	corner2[0] = end[0];
	corner2[1] = start[1];
	corner2[2] = end[2];
	
	res = this.project(start);		
	var start_x1 = res[0];
	var start_x2 = res[1];
	
	res = this.project(end);		
	var end_x1 = res[0];
	var end_x2 = res[1];
	
	res = this.project(corner1);		
	var corner1_x1 = res[0];
	var corner1_x2 = res[1];
 	res = this.project(corner2);		
	var corner2_x1 = res[0];
	var corner2_x2 = res[1];
 			
	this.polygone2D( [ start_x1, corner1_x1, end_x1, corner2_x1], [ start_x2, corner1_x2, end_x2, corner2_x2], polyname, color);
}

Plot3D.prototype.sphere = function( center, radius, spherename, color ) {
	if (typeof(color) === 'undefined')
		var color = 1; 
	if (typeof(spherename) === 'undefined')
		var spherename = "";
	this.spheres.push([center, radius, spherename, color ]);
	this.drawsphere( center, radius, spherename, color );
}
Plot3D.prototype.drawsphere = function( center, radius, spherename, color ) {
	var res;
	res = this.project(center);		
	var x1 = res[0];
	var x2 = res[1];
	var distance = res[2];
	
	if ( distance >= 0 ) {
		var opacity = 1.0;
		var maxDistance = this.cameraDistance + this.maxX2 - this.minX2; 
	
		if ( distance < maxDistance ) 
			opacity = 0.5 * ( distance / maxDistance ) ;

		var radius2D = Math.floor(radius * ( 0 +3* (1 - opacity)*(1 - opacity) ) );

		this.disk2D( x1, x2, radius2D, spherename, color, opacity);
	
	}
}

Plot3D.prototype.point2D = function (x1, x2, color_idx, opacity,  radius ) {

	if ( x1 >= this.viewminX1 && x1 <= this.viewmaxX1 && x2 >= this.viewminX2 && x2 <= this.viewmaxX2 ) {

		if (typeof(opacity) === 'undefined')
			var opacity = 1.1; 
		if (typeof(radius) === 'undefined')
			var radius = 5; 
	

		var canvas = document.getElementById(this.canvasId);
		if (canvas.getContext) {
			var ctx = canvas.getContext("2d");
		
			if (opacity < 1.0 ) 
				setcolortransparent(ctx, color_idx, opacity);
			else
				setcolor(ctx, color_idx);
		
			ctx.beginPath();
			ctx.arc( ( x1-this.viewminX1 ) * this.viewscaleX1 , canvas.height - ( x2 - this.viewminX2) * this.viewscaleX2, radius, 0, 2 * Math.PI , true);
			// arc( x, y, radius, agnlestart, angleend, sens)
	
			ctx.closePath();
			ctx.fill();
		}
	}
}
Plot3D.prototype.line2D = function(start_x1,start_x2, end_x1,end_x2, linename, linecolor, dashed, linewidth) {
	if(typeof(linecolor) === 'undefined') {
		linecolor = 0;
	}
	if(typeof(dashed) === 'undefined') {
		dashed = false;
	}
	if(typeof(linewidth) === 'undefined') {
		linewidth = 1;
	}
	
	start_x1 = (start_x1 - this.viewminX1) * this.viewscaleX1;
	end_x1 = (end_x1 - this.viewminX1) * this.viewscaleX1;	
	start_x2 = (start_x2 - this.viewminX2) * this.viewscaleX2;
	end_x2 = (end_x2 - this.viewminX2) * this.viewscaleX2;	
	
	
	var canvas = document.getElementById(this.canvasId);

	if ( start_x1 < 0 ) 
			start_x1 = 0;
	if ( start_x1 >= canvas.width ) 
			start_x1 = canvas.width-1;
	if ( start_x2 <= 0 ) 
			start_x2 = 1;
	if ( start_x2 > canvas.height ) 
			start_x2 = canvas.height;
	if ( end_x1 < 0 ) 
			end_x1 = 0;
	if ( end_x1 >= canvas.width ) 
			end_x1 = canvas.width-1;
	if ( end_x2 <= 0 ) 
			end_x2 = 1;
	if ( end_x2 > canvas.height ) 
			start_x2 = canvas.height;

	if (canvas.getContext) {
		var ctx = canvas.getContext("2d");
		
		ctx.lineWidth=""+linewidth;
		setcolor(ctx,linecolor);
		if (dashed) {
			ctx.setLineDash([5]);
			//ctx.lineWidth="1";
		}
		ctx.beginPath();
		ctx.moveTo(start_x1,canvas.height - start_x2);
		ctx.lineTo(end_x1,canvas.height - end_x2);
		ctx.stroke();
		if (dashed) {
			ctx.setLineDash([1, 0]);
		}
		
		if(typeof(linename) !== 'undefined') {
			if (linename != "") {
				var x = -10 + (end_x1 + start_x1)/2 ;
				var y = canvas.height + 10 - (end_x2 + start_x2)/2 ; 
					
				if (linename.indexOf("jaxstring") == 0 ) {
					// put mathjaxstring as line name
					var label = document.getElementById(linename);
					label.style.fontSize = "70%";
					label.style.top = y + canvas.offsetTop;
					label.style.left = x + canvas.offsetLeft;	
					label.style.visibility = "visible"; 
				}
				else {
					ctx.lineWidth="1";
					ctx.strokeText(linename, x, y );
				}
			}
		}
	}
}

Plot3D.prototype.polygone2D = function(x1,x2, polyname, color) {
	/*
		x1,x2 : arrayx of X1,X2 coordinates of all points
	*/

	if(typeof(color) === 'undefined') {
		color = 3;
	}
	
	var i;
	// loop over all points:
	
	for (i=0;i<x1.length;i++) {
		x1[i] = (x1[i] - this.viewminX1) * this.viewscaleX1;	
		x2[i] = (x2[i] - this.viewminX2) * this.viewscaleX2;
	}
	
	var canvas = document.getElementById(this.canvasId);
	if (canvas.getContext) {
		var ctx = canvas.getContext("2d");
		
		
		setcolortransparent(ctx,color, 0.5);
		
		ctx.beginPath();
		ctx.moveTo(x1[0],canvas.height - x2[0]);
		for (i=0;i<x1.length;i++) {
			ctx.lineTo( x1[i],canvas.height - x2[i]);
		}
		ctx.fill();
		
		if(typeof(polyname) !== 'undefined') {
			if (polyname != "") {
				var x = -10 + x1[0];
				var y = canvas.height + 10 - x2[0];
					
				if (polyname.indexOf("jaxstring") == 0 ) {
					// put mathjaxstring as line name
					var label = document.getElementById(polyname);
					label.style.fontSize = "70%";
					label.style.top = y + canvas.offsetTop;
					label.style.left = x + canvas.offsetLeft;	
					label.style.visibility = "visible"; 
				}
				else {
					ctx.lineWidth="1";
					ctx.strokeText(polyname, x, y );
				}
			}
		}
	}
}

Plot3D.prototype.disk2D = function (x1, x2, radius, spherename, color, opacity ) {
	if (typeof(opacity) === 'undefined')
		var opacity = 1.1; 
	if (typeof(radius) === 'undefined')
		var radius = 5; 
	
	if ( x1 + radius >= this.viewminX1 && x1 - radius <= this.viewmaxX1 && x2 + radius >= this.viewminX2 && x2 - radius <= this.viewmaxX2 ) {
		
		var canvas = document.getElementById(this.canvasId);
		if (canvas.getContext) {
			var ctx = canvas.getContext("2d");
			var x1view =  ( x1-this.viewminX1 ) * this.viewscaleX1 ;
			var x2view =  canvas.height - ( x2 - this.viewminX2) * this.viewscaleX2;
		
			if (opacity < 1.0 ) 
				setcolortransparentgradient(ctx, color, opacity, Math.sqrt(x1view*x1view+x2view*x2view) + radius);
			else
				setcolorgradient(ctx, color,  Math.sqrt(x1view*x1view+x2view*x2view) + radius);
		
			ctx.beginPath();
			ctx.arc( x1view, x2view, radius, 0, 2 * Math.PI , true);
			ctx.closePath();
			ctx.fill();
			
			if(typeof(spherename) !== 'undefined') {
				if (spherename != "") {
					var x = -10 + x1view;
					var y = 10 + x2view;
					
					if (spherename.indexOf("jaxstring") == 0 ) {
						// put mathjaxstring as line name
						var label = document.getElementById(spherename);
						label.style.fontSize = "70%";
						label.style.top =  x2view  + canvas.offsetTop;
						label.style.left = x1view  + canvas.offsetLeft;	
						label.style.visibility = "visible"; 
					}
					else {
						var words = spherename.split("*");
						ctx.textAlign = "center";	// center of text appear at x position
						var txtsize = Math.floor(0.2 * radius) ;
						var tmpfont = ctx.font;
						ctx.font = txtsize + "pt sans-serif";
						ctx.fillStyle = "black";
		
						if ( words.length == 1 ) {
							ctx.fillText( spherename, x1view  , x2view  ) ;
						}
						else {
							for (var i = 0; i< words.length; i++) {
								ctx.fillText( words[i], x1view  ,x2view - (words.length/2 - i - 0.5)* (1.5 * txtsize)) ;
							}
						}
						ctx.font = tmpfont;
					}
				}
			}
		}
	}
}
Plot3D.prototype.animate = function(samplingRate) {
	if ( typeof(samplingRate) === 'undefined' ) 
		var samplingRate = this.animateAuto ;
		
		
	this.animateStop(); // make sure a single animation runs
		
	var p3 = this;
	this.animation = setInterval( function () {
			p3.rotateZ(0.01);	// cannot use "this" here => plot3
		}, samplingRate
	);
	
}
Plot3D.prototype.animateStop = function() {
	if ( this.animation != null ) {
		clearInterval( this.animation );
		this.animation = null;
	}
	
}
Plot3D.prototype.isInSphere = function (x, y, z, sphere) {
	var dx = (x - sphere[0][0]);
	var dy = (y - sphere[0][1]);
	var dz = (z - sphere[0][2]);		
	var norm2 = dx*dx+dy*dy+dz*dz;
	
	if ( norm2 <= sphere[1]*sphere[1] )
		return true;
	else 
		return false;

}

////////////////////////////////////////
// General canvas tools 	 
function setcolor(ctx, color_idx) {
	if( color_idx > 10 ) {
		setcolortransparent(ctx, color_idx - 10, 0.5);
		return;
	}
	
	switch(color_idx) {
	case -1: 
		ctx.fillStyle = "white";			
		ctx.strokeStyle = "white";
		break;

	case 0: 
		ctx.fillStyle = "rgb(0,0,0)";
		ctx.strokeStyle = "rgb(0,0,0)";
		break;
	case 1: 
		ctx.fillStyle = "rgb(0,0,200)";	
		ctx.strokeStyle = "rgb(0,0,200)";					
		break;
	case 2: 
		ctx.fillStyle = "rgb(200,0,0)";			
		ctx.strokeStyle = "rgb(200,0,0)";			
		break;
	case 3: 
		ctx.fillStyle = "rgb(0,200,0)";
		ctx.strokeStyle = "rgb(0,200,0)";						
		break;
	case 4: 
		ctx.fillStyle = "rgb(200,0,200)";			
		ctx.strokeStyle = "rgb(200,0,200)";
		break;
	case 5: 
		ctx.fillStyle = "rgb(255,255,0)";			
		ctx.strokeStyle = "rgb(255,255,0)";
		break;
	case 6: 
		ctx.fillStyle = "rgb(0,255,255)";			
		ctx.strokeStyle = "rgb(0,255,255)";
		break;
	case 7: 
		ctx.fillStyle = "rgb(102,51,0)";			
		ctx.strokeStyle = "rgb(102,51,0)";
		break;
	case 8: 
		ctx.fillStyle = "rgb(204,51,0)";			
		ctx.strokeStyle = "rgb(204,51,0)";
		break;
	case 9: 
		ctx.fillStyle = "rgb(255,102,204)";			
		ctx.strokeStyle = "rgb(255,102,204)";
		break;
	case 10: 
		ctx.fillStyle = "rgb(120,120,120)";			
		ctx.strokeStyle = "rgb(120,120,120)";
		break;
	
	default:
		ctx.fillStyle = "rgb(0,0,200)";			
		ctx.strokeStyle = "rgb(0,0,200)";			
		break;															
	}

}
	 
function setcolortransparent(ctx, color_idx, opacity) {
	switch(color_idx) {
	case 0: 
		ctx.fillStyle = "rgba(0,0,0," + opacity +" )";
		ctx.strokeStyle = "rgba(0,0,0," + opacity +" )";
		break;
	case 1: 
		ctx.fillStyle = "rgba(0,0,200," + opacity +" )";
		ctx.strokeStyle = "rgba(0,0,200," + opacity +" )";
		break;
	case 2: 
		ctx.fillStyle = "rgba(200,0,0," + opacity +" )";
		ctx.strokeStyle = "rgba(200,0,0," + opacity +" )";
		break;
	case 3: 
		ctx.fillStyle = "rgba(0,200,0," + opacity +" )";
		ctx.strokeStyle = "rgba(0,200,0," + opacity +" )";
		break;
	case 4: 
		ctx.fillStyle = "rgba(200,0,200," + opacity +" )";
		ctx.strokeStyle = "rgba(200,0,200," + opacity +" )";
		break;
	case 5: 
		ctx.fillStyle = "rgba(255,255,0," + opacity +" )";
		ctx.strokeStyle = "rgba(255,255,0," + opacity +" )";
		break;
	case 6: 
		ctx.fillStyle = "rgba(0,255,255," + opacity +" )";		
		ctx.strokeStyle = "rgba(0,255,255," + opacity +" )";
		break;
	case 7: 
		ctx.fillStyle = "rgba(102,51,0," + opacity +" )";			
		ctx.strokeStyle = "rgba(102,51,0," + opacity +" )";
		break;
	case 8: 
		ctx.fillStyle = "rgba(204,51,0," + opacity +" )";			
		ctx.strokeStyle = "rgba(204,51,0," + opacity +" )";
		break;
	case 9: 
		ctx.fillStyle = "rgab(255,102,204," + opacity +" )";		
		ctx.strokeStyle = "rgba(255,102,204," + opacity +" )";
		break;
	case 10: 
		ctx.fillStyle = "rgba(120,120,120," + opacity +" )";	
		ctx.strokeStyle = "rgba(120,120,120," + opacity +" )";
		break;
	default:
		ctx.fillStyle = "rgba(0,0,200," + opacity +" )";
		ctx.strokeStyle = "rgba(0,0,200," + opacity +" )";
		break;															
	}

}

function setcolorgradient(ctx, color_idx,size) {
	if ( typeof(size) === "undefined")
		var size = 400 * Math.sqrt(2);
		
	var gradient = ctx.createRadialGradient(0,0,size, 0 , 2*Math.PI, true);
	gradient.addColorStop(1,"white");
	
	switch(color_idx) {
	case 0: 
		gradient.addColorStop(0,"rgb(0,0,0 )");
		break;
	case 1: 
		gradient.addColorStop(0,"rgb(0,0,200 )");
		break;
	case 2: 
		gradient.addColorStop(0,"rgb(200,0,0 )");
		break;
	case 3: 
		gradient.addColorStop(0,"rgb(0,200,0 )");
		break;
	case 4: 
		gradient.addColorStop(0,"rgb(200,0,200 )");
		break;
	case 5: 
		gradient.addColorStop(0,"rgb(255,255,0 )");		
		break;
	default:
		gradient.addColorStop(0,"rgb(0,0,200 )");
		break;
													
	}
	ctx.fillStyle = gradient;
}
	 
function setcolortransparentgradient(ctx, color_idx, opacity,size) {
	if ( typeof(size) === "undefined")
		var size = 400 * Math.sqrt(2);
		
	var gradient = ctx.createRadialGradient(0,0,size, 0 , 2*Math.PI, true);
	gradient.addColorStop(1,"white");
	
	switch(color_idx) {
	case 0: 
		gradient.addColorStop(0.3,"rgba(0,0,0," + opacity +" )");		
		gradient.addColorStop(0,"rgb(0,0,0 )");
		break;
	case 1: 
		gradient.addColorStop(0.3,"rgba(0,0,200," + opacity +" )");
		gradient.addColorStop(0,"rgb(0,0,200 )");
		break;
	case 2: 
		gradient.addColorStop(0.3,"rgba(200,0,0," + opacity +" )");
		gradient.addColorStop(0,"rgb(200,0,0 )");
		break;
	case 3: 
		gradient.addColorStop(0.3,"rgba(0,200,0," + opacity +" )");
		gradient.addColorStop(0,"rgb(0,200,0 )");
		break;
	case 4: 
		gradient.addColorStop(0.3,"rgba(200,0,200," + opacity +" )");
		gradient.addColorStop(0,"rgb(200,0,200 )");
		break;
	case 5: 
		gradient.addColorStop(0.3,"rgba(255,255,0," + opacity +" )");
		gradient.addColorStop(0,"rgb(255,255,0 )");		
		break;
	default:
		gradient.addColorStop(0.3,"rgba(0,0,200," + opacity +" )");
		gradient.addColorStop(0,"rgb(0,0,200 )");
		break;
													
	}
	ctx.fillStyle = gradient;
}


