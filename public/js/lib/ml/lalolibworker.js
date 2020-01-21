/*
	Lab Worker for LAlOLib
*/

//////////////////////////////
//// Load LALOLib
/////////////////////////////
importScripts('lalolib.js');

///////////////////////////////
/// Worker interface
///////////////////////////////

onmessage = function ( WorkerEvent ) {
	var WorkerCommand = WorkerEvent.data.cmd;
	var mustparse = WorkerEvent.data.parse; 
	if ( mustparse )
		var res = lalo(WorkerCommand); 
	else {
		if ( WorkerCommand == "load_mat" ) {
			if ( type(WorkerEvent.data.data) == "matrix" ) 
				var res = new Matrix(WorkerEvent.data.data.m,WorkerEvent.data.data.n,WorkerEvent.data.data.val, true);//need new Matrix otherwise not recognized as MAtrix but as Object....
			else 
				var res = mat(WorkerEvent.data.data, true);
			eval(WorkerEvent.data.varname + "=res");			
		} 
		else
			var res = self.eval( WorkerCommand ) ;
	}
	try {
		postMessage( { "cmd" : WorkerCommand, "output" : res } );	
	}
	catch ( e ) {
		try {
			postMessage( { "cmd" : WorkerCommand, "output" : res.info() } );	
		}
		catch(e2) {
			postMessage( { "cmd" : WorkerCommand, "output" : undefined } );	
		}
	}
}

