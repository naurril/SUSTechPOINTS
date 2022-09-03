  
import React from 'react';
import { Link } from "react-router-dom";
import { jsonrpc } from '../editor/js/jsonrpc';


class Thumbnail extends React.Component{
  
    constructor(props)
    {
        super(props)
        this.state = {         
            //frameQuality: 'unknown',   
        }
        this.props.registerUpdate(this.props.frame, ()=>this.updateMeta());
        
    }
  
  
    componentDidMount(){
        this.updateMeta();        
        
    }

    // componentDidUpdate(prevProps, prevState, snapshot){
    //     if (prevProps.updateFlag != this.props.updateFlag)
    //         this.updateMeta();
    // }

    updateMeta()
    {
        jsonrpc("/api/loadtag?scene="+this.props.scene+"&frame="+this.props.frame).then(ret=>{
            if (ret){
                this.setState({
                    ...ret
                });
            }
            
       });
    }

    getImgUrl(camera, cameraType='camera')
    {
        return '/data/'+this.props.scene + "/"+cameraType+"/" +camera+"/" + this.props.frame + ".jpg?token="+window.localStorage.getItem('userToken');
    }

    getMaskStyle(clean)
    {
        let s = {
            position: 'absolute',
            left: '0%',
            top: '0%',
            width: '100%',
            height: '100%',
            background: clean?'#00000000':'#66006666',
        };

        return s;
    }

    onMaskClicked(e)
    {
        if (this.props.operation.type == 'framequality' && (this.state.framequality == 'low' || this.state.framequality=='unknown'))
            return;

        let type = this.props.operation.type;
        let value = this.state[type]== this.props.operation.default? this.props.operation.set : this.props.operation.default;

        console.log( 'image quality', 'medium');
        let data = {};
        data[type] = value;

        jsonrpc("/api/savetag", "POST", {
            scene: this.props.scene,
            frame: this.props.frame,
            data
        }).then(ret=>{
            if (ret.result != 'success'){
                //this.sendMsg('alert', {message: JSON.stringify(ret)});
            }
            else
            {
                this.setState(data)
            }
        });
    }

    
    render(){
        let thumbnailStyle = {
            position: 'relative',
            padding: '3px',
        };

        let operationStyle = {
            position: 'absolute',
            left: '0%',
            top: '0%'
        };


        
        return <div style={thumbnailStyle}  className='thumbnail'>
                <div>
                {
                    this.props.cameraList.map(i=>{
                        let [cameraType, camera] = i.split(":");

                        if (this.props.layout=='column')
                            return <div key={i}><img  width={this.props.size.width} height={this.props.size.height} src={this.getImgUrl(camera, cameraType)} alt={this.props.frame}></img></div>
                        else
                            return <img key={i} width={this.props.size.width} height={this.props.size.height} src={this.getImgUrl(camera, cameraType)} alt={this.props.frame}></img>;
                    })
                }
                </div>
                <div style={this.getMaskStyle(this.state[this.props.operation.type]==this.props.operation.default) } onClick={e=>this.onMaskClicked(e)}></div>
                <div style={operationStyle} >
                    <Link to={`/editor?scene=${this.props.scene}&frame=${this.props.frame}`}> {this.props.frame}</Link>
                    <div className='color-red'> {
                        Object.keys(this.state).map(k=>{
                            return <div key={k}>{k}: {this.state[k]}</div>
                        })
                    } </div>
                </div>
                
            </div>
    }
  
}

export default Thumbnail;