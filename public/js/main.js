import{Config} from "./config.js"
import{Editor} from "./editor.js"
import {Data} from './data.js'


let config = new Config();
window.config = config;

config.load();


document.documentElement.className="theme-"+config.theme;


document.body.addEventListener('keydown', event => {
    if (event.ctrlKey && 'asdv'.indexOf(event.key) !== -1) {
      event.preventDefault()
    }
});


// meatdata
(function(){
  let self=this;
  let xhr = new XMLHttpRequest();
  // we defined the xhr
  
  xhr.onreadystatechange = function () {
      if (this.readyState != 4) 
          return;
  
      if (this.status == 200) {
          let ret = JSON.parse(this.responseText);
          let metaData = ret;                               

          metaData.getScene = function(sceneName){
            var scene_meta = this.find(function(x){
                return x.scene == sceneName;
            });
        
            return scene_meta;
          };

          start(metaData);
      }

  };
  
  xhr.open('GET', "/datameta", true);
  xhr.send();
})();


function start(metaData){

  var template = document.querySelector('#editor-template');

  // main editor
  function createMainEditor(){
      let maindiv  = document.querySelector("#main-editor");
      let main_ui = template.content.cloneNode(true);
      maindiv.appendChild(main_ui); // input parameter is changed after `append`

      let editorCfg = config;

      let dataCfg = config;
      
      let data = new Data(metaData, dataCfg);
      let editor = new Editor(maindiv.lastElementChild, maindiv, editorCfg, data, "main-editor")
      editor.run();
      return editor;
  } 


  let mainEditor = createMainEditor();


  let url_string = window.location.href
  let url = new URL(url_string);
  //language
  let scene = url.searchParams.get("scene");
  let frame = url.searchParams.get("frame");

  if (scene && frame)
  {
    mainEditor.load_world(scene, frame);
  }



}

