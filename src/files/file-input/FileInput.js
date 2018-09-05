import React from 'react'
import PropTypes from 'prop-types'
import { translate } from 'react-i18next'
import DocumentIcon from '../../icons/StrokeDocument'
import FolderIcon from '../../icons/StrokeFolder'
import DecentralizationIcon from '../../icons/StrokeDecentralization'
import { Dropdown, DropdownMenu, Option } from '../dropdown/Dropdown'
import Overlay from '../../components/overlay/Overlay'
import ByPathModal from './ByPathModal'
import NewFolderModal from './NewFolderModal'
import { NativeTypes } from 'react-dnd-html5-backend'
import { DropTarget } from 'react-dnd'

const AddButton = translate('files')(({ progress = null, t, tReady, ...props }) => {
  const sending = progress !== null
  let cls = 'Button f7 relative transition-all sans-serif dib v-mid fw5 nowrap lh-copy bn br1 pa2 focus-outline'
  if (sending) {
    cls += ' bg-grey light-grey'
  } else {
    cls += ' pointer bg-aqua white'
  }

  return (
    <button disabled={sending} className={cls} style={{ width: '120px' }} {...props}>
      <div className='absolute top-0 left-0 1 pa2 w-100 z-2'>
        {sending ? `${progress.toFixed(0)}%` : `+ ${t('addToIPFS')}`}
      </div>&nbsp;

      { sending &&
        <div className='transition-all absolute top-0 br1 left-0 h-100 z-1' style={{ width: `${progress}%`, background: 'rgba(0,0,0,0.1)' }} />
      }
    </button>
  )
})

class FileInput extends React.Component {
  static propTypes = {
    onMakeDir: PropTypes.func.isRequired,
    onAddFiles: PropTypes.func.isRequired,
    onAddByPath: PropTypes.func.isRequired,
    addProgress: PropTypes.number,
    t: PropTypes.func.isRequired,
    tReady: PropTypes.bool.isRequired
  }

  state = {
    dropdown: false,
    byPathModal: false,
    newFolderModal: false,
    force100: false
  }

  toggleDropdown = () => {
    this.setState(s => ({ dropdown: !s.dropdown }))
  }

  toggleModal = (which) => () => {
    if (!this.state[`${which}Modal`]) {
      this.toggleDropdown()
    }

    this.setState(s => {
      s[`${which}Modal`] = !s[`${which}Modal`]
      return s
    })
  }

  componentDidUpdate (prev) {
    if (this.props.addProgress === 100 && prev.addProgress !== 100) {
      this.setState({ force100: true })
      setTimeout(() => {
        this.setState({ force100: false })
      }, 2000)
    }
  }

  onInputChange = (input) => () => {
    this.props.onAddFiles(input.files)
    input.value = null
    this.toggleDropdown()
  }

  onAddByPath = (path) => {
    this.props.onAddByPath(path)
    this.toggleModal('byPath')()
  }

  onMakeDir = (path) => {
    this.props.onMakeDir(path)
    this.toggleModal('newFolder')()
  }

  render () {
    let { progress, t } = this.props
    if (this.state.force100) {
      progress = 100
    }

    return this.props.connectDropTarget(
      <div className={this.props.className}>
        <Dropdown>
          <AddButton progress={progress} onClick={this.toggleDropdown} />
          <DropdownMenu
            top={3}
            open={this.state.dropdown}
            onDismiss={this.toggleDropdown} >
            <Option onClick={() => this.filesInput.click()}>
              <DocumentIcon className='fill-aqua w2 mr1' />
              {t('addFile')}
            </Option>
            <Option onClick={() => this.folderInput.click()}>
              <FolderIcon className='fill-aqua w2 mr1' />
              {t('addFolder')}
            </Option>
            <Option onClick={this.toggleModal('byPath')}>
              <DecentralizationIcon className='fill-aqua w2 mr1' />
              {t('addByPath')}
            </Option>
            <Option className='bt border-snow' onClick={this.toggleModal('newFolder')}>
              <FolderIcon className='fill-aqua w2 mr1' />
              {t('newFolder')}
            </Option>
          </DropdownMenu>
        </Dropdown>

        <input
          type='file'
          className='dn'
          multiple
          ref={el => { this.filesInput = el }}
          onChange={this.onInputChange(this.filesInput)} />

        <input
          type='file'
          className='dn'
          multiple
          webkitdirectory='true'
          ref={el => { this.folderInput = el }}
          onChange={this.onInputChange(this.folderInput)} />

        <Overlay show={this.state.byPathModal} onLeave={this.toggleModal('byPath')}>
          <ByPathModal
            className='outline-0'
            onCancel={this.toggleModal('byPath')}
            onSubmit={this.onAddByPath} />
        </Overlay>

        <Overlay show={this.state.newFolderModal} onLeave={this.toggleModal('newFolder')}>
          <NewFolderModal
            className='outline-0'
            onCancel={this.toggleModal('newFolder')}
            onSubmit={this.onMakeDir} />
        </Overlay>
      </div>
    )
  }
}

const dropTarget = {
  drop: ({ onAddFiles }, monitor) => {
    if (monitor.didDrop()) {
      return
    }

    onAddFiles(monitor.getItem())
  }
}

const dropCollect = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop()
})

export default DropTarget(NativeTypes.FILE, dropTarget, dropCollect)(translate('files')(FileInput))
