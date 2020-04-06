import * as THREE from './lib/three.module.js';
import { OrbitControls } from './lib/OrbitControls.js';
import { OrthographicTrackballControls } from './lib/OrthographicTrackballControls.js';
import { TransformControls } from './lib/TransformControls.js';



function ViewManager(main_ui_container, webgl_scene, renderer, globalRenderFunc, on_box_changed, cfg){

    let subviewWidth = 0.2;

    if (cfg && cfg.subviewWidth){        
        subviewWidth = cfg.subviewWidth;
    }

    let viewCfg = [
        {
            backgroundColor: new THREE.Color( 0.0, 0.0, 0.0 ),
        },
        {
            backgroundColor: new THREE.Color( 0.1, 0.1, 0.2 ),
        },
        {
            backgroundColor: new THREE.Color( 0.1, 0.2, 0.1 ),
            
        },
        {
            backgroundColor: new THREE.Color( 0.2, 0.1, 0.1 ),
        }
    ];

    var container = main_ui_container;

    this.container = main_ui_container;
    this.views= [
        cfg.disableMainView?null:create_main_view(viewCfg[0].backgroundColor, webgl_scene,  renderer, globalRenderFunc, this.container, on_box_changed),
        createTopView(viewCfg[1].backgroundColor, webgl_scene),
        createSideView(viewCfg[2].backgroundColor, webgl_scene),
        createBackView(viewCfg[3].backgroundColor, webgl_scene, renderer, container),   
    ];


    // no code after this line
        
    function create_main_view(backgroundColor, scene, renderer, globalglobalRenderFunc, dom, on_box_changed){
        var view ={};
        view.backgroundColor=backgroundColor;
        view.zoom_ratio = 1.0; //useless for mainview
            
        var camera = new THREE.PerspectiveCamera( 65, container.clientWidth / container.clientHeight, 1, 800 );
        camera.position.x = 0;
        camera.position.z = 50;
        camera.position.y = 0;
        camera.up.set( 0, 0, 1);
        camera.lookAt( 0, 0, 0 );
        view.camera_perspective = camera;
        view.container = dom;
        view.renderer = renderer;
        view.scene = scene;


        //var cameraOrthoHelper = new THREE.CameraHelper( camera );
        //cameraOrthoHelper.visible=true;
        //scene.add( cameraOrthoHelper );

        view.render=function(){
            this.switch_camera(false);

            
            //view.updateCamera( camera, scene, mouseX, mouseY );
            
            var left = 0;
            var bottom = 0;
            var width = this.container.scrollWidth;
            var height = this.container.scrollHeight;

            // update viewport, so the operating lines over these views 
            // will be updated in time.
            
            
            //console.log(left,bottom, width, height);

            this.renderer.setViewport( left, bottom, width, height );
            this.renderer.setScissor( left, bottom, width, height );
            this.renderer.setClearColor(view.backgroundColor );
            this.renderer.setScissorTest( true );

            this.renderer.render( this.scene, this.camera );
        };

        var orbit_perspective = new OrbitControls( view.camera_perspective, dom );
        orbit_perspective.update();
        orbit_perspective.addEventListener( 'change', globalRenderFunc );
        orbit_perspective.enabled = false;
        view.orbit_perspective = orbit_perspective;

        var transform_control = new TransformControls(camera, dom );
        transform_control.setSpace("local");
        transform_control.addEventListener( 'change', globalRenderFunc );
        transform_control.addEventListener( 'objectChange', function(e){on_box_changed(e.target.object);});
        
        transform_control.addEventListener( 'dragging-changed', function ( event ) {
            view.orbit_perspective.enabled = ! event.value;
        } );
        transform_control.visible = false;
        //transform_control.enabled = false;
        scene.add( transform_control );
        view.transform_control_perspective = transform_control;




        var width = container.clientWidth;
        var height = container.clientHeight;
        var asp = width/height;

        //camera = new THREE.OrthographicCamera(-800*asp, 800*asp, 800, -800, -800, 800);       
        // camera.position.x = 0;
        // camera.position.z = 0;
        // camera.position.y = 0;
        // camera.up.set( 1, 0, 0);
        // camera.lookAt( 0, 0, -3 );

        //camera = new THREE.OrthographicCamera( container.clientWidth / - 2, container.clientWidth / 2, container.clientHeight / 2, container.clientHeight / - 2, -400, 400 );
        
        camera = new THREE.OrthographicCamera(-asp*200, asp*200, 200, -200, -200, 200 );
        camera.position.z = 50;
        

        // var cameraOrthoHelper = new THREE.CameraHelper( camera );
        // cameraOrthoHelper.visible=true;
        // scene.add( cameraOrthoHelper );

        
        view.camera_orth = camera;

        // var orbit_orth = new OrbitControls( view.camera_orth, dom );
        // orbit_orth.update();
        // orbit_orth.addEventListener( 'change', render );
        // orbit_orth.enabled = false;
        // view.orbit_orth = orbit_orth;

        var orbit_orth = new OrthographicTrackballControls( view.camera_orth, dom );
        orbit_orth.rotateSpeed = 1.0;
        orbit_orth.zoomSpeed = 1.2;
        orbit_orth.noZoom = false;
        orbit_orth.noPan = false;
        orbit_orth.noRotate = false;
        orbit_orth.staticMoving = true;
        
        orbit_orth.dynamicDampingFactor = 0.3;
        orbit_orth.keys = [ 65, 83, 68 ];
        orbit_orth.addEventListener( 'change', globalRenderFunc );
        orbit_orth.enabled=true;
        view.orbit_orth = orbit_orth;
        
        transform_control = new TransformControls(view.camera_orth, dom );
        transform_control.setSpace("local");
        transform_control.addEventListener( 'change', globalRenderFunc );
        transform_control.addEventListener( 'objectChange', function(e){on_box_changed(e.target.object);} );
        
        
        transform_control.addEventListener( 'dragging-changed', function ( event ) {
            view.orbit_orth.enabled = ! event.value;
        } );


        transform_control.visible = false;
        //transform_control.enabled = true;
        scene.add( transform_control );
        view.transform_control_orth = transform_control;



        view.camera = view.camera_orth;
        view.orbit = view.orbit_orth;
        view.transform_control = view.transform_control_orth;


        view.switch_camera = function(birdseye)        
        {
            
            if (!birdseye && (this.camera === this.camera_orth)){
                this.camera = this.camera_perspective;
                this.orbit_orth.enabled=false;
                this.orbit_perspective.enabled=true;
                this.orbit = this.orbit_perspective;

                
                this.transform_control_perspective.detach();
                this.transform_control_orth.detach();

                this.transform_control_orth.enabled=false;
                this.transform_control_perspective.enabled=true;
                //this.transform_control_perspective.visible = false;
                //this.transform_control_orth.visible = false;
                this.transform_control = this.transform_control_perspective;
            }
            else if (birdseye && (this.camera === this.camera_perspective))
            {
                this.camera = this.camera_orth;
                this.orbit_orth.enabled=true;
                this.orbit_perspective.enabled=false;
                this.orbit = this.orbit_orth;

                this.transform_control_perspective.detach();
                this.transform_control_orth.detach();
                this.transform_control_orth.enabled=true;
                this.transform_control_perspective.enabled=false;
                this.transform_control = this.transform_control_orth;
            }

            this.camera.updateProjectionMatrix();
        };

        view.reset_camera = function(){
            var camera = this.camera_perspective;
            camera.position.x = 0;
            camera.position.z = 50;
            camera.position.y = 0;
            camera.up.set( 0, 0, 1);
            camera.lookAt( 0, 0, 0 );
            camera.updateProjectionMatrix();

            this.orbit_perspective.reset();   // this func will call render()
        };

        view.look_at = function(p){
            if (this.orbit === this.orbit_perspective){
                this.orbit.target.x=p.x;
                this.orbit.target.y=p.y;
                this.orbit.target.z=p.z;
                this.orbit.update();
            }
        };

        view.onWindowResize = function(){

            

            var asp = container.clientWidth/container.clientHeight;
            this.camera_orth.left = -asp*200;
            this.camera_orth.right = asp*200;
            this.camera_orth.top = 200;
            this.camera_orth.bottom = -200
            this.camera_orth.updateProjectionMatrix();

            this.orbit_orth.handleResize();
            this.orbit_orth.update();
            
            this.camera_perspective.aspect = container.clientWidth / container.clientHeight;
            this.camera_perspective.updateProjectionMatrix();
            
        };

        view.reset_birdseye = function(){
            this.orbit_orth.reset(); // 
        };
        view.rotate_birdseye = function(){
            this.camera_orth.up.set( 1, 0, 0);
            this.orbit_orth.update();
        }
        view.detach_control = function(){
            this.transform_control.detach();
        }

        view.target0 = view.orbit.target.clone();
        view.position0 = view.camera.position.clone();
        view.zoom0 = view.camera.zoom;
        view.scale0 = null;
        
        view.save_orbit_state = function(highlight_obj_scale){
            this.target0.copy( this.orbit.target );
            this.position0.copy( this.camera.position );
            this.zoom0 = this.camera.zoom;
            this.scale0 = {x: highlight_obj_scale.x, y: highlight_obj_scale.y, z: highlight_obj_scale.z};
        }

        view.restore_relative_orbit_state = function(highlight_obj_scale){

            if (view.scale0){
                
                var obj_size = Math.sqrt(view.scale0.x*view.scale0.x + view.scale0.y*view.scale0.y + view.scale0.z*view.scale0.z);
                var target_obj_size = Math.sqrt(highlight_obj_scale.x*highlight_obj_scale.x + highlight_obj_scale.y*highlight_obj_scale.y + highlight_obj_scale.z*highlight_obj_scale.z);
                var ratio  = target_obj_size/obj_size;


                this.camera.position.x = this.orbit.target.x + (this.position0.x - this.target0.x)*ratio;
                this.camera.position.y = this.orbit.target.y + (this.position0.y - this.target0.y)*ratio;
                this.camera.position.z = this.orbit.target.z + (this.position0.z - this.target0.z)*ratio;

                this.camera.zoom = this.zoom0;
            } else {
                this.camera.position.set(
                    this.orbit.target.x + highlight_obj_scale.x*3, 
                    this.orbit.target.y + highlight_obj_scale.y*3, 
                    this.orbit.target.z + highlight_obj_scale.z*3);
            }
            // target is set 
        }


        return view;
    }


    function createTopView(backgroundColor, scene){
        var view = {};
        view.zoom_ratio = 1.0;
        view.backgroundColor = backgroundColor;
        view.container = container;
        view.scene = scene;
        view.renderer = renderer;
        view.placeHolderUi = container.offsetParent.querySelector("#z-view-manipulator");
        //var camera = new THREE.PerspectiveCamera( 65, container.clientWidth / container.clientHeight, 1, 800 );
        var width = container.clientWidth;
        var height = container.clientHeight;
        var asp = width/height;

        var camera = new THREE.OrthographicCamera( -3*asp, 3*asp, 3, -3, -3, 3 );

        var cameraOrthoHelper = new THREE.CameraHelper( camera );
        cameraOrthoHelper.visible=false;
        scene.add( cameraOrthoHelper );
        view["cameraHelper"] = cameraOrthoHelper;

        camera.position.x = 0;
        camera.position.z = 0;
        camera.position.y = 0;
        //camera.up.set( 0, 1, 0);
        //camera.lookAt( 0, 0, -3 );

        camera.rotation.x=0;
        camera.rotation.y=0;
        camera.rotation.z=-Math.PI/2;;

        view.camera = camera;

        view.getViewPort = function(){
            return {
                left : view.placeHolderUi.offsetLeft,
                bottom : view.container.scrollHeight - (view.placeHolderUi.offsetTop + view.placeHolderUi.clientHeight),
                width : view.placeHolderUi.clientWidth,
                height : view.placeHolderUi.clientHeight,
                zoom_ratio: this.zoom_ratio,
            }
        };

        view.updateCameraRange=function(box){

            var exp_camera_width, exp_camera_height, exp_camera_clip;
            
            //view.width = 0.2;//params["side view width"];

            var view_width = view.placeHolderUi.clientWidth;
            var view_height = view.placeHolderUi.clientHeight;

            exp_camera_height = box.scale.x*1.5*view.zoom_ratio;
            exp_camera_width = box.scale.y*1.5*view.zoom_ratio;
            exp_camera_clip = box.scale.z+0.8;

            if (exp_camera_width/exp_camera_height > view_width/view_height){
                //increase height
                exp_camera_height = exp_camera_width * view_height/view_width;
            }
            else
            {
                exp_camera_width = exp_camera_height * view_width/view_height;
            }

            this.camera.top = exp_camera_height/2;
            this.camera.bottom = exp_camera_height/-2;
            this.camera.right = exp_camera_width/2;
            this.camera.left = exp_camera_width/-2;

            this.camera.near = exp_camera_clip/-2;
            this.camera.far = exp_camera_clip/2;
            
            //camera.aspect = view_width / view_height;
            this.camera.updateProjectionMatrix();
            this.cameraHelper.update();
        },

        view.render=function(){
            //view.updateCamera( camera, scene, mouseX, mouseY );
            
            let left = view.placeHolderUi.offsetLeft;
            let bottom = view.container.scrollHeight - (view.placeHolderUi.offsetTop + view.placeHolderUi.clientHeight);
            let width = view.placeHolderUi.clientWidth;
            let height = view.placeHolderUi.clientHeight;

            // update viewport, so the operating lines over these views 
            // will be updated in time.
            
            
            //console.log(left,bottom, width, height);

            this.renderer.setViewport( left, bottom, width, height );
            this.renderer.setScissor( left, bottom, width, height );
            this.renderer.setClearColor(view.backgroundColor );
            this.renderer.setScissorTest( true );

            this.renderer.render( this.scene, this.camera );
        };


        return view;
    }

    function createSideView(backgroundColor, scene){
        var view = {};
        view.zoom_ratio = 1.0;
        view.backgroundColor=backgroundColor;
        view.container = container;
        view.scene = scene;
        view.renderer = renderer;
        view.placeHolderUi = container.offsetParent.querySelector("#y-view-manipulator");
        //var camera = new THREE.PerspectiveCamera( 65, container.clientWidth / container.clientHeight, 1, 800 );
        var width = container.clientWidth;
        var height = container.clientHeight;
        var asp = width/height;

        var camera = new THREE.OrthographicCamera( -3*asp, 3*asp, 3, -3, -3, 3 );

        var cameraOrthoHelper = new THREE.CameraHelper( camera );
        cameraOrthoHelper.visible=false;
        scene.add( cameraOrthoHelper );
        view["cameraHelper"] = cameraOrthoHelper;
                
        camera.position.x = 0;
        camera.position.z = 0;
        camera.position.y = 0;
        //camera.up.set( 0, 0, 1);
        //camera.lookAt( 0, 3, 0 );

        //camera.up.set( 0, 1, 0);
        //camera.lookAt( 0, 0, -3 );

        camera.rotation.x=Math.PI/2;
        camera.rotation.y=0;
        camera.rotation.z=0;

        view.camera = camera;

        view.getViewPort = function(){
            return {
                left : view.placeHolderUi.offsetLeft,
                bottom : view.container.scrollHeight - (view.placeHolderUi.offsetTop + view.placeHolderUi.clientHeight),
                width : view.placeHolderUi.clientWidth,
                height : view.placeHolderUi.clientHeight,
                zoom_ratio: this.zoom_ratio,
            }
        };

        view.updateCameraRange=function(box){

            var exp_camera_width, exp_camera_height, exp_camera_clip;
            
            //view.width = 0.2;//params["side view width"];

            var view_width = view.placeHolderUi.clientWidth;
            var view_height = view.placeHolderUi.clientHeight;

            exp_camera_width = box.scale.x*1.5*view.zoom_ratio;
            exp_camera_height = box.scale.z*1.5*view.zoom_ratio;

            exp_camera_clip = box.scale.y*1.2;
            
            if (exp_camera_width/exp_camera_height > view_width/view_height){
                //increase height
                exp_camera_height = exp_camera_width * view_height/view_width;
            }
            else
            {
                exp_camera_width = exp_camera_height * view_width/view_height;
            }

            this.camera.top = exp_camera_height/2;
            this.camera.bottom = exp_camera_height/-2;
            this.camera.right = exp_camera_width/2;
            this.camera.left = exp_camera_width/-2;

            this.camera.near = exp_camera_clip/-2;
            this.camera.far = exp_camera_clip/2;
            
            //camera.aspect = view_width / view_height;
            this.camera.updateProjectionMatrix();
            this.cameraHelper.update();
        },

        view.render=function(){
            let left = view.placeHolderUi.offsetLeft;
            let bottom = view.container.scrollHeight - (view.placeHolderUi.offsetTop + view.placeHolderUi.clientHeight);
            let width = view.placeHolderUi.clientWidth;
            let height = view.placeHolderUi.clientHeight;

            // update viewport, so the operating lines over these views 
            // will be updated in time.
            
            
            //console.log(left,bottom, width, height);

            this.renderer.setViewport( left, bottom, width, height );
            this.renderer.setScissor( left, bottom, width, height );
            this.renderer.setClearColor(view.backgroundColor );
            this.renderer.setScissorTest( true );

            this.renderer.render( this.scene, this.camera );
        };



        return view;
    }

    function createBackView(backgroundColor, scene, renderer, container){
        var view = {};
        view.zoom_ratio = 1.0;
        view.backgroundColor=backgroundColor;
        view.container = container;
        view.scene = scene;
        view.renderer = renderer;
        view.placeHolderUi = container.offsetParent.querySelector("#x-view-manipulator");
        //var camera = new THREE.PerspectiveCamera( 65, container.clientWidth / container.clientHeight, 1, 800 );
        var width = container.clientWidth;
        var height = container.clientHeight;
        var asp = width/height;

        var camera = new THREE.OrthographicCamera( -3*asp, 3*asp, 3, -3, -3, 3 );

        var cameraOrthoHelper = new THREE.CameraHelper( camera );
        cameraOrthoHelper.visible=false;
        scene.add( cameraOrthoHelper );
        view["cameraHelper"] = cameraOrthoHelper;
                
        camera.position.x = 0;
        camera.position.z = 0;
        camera.position.y = 0;
        camera.up.set( 0, 0, 1);
        camera.lookAt( -3, 0, 0 );

        camera.rotation.x=Math.PI/2;
        camera.rotation.y=Math.PI/2;
        camera.rotation.z=0;

        view.camera = camera;


        view.getViewPort = function(){
            return {
                left : view.placeHolderUi.offsetLeft,
                bottom : view.container.scrollHeight - (view.placeHolderUi.offsetTop + view.placeHolderUi.clientHeight),
                width : view.placeHolderUi.clientWidth,
                height : view.placeHolderUi.clientHeight,
                zoom_ratio: this.zoom_ratio,
            }
        };

        view.updateCameraRange=function(box){

            var exp_camera_width, exp_camera_height, exp_camera_clip;
            
            //view.width = 0.2;//params["side view width"];

            var view_width = view.placeHolderUi.clientWidth;
            var view_height = view.placeHolderUi.clientHeight;

            exp_camera_width = box.scale.y*1.5*view.zoom_ratio;
            exp_camera_height = box.scale.z*1.5*view.zoom_ratio;
            exp_camera_clip = box.scale.x*1.2;
            
            if (exp_camera_width/exp_camera_height > view_width/view_height){
                //increase height
                exp_camera_height = exp_camera_width * view_height/view_width;
            }
            else
            {
                exp_camera_width = exp_camera_height * view_width/view_height;
            }

            this.camera.top = exp_camera_height/2;
            this.camera.bottom = exp_camera_height/-2;
            this.camera.right = exp_camera_width/2;
            this.camera.left = exp_camera_width/-2;

            this.camera.near = exp_camera_clip/-2;
            this.camera.far = exp_camera_clip/2;
            
            //camera.aspect = view_width / view_height;
            this.camera.updateProjectionMatrix();
            this.cameraHelper.update();
        },

        view.render=function(){
            let left = view.placeHolderUi.offsetLeft;
            let bottom = view.container.scrollHeight - (view.placeHolderUi.offsetTop + view.placeHolderUi.clientHeight);
            let width = view.placeHolderUi.clientWidth;
            let height = view.placeHolderUi.clientHeight;

            this.renderer.setViewport( left, bottom, width, height );
            this.renderer.setScissor( left, bottom, width, height );
            this.renderer.setClearColor(view.backgroundColor );
            this.renderer.setScissorTest( true );

            this.renderer.render( this.scene, this.camera );
        };


        return view;
    }

}


export {ViewManager}