
import React from 'react'
import { jsonrpc } from '../editor/js/jsonrpc'
import Thumbnail from './Thumbnail'

class Scene extends React.Component {
  constructor (props) {
    super(props)

    this.operations = {
      framequality: ['high', 'medium'],
      weather: ['sunny', 'cloudy', 'raining'],
      roadtype: ['城市街道', '郊区道路', '乡村道路', '简易铺装道路', '非铺装平整道路'],
      imagequality: ['high', 'medium']
    }

    this.filterScheme = {
      framequality: ['high', 'medium', 'low', ':empty'], // different from operations.
      weather: ['sunny', 'cloudy', 'raining', ':empty'],
      roadtype: ['城市街道', '郊区道路', '乡村道路', '简易铺装道路', '非铺装平整道路', ':empty'],
      imagequality: ['high', 'medium', ':empty']
    }

    this.state = {
      meta: {},
      cameraList: ['camera:front'],
      thumbnailSize: {
        width: 400,
        height: 300
      },
      layout: 'column',
      operation: {
        type: 'framequality',
        default: 'high',
        set: 'medium'
      },
      filter: JSON.parse(JSON.stringify(this.filterScheme))
    }

    console.log('scene created.')
  }

  componentDidMount () {
    console.log('scene mounted.')
    const url = new URL(window.location.href)

    const scene = url.searchParams.get('scene')

    this.scene = scene

    jsonrpc(`/api/scenemeta?scene=${scene}`).then(ret => {
      this.setState({ meta: ret })
    })

    const savedFilterCfg = this.readFilterCfg()
    if (savedFilterCfg) {
      this.setState({ filter: savedFilterCfg })
    }

    const savedOperationCfg = this.readOperationCfg()
    if (savedOperationCfg) {
      this.setState({ operation: savedOperationCfg })
    }

    const cameraList = this.readCameraList()
    if (cameraList) {
      this.setState({ cameraList })
    }
  }

  onCameraClicked (e) {
    console.log(e.currentTarget.value, e.currentTarget.checked)
    const cameraList = this.state.cameraList.filter(x => x !== e.currentTarget.value)

    if (e.currentTarget.checked) {
      cameraList.push(e.currentTarget.value)
    }

    this.setState({
      cameraList
    })

    this.saveCameraList(cameraList)
  }

  onWheel (e) {
    if (e.shiftKey) {
      if (e.deltaY < 0) {
        this.setState({
          thumbnailSize: {
            width: this.state.thumbnailSize.width * 1.1,
            height: this.state.thumbnailSize.height * 1.1
          }
        })
      } else {
        this.setState({
          thumbnailSize: {
            width: this.state.thumbnailSize.width * 0.9,
            height: this.state.thumbnailSize.height * 0.9
          }
        })
      }
    }
  }

  onLayoutChanged (e) {
    this.setState({
      layout: e.currentTarget.value
    })
  }

  saveCameraList (cameraList) {
    window.localStorage.setItem('tagCameraList', JSON.stringify(cameraList))
  }

  readCameraList (cameraList) {
    return JSON.parse(window.localStorage.getItem('tagCameraList'))
  }

  readOperationCfg () {
    return JSON.parse(window.localStorage.getItem('tagOperationConfg'))
  }

  saveOperationCfg (operation) {
    window.localStorage.setItem('tagOperationConfg', JSON.stringify(operation))
  }

  readFilterCfg () {
    return JSON.parse(window.localStorage.getItem('tagFilterConfg'))
  }

  saveFilterCfg (filter) {
    window.localStorage.setItem('tagFilterConfg', JSON.stringify(filter))
  }

  onOperationTypeChanged (e) {
    const op = e.currentTarget.value
    const operation = {
      type: op,
      default: this.operations[op][0],
      set: this.operations[op][1]

    }

    this.saveOperationCfg(operation)
    this.setState({ operation })
  }

  onDefaultOperationChanged (e) {
    const operation = {
      type: this.state.operation.type,
      default: e.currentTarget.value,
      set: this.state.operation.set
    }

    this.saveOperationCfg(operation)
    this.setState({ operation })
  }

  onSetOperationChanged (e) {
    const operation = {
      type: this.state.operation.type,
      default: this.state.operation.default,
      set: e.currentTarget.value
    }

    this.saveOperationCfg(operation)
    this.setState({ operation })
  }

  onApplyDefaultToAllClicked (e) {
    this.state.meta.frames.filter(i => this.thumbnails[i].shown()).forEach(i => {
      const data = {}
      data[this.state.operation.type] = this.state.operation.default

      jsonrpc('/api/savetag', 'POST', {
        scene: this.scene,
        frame: i,
        data
      }).then(ret => {
        if (ret.result !== 'success') {
          // this.sendMsg('alert', {message: JSON.stringify(ret)});
        } else {
          if (this.thumbnails[i]) {
            this.thumbnails[i].updateMeta()
          }
        }
      })
    })
  }

