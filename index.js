// Constants

const BIRD_SPAWN_POS_Y = 5;
const BIRD_FLOAT_STRENGTH = 0.3;
const GRAVITY = - 0.01;
const JUMP_STRENGTH = 0.2;
const FLOAT_SPEED = 1;
const BIRD_SIZE = 1;
const PIPE_RADIUS = 1.5;
const PIPE_SPAWN_POS_X = 25;
const SPEED = 2;
const PIPE_SPAWN_TIME = 100;
const PIPE_TOTAL_HEIGHT = 14;
const PIPE_GAP_SIZE = 0.3;
const PIPE_MIN_SIZE = 0.2;
const RAIN_PARTICLES_COUNT = 150;
const CLOUD_COUNT = 8;
const SMOKE_PARTICLE_COUNT = 10;

const states = {
	MENU: 0,
	PLAY: 1,
	SCORE: 2
};

// Three.js stuff
let renderer, scene, camera;

// DOM elements
let canvasEl;

// Buttons
let playEl;
let githubEl;
let playAgainEl;

// Score elements
let scoreEl;
let scoreHudEl;

// State screen elements
let preloaderEl;
let menuEl;
let gameOverEl;

// THREE.Object3D instance representing bird
let bird;

// Why a global variable for this? Cos we update the offset
// of this texture to make the ground appear moving
let groundTexture;

// A variable for regulating the idle bird float animation on menu screen
let floatAnimation;

// Game state varibles
let currentState;
let velY;
let score;
let dead;

// Used to spawn pipes at regular intervals
let frames;

let pipes;

// For pipes
let cylinderGeometry, cylinderMaterial;

// For gameover smoke effect
let smokeParticles;
let smokeGeometry;
let smokeMaterial;

let rainParticles;
let clouds;

let gui;
let guiObject;

// For updating the rotation of the wings later in update function
let wing1;
let wing2;

init();
animate();

// Initializes all the varibles and adds appropiate event listeners 
// to buttons

