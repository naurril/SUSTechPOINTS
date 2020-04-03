import{new_editor} from "./editor.js"

document.body.addEventListener('keydown', event => {
    if (event.ctrlKey && 'asdv'.indexOf(event.key) !== -1) {
      event.preventDefault()
    }
})


var maindiv  = document.querySelector("#main-div");

var template = document.querySelector('#main-ui-template');

if (true){
  let main_ui = template.content.cloneNode(true);
  maindiv.appendChild(main_ui); // input parameter is changed after `append`
  let editor = new_editor(maindiv.lastElementChild)
  editor.run();
}


if (true){
  let main_ui = template.content.cloneNode(true);
  maindiv.appendChild(main_ui); // input parameter is changed after `append`
  let editor = new_editor(maindiv.lastElementChild)
  editor.run();
}