  onApplyDefaultToUnsetClicked (e) {
    this.state.meta.frames.filter(i => this.thumbnails[i].shown()).forEach(i => {
      const data = {}
      data[this.state.operation.type] = this.state.operation.default

      jsonrpc('/api/savetag', 'POST', {
        scene: this.scene,
        frame: i,
        overwrite: false,
        data
      }).then(ret => {
        if (ret.result != 'success') {
          // this.sendMsg('alert', {message: JSON.stringify(ret)});
        } else {
          if (this.thumbnails[i]) {
            this.thumbnails[i].updateMeta()
          }
        }
      })
    })
  }

  onFilterChange (e, opType, value) {
    const checked = e.currentTarget.checked
    const filter = JSON.parse(JSON.stringify(this.state.filter))
    filter[opType] = filter[opType].filter(x => x != value)

    if (checked) { filter[opType].push(value) }

    this.saveFilterCfg(filter)
    this.setState({
      filter
    })
  }

  thumbnails = {}
  registerObj (frame, obj) {
    this.thumbnails[frame] = obj
  }

  render () {
    const style = {
      display: 'inline-flex',
      flexWrap: 'wrap'
    }

    const cameras = ['front', 'front_right', 'front_left', 'rear', 'rear_left', 'rear_right']

    return (
      <div className='full-height auto-scroll' onWheel={(e) => this.onWheel(e)}>
        <table>
          <tbody>
            <tr>
              <td>cameras: </td>
              <td style={style}>{
                    cameras.map(c => {
                      return (
                        <div key={c}><input
                          type='checkbox'
                          value={'camera:' + c}
                          id={'camera:' + c}
                          onChange={e => this.onCameraClicked(e)}
                          checked={this.state.cameraList.includes('camera:' + c)}
                                     /><label htmlFor={'camera:' + c}>{c}</label>
                        </div>
                      )
                    })
                }
              </td>
            </tr>

            <tr>
              <td>aux_cameras: </td>
              <td style={style}>{
                    cameras.map(c => {
                      return (
                        <div key={c}><input
                          type='checkbox' value={'aux_camera:' + c} id={'aux_camera:' + c}
                          checked={this.state.cameraList.includes('aux_camera:' + c)}
                          onChange={e => this.onCameraClicked(e)}
                                     /><label htmlFor={'aux_camera:' + c}>{c}</label>
                        </div>
                      )
                    })
             }
              </td>
            </tr>
            <tr>
              <td>layout</td>
              <td>
                <select value={this.state.layout} onChange={e => this.onLayoutChanged(e)}>
                  <option value='column'>column</option>
                  <option value='row'>row</option>
                </select>
              </td>
            </tr>

            <tr>
              <td>frame filter </td>
              <td>
                <table>
                  <tbody>
                    {
                    Object.keys(this.filterScheme).map(ot => {
                      return (
                        <tr key={ot}>
                          <td>{ot}</td>
                          <td>
                            {
                                        this.filterScheme[ot].map(v => {
                                          return (
                                            <span key={v}> <input
                                              type='checkbox' id={'filter-' + ot + '-' + v}
                                              checked={this.state.filter[ot].includes(v)}
                                              onChange={e => this.onFilterChange(e, ot, v)}
                                                           /><label htmlFor={'filter-' + ot + '-' + v}>{v}</label>
                                            </span>
                                          )
                                        })
                                    }
                          </td>
                        </tr>
                      )
                    })
                }
                  </tbody>
                </table>
              </td>
            </tr>

            <tr>
              <td>operation </td>
              <td>
                opType:
                <select onChange={(e) => this.onOperationTypeChanged(e)} value={this.state.operation.type}>
                  {
                            Object.keys(this.operations).map(o => {
                              return <option key={o} value={o}>{o}</option>
                            })
                        }
                </select>
                <span>default: </span>
                <select onChange={(e) => this.onDefaultOperationChanged(e)} value={this.state.operation.default}>
                  {
                            this.operations[this.state.operation.type].map(o => {
                              return <option key={o} value={o}>{o}</option>
                            })
                        }
                </select>

                <span>set: </span>
                <select onChange={(e) => this.onSetOperationChanged(e)} value={this.state.operation.set}>
                  {
                            this.operations[this.state.operation.type].map(o => {
                              return <option key={o} value={o}>{o}</option>
                            })
                        }
                </select>

                <button onClick={e => this.onApplyDefaultToAllClicked(e)}>
                  apply default to all frames
                </button>

                <button onClick={e => this.onApplyDefaultToUnsetClicked(e)}>
                  apply default to all unset frames
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <div>
          <div style={style}>{
                    this.state.meta.frames
                      ? this.state.meta.frames.map(f => {
                        return (
                          <Thumbnail
                            key={f}
                            scene={this.scene}
                            frame={f}
                            cameraList={this.state.cameraList}
                            layout={this.state.layout}
                            size={this.state.thumbnailSize}
                            operation={this.state.operation}
                            registerObj={this.registerObj.bind(this)}
                            filter={this.state.filter}
                          />
                        )
                      })
                      : ''
                }
          </div>
        </div>
      </div>
    )
  }
}

export default Scene
