import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'redux-bundler-react'
import navHelper from 'internal-nav-helper'
import { filesToStreams } from './lib/files'
import { IpldExploreForm } from 'ipld-explorer-components'
// React DnD
import { DragDropContext, DropTarget } from 'react-dnd'
import { NativeTypes } from 'react-dnd-html5-backend'
import DnDBackend from './lib/dnd-backend'
// Components
import NavBar from './navigation/NavBar'
import ComponentLoader from './loader/ComponentLoader'
import Notify from './components/notify/Notify'
import Connected from './components/connected/Connected'

export class App extends Component {
  static propTypes = {
    doInitIpfs: PropTypes.func.isRequired,
    doUpdateUrl: PropTypes.func.isRequired,
    doUpdateHash: PropTypes.func.isRequired,
    doFilesWrite: PropTypes.func.isRequired,
    route: PropTypes.oneOfType([
      PropTypes.func,
      PropTypes.element
    ]).isRequired,
    routeInfo: PropTypes.object.isRequired,
    navbarIsOpen: PropTypes.bool.isRequired,
    // Injected by DropTarget
    isOver: PropTypes.bool.isRequired
  }

  componentWillMount () {
    this.props.doInitIpfs()
  }

  addFiles = async (filesPromise) => {
    const { doFilesWrite, doUpdateHash, routeInfo } = this.props
    const isFilesPage = routeInfo.pattern === '/files*'
    const addAtPath = isFilesPage ? routeInfo.params.path : '/'
    const files = await filesPromise

    doFilesWrite(addAtPath, await filesToStreams(files))
    // Change to the files pages if the user is not there
    if (!isFilesPage) {
      doUpdateHash('/files')
    }
  }

  render () {
    const { route: Page, ipfsReady, routeInfo: { url }, navbarIsOpen, connectDropTarget, isOver } = this.props

    return connectDropTarget(
      <div className='sans-serif h-100' onClick={navHelper(this.props.doUpdateUrl)}>
        {/* Tinted overlay that appears when dragging and dropping an item */}
        { isOver && <div className='w-100 h-100 top-0 left-0 absolute' style={{ background: 'rgba(99, 202, 210, 0.2)' }} /> }
        <div className='flex-l' style={{ minHeight: '100vh' }}>
          <div className={`flex-none-l bg-navy ${navbarIsOpen ? 'w5-l' : 'w4-l'}`}>
            <NavBar />
          </div>
          <div className='flex-auto-l'>
            <div className='flex items-center ph3 ph4-l' style={{ height: 75, background: '#F0F6FA', paddingTop: '20px', paddingBottom: '15px' }}>
              <div style={{ width: 560 }}>
                <IpldExploreForm />
              </div>
              <div className='dn db-ns flex-auto tr'>
                <Connected />
              </div>
            </div>
            <main className='bg-white pv3 pa3-ns pa4-l'>
              { (ipfsReady || url === '/welcome' || url.startsWith('/settings'))
                ? <Page />
                : <ComponentLoader pastDelay />
              }
            </main>
          </div>
        </div>
        <Notify />
      </div>
    )
  }
}

const dropTarget = {
  drop: (props, monitor, App) => {
    if (monitor.didDrop()) {
      return
    }

    const { filesPromise } = monitor.getItem()
    App.addFiles(filesPromise)
  }
}

const dropCollect = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop()
})

export const AppWithDropTarget = DropTarget(NativeTypes.FILE, dropTarget, dropCollect)(App)

export default connect(
  'selectRoute',
  'selectNavbarIsOpen',
  'selectRouteInfo',
  'doUpdateUrl',
  'doUpdateHash',
  'doInitIpfs',
  'doFilesWrite',
  'selectIpfsReady',
  DragDropContext(DnDBackend)(AppWithDropTarget)
)