function init() {

	// init game variables
	floatAnimation = 0;
	currentState = states.MENU;
	velY = 0;
	frames = 0;
	pipes = [];
	score = 0;
	dead = false;

	// create gui component
	gui = new dat.GUI();

	// for storing gui options
	guiObject = {};

	// get canvas to render on
	canvasEl = document.getElementById( 'canvas' );

	// create a webgl renderer
	renderer = new THREE.WebGLRenderer( {
		canvas: canvasEl,
		alpha: true,
		antialias: true,
		alpha: true
	} );

	renderer.outputEncoding = THREE.sRGBEncoding;
	renderer.shadowMap.enabled = true;

	// set the size of the renderer
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setPixelRatio( window.devicePixelRatio );

	// create scene and camera
	scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.1, 1000 );

	// position the camera
	camera.position.set( 0, 4, 14 );

	// create and add the bird object to the scene
	bird = new THREE.Object3D();
	scene.add( bird );

	// HERE
	const model = BirdModel();
	wing1 = model.getObjectByName( 'wing1' );
	wing2 = model.getObjectByName( 'wing2' );
	bird.add( model );

	// set the scene background color and the fog
	const bgColor = new THREE.Color( 'lightblue' );
	scene.background = bgColor;
	scene.fog = new THREE.Fog( bgColor, 0, 50 );

	createScene();

	// create a wrapper object for the rain particles
	rainParticles = new THREE.Object3D();
	scene.add( rainParticles );

	// rain geometry and material
	const boxGeometry = new THREE.BoxBufferGeometry();
	const rainMaterial = new THREE.MeshPhongMaterial( { color: 'blue' } );

	// add random rain particles
	for ( let i = 0; i < RAIN_PARTICLES_COUNT; i ++ ) {

		const mesh = new THREE.Mesh( boxGeometry, rainMaterial );
		mesh.position.x = - PIPE_SPAWN_POS_X + Math.random() * PIPE_SPAWN_POS_X * 2;
		mesh.position.y = Math.random() * PIPE_TOTAL_HEIGHT * 2;
		mesh.rotation.z = - Math.PI / 4;
		mesh.position.z = Math.random() * 18 - 10;
		mesh.speed = Math.random() + 0.5;
		mesh.scale.set( 0.2, 1.5, 0.2 );
		rainParticles.add( mesh );

	}

	// wrapper object for the clouds
	clouds = new THREE.Object3D();
	clouds.position.y = PIPE_TOTAL_HEIGHT;
	clouds.position.z = - 10;
	scene.add( clouds );

	const cloudMaterial = new THREE.MeshLambertMaterial( { color: 'white' } );

	// add random clouds
	for ( let i = 0; i < CLOUD_COUNT; i ++ ) {

		const cloud = new THREE.Mesh( boxGeometry, cloudMaterial );
		cloud.position.x = Math.random() * PIPE_SPAWN_POS_X * 2 - PIPE_SPAWN_POS_X;
		cloud.position.y = Math.random() * 5;
		cloud.scale.set( Math.random() * 2 + 2, Math.random() * 0.5 + 0.7, Math.random() * 2 + 0.5 );
		cloud.speed = Math.random() * 0.2 + 0.2;
		clouds.add( cloud );

	}

	// smoke geometry and material
	smokeGeometry = new THREE.SphereBufferGeometry();
	smokeMaterial = new THREE.MeshLambertMaterial( {
		color: 'white'
	} );

	// wrapper object for smoke particles
	smokeParticles = new THREE.Object3D();
	scene.add( smokeParticles );

	// get the preloader element and hide it
	preloaderEl = document.getElementById( 'preloader' );
	preloaderEl.style.display = 'none';

	// show the menu element
	menuEl = document.getElementById( 'menu' );
	menuEl.style.display = '';

	// get other elements
	gameOverEl = document.getElementById( 'gameOver' );

	playEl = document.getElementById( 'play' );
	githubEl = document.getElementById( 'github' );
	playAgainEl = document.getElementById( 'playAgain' );

	scoreEl = document.getElementById( 'score' );
	scoreHudEl = document.getElementById( 'scoreHud' );

	// add event listeners to the buttons

	playEl.onclick = function () {

		// hide the appropiate elements and start the game
		menuEl.style.display = 'none';
		scoreHudEl.style.display = '';
		scoreHudEl.innerHTML = score;

		currentState = states.PLAY;
		jump();

	}

	githubEl.onclick = function () {

		// open github link
		window.open( 'https://github.com/bytezeroseven', '_open' );

	}

	playAgainEl.onclick = function () {

		// update UI
		menuEl.style.display = '';
		gameOverEl.style.display = 'none';

		// reset game state
		currentState = states.MENU;
		bird.position.y = BIRD_SPAWN_POS_Y;
		bird.rotation.z = 0;
		floatAnimation = 0;
		velY = 0;
		score = 0;
		dead = false;

		// remove the pipes
		for ( let i = 0; i < pipes.length; i ++ ) {

			scene.remove( pipes[ i ] );

		}

		// remove the smoke
		smokeParticles.children.length = 0;

		// clear pipe array
		pipes.length = 0;

	}

	// other event listeners

	document.oncontextmenu = function () { return false; }

	window.addEventListener( 'resize', onWindowResize, false );
	window.addEventListener( 'keydown', onKeyDown, false );
	canvasEl.addEventListener( 'mousedown', jump, false );
	canvasEl.addEventListener( 'touchstart', jump, false );

}

