import React from 'react'
import PropTypes from 'prop-types'
import { findDOMNode } from 'react-dom'
import { Helmet } from 'react-helmet'
import { connect } from 'redux-bundler-react'
import downloadFile from './download-file'
import { translate } from 'react-i18next'
// Components
import FilesList from './files-list/FilesList'
import FilePreview from './file-preview/FilePreview'
import ContextMenu from './context-menu/ContextMenu'
import AddFilesInfo from './info-boxes/AddFilesInfo'
import CompanionInfo from './info-boxes/CompanionInfo'
import WelcomeInfo from './info-boxes/WelcomeInfo'
import Modals, { DELETE, NEW_FOLDER, SHARE, RENAME } from './modals/Modals'
import Header from './header/Header'

const defaultState = {
  downloadAbort: null,
  downloadProgress: null,
  modals: {
    show: null,
    files: null
  },
  contextMenu: {
    isOpen: false,
    translateX: 0,
    translateY: 0,
    file: null
  }
}

class FilesPage extends React.Component {
  constructor (props) {
    super(props)
    this.contextMenuRef = React.createRef()
  }

  static propTypes = {
    ipfsConnected: PropTypes.bool,
    ipfsProvider: PropTypes.string,
    files: PropTypes.object,
    filesErrors: PropTypes.array,
    filesPathFromHash: PropTypes.string,
    filesSorting: PropTypes.object.isRequired,
    gatewayUrl: PropTypes.string.isRequired,
    doUpdateHash: PropTypes.func.isRequired,
    doFilesDelete: PropTypes.func.isRequired,
    doFilesMove: PropTypes.func.isRequired,
    doFilesWrite: PropTypes.func.isRequired,
    doFilesAddPath: PropTypes.func.isRequired,
    doFilesDownloadLink: PropTypes.func.isRequired,
    doFilesMakeDir: PropTypes.func.isRequired,
    doFilesUpdateSorting: PropTypes.func.isRequired,
    t: PropTypes.func.isRequired,
    tReady: PropTypes.bool.isRequired
  }

  state = defaultState

  resetState = (field) => this.setState({ [field]: defaultState[field] })

  componentDidMount () {
    this.props.doFilesFetch()
  }

  componentDidUpdate (prev) {
    const { filesPathFromHash } = this.props

    if (prev.files === null || !prev.ipfsConnected || filesPathFromHash !== prev.filesPathFromHash) {
      this.props.doFilesFetch()
    }
  }

  download = async (files) => {
    const { doFilesDownloadLink } = this.props
    const { downloadProgress, downloadAbort } = this.state

    if (downloadProgress !== null) {
      downloadAbort()
      return
    }

    const updater = (v) => this.setState({ downloadProgress: v })
    const { url, filename } = await doFilesDownloadLink(files)
    const { abort } = await downloadFile(url, filename, updater)
    this.setState({ downloadAbort: abort })
  }

  add = (raw, root = '') => {
    const { files, doFilesWrite } = this.props

    if (root === '') {
      root = files.path
    }

    doFilesWrite(root, raw)
  }

  addByPath = (path) => {
    const { doFilesAddPath, files } = this.props
    doFilesAddPath(files.path, path)
  }

  inspect = (hash) => {
    const { doUpdateHash } = this.props

    if (Array.isArray(hash)) {
      hash = hash[0].hash
    }

    doUpdateHash(`/explore/ipfs/${hash}`)
  }

  showNewFolderModal = () => {
    this.setState({ modals: { show: NEW_FOLDER } })
  }

  showShareModal = (files) => {
    this.setState({ modals: { show: SHARE, files } })
  }

  showRenameModal = (files) => {
    this.setState({ modals: { show: RENAME, files } })
  }

  showDeleteModal = (files) => {
    this.setState({ modals: { show: DELETE, files } })
  }

  resetModals = () => {
    this.setState({ modals: { } })
  }

