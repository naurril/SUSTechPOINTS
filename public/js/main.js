import { Config } from "./config.js";
import { Editor } from "./editor.js";
import { Data } from "./data.js";

let pointsGlobalConfig = new Config(); // an object
window.pointsGlobalConfig = pointsGlobalConfig;

pointsGlobalConfig.load(); // will populate the object with key value pairs

document.documentElement.className = "theme-" + pointsGlobalConfig.theme; // for switching between light and dark mode

document.body.addEventListener("keydown", (event) => {
  if (event.ctrlKey && "asdv".indexOf(event.key) !== -1) {
    event.preventDefault();
  }
});

async function createMainEditor() {
  let template = document.querySelector("#editor-template");
  let maindiv = document.querySelector("#main-editor");
  let main_ui = template.content.cloneNode(true);
  maindiv.appendChild(main_ui); // input parameter is changed after `append`

  let editorCfg = pointsGlobalConfig;

  let dataCfg = pointsGlobalConfig;

  let data = new Data(dataCfg);
  await data.init(); // gets the names of all scenes (folders) from the backend
  // data.sceneDescList is set to this list after the function is done
  // at this point data.world is null

  // for reference
  // Editor(editorUi, wrapperUi, editorCfg, data, name = "editor")
  let editor = new Editor(
    maindiv.lastElementChild, // I assume this is main_ui, since it was just appended on line 22
    maindiv, // <div id="main-editor"></div>
    editorCfg, // it's the same config as everywhere I think
    data, // the data object which was just created, for now only has the scene (folder) names mostly
    "main-editor" // the name of the editor
  );
  window.editor = editor;
  editor.run();
  return editor;
}

async function start() {
  let mainEditor = await createMainEditor();

  let url_string = window.location.href;
  let url = new URL(url_string);
  //language
  let scene = url.searchParams.get("scene");
  let frame = url.searchParams.get("frame");

  if (scene && frame) {
    mainEditor.load_world(scene, frame);
  }
}

start();
