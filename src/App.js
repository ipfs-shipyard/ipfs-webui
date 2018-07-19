import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'redux-bundler-react'
import NavBar from './navigation/NavBar'
import navHelper from 'internal-nav-helper'
import IpldExploreForm from './explore/IpldExploreForm'
import AsyncRequestLoader from './loader/AsyncRequestLoader'
import { DragDropContext } from 'react-dnd'
import DnDBackend from './lib/dnd-backend'

export class App extends Component {
  static propTypes = {
    doInitIpfs: PropTypes.func.isRequired,
    doUpdateUrl: PropTypes.func.isRequired,
    route: PropTypes.oneOfType([
      PropTypes.func,
      PropTypes.element
    ]).isRequired
  }

  componentWillMount () {
    this.props.doInitIpfs()
  }

  render () {
    const Page = this.props.route
    return (
      <div className='sans-serif' onClick={navHelper(this.props.doUpdateUrl)}>
        <div className='dt dt--fixed' style={{height: '100vh'}}>
          <div className='dtc v-top bg-navy' style={{width: 240}}>
            <NavBar />
          </div>
          <div className='dtc v-top'>
            <div style={{background: '#F0F6FA'}}>
              <IpldExploreForm />
            </div>
            <main style={{padding: '40px'}}>
              <Page />
            </main>
          </div>
        </div>
        <div className='absolute top-0 left-0 pa2'>
          <AsyncRequestLoader />
        </div>
      </div>
    )
  }
}

export default connect(
  'selectRoute',
  'doUpdateUrl',
  'doInitIpfs',
  DragDropContext(DnDBackend)(App)
)