function animate() {

	// the speed to move the objects with
	const objectMoveSpeed = 0.05 * SPEED;

	// updates the smoke particles
	for ( let i = 0; i < smokeParticles.children.length; i ++ ) {

		const particle = smokeParticles.children[ i ];

		particle.scale.setScalar( particle.scale.x * 0.95 );

		particle.position.y += particle.scale.x * 0.2;

	}

	// updates the rain particles
	for ( let i = 0; i < rainParticles.children.length; i ++ ) {

		const particle = rainParticles.children[ i ];

		particle.translateY( - objectMoveSpeed * particle.speed * 2 );

		if ( currentState !== states.SCORE ) {

			particle.position.x -= 0.1;

		}

		// if the rain particle is outside the screen, then move the rain particle 
		// to the top of the screen
		if ( particle.position.x < - PIPE_SPAWN_POS_X - Math.abs( particle.position.z ) ) {

			particle.position.x = PIPE_SPAWN_POS_X + Math.abs( particle.position.z );

		}

		if ( particle.position.y < - particle.scale.y ) {

			particle.position.y = PIPE_TOTAL_HEIGHT * 2;

		}

	}

	// update clounds

	for ( let i = 0; i < clouds.children.length; i ++ ) {

		const cloud = clouds.children[ i ];

		let v = - cloud.speed * objectMoveSpeed;

		if ( currentState === states.SCORE ) {
			 
			 v *= 0.1;

		}

		cloud.position.x += v;

		// if the cloud moves outside the view, move it at the right of the screen

		if ( cloud.position.x < - PIPE_SPAWN_POS_X * 1.5 ) {

			cloud.position.x = PIPE_SPAWN_POS_X * 1.5;

		}

	}

	if ( currentState === states.MENU ) {

		// Idle float animation for the bird
		floatAnimation += 0.04;
		const sin = Math.sin( floatAnimation );
		const float = sin * BIRD_FLOAT_STRENGTH;
		bird.position.y = BIRD_SPAWN_POS_Y + float;

		// update the wing rotations
		if ( wing1 && wing2 ) {

			const wingRotation = sin * 0.8;
			wing1.rotation.x = wingRotation;
			wing2.rotation.x = Math.PI - wingRotation;

		}

	} else {

		if ( currentState === states.PLAY ) {

			for ( let i = 0; i < pipes.length; i ++ ) {

				const pipe = pipes[ i ];

				// move the pipe to the left
				pipe.position.x -= objectMoveSpeed;

				// if pipe is outside the screen, remove it
				if ( pipe.position.x < - PIPE_SPAWN_POS_X ) {

					scene.remove( pipe );
					pipes.splice( i, 1 );
					continue;

				}

				// if bird has crossed the pipe, increment the score
				if ( pipe.position.x < bird.position.x && ! pipe.pointCollected && ! pipe.otherPipe.pointCollected ) {

					score += 1;
					// update socre hud
					scoreHudEl.innerHTML = score;
					pipe.pointCollected = true;

					// play point sound
					new Audio( 'point.mp3' ).play();

				}

				// if the bird collides with the pipe, die
				if ( bird.position.x + BIRD_SIZE / 2 > pipe.position.x - PIPE_RADIUS &&
					bird.position.x - BIRD_SIZE / 2 < pipe.position.x + PIPE_RADIUS &&
					bird.position.y + BIRD_SIZE / 2 > pipe.position.y - pipe.height / 2 &&
					bird.position.y - BIRD_SIZE / 2 < pipe.position.y + pipe.height / 2 ) {

					die();

				}

			}

			// every PIPE_SPAWN_TIME number of frames spawn two new pipes
			if ( frames % PIPE_SPAWN_TIME === 0 ) {

				// bottom pipe
				const h1 = PIPE_TOTAL_HEIGHT * ( Math.random() * ( 1 - PIPE_MIN_SIZE * 2 - PIPE_GAP_SIZE ) + PIPE_MIN_SIZE );
				const p1 = new THREE.Object3D();
				p1.position.y = h1 / 2;
				p1.position.x = PIPE_SPAWN_POS_X;
				p1.height = h1;

				// HERE
				p1.add( PipeModel( h1 ) );

				scene.add( p1 );
				pipes.push( p1 );

				// top pipe
				const h2 = PIPE_TOTAL_HEIGHT - ( PIPE_GAP_SIZE * PIPE_TOTAL_HEIGHT + h1 );
				const p2 = new THREE.Object3D();
				p2.position.y = PIPE_TOTAL_HEIGHT - h2 / 2;
				p2.position.x = PIPE_SPAWN_POS_X;
				p2.height = h2;
				p2.rotation.x = Math.PI;
				scene.add( p2 );
				pipes.push( p2 );

				// HERE
				p2.add( PipeModel( h2 ) );

				p1.otherPipe = p2;
				p2.otherPipe = p1;

			}

			// increment the frames
			frames ++;

		}

		// if bird hits the ground, die
		if ( bird.position.y < BIRD_SIZE / 2 ) {

			velY = 0;

			if ( ! dead ) {
			
				die();

			}

		} else {

			// physics
			velY += GRAVITY;
			bird.position.y += velY;
			bird.rotation.z = bird.rotation.z * 0.8 + ( velY * 4 ) * 0.2;

			// update wing rotation
			if ( wing1 && wing2 ) {

				const wingRotation = bird.rotation.z * 2;
				wing1.rotation.x = wingRotation;
				wing2.rotation.x = Math.PI - wingRotation;

			}

		}

	}

	// if not on score screen, make the ground
	if ( currentState !== states.SCORE ) {

		groundTexture.offset.x += 0.02 * SPEED;

	}

	renderer.render( scene, camera );

	window.requestAnimationFrame( animate );

}

