import React from 'react';
import { Link } from 'react-router-dom';
import './App.css';

class App extends React.Component {

  constructor(props)
  {
      super(props)      
      
  }

  componentDidMount(){
    window.editor.show()
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

