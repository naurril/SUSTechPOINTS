const form = document.getElementById("create-label-form")
form?.addEventListener("submit", addLabel)

async function addLabel(event) {
    event.preventDefault()
    const name = document.getElementById("label-name-input").value
    const color = document.getElementById("label-color-input").value
    const x = parseFloat(document.getElementById("label-x-input").value)
    const y = parseFloat(document.getElementById("label-y-input").value)
    const z = parseFloat(document.getElementById("label-z-input").value)

    if (name === '' || x === '' || y === '' || z === '') {
        alert("enter non empty values")
    } else if (isNaN(x) || isNaN(y) || isNaN(z)) {
        alert("enter valid floats for x y and z")
    } else {
        console.log(name)
        console.log(color)
        console.log(x)
        console.log(y)
        console.log(z)
    }

    const body = {
        name, color, x, y, z
    }

    const res = await fetch('/save_label', {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    })
    const data = await res.json() 
    console.log(data)
}