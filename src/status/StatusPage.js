import React from 'react'
import { Helmet } from 'react-helmet'
import { translate } from 'react-i18next'
import { connect } from 'redux-bundler-react'
import StatusConnected from './StatusConnected'
import StatusNotConnected from './StatusNotConnected'
import NodeInfo from './NodeInfo'
import NodeInfoAdvanced from './NodeInfoAdvanced'
import NodeBandwidthChart from './NodeBandwidthChart'
import NetworkTraffic from './NetworkTraffic'
import Box from '../components/box/Box'

const StatusPage = ({ t, ipfsConnected }) => {
  return (
    <div data-id='StatusPage'>
      <Helmet>
        <title>{t('title')} - IPFS</title>
      </Helmet>
      <Box className='pa3' style={{ minHeight: 0 }}>
        <div className='flex'>
          <div className='flex-auto'>
            { ipfsConnected ? (
              <div>
                <StatusConnected />
                <NodeInfo />
                <div className='pt2'>
                  <NodeInfoAdvanced />
                </div>
              </div>
            ) : (
              <StatusNotConnected />
            )}
          </div>
        </div>
      </Box>
      <Box className='mt3 pa3' style={{ opacity: ipfsConnected ? 1 : 0.4 }}>
        <div className='flex flex-column flex-row-l'>
          <div className='pr0 pr2-l flex-auto'>
            <NodeBandwidthChart />
          </div>
          <div className='dn db-l pl3 pr5'>
            <NetworkTraffic />
          </div>
        </div>
      </Box>
    </div>
  )
}

export default connect(
  'selectIpfsConnected',
  translate('status')(StatusPage)
)
