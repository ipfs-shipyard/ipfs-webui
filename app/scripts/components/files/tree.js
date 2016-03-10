import React, {PropTypes, Component} from 'react'
import {Table} from 'react-bootstrap'
import {isEmpty, includes, map} from 'lodash-es'
import {join} from 'path'
import {DropTarget} from 'react-dnd'
import {NativeTypes} from 'react-dnd-html5-backend'
import classnames from 'classnames'

import RowInput from './tree/row-input'
import Row from './tree/row'

function readAsBuffer (file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      resolve({
        content: new Buffer(reader.result),
        name: file.name
      })
    }
    reader.onerror = (event) => {
      reject(reader.error)
    }

    reader.readAsArrayBuffer(file)
  })
}

const fileTarget = {
  drop (props, monitor) {
    console.log(monitor.getItem())
    Promise
      .all(map(monitor.getItem().files, readAsBuffer))
      .then((files) => {
        props.onCreateFiles(files)
      })
  }
}

class Tree extends Component {
  static propTypes = {
    files: PropTypes.array,
    selectedFiles: PropTypes.array,
    tmpDir: PropTypes.shape({
      root: PropTypes.string.isRequired,
      name: PropTypes.string
    }),
    root: PropTypes.string,
    onRowClick: PropTypes.func,
    onRowDoubleClick: PropTypes.func,
    onTmpDirChange: PropTypes.func.isRequired,
    onCreateDir: PropTypes.func.isRequired,
    onCancelCreateDir: PropTypes.func.isRequired,
    onCreateFiles: PropTypes.func.isRequired,
    // react-dnd
    connectDropTarget: PropTypes.func.isRequired,
    isOver: PropTypes.bool.isRequired,
    canDrop: PropTypes.bool.isRequired
  };

  static defaultProps = {
    root: '/',
    files: [],
    selectedFiles: [],
    onRowClick () {},
    onRowDoubleClick () {}
  };

  _onTmpDirChange = ({target}) => {
    this.props.onTmpDirChange(target.value)
  };

  _onDirCreateBlur = (event) => {
    if (isEmpty(event.target.value)) {
      this.props.onCancelCreateDir()
    } else {
      this.props.onCreateDir()
    }
  };

  _isSelected = (file) => {
    const {selectedFiles, root} = this.props
    return includes(selectedFiles, join(root, file.Name))
  };

  render () {
    let tmpDir
    if (this.props.tmpDir) {
      tmpDir = (
        <RowInput
          onChange={this._onTmpDirChange}
          value={this.props.tmpDir.name}
          onKeyEnter={this.props.onCreateDir}
          onKeyEsc={this.props.onCancelCreateDir}
          onBlur={this._onDirCreateBlur}
        />
      )
    }

    const files = this.props.files.map((file, i) => (
      <Row
        key={i}
        file={file}
        selected={this._isSelected(file)}
        onClick={this.props.onRowClick}
        onDoubleClick={this.props.onRowDoubleClick}/>
    )).concat([tmpDir])

    const {isOver, canDrop} = this.props
    const className = classnames('files-drop', {isOver, canDrop})

    return this.props.connectDropTarget(
      <div>
        <div className={className}>
          {!isOver && canDrop && 'Drag your files here'}
          {isOver && 'Drop your files'}
        </div>
        <Table responsive className='files-tree'>
          <thead>
            <tr>
              <th>Name</th>
              <th>Size</th>
            </tr>
          </thead>
          <tbody>
            {files}
          </tbody>
        </Table>
      </div>
    )
  }
}

export default DropTarget(
  NativeTypes.FILE,
  fileTarget,
  (connect, monitor) => ({
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver(),
    canDrop: monitor.canDrop()
  })
)(Tree)
