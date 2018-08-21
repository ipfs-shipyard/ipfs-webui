import React from 'react'
import { Helmet } from 'react-helmet'
import { connect } from 'redux-bundler-react'
import Box from '../components/box/Box'
import Button from '../components/button/Button'
import ComponentLoader from '../loader/ComponentLoader.js'

const WelcomePage = ({ doUpdateIpfsAPIAddress, ipfsInitFailed, ipfsReady, ipfsApiAddress }) => {
  if (!ipfsInitFailed && !ipfsReady) {
    return <ComponentLoader pastDelay />
  }

  return (
    <div>
      <Helmet>
        <title>Welcome to IPFS</title>
      </Helmet>
      <div className='flex'>
        <div className='flex-auto pr3 lh-copy charcoal'>
          <Box>
            { ipfsReady ? (
              <div>
                <h1 className='montserrat fw2 navy ma0 f3 yellow'>Your IPFS daemon is running!</h1>
                <p>
                  We could connect successfully to your IPFS daemon. Now, it's time for you to explore
                  your node. Head to <a className='link blue' href='#/files/'>Files page</a> to manage
                  and store your files, or try adventuring yourself on the <a className='link blue' href='#/explore'>Merkle Forest</a>.
                </p>
                <p>
                  You can always come back to this address to change the IPFS node you're connected to.
                </p>
              </div>
            ) : (
              <div>
                <h1 className='montserrat fw2 navy ma0 f3 yellow'>Is your IPFS daemon running?</h1>
                <p>
                  Failed to connect to the API. Please check the IPFS daemon is running.
                  Run <code className='f6'>ipfs daemon</code> in a terminal window, as shown below.
                </p>
                <p className='f7 mb0 ttu tracked charcoal pl2 bg-black-20'>
                  Shell
                </p>
                <div className='bg-black-70 snow pa2 f7'>
                  <code className='db'>$ ipfs daemon</code>
                  <code className='db'>Initializing daemon...</code>
                  <code className='db'>API server listening on /ip4/127.0.0.1/tcp/5001</code>
                </div>
                <p className='mt4'>
                  For more info on how to get started with IPFS you can <a className='link blue' href='https://ipfs.io/docs/getting-started/'>read the guide</a>.
                </p>
              </div>
            )}
            <h1 className='montserrat fw2 navy mb0 mt5 f3 yellow'>Is your API on a port other than 5001?</h1>
            <p>
              If your IPFS node is configured with a <a className='link blue' href='https://github.com/ipfs/go-ipfs/blob/master/docs/config.md#addresses' target='_blank' rel='noopener noreferrer'>custom API address</a>, please set it here
            </p>
            <ApiAddressForm
              defaultValue={ipfsApiAddress}
              updateAddress={doUpdateIpfsAPIAddress} />
          </Box>
        </div>
        <div className='measure lh-copy dn db-l flex-none mid-gray f6' style={{maxWidth: '40%'}}>
          <Box>
            <p className='mt0'><strong>IPFS is a protocol</strong> that defines a content-addressed file system, coordinates content delivery and combines ideas from Kademlia, BitTorrent, Git and more.</p>
            <p><strong>IPFS is a filesystem.</strong> It has directories and files and mountable filesystem via FUSE.</p>
            <p><strong>IPFS is a web.</strong> Files are accessible via HTTP at <code className='f6'>https://ipfs.io/&lt;path&gt;</code>. Browsers <a className='link blue' target='_blank' rel='noopener noreferrer' href='https://github.com/ipfs-shipyard/ipfs-companion#release-channel'>can be extended</a> to use the <code className='f6'>ipfs://</code> or <code className='f6'>dweb:/ipfs/</code> schemes directly, and hash-addressed content guarantees authenticity</p>
            <p><strong>IPFS is p2p.</strong> It supports worldwide peer-to-peer file transfers with a completely decentralized architecture and no central point of failure.</p>
            <p><strong>IPFS is a CDN.</strong> Add a file to your local repository, and it's now available to the world with cache-friendly content-hash addressing and bittorrent-like bandwidth distribution.</p>
          </Box>
        </div>
      </div>
    </div>
  )
}

class ApiAddressForm extends React.Component {
  constructor (props) {
    super(props)
    this.state = { value: props.defaultValue }
  }

  onChange = (event) => {
    let val = event.target.value

    if (this.props.onChange) {
      val = this.props.onChange(val)
    }

    this.setState({ value: val })
  }

  onKeyPress = (event) => {
    if (event.key === 'Enter') {
      this.onSubmit(event)
    }
  }

  onSubmit = async (event) => {
    event.preventDefault()
    this.props.updateAddress(this.state.value)
  }

  render () {
    return (
      <form onSubmit={this.onSubmit}>
        <label htmlFor='api-address' className='db f7 mb0 ttu tracked charcoal pl1'>API ADDRESS</label>
        <input id='api-address'
          type='text'
          className='w-100 lh-copy monospace f5 pl1 pv1 mb2 charcoal'
          onChange={this.onChange}
          onKeyPress={this.onKeyPress}
          value={this.state.value} />
        <div className='tr'>
          <Button>Submit</Button>
        </div>
      </form>
    )
  }
}

export default connect(
  'doUpdateIpfsAPIAddress',
  'selectIpfsInitFailed',
  'selectIpfsReady',
  'selectIpfsApiAddress',
  WelcomePage
)
