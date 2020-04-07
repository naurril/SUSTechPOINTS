import{Editor} from "./editor.js"
import {Data} from './data.js'

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
  if (true){
      let maindiv  = document.querySelector("#main-editor");
      let main_ui = template.content.cloneNode(true);
      maindiv.appendChild(main_ui); // input parameter is changed after `append`

      let editorCfg={
          //disableSceneSelector: true,
          //disableFrameSelector: true,
          //disableCameraSelector: true,
          //disableFastToolbox: true,
          //disableMainView: true,
          //disableMainImageContext: true,
          //disableGrid:true,
          //disableRangeCircle:true,
          //disableMainViewKeyDown:true
      };

      let data = new Data(metaData);
      let editor = new Editor(maindiv.lastElementChild, editorCfg, metaData, data)
      editor.run();

  }


  // batch editor
  if (false){
      let maindiv  = document.querySelector("#batch-editor");
      let main_ui = template.content.cloneNode(true);
      maindiv.appendChild(main_ui); // input parameter is changed after `append`

      let editorCfg={
        disableSceneSelector: true,
        disableFrameSelector: true,
        disableCameraSelector: true,
        //disableFastToolbox: true,
        //disableMainView: true,
        //disableMainImageContext: true,
        disableGrid:true,
        disableRangeCircle:true,
        disableMainBoxEditor:true,
        //disableMainViewKeyDown:true
      };

      let enableMultiWorld = true;
      let data = new Data(metaData, enableMultiWorld);
      let editor = new Editor(maindiv.lastElementChild, editorCfg, metaData, data)
      editor.run();

      let objid="6";
      editor.editBox("example", "000950", objid);
      editor.editBox("example", "000965", objid);
      editor.editBox("example", "000970", objid);
      editor.editBox("example", "000975", objid);
      
  }

}

