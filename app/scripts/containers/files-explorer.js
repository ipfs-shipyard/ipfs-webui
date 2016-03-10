import React, {PropTypes, Component} from 'react'
import {Row, Col} from 'react-bootstrap'
import {connect} from 'react-redux'
import {join} from 'path'
import {includes} from 'lodash-es'
import {toastr} from 'react-redux-toastr'

import {files, router} from '../actions'

import Tree from './../components/files/tree'
import ActionBar from './../components/files/action-bar'
import Breadcrumbs from './../components/files/breadcrumbs'

class FilesExplorer extends Component {
  static propTypes = {
    // state
    list: PropTypes.array.isRequired,
    root: PropTypes.string.isRequired,
    tmpDir: PropTypes.shape({
      root: PropTypes.string.isRequired,
      name: PropTypes.string
    }),
    selected: PropTypes.array.isRequired,
    // actions
    setRoot: PropTypes.func.isRequired,
    createTmpDir: PropTypes.func.isRequired,
    setTmpDirName: PropTypes.func.isRequired,
    createDir: PropTypes.func.isRequired,
    removeDir: PropTypes.func.isRequired,
    rmTmpDir: PropTypes.func.isRequired,
    select: PropTypes.func.isRequired,
    deselect: PropTypes.func.isRequired,
    deselectAll: PropTypes.func.isRequired,
    createFiles: PropTypes.func.isRequired,
    push: PropTypes.func.isRequired
  };

  _onRowClick = (file, shiftKey) => {
    const {
      root,
      selected,
      select,
      deselect,
      deselectAll
    } = this.props
    const filePath = join(root, file.Name)

    if (shiftKey) {
      select(filePath)
    } else if (includes(selected, filePath)) {
      deselect(filePath)
    } else {
      deselectAll()
      select(filePath)
    }
  };

  _onRowDoubleClick = (file) => {
    const {root, deselectAll, setRoot, push} = this.props
    const filePath = join(root, file.Name)
    deselectAll()
    if (file.Type === 'directory') {
      setRoot(filePath)
    } else {
      push({
        pathname: '/files/preview',
        query: {
          name: filePath
        }
      })
    }
  };

  _onCreateDir = (event) => {
    this.props.createTmpDir(this.props.root)
  };

  _onCreateFiles = (files) => {
    this.props.createFiles(this.props.root, files)
  };

  _onCancelCreateDir = (event) => {
    this.props.rmTmpDir()
  };

  _onRemoveDir = () => {
    const {selected, removeDir} = this.props
    const count = selected.length
    const plural = count > 1 ? 'files' : 'file'
    const msg = `Are you sure you want to delete ${count} ${plural}?`
    toastr.confirm(msg, {
      onOk () {
        removeDir()
      }
    })
  };

  render () {
    const {list, root, setRoot, tmpDir, selected} = this.props

    return (
      <div className='files-explorer'>
        <Row>
          <Col sm={12}>
            <Row>
              <Col sm={12}>
                <Breadcrumbs
                  files={list}
                  root={root}
                  setRoot={setRoot}
                />
                <ActionBar
                  selectedFiles={selected}
                  onCreateDir={this._onCreateDir}
                  onRemoveDir={this._onRemoveDir}/>
              </Col>
            </Row>
            <Row>
              <Col sm={12}>
                <Tree
                  files={list}
                  tmpDir={tmpDir}
                  root={root}
                  selectedFiles={selected}
                  onRowClick={this._onRowClick}
                  onRowDoubleClick={this._onRowDoubleClick}
                  onTmpDirChange={this.props.setTmpDirName}
                  onCreateDir={this.props.createDir}
                  onCancelCreateDir={this._onCancelCreateDir}
                  onCreateFiles={this._onCreateFiles}/>
              </Col>
            </Row>
          </Col>
        </Row>
      </div>
    )
  }
}

function mapStateToProps (state) {
  const {files} = state

  return files
}

export default connect(mapStateToProps, {
  setRoot: files.filesSetRoot,
  createTmpDir: files.filesCreateTmpDir,
  setTmpDirName: files.filesSetTmpDirName,
  createDir: files.filesCreateDir,
  removeDir: files.filesRemoveDir,
  rmTmpDir: files.filesRmTmpDir,
  select: files.filesSelect,
  deselect: files.filesDeselect,
  deselectAll: files.filesDeselectAll,
  createFiles: files.filesCreateFiles,
  push: router.push
})(FilesExplorer)