function die() {

	// update the ui
	dead = true;
	currentState = states.SCORE;
	scoreHudEl.style.display = 'none';
	gameOverEl.style.display = '';
	scoreEl.innerHTML = score;

	// play the dead sound
	new Audio( 'hit.mp3' ).play();

	// all some random smoke particles
	smokeParticles.position.copy( bird.position );

	for ( let i = 0; i < SMOKE_PARTICLE_COUNT; i ++ ) {

		const mesh = new THREE.Mesh( smokeGeometry, smokeMaterial );
		mesh.scale.setScalar( Math.random() );
		mesh.position.set( Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5 );
		smokeParticles.add( mesh );

	}

}

function jump() {

	// only jump if the bird is in the screen or players will be able cheat
	// by going too high and not colliding with the pipes
	if ( bird.position.y < PIPE_TOTAL_HEIGHT ) {

		velY = JUMP_STRENGTH;

		// play the jump sound
		new Audio( 'wing.mp3' ).play();

	}

}

// 

function createScene() {

	guiObject[ 'dir light color' ] = '#fff';
	guiObject[ 'dir light intensity' ] = 0.5;

	guiObject[ 'ambient light color' ] = '#fff';
	guiObject[ 'ambient light intensity' ] = 0.5;

	// lighting

	const dirLight = new THREE.DirectionalLight( guiObject[ 'dir light color' ], guiObject[ 'dir light intensity' ] );
	dirLight.position.set( 50, 60, 50 );
	dirLight.castShadow = true;
	scene.add( dirLight );

	const ambientLight = new THREE.AmbientLight( guiObject[ 'ambient light color' ], guiObject[ 'ambient light intensity' ] );
	scene.add( ambientLight );

	// add gui components for the lights

	gui.addColor( guiObject, 'dir light color' ).onChange( function ( value ) {

		dirLight.color.set( value );

	} );

	gui.add( guiObject, 'dir light intensity', 0, 1.0, 0.05 ).onChange( function ( value ) {

		dirLight.intensity = value;

	} );

	gui.addColor( guiObject, 'ambient light color' ).onChange( function ( value ) {

		ambientLight.color.set( value );

	} );

	gui.add( guiObject, 'ambient light intensity', 0, 1.0, 0.05 ).onChange( function ( value ) {

		ambientLight.intensity = value;

	} );

	// initialize the ground texture
	groundTexture = new THREE.CanvasTexture( GroundTexture() );

	// set the repeat amount
	groundTexture.repeat.setScalar( 60 );

	// make the texture to repeat
	groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
	groundTexture.minFilter = groundTexture.magFilter = THREE.NearestFilter;

	// ground
	const groundColor = '#0f0';

	const groundMaterial = new THREE.MeshLambertMaterial( {
		map: groundTexture,
		transparent: true,
		color: groundColor
	} );

	// add gui component for the color of the ground

	guiObject[ 'grass color' ] = groundColor;

	gui.addColor( guiObject, 'grass color' ).onChange( function ( value ) {

		groundMaterial.color.set( value );

	} );

	// create the ground and add it to the scene
	const ground = new THREE.Mesh( new THREE.PlaneBufferGeometry( 150, 150 ), groundMaterial );
	ground.receiveShadow = true;
	ground.rotation.x = - Math.PI / 2;
	scene.add( ground );

}

