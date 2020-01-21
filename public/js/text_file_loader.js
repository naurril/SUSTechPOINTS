
import {
	DefaultLoadingManager,
	FileLoader,		
	LoaderUtils,	
} from "./lib/three.module.js";

var TextFileLoader = function ( manager ) {

	this.manager = ( manager !== undefined ) ? manager : DefaultLoadingManager;
	this.littleEndian = true;
};


TextFileLoader.prototype = {

	constructor: TextFileLoader,

	load: function ( url, onLoad, onProgress, onError ) {

		var scope = this;

		var loader = new FileLoader( scope.manager );
		loader.setPath( scope.path );
		loader.setResponseType( 'arraybuffer' );
		loader.load( url, function ( data ) {

			try {
				var textData = LoaderUtils.decodeText( new Uint8Array( data ) );
				onLoad(textData, url);
			} catch ( e ) {

				if ( onError ) {

					onError( e );

				} else {

					throw e;

				}

			}

		}, onProgress, onError );

	},

	setPath: function ( value ) {

		this.path = value;
		return this;

	},
};

export { TextFileLoader };
