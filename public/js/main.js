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
  await data.init();

  let editor = new Editor(
    maindiv.lastElementChild,
    maindiv,
    editorCfg,
    data,
    "main-editor"
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
