import React from 'react';
import { Link } from 'react-router-dom';
import './App.css';

class App extends React.Component {

  constructor(props)
  {
      super(props)      
      
  }

  componentDidMount(){
    let url = new URL(window.location.href);

    let scene = url.searchParams.get("scene");
    let frame = url.searchParams.get("frame");

    window.editor.show()

    if (scene && frame){
      window.editor.load_world(scene, frame, ()=>{
        window.editor.onWindowResize();
      });      
    }
  }

  componentWillUnmount(){
    window.editor.hide()
  }

  render(){
    return<div>
        <Link to='/user'>user</Link>
    </div>
  }

}

export default App;

