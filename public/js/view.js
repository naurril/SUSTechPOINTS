import * as THREE from './lib/three.module.js';
import { OrbitControls } from './lib/OrbitControls.js';
//import { OrthographicTrackballControls } from './lib/OrthographicTrackballControls.js';
import { TransformControls } from './lib/TransformControls.js';
import {matmul2, euler_angle_to_rotate_matrix} from "./util.js"


function ViewManager(mainViewContainer, webglScene, webglMainScene, renderer, globalRenderFunc, on_box_changed, cfg){

    this.mainViewContainer = mainViewContainer;
    this.globalRenderFunc  = globalRenderFunc;
    this.webglScene = webglScene;
    this.webglMainScene = webglMainScene;
    this.renderer = renderer;

    
    this.mainView = cfg.disableMainView?null:create_main_view(webglMainScene,  renderer, this.globalRenderFunc, this.mainViewContainer, on_box_changed);
    
    this.boxViewList = [];
    
    this.addBoxView = function(subviewsUi){
        let boxview = new BoxView(subviewsUi, this.mainViewContainer, this.webglScene, this.renderer, this);
        this.boxViewList.push(boxview);
        return boxview;
    }
    
    this.onWindowResize = function(){
        if (this.mainView)
            this.mainView.onWindowResize();
    };
    
    this.render = function(){
        console.log("render verything");
        if (this.mainView)
           this.mainView.renderAll();

        this.boxViewList.forEach(v=>{
            //if (v.ui.style.display != 'none')  //we have pseudo box now. render as commanded.
                v.render()
        });
      
    };

    
    this.setColorScheme = function(){
        let scheme = document.documentElement.className;
        if (scheme == "theme-dark")
        {
            this.mainView.backgroundColor = new THREE.Color( 0.0, 0.0, 0.0 );
            this.boxViewList.forEach(v=>{
                v.views[0].backgroundColor = new THREE.Color( 0.1, 0.05, 0.05 );
                v.views[1].backgroundColor = new THREE.Color( 0.05, 0.1, 0.05 );
                v.views[2].backgroundColor = new THREE.Color( 0.05, 0.05, 0.1 );
            });
        }
        else{
            this.mainView.backgroundColor = new THREE.Color( 1.0, 1.0, 1.0 );
            this.boxViewList.forEach(v=>{
                v.views[0].backgroundColor = new THREE.Color( 0.95, 0.9, 0.9 );
                v.views[1].backgroundColor = new THREE.Color( 0.9, 0.95, 0.9 );
                v.views[2].backgroundColor = new THREE.Color( 0.9, 0.9, 0.95 );
            })
        }
    };

    //this.setColorScheme();

    // no public funcs below
    function create_main_view(scene, renderer, globalRenderFunc, container, on_box_changed){
        var view ={};
        
        view.backgroundColor=　(document.documentElement.className == "theme-dark") ? new THREE.Color( 0.0, 0.0, 0.0 ) : new THREE.Color( 1.0, 1.0, 1.0 );
        view.zoom_ratio = 1.0; //useless for mainview
            
        let camera = new THREE.PerspectiveCamera( 65, container.clientWidth / container.clientHeight, 1, 500 );
        camera.position.x = 0;
        camera.position.z = 50;
        camera.position.y = 0;
        camera.up.set( 0, 0, 1);
        camera.lookAt( 0, 0, 0 );
        camera.name = "main view camera";
        view.camera_perspective = camera;
        view.camera = camera;

        // make a blind camera to clean background when batch editing is enabled.
        camera = new THREE.PerspectiveCamera( 65, container.clientWidth / container.clientHeight, 1, 500 );
        camera.position.x = -1000;
        camera.position.z = -1000;
        camera.position.y = -1000;
        camera.up.set( 0, 0, 1);
        camera.lookAt( 0, 0, 0 );
        view.blind_camera = camera;
       

        view.container = container;
        view.renderer = renderer;
        view.scene = scene;

        view.active = true;

        view.disable = function(){
            this.active = false;
            this.renderWithCamera(this.blind_camera);
        };

        view.dumpPose = function()
        {
            console.log(this.camera.position, this.camera.rotation);
        };

        view.enable = function(){
            this.active = true;
            this.render();
        };

        //var cameraOrthoHelper = new THREE.CameraHelper( camera );
        //cameraOrthoHelper.visible=true;
        //scene.add( cameraOrthoHelper );

        view.render=function(){
            console.log("render mainview.");
            if (this.active){
                //this.switch_camera(false);
                this.renderWithCamera(this.camera);
            }
            // else
            // {
            //     this.renderWithCamera(this.blind_camera);
            // }
        };

        view.renderAll = function(){
            console.log("render mainview.");
            if (this.active){
                //this.switch_camera(false);
                this.renderWithCamera(this.camera);
            }
            else
            {
                this.renderWithCamera(this.blind_camera);
            }
        }

        view.clearView = function(){
            this.renderWithCamera(this.blind_camera);
        };

        view.renderWithCamera = function(camera){
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

            this.renderer.render( this.scene, camera );
        };


        var orbit_perspective = new OrbitControls( view.camera_perspective, view.container );
        orbit_perspective.update();
        orbit_perspective.addEventListener( 'change', globalRenderFunc );
        //orbit_perspective.enabled = true;
        view.orbit_perspective = orbit_perspective;

        
        var transform_control = new TransformControls(view.camera_perspective , view.container );
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
        
        // camera = new THREE.OrthographicCamera(-asp*200, asp*200, 200, -200, -200, 200 );
        // camera.position.z = 50;
        

        // var cameraOrthoHelper = new THREE.CameraHelper( camera );
        // cameraOrthoHelper.visible=true;
        // scene.add( cameraOrthoHelper );

        
        //view.camera_orth = camera;

        // var orbit_orth = new OrbitControls( view.camera_orth, view.container );
        // orbit_orth.update();
        // orbit_orth.addEventListener( 'change', render );
        // orbit_orth.enabled = false;
        // view.orbit_orth = orbit_orth;

        // var orbit_orth = new OrthographicTrackballControls( view.camera_orth, view.container );
        // orbit_orth.rotateSpeed = 1.0;
        // orbit_orth.zoomSpeed = 1.2;
        // orbit_orth.noZoom = false;
        // orbit_orth.noPan = false;
        // orbit_orth.noRotate = false;
        // orbit_orth.staticMoving = true;
        
        // orbit_orth.dynamicDampingFactor = 0.3;
        // orbit_orth.keys = [ 65, 83, 68 ];
        // orbit_orth.addEventListener( 'change', globalRenderFunc );
        // orbit_orth.enabled=true;
        // view.orbit_orth = orbit_orth;
        
        // transform_control = new TransformControls(view.camera_orth, view.container );
        // transform_control.setSpace("local");
        // transform_control.addEventListener( 'change', globalRenderFunc );
        // transform_control.addEventListener( 'objectChange', function(e){on_box_changed(e.target.object);} );
        
        
        // transform_control.addEventListener( 'dragging-changed', function ( event ) {
        //     view.orbit_orth.enabled = ! event.value;
        // } );


        // transform_control.visible = false;
        // //transform_control.enabled = true;
        // //scene.add( transform_control );
        
        // view.transform_control_orth = transform_control;



        view.camera = view.camera_perspective;
        view.orbit = view.orbit_perspective;
        view.transform_control = view.transform_control_perspective;


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
            // this.camera_orth.left = -asp*200;
            // this.camera_orth.right = asp*200;
            // this.camera_orth.top = 200;
            // this.camera_orth.bottom = -200
            // this.camera_orth.updateProjectionMatrix();

            // this.orbit_orth.handleResize();
            // this.orbit_orth.update();
            
            this.camera_perspective.aspect = container.clientWidth / container.clientHeight;
            this.camera_perspective.updateProjectionMatrix();
            
        };

        view.reset_birdseye = function(){
            //this.orbit_orth.reset(); // 
        };
        view.rotate_birdseye = function(){
            //this.camera_orth.up.set( 1, 0, 0);
            //this.orbit_orth.update();
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
                // restore last viewpoint
                
                var obj_size = Math.sqrt(view.scale0.x*view.scale0.x + view.scale0.y*view.scale0.y + view.scale0.z*view.scale0.z);
                var target_obj_size = Math.sqrt(highlight_obj_scale.x*highlight_obj_scale.x + highlight_obj_scale.y*highlight_obj_scale.y + highlight_obj_scale.z*highlight_obj_scale.z);
                var ratio  = target_obj_size/obj_size;


                this.camera.position.x = this.orbit.target.x + (this.position0.x - this.target0.x)*ratio;
                this.camera.position.y = this.orbit.target.y + (this.position0.y - this.target0.y)*ratio;
                this.camera.position.z = this.orbit.target.z + (this.position0.z - this.target0.z)*ratio;

                this.camera.zoom = this.zoom0;
            } else {
                // not saved yet, set default viewpoint
                this.camera.position.set(
                    this.orbit.target.x + highlight_obj_scale.x*3, 
                    this.orbit.target.y + highlight_obj_scale.y*3, 
                    this.orbit.target.z + highlight_obj_scale.z*3);
            }
            // target is set 
        }


        return view;
    }
}