  handleContextMenu = (ev, clickType, file, dotsPosition, fromHeader = false) => {
    // This is needed to disable the native OS right-click menu
    // and deal with the clicking on the ContextMenu options
    if (ev !== undefined && typeof ev !== 'string') {
      ev.preventDefault()
      ev.persist()
    }

    const ctxMenu = findDOMNode(this.contextMenuRef.current)
    const ctxMenuPosition = ctxMenu.getBoundingClientRect()

    let translateX = 0
    let translateY = 0

    if (clickType === 'RIGHT') {
      const rightPadding = window.innerWidth - ctxMenu.parentNode.getBoundingClientRect().right
      translateX = (window.innerWidth - ev.clientX) - rightPadding - 20
      translateY = (ctxMenuPosition.y + ctxMenuPosition.height / 2) - ev.clientY - 10
    } else {
      translateX = 1
      translateY = (ctxMenuPosition.y + ctxMenuPosition.height / 2) - (dotsPosition && dotsPosition.y) - 30
    }

    if (fromHeader) {
      translateX = -8
    }

    this.setState({
      contextMenu: {
        isOpen: !this.state.contextMenu.isOpen,
        translateX,
        translateY,
        file
      }
    })
  }

  render () {
    const {
      ipfsProvider, files, filesSorting: sort, t,
      doFilesMove, doFilesNavigateTo, doFilesUpdateSorting
    } = this.props

    const { contextMenu } = this.state

    const isCompanion = ipfsProvider === 'window.ipfs'
    const filesExist = files && files.content && files.content.length
    const isRoot = files && files.path === '/'

    return (
      <div data-id='FilesPage' className='mw9 center'>
        <Helmet>
          <title>{t('title')} - IPFS</title>
        </Helmet>

        <ContextMenu
          ref={this.contextMenuRef}
          isOpen={contextMenu.isOpen}
          translateX={contextMenu.translateX}
          translateY={contextMenu.translateY}
          handleClick={this.handleContextMenu}
          isUpperDir={contextMenu.file && contextMenu.file.name === '..'}
          showDots={false}
          onShare={() => this.showShareModal([contextMenu.file])}
          onDelete={() => this.showDeleteModal([contextMenu.file])}
          onRename={() => this.showRenameModal([contextMenu.file])}
          onInspect={() => this.inspect([contextMenu.file])}
          onDownload={() => this.download([contextMenu.file])}
          hash={contextMenu.file && contextMenu.file.hash} />

        { files &&
          <div>
            <Header onAdd={this.add}
              onAddByPath={this.addByPath}
              onNewFolder={this.showNewFolderModal}
              handleContextMenu={(...args) => this.handleContextMenu(...args, true)} />

            { isRoot && isCompanion && <CompanionInfo /> }

            { isRoot && !filesExist && !isCompanion && <AddFilesInfo /> }

            { isRoot && !filesExist && <WelcomeInfo t={t} /> }

            { files.type === 'directory'
              ? <FilesList
                key={window.encodeURIComponent(files.path)}
                root={files.path}
                sort={sort}
                updateSorting={doFilesUpdateSorting}
                files={files.content}
                upperDir={files.upper}
                downloadProgress={this.state.downloadProgress}
                onShare={this.showShareModal}
                onInspect={this.inspect}
                onDownload={this.download}
                onAddFiles={this.add}
                onRename={this.showRenameModal}
                onDelete={this.showDeleteModal}
                onNavigate={doFilesNavigateTo}
                onMove={doFilesMove}
                handleContextMenuClick={this.handleContextMenu} />
              : <FilePreview {...files} gatewayUrl={this.props.gatewayUrl} /> }
          </div>
        }

        <Modals done={this.resetModals} root={files ? files.path : null} { ...this.state.modals } />
      </div>
    )
  }
}

export default connect(
  'selectIpfsProvider',
  'selectIpfsConnected',
  'doUpdateHash',
  'doFilesDelete',
  'doFilesMove',
  'doFilesWrite',
  'doFilesAddPath',
  'doFilesDownloadLink',
  'doFilesMakeDir',
  'doFilesFetch',
  'doFilesNavigateTo',
  'doFilesUpdateSorting',
  'selectFiles',
  'selectGatewayUrl',
  'selectFilesPathFromHash',
  'selectFilesSorting',
  translate('files')(FilesPage)
)