// creates a pipe model

function PipeModel( height ) {

	if ( ! cylinderGeometry ) {

		cylinderGeometry = new THREE.CylinderBufferGeometry( PIPE_RADIUS, PIPE_RADIUS, 1 );
		cylinderMaterial = new THREE.MeshLambertMaterial( {
			color: 'green'
		} );

	}

	const model = new THREE.Object3D();

	const base = new THREE.Mesh( cylinderGeometry, cylinderMaterial );
	base.scale.y = height;
	model.add( base );

	const top = new THREE.Mesh( cylinderGeometry, cylinderMaterial );
	top.scale.y = 0.4;
	model.add( top );

	top.scale.x = top.scale.z = 1.1;
	top.position.y = height / 2 - top.scale.y / 2;

	return model;

}

// creates a dummy bird model

function BirdModel() {

	const boxGeometry = new THREE.BoxBufferGeometry();
	const birdMaterial = new THREE.MeshLambertMaterial( { color: '#ff6900'} );

	const bird = new THREE.Mesh( boxGeometry, birdMaterial );

	const redMaterial = new THREE.MeshLambertMaterial( {
		color: 'red'
	} );

	const wing1 = new THREE.Object3D();
	wing1.name = 'wing1';
	wing1.scale.set( 0.6, 0.2, 0.7 );
	wing1.position.z = 0.5;
	bird.add( wing1 );

	const wingMesh = new THREE.Mesh( boxGeometry, redMaterial );
	wingMesh.position.z = 0.5;
	wing1.add( wingMesh );

	const wing2 = wing1.clone( true );
	wing2.name = 'wing2';
	wing2.position.z *= - 1;
	bird.add( wing2 );

	const coneGeometry = new THREE.ConeBufferGeometry( 1, 1 );

	const peak = new THREE.Mesh( coneGeometry, redMaterial );
	peak.rotation.z = - Math.PI / 2;
	peak.scale.set( 0.1, 0.5, 0.5 );
	peak.position.x = 0.5 + peak.scale.y / 2;
	bird.add( peak );

	const tail = new THREE.Mesh( coneGeometry, redMaterial );
	tail.rotation.z = - Math.PI / 2;
	tail.position.x = - 0.5;
	tail.scale.set( 0.25, 0.5, 0.25 );
	bird.add( tail );

	return bird;

}

// ground texture generated using canvas

function GroundTexture() {

	const canvas = document.createElement( 'canvas' );
	canvas.width = canvas.height = 64;

	const context = canvas.getContext( '2d' );

	context.fillStyle = '#fff';
	context.fillRect( 0, 0, canvas.width, canvas.height );

	context.fillStyle = 'rgba(0, 0, 0, 0.5)';
	context.fillRect( 10, 10, 30, 30 );

	context.fillStyle = 'rgba(0, 0, 0, 0.3)';
	context.fillRect( 45, 45, 15, 15 );

	return canvas;

}

function onWindowResize() {

	renderer.setSize( window.innerWidth, window.innerHeight );

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.render( scene, camera );

}

function onKeyDown( event ) {

	if ( event.keyCode === 32 ) {

		jump();

	}

}
