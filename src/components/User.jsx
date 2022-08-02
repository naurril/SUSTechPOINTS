
import React from 'react';
import { jsonrpc } from '../editor/js/jsonrpc';

class User extends React.Component{
  
    constructor(props)
    {
        super(props)
        this.state = {
            userid: 'unknown',
            readonly: true,
            scenes: {},
        }
    }
  
  
    componentDidMount(){
        jsonrpc("/api/get_user_info").then(ret=>{
            this.setState({
                userid: ret.annotator,
                readonly: ret.readonly
            });            
        });

        jsonrpc("/api/get_all_scene_desc").then(ret=>{
            console.log(ret);
            this.setState({
                scenes: ret
            })
            
        })
        .catch(reject=>{
            console.log("error read scene list!");
        });
    }

    render(){

        return <div>
                <div>user: {this.state.userid}</div>
                <div>readonly: {this.state.readonly?'yes':'no'}</div>

                <p></p>
                <div>{
                    Object.keys(this.state.scenes).map(s=> {
                        
                        let desc = this.state.scenes[s];
                        return  <div key={s}><span>{s}</span>, <span>{desc?desc.scene:''}</span>, <span>{desc.label_files}/{desc.frames} annotated</span></div>;
                    })
                }</div>  
            </div>
    }
  
}

export default User;
