import{Editor} from "./editor.js"
import{BatchEditor} from "./batch-editor.js"


document.body.addEventListener('keydown', event => {
    if (event.ctrlKey && 'asdv'.indexOf(event.key) !== -1) {
      event.preventDefault()
    }
})


var maindiv  = document.querySelector("#main-div");
var template = document.querySelector('#main-ui-template');

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

  // main editor
  if (true){
      let main_ui = template.content.cloneNode(true);
      maindiv.appendChild(main_ui); // input parameter is changed after `append`

      let mainEditorCfg={
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

      let editor = new Editor(maindiv.lastElementChild, mainEditorCfg, metaData)
      editor.run();

  }


  // // batch editor
  // if (true){
  //   let parentDiv = document.getElementById("batch-editor");
  //   let batchEditor= new BatchEditor(10, template, parentDiv, metaData);

  //   batchEditor.start("example", "2");
  // }

}

