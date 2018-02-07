
var sim

CAPS.Simulation = function () {

	
	this.capsScene    = undefined;
	this.backStencil  = undefined;
	this.frontStencil = undefined;
	this.scene        = undefined;
	this.camera   = undefined;
	this.renderer = undefined;
	this.zoom = 0.02
	//this.controls = undefined;

	this.showCaps = true;
	sim = this
	this.init();
	//animate();

};

render = function (self) {
	self = sim
	var timer = Date.now() * 0.0001;
	self.camera.position.y = Math.cos( 1 ) * 800;
	//self.camera.position.z = Math.sin( timer ) * 800;
	//self.camera.position.x = Math.sin( timer ) * 800;
	self.camera.lookAt( self.scene.position );
	
	console.log(self.camera.position)

	self.renderer.render( self.scene, self.camera);
};

animate = function () {
	requestAnimationFrame( animate );

	this.render();

};
	

CAPS.Simulation.prototype = {

	constructor: CAPS.Simulation,

	
	

	init: function () {

		var self = this;

		var loader = new THREE.ColladaLoader();
		loader.options.convertUpAxis = true;
		loader.load( 'https://s3.amazonaws.com/babylonjsassets/beach_home.dae', function ( collada ) {
			self.initScene( collada.scene );
		} );

		var container = document.createElement( 'div' );
		document.body.appendChild( container );

		//this.camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 2000 );
		//this.camera = new THREE.OrthographicCamera( window.innerWidth / - 50, window.innerWidth / 50,  window.innerHeight / 50,  window.innerHeight / - 50, 1, 1000 );
	
	

		this.scene        = new THREE.Scene();
		this.capsScene    = new THREE.Scene();
		this.backStencil  = new THREE.Scene();
		this.frontStencil = new THREE.Scene();

		this.selection = new CAPS.Selection(
			new THREE.Vector3( -10, -1, -10 ),
			new THREE.Vector3( 10,   5,   10 )
		);
		this.capsScene.add( this.selection.boxMesh );
		this.scene.add( this.selection.touchMeshes );
		this.scene.add( this.selection.displayMeshes );


		var width = window.innerWidth
		var height = window.innerHeight
		this.camera = new THREE.OrthographicCamera(-this.zoom*width, this.zoom*width, this.zoom*height, -this.zoom*height, 1, 2000  );


		this.camera.position.set( 0, 100, 0 )
	
		this.camera.lookAt( this.scene.position );

		//alert("test 2")
		this.renderer = new THREE.WebGLRenderer( { antialias: true } );
		this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.setSize( window.innerWidth, window.innerHeight );
		this.renderer.setClearColor( 0xffffff );
		this.renderer.autoClear = false;	
		container.appendChild( this.renderer.domElement );
		//var cameraControl = new THREE.OrbitControls(this.camera, this.renderer.domElement)
		//cameraControl.

		var self = this;
		this.renderer.domElement.addEventListener( 'mousewheel', function( event) {
			event.preventDefault();
			event.stopPropagation();
		
			var delta = 0;
		
			if ( event.wheelDelta ) { // WebKit / Opera / Explorer 9
				delta = event.wheelDelta / 40;
			} else if ( event.detail ) { // Firefox
				delta = - event.detail / 3;
			}
		
			var width = self.camera.right /self.zoom;
			var height = self.camera.top / self.zoom;
		
			self.zoom -= delta * 0.001;
		
			self.camera.left = -self.zoom*width;
			self.camera.right = self.zoom*width;
			self.camera.top = self.zoom*height;
			self.camera.bottom = -self.zoom*height;
		
			self.camera.updateProjectionMatrix();
		
			self.renderer.render( self.scene, self.camera );
		
		
		}, false );
		//this.renderer.domElement.addEventListener( 'DOMMouseScroll', mousewheel, false ); // firefox
		

		var throttledRender = CAPS.SCHEDULE.deferringThrottle( this._render, this, 40 );
		this.throttledRender = throttledRender;

		CAPS.picking( this ); // must come before OrbitControls, so it can cancel them

		//this.controls = new THREE.OrbitControls( this.camera, this.renderer.domElement );
		//this.controls.addEventListener( 'change', throttledRender );

		var onWindowResize = function () {
			self.camera.aspect = window.innerWidth / window.innerHeight;
			self.camera.updateProjectionMatrix();
			self.renderer.setSize( window.innerWidth, window.innerHeight );
			throttledRender();
		};
		window.addEventListener( 'resize', onWindowResize, false );

		var showCapsInput = document.getElementById( 'showCaps' );
		this.showCaps = showCapsInput.checked;
		var onShowCaps = function () {
			self.showCaps = showCapsInput.checked;
			throttledRender();
		};
		showCapsInput.addEventListener( 'change', onShowCaps, false );

		throttledRender();

	},

	

	initScene: function ( collada ) {

		var setMaterial = function ( node, material ) {
			node.material = material;
			if ( node.children ) {
				for ( var i = 0; i < node.children.length; i++ ) {
					setMaterial( node.children[i], material );
				}
			}
		};

		var back = collada.clone();
		setMaterial( back, CAPS.MATERIAL.backStencil );
		//back.scale.set( 0.03, 0.03, 0.03 );
		back.updateMatrix();
		this.backStencil.add( back );

		var front = collada.clone();
		setMaterial( front, CAPS.MATERIAL.frontStencil );
		//front.scale.set( 0.03, 0.03, 0.03 );
		front.updateMatrix();
		this.frontStencil.add( front );

		setMaterial( collada, CAPS.MATERIAL.sheet );
		//collada.scale.set( 0.03, 0.03, 0.03 );
		collada.updateMatrix();
		this.scene.add( collada );

		this.throttledRender();

	},

	_render: function () {

		this.renderer.clear();

		var gl = this.renderer.context;

		if ( this.showCaps ) {

			this.renderer.state.setStencilTest( true );

			this.renderer.state.setStencilFunc( gl.ALWAYS, 1, 0xff );
			this.renderer.state.setStencilOp( gl.KEEP, gl.KEEP, gl.INCR );
			this.renderer.render( this.backStencil, this.camera );

			this.renderer.state.setStencilFunc( gl.ALWAYS, 1, 0xff );
			this.renderer.state.setStencilOp( gl.KEEP, gl.KEEP, gl.DECR );
			this.renderer.render( this.frontStencil, this.camera );

			this.renderer.state.setStencilFunc( gl.EQUAL, 1, 0xff );
			this.renderer.state.setStencilOp( gl.KEEP, gl.KEEP, gl.KEEP );
			this.renderer.render( this.capsScene, this.camera );

			this.renderer.state.setStencilTest( false );

		}

		this.renderer.render( this.scene, this.camera );

	},



};

