import{new_editor} from "./editor.js"

document.body.addEventListener('keydown', event => {
    if (event.ctrlKey && 'asdv'.indexOf(event.key) !== -1) {
      event.preventDefault()
    }
})

let container = document.getElementById("container");
let editor = new_editor(container)
editor.run();