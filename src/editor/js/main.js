import { Config } from './config.js';
import { Editor } from './editor.js';
import { Data } from './data.js';
import WebGL from './webgl.js';

const pointsGlobalConfig = new Config();
window.pointsGlobalConfig = pointsGlobalConfig;

pointsGlobalConfig.load();

document.documentElement.className = 'theme-' + pointsGlobalConfig.theme;

document.body.addEventListener('keydown', event => {
  if (event.ctrlKey && 'asdv'.indexOf(event.key) !== -1) {
    event.preventDefault();
  }
});

async function createMainEditor () {
  const template = document.querySelector('#editor-template');
  const maindiv = document.querySelector('#main-editor');
  const main_ui = template.content.cloneNode(true);
  maindiv.appendChild(main_ui); // input parameter is changed after `append`

  const editorCfg = pointsGlobalConfig;

  const dataCfg = pointsGlobalConfig;

  const data = new Data(dataCfg);

  const editor = new Editor(maindiv.lastElementChild, maindiv, editorCfg, data, 'main-editor');

  window.editor = editor;

  // don't do async things before here.

  editor.init();
  editor.run();

  // must be after init.
  editor.hide(); // hide by default

  return editor;
}

async function start () {
  if (WebGL.isWebGL2Available()) {
    // Initiate function or other initializations here
    console.log('webgl check passed.');
  } else {
    const warning = WebGL.getWebGLErrorMessage();
    console.log('webgl check faild.', warning);
  }

  const url_string = window.location.href;
  const url = new URL(url_string);

  const userToken = url.searchParams.get('token');

  if (userToken) {
    window.localStorage.setItem('userToken', userToken);
  }

  window.pointsGlobalConfig.userToken = window.localStorage.getItem('userToken');

  const mainEditor = await createMainEditor();

  // language
  const scene = url.searchParams.get('scene');
  const frame = url.searchParams.get('frame');

  if (scene && frame) {
    mainEditor.load_world(scene, frame);
  }
}

export { start };
