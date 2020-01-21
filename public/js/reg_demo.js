import * as THREE from './lib/three.module.js';
import { PCDLoader } from './lib/PCDLoader.js';
import { OrbitControls } from './lib/OrbitControls.js';
import { GUI } from './lib/dat.gui.module.js';
import {TextFileLoader} from "./text_file_loader.js";

var container, stats;
var camera, controls, scene, renderer;
var camera;


var params = {
    src: true,
    tgt: true,
    out: true,
    reload: load_all,
};

var last_cloud_ind = {
    src: true,
    tgt: true,
    out: true,
}

var clouds ={};

init();
animate();
function init() {
    document.body.addEventListener('keydown', event => {
        if (event.ctrlKey && 'asdv'.indexOf(event.key) !== -1) {
          event.preventDefault()
        }
    })


    scene = new THREE.Scene();



    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );


       
    camera = new THREE.PerspectiveCamera( 65, window.innerWidth / window.innerHeight, 1, 800 );
    camera.position.x = 0;
    camera.position.z = 50;
    camera.position.y = 0;
    camera.up.set( 0, 0, 1);
    camera.lookAt( 0, 0, 0 );

    
    controls = new OrbitControls( camera, renderer.domElement );
    controls.addEventListener( 'change', render ); // call this only in static scenes (i.e., if there is no animation loop)
    
    container = document.createElement( 'container' );
    

    document.body.appendChild( container );
    container.appendChild( renderer.domElement );

    document.addEventListener("keydown", keydown)

    init_gui();
    //scene.add( new THREE.AxesHelper( 2 ) );

    onWindowResize();
    window.addEventListener( 'resize', onWindowResize, false );
    
    load_all();
    
    render();
    
}

function load_all(){

    clearAll();
    load_pcd("src", "/temp/src.pcd", 0xff0000);
    load_pcd("tgt", "/temp/tgt.pcd", 0x00ff00);
    load_pcd("out", "/temp/out.pcd", 0xffff00);
    load_transform_matrix();
}

function clearAll(){
    
    remove(clouds["src"]);
    remove(clouds["tgt"]);
    remove(clouds["out"]);

    clouds["src"] = null;
    clouds["tgt"] = null;
    clouds["our"] = null;

    function remove(p){
        if (p){
            scene.remove(p);
            p.geometry.dispose();
            p.material.dispose();
        }
    }
}


function keydown( ev ) {
    
    switch ( ev.key) {
    case '+':
        clouds["src"].material.size *= 1.2;
        clouds["tgt"].material.size *= 1.2;
        clouds["out"].material.size *= 1.2;
        break;
    case '-':
        clouds["src"].material.size /= 1.2;
        clouds["tgt"].material.size /= 1.2;
        clouds["out"].material.size /= 1.2;
            
        break;
    }
}


function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );    
}
function animate() {
    requestAnimationFrame( animate );
    controls.update();   
    render();
    switch_cloud("src");
    switch_cloud("tgt");
    switch_cloud("out");

    function switch_cloud(name){
        if (params[name] != last_cloud_ind[name]){
            last_cloud_ind[name] = params[name];
            if (last_cloud_ind[name]){
                scene.add(clouds[name]);
            }else {
                scene.remove(clouds[name]);
            }
        }
    }
}


function render(){
    renderer.render( scene, camera );
}

function load_transform_matrix(){
    var loader = new TextFileLoader();
    loader.load( "/temp/trans.json",
        function(json){
            console.log(json);
            var mat = JSON.parse(json);

            var trans_html = "<table><tbody>";
            for (var i = 0; i<4; i++){

                trans_html += "<tr>";
                for (var j =0; j<4; j++)
                    trans_html += "<td>"+ mat[i*4+j] + "</td>";
                trans_html += "</tr>"
            }
            trans_html += "</tbody></table>";
            document.getElementById("info").innerHTML = trans_html;
        }
    )
}

function load_pcd(name, file, overall_color){
    var loader = new PCDLoader();

    loader.load( file, 
        function ( pcd ) {
            var position = pcd.position;
            var color = pcd.color;
            var normal = pcd.normal;
            // build geometry
            var geometry = new THREE.BufferGeometry();
            if ( position.length > 0 ) geometry.addAttribute( 'position', new THREE.Float32BufferAttribute( position, 3 ) );
            if ( normal.length > 0 ) geometry.addAttribute( 'normal', new THREE.Float32BufferAttribute( normal, 3 ) );
            if ( color.length > 0 ) geometry.addAttribute( 'color', new THREE.Float32BufferAttribute( color, 3 ) );

            geometry.computeBoundingSphere();
            // build material

            var material = new THREE.PointsMaterial( { size: 0.005 } );

            if ( color.length > 0 ) {
                material.vertexColors = VertexColors;
            } else {
                material.color.setHex(overall_color );
            }

            //material.size = 0.1;

            // build mesh

            var mesh = new THREE.Points( geometry, material );                        
            mesh.name = "pcd";

            //return mesh;
            if (params[name])
                scene.add(mesh);

            clouds[name] = mesh;
            //var center = points.geometry.boundingSphere.center;
            //controls.target.set( center.x, center.y, center.z );
            //controls.update();
        },
    );

}



function init_gui(){
    var gui = new GUI();

    var cfgFolder = gui.addFolder( 'View' );


    cfgFolder.add( params, "src");
    cfgFolder.add( params, "tgt");
    cfgFolder.add( params, "out");
    cfgFolder.add( params, "reload");
    cfgFolder.open();
    gui.open();
}