  
import React from 'react';
import { Link } from "react-router-dom";
import { jsonrpc } from '../editor/js/jsonrpc';


class Thumbnail extends React.Component{
  
    constructor(props)
    {
        super(props)
        this.state = {         
            frameQuality: 'unknown',   
        }
    }
  
  
    componentDidMount(){

        
        jsonrpc("/api/loadtag?scene="+this.props.scene+"&frame="+this.props.frame+"&key=framequality").then(ret=>{
            this.setState({
                frameQuality: ret.framequality,
                frameQualityCause: ret.framequality_cause
            });
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
        if (this.state.frameQuality == 'low' || this.state.frameQuality=='unknown')
            return;

        let setQuality = this.state.frameQuality == 'high'? 'medium': 'high';

        console.log( 'image quality', 'medium');
        jsonrpc("/api/savetag", "POST", {
            scene: this.props.scene,
            frame: this.props.frame,
            data: {
                scene: this.props.scene,
                frame: this.props.frame,
                framequality: setQuality,
            }
        }).then(ret=>{
            if (ret.result != 'success'){
                this.sendMsg('alert', {message: JSON.stringify(ret)});
            }
            else
            {
                this.setState({
                    frameQuality: setQuality
                })
            }
        });
    }

    render(){
        let thumbnailStyle = {
            position: 'relative',
        }
        let operationStyle = {
            position: 'absolute',
            left: '0%',
            top: '0%'
        };


        
        return <div style={thumbnailStyle}  className='thumbnail'>
                <div><img width='400' height='300' src={this.getImgUrl('front')} alt={this.props.frame}></img></div>
                <div><img width='400' height='300' src={this.getImgUrl('front', 'aux_camera')} alt={this.props.frame}></img></div>
                <div><img width='400' height='300' src={this.getImgUrl('rear')} alt={this.props.frame}></img></div>
                <div style={this.getMaskStyle(this.state.frameQuality=='high') } onClick={e=>this.onMaskClicked(e)}></div>
                <div style={operationStyle} >
                    <Link to={`/editor?scene=${this.props.scene}&frame=${this.props.frame}`}> {this.props.frame}</Link>
                    <div  title={this.state.frameQualityCause}> {this.state.frameQuality} </div>
                </div>
                
            </div>
    }
  
}

export default Thumbnail;