function BoxView(ui, mainViewContainer, scene, renderer, viewManager){

    
    this.viewManager = viewManager;
    this.mainViewContainer = mainViewContainer;
    this.ui = ui;  //sub-views
    this.baseOffset = function(){
        // ui offset
        return {
            top: this.ui.offsetTop,
            left: this.ui.offsetLeft
        }
    };

    
    this.defaultBox = {
        position: {x: -100, y: -100, z: 0},
        rotation: {x: 0, y: 0, z: 0},
        scale: {x: 5, y: 5, z: 5},
    };

    this.box = this.defaultBox;
    
    this.attachBox = function(box){
        
        this.box = box;

        this.views.forEach(v=>{
            //this.box.world.webglGroup.add(v.camera);
            //this.box.world.webglGroup.add(v.cameraHelper);

            this.box.world.webglGroup.add(v.cameraContainer);
            this.box.world.webglGroup.add(v.cameraHelper); //seems camerahelp shold be added to top-most scene only.
        });

        this.onBoxChanged();
    };
    this.detach = function(){
        this.box = this.defaultBox;
        this.onBoxChanged();
    };

    this.onBoxChanged=function(dontRender){
        this.updateCameraPose(this.box);
        this.updateCameraRange(this.box);

        if (!dontRender)
            this.render();
    };

    this.updateCameraPose = function(box){
        this.views.forEach((v)=>v.updateCameraPose(box));
    };

    this.updateCameraRange = function(box){
        this.views.forEach((v)=>v.updateCameraRange(box));
    };

    this.hidden = function(){
        return this.ui.style.display == 'none';
    };

    this.render = function(){
        if (!this.hidden())
            this.views.forEach((v)=>v.render());
    }

    var scope = this;


    scope.projViewProto = {
        render(){
            let vp = this.getViewPort();
            
            this.renderer.setViewport( vp.left, vp.bottom, vp.width, vp.height );
            this.renderer.setScissor(  vp.left, vp.bottom, vp.width, vp.height );
            this.renderer.setClearColor(this.backgroundColor );
            this.renderer.setScissorTest( true );
            this.renderer.render( this.scene, this.camera );
        },

        getViewPort(){
            return {
                left : this.placeHolderUi.offsetLeft + scope.baseOffset().left, 
                bottom : this.container.scrollHeight - (scope.baseOffset().top +  this.placeHolderUi.offsetTop + this.placeHolderUi.clientHeight),
                width : this.placeHolderUi.clientWidth,
                height : this.placeHolderUi.clientHeight,
                zoom_ratio: this.zoom_ratio,
            }
        },

        
    };

    this.views = [
        createTopView(scene, renderer, mainViewContainer),
        createSideView(scene, renderer, mainViewContainer),
        createBackView(scene, renderer, mainViewContainer),
    ];

    function createTopView(scene, renderer, container){
        let view = Object.create(scope.projViewProto);
        view.name="topview";
        view.zoom_ratio = 1.0;
        
        view.backgroundColor = 　(document.documentElement.className == "theme-dark") ? new THREE.Color( 0.1, 0.05, 0.05 ) : new THREE.Color( 0.95, 0.9, 0.9 );
        view.container = container;
        view.scene = scene;
        view.renderer = renderer;
        view.placeHolderUi = ui.querySelector("#z-view-manipulator");

        //var camera = new THREE.PerspectiveCamera( 65, container.clientWidth / container.clientHeight, 1, 800 );
        var width = container.clientWidth;
        var height = container.clientHeight;
        var asp = width/height;

        var camera = new THREE.OrthographicCamera( -3*asp, 3*asp, 3, -3, -3, 3 );

        var cameraOrthoHelper = new THREE.CameraHelper( camera );
        cameraOrthoHelper.visible=false;
        //scene.add( cameraOrthoHelper );
        view.cameraHelper = cameraOrthoHelper;

        camera.position.set(0,0,0);
        camera.up.set( 1, 0, 0);
        camera.lookAt( 0, 0, -3 );

        view.camera = camera;
        view.cameraContainer = new THREE.Group();
        view.cameraContainer.name = "topview-camera";
        view.cameraContainer.add(camera);
        

        view.updateCameraPose=function(box){
            var p = box.position;
            var r = box.rotation;
            //console.log(r);
            //
            this.cameraContainer.position.set(p.x, p.y, p.z);
            this.cameraContainer.rotation.set(r.x, r.y, r.z);
        };

        view.updateCameraRange=function(box){

            var exp_camera_width, exp_camera_height, exp_camera_clip;
            
            //view.width = 0.2;//params["side view width"];

            var view_width = view.placeHolderUi.clientWidth;
            var view_height = view.placeHolderUi.clientHeight;

            exp_camera_height = box.scale.x*1.5*view.zoom_ratio;
            exp_camera_width = box.scale.y*1.5*view.zoom_ratio;
            exp_camera_clip = box.scale.z + 0.8;

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
            
            // this.camera.scale.x = box.scale.x;
            // this.camera.scale.y = box.scale.y;
            // this.camera.scale.z = box.scale.z;
            //camera.aspect = view_width / view_height;
            this.camera.updateProjectionMatrix();
            this.cameraHelper.update();
        };

        return view;
    }


    function createSideView(scene, renderer, container){
        let view = Object.create(scope.projViewProto);
        view.name="sideview";
        view.zoom_ratio = 1.0;
        //view.backgroundColor=new THREE.Color( 0.1, 0.2, 0.1 );
        view.backgroundColor=(document.documentElement.className == "theme-dark") ? new THREE.Color( 0.05, 0.1, 0.05 ) : new THREE.Color( 0.9, 0.95, 0.9 );
        view.container = container;
        view.scene = scene;
        view.renderer = renderer;
        view.placeHolderUi = ui.querySelector("#y-view-manipulator");

        //var camera = new THREE.PerspectiveCamera( 65, container.clientWidth / container.clientHeight, 1, 800 );
        var width = container.clientWidth;
        var height = container.clientHeight;
        var asp = width/height;

        var camera = new THREE.OrthographicCamera( -3*asp, 3*asp, 3, -3, -3, 3 );

        var cameraOrthoHelper = new THREE.CameraHelper( camera );
        cameraOrthoHelper.visible=false;
        //scene.add( cameraOrthoHelper );
        view["cameraHelper"] = cameraOrthoHelper;

        view.cameraContainer = new THREE.Group();
        view.cameraContainer.name = "sideview-camera";
                
        view.cameraContainer.position.x = 0;
        view.cameraContainer.position.z = 0;
        view.cameraContainer.position.y = 0;

        view.cameraContainer.rotation.x=0; //Math.PI/2;
        view.cameraContainer.rotation.y=0;
        view.cameraContainer.rotation.z=0;

        //view.cameraContainer.updateProjectionMatrix();

        view.cameraContainer.add(camera);

        camera.position.set( 0, 0, 0);
        camera.up.set(0,0,1);
        camera.lookAt( 0, 3, 0 );

        //camera.up.set( 0, 1, 0);
        //camera.lookAt( 0, 0, -3 );


        // camera should not be changed again?
        view.camera = camera;

        view.updateCameraPose=function(box){
            var p = box.position;
            var r = box.rotation;
            
            view.cameraContainer.position.x = p.x;
            view.cameraContainer.position.y = p.y;
            view.cameraContainer.position.z = p.z;
            
    
            view.cameraContainer.rotation.x=r.x;
            view.cameraContainer.rotation.y=r.y;
            view.cameraContainer.rotation.z=r.z;
            //view.cameraContainer.updateProjectionMatrix();

            // var trans_matrix = euler_angle_to_rotate_matrix(r, p);
      

            // this.camera.position.x= p.x;
            // this.camera.position.y= p.y;
            // this.camera.position.z= p.z;



    
            // var up = matmul2(trans_matrix, [0, 0, 1, 0], 4);
            // this.camera.up.set( up[0], up[1], up[2]);
            // var at = matmul2(trans_matrix, [0, 1, 0, 1], 4);
            // this.camera.lookAt( at[0], at[1], at[2] );
            
            
            // this.camera.updateProjectionMatrix();
            // this.cameraHelper.update();
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
        };

        return view;
    }

    function createBackView(scene, renderer, container){
        let view = Object.create(scope.projViewProto);
        view.name="backview";
        view.zoom_ratio = 1.0;
        //view.backgroundColor=new THREE.Color( 0.2, 0.1, 0.1 );
        view.backgroundColor= (document.documentElement.className == "theme-dark") ? new THREE.Color( 0.05, 0.05, 0.1 ) : new THREE.Color( 0.9, 0.9, 0.95 );
        view.container = container;
        view.scene = scene;
        view.renderer = renderer;
        view.placeHolderUi = ui.querySelector("#x-view-manipulator");

        //var camera = new THREE.PerspectiveCamera( 65, container.clientWidth / container.clientHeight, 1, 800 );
        var width = container.clientWidth;
        var height = container.clientHeight;
        var asp = width/height;

        var camera = new THREE.OrthographicCamera( -3*asp, 3*asp, 3, -3, -3, 3 );

        var cameraOrthoHelper = new THREE.CameraHelper( camera );
        cameraOrthoHelper.visible=false;
        //scene.add( cameraOrthoHelper );
        view["cameraHelper"] = cameraOrthoHelper;
                
        camera.position.set(0,0,0);
        camera.up.set(0,0,1);
        camera.lookAt(3,0,0);

        view.camera = camera;
        view.cameraContainer = new THREE.Group();
        view.cameraContainer.name = "backview-camera";
        view.cameraContainer.position.set(0,0,0);
        view.cameraContainer.rotation.set(0,0,0);

        view.cameraContainer.add(camera);

        view.updateCameraPose=function(box){

            let p = box.position;
            let r = box.rotation;

            // let trans_matrix = euler_angle_to_rotate_matrix(r, p);

            // this.camera.position.x= p.x;
            // this.camera.position.y= p.y;
            // this.camera.position.z= p.z;
    
            // var up3 = matmul2(trans_matrix, [0, 0, 1, 0], 4);
            // this.camera.up.set( up3[0], up3[1], up3[2]);
            // var at3 = matmul2(trans_matrix, [1, 0, 0, 1], 4);
            // this.camera.lookAt( at3[0], at3[1], at3[2] );
            
    
            // this.camera.updateProjectionMatrix();
            // this.cameraHelper.update();   

            this.cameraContainer.position.set(p.x, p.y, p.z);
            this.cameraContainer.rotation.set(r.x, r.y, r.z);
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
        };

        return view;
    }
}

export {ViewManager}