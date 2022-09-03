
import React from 'react';
import { jsonrpc } from '../editor/js/jsonrpc';
import Thumbnail from './Thumbnail';

class Scene extends React.Component{
  
    constructor(props)
    {
        super(props)
        this.state = {
            meta: {}
        }
    }
  
  
    componentDidMount(){

        let url = new URL(window.location.href);

        let scene = url.searchParams.get("scene");

        this.scene = scene;

        return jsonrpc(`/api/scenemeta?scene=${scene}`).then(ret=>{
            
            this.setState({meta: ret});
        });

    }

    render(){
        let style = {
            display: 'inline-flex',
            flexWrap: 'wrap',
        };

        return <div className='full-height auto-scroll'>
                
                <div style={style}>{
                    this.state.meta.frames?this.state.meta.frames.map(f=> {                                                
                        return  <div key={f}>
                            <Thumbnail scene={this.scene} frame={f}></Thumbnail>
                        </div>
                    }):""
                }</div>  
            </div>
    }
  
}

export default Scene;
