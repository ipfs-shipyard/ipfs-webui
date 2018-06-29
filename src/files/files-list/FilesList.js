import React from 'react'
import PropTypes from 'prop-types'
import Checkbox from '../../components/checkbox/Checkbox'
import SelectedActions from '../selected-actions/SelectedActions'
import File from '../file/File'
import { join } from '../../lib/path'
import './FilesList.css'

const ORDER_BY_NAME = 'name'
const ORDER_BY_SIZE = 'size'

function compare (a, b, asc) {
  if (a > b) {
    return asc ? 1 : -1
  } else if (a < b) {
    return asc ? -1 : 1
  } else {
    return 0
  }
}

class FileList extends React.Component {
  static propTypes = {
    className: PropTypes.string,
    onShare: PropTypes.func.isRequired,
    onInspect: PropTypes.func.isRequired,
    onRename: PropTypes.func.isRequired,
    onDownload: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
    onNavigate: PropTypes.func.isRequired,
    onCancelUpload: PropTypes.func.isRequired,
    files: PropTypes.array.isRequired,
    root: PropTypes.string.isRequired,
    maxWidth: PropTypes.string
  }

  static defaultProps = {
    className: '',
    maxWidth: '100%'
  }

  state = {
    selected: [],
    sortBy: ORDER_BY_NAME,
    sortAsc: true
  }

  selectAll = (checked) => {
    let selected = []

    if (checked) {
      selected = this.props.files.map(file => file.hash)
    }

    this.setState({ selected: selected })
  }

  selectOne = (hash, select) => {
    let selected = this.state.selected

    if (select) {
      selected.push(hash)
    } else {
      selected.splice(this.state.selected.indexOf(hash), 1)
    }

    this.setState({selected: selected})
  }

  genActionFromSelected = (fn, opts = {}) => {
    return () => {
      if (opts.unselect) {
        this.setState({ selected: [] })
      }

      let data = this.selectedFiles.map(f => {
        return {
          ...f,
          path: join(this.props.root, f.name)
        }
      })

      this.props[fn](data)
    }
  }

  genActionFromFile = (fn, file) => {
    return () => {
      this.props[fn](join(this.props.root, file.name))
    }
  }

  get selectedFiles () {
    return this.state.selected.map(hash => {
      return this.props.files.find(el => el.hash === hash)
    })
  }

  selectedMenu = () => {
    if (this.state.selected.length === 0) {
      return null
    }

    const unselectAll = () => this.selectAll(false)
    const size = this.selectedFiles.reduce((a, b) => a + b.size, 0)

    return (
      <SelectedActions
        className='fixed bottom-0 right-0'
        style={{maxWidth: this.props.maxWidth}}
        unselect={unselectAll}
        remove={this.genActionFromSelected('onDelete', {unselect: true})}
        share={this.genActionFromSelected('onShare')}
        rename={this.genActionFromSelected('onRename')}
        download={this.genActionFromSelected('onDownload')}
        inspect={this.genActionFromSelected('onInspect')}
        count={this.state.selected.length}
        size={size}
      />
    )
  }

  generateFiles = () => {
    return this.props.files.sort((a, b) => {
      if (a.type === b.type) {
        if (this.state.sortBy === ORDER_BY_NAME) {
          return compare(a.name, b.name, this.state.sortAsc)
        } else {
          return compare(a.size, b.size, this.state.sortAsc)
        }
      }

      if (a.type === 'directory') {
        return -1
      } else {
        return 1
      }
    }).map(file => (
      <File
        onSelect={this.selectOne}
        onNavigate={this.genActionFromFile('onNavigate', file)}
        onCancel={this.genActionFromFile('onCancelUpload', file)}
        selected={this.state.selected.indexOf(file.hash) !== -1}
        key={window.btoa(file.name)}
        {...file}
      />
    ))
  }

  sortByIcon = (order) => {
    if (this.state.sortBy === order) {
      return (this.state.sortAsc) ? '↑' : '↓'
    }

    return null
  }

  changeSort = (order) => {
    return () => {
      if (order === this.state.sortBy) {
        this.setState({ sortAsc: !this.state.sortAsc })
      } else {
        this.setState({ sortBy: order, sortAsc: true })
      }
    }
  }

  render () {
    let {className} = this.props
    className = `FilesList no-select sans-serif border-box w-100 ${className}`

    if (this.state.selected.length !== 0) {
      className += ' mb6'
    }

    return (
      <section className={className}>
        <header className='gray pv3 flex items-center'>
          <div className='ph2 w2'>
            <Checkbox checked={this.state.selected.length === this.props.files.length} onChange={this.selectAll} />
          </div>
          <div className='ph2 f6 flex-grow-1 w-40'>
            <span onClick={this.changeSort(ORDER_BY_NAME)} className='pointer'>
              File name {this.sortByIcon(ORDER_BY_NAME)}
            </span>
          </div>
          <div className='ph2 f6 w-30'>Status</div>
          <div className='ph2 f6 w-10'>
            <span className='pointer' onClick={this.changeSort(ORDER_BY_SIZE)}>
              Size {this.sortByIcon(ORDER_BY_SIZE)}
            </span>
          </div>
        </header>
        {this.generateFiles()}
        {this.selectedMenu()}
      </section>
    )
  }
}

export default FileList
