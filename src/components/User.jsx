import React from 'react';
import { Link } from 'react-router-dom';
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

    getStat()
    {
        let total = 0;
        
        let stat = {};

        Object.keys(this.state.scenes).forEach(k=>{
            let s = this.state.scenes[k];
            total += s.frames;
        
            Object.keys(s.meta).forEach(category=>{
                Object.keys(s.meta[category]).forEach(c=>{
                    
                    if (!stat[category])
                        stat[category] = {};

                    if (!stat[category][c])
                        stat[category][c] = 0

                    stat[category][c] += s.meta[category][c];
                })
            })
        })

        stat.total = total;
        return stat;
    }

    render(){
        let stat = this.getStat();
        return <div className='full-height auto-scroll'>
                <div>user: {this.state.userid}</div>
                <div>readonly: {this.state.readonly?'yes':'no'}</div>

                <div>
                    <table>
                    <thead>
                    <tr>
                        <th>scene</th>
                        <th>desc</th>
                        <th>total</th>
                        <th>annotated</th>
                        <th>stat</th>
                    </tr>
                    </thead>
                    <tbody>
                    {
                    Object.keys(this.state.scenes).map(s=> {                        
                        let desc = this.state.scenes[s];
                        return  <tr key={s}> 
                                    <td><Link to={"/scene?scene="+s}>{s}</Link></td>
                                    <td>{desc?desc.scene:''}</td>
                                    <td>{desc.frames}</td>
                                    <td>{desc.label_files}</td>
                                    <td>{JSON.stringify(desc.meta)}</td>
                                </tr>;
                    })
                    }
                    
                    <tr>
                        <td></td>
                        <td></td>
                        <td>{stat.total}</td>
                        <td></td>
                        <td>{JSON.stringify(stat)}</td>
                    </tr>
                    </tbody>
                    </table>
                </div> 
            </div>
    }
  
}

export default User;
