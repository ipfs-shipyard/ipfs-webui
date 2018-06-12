import React from 'react'
import { Helmet } from 'react-helmet'
import { connect } from 'redux-bundler-react'

export function PeersPage ({ peers }) {
  return (
    <div data-id='PeersPage'>
      <Helmet>
        <title>Peers - IPFS</title>
      </Helmet>
      <h1 data-id='title'>Peers</h1>
      {peers ? (
        peers.map((p, i) => {
          const id = p.peer.toB58String()
          return <div key={i}>{id}</div>
        })
      ) : null}
    </div>
  )
}

export default connect(
  'selectPeers',
  PeersPage
)
