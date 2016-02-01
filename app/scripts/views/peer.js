import React, {Component} from 'react'
import i18n from '../utils/i18n.js'

export default class Peer extends Component {
  static displayName = 'Peer';
  static propTypes = {
    table: React.PropTypes.object,
    children: React.PropTypes.object,
    peer: React.PropTypes.object,
    location: React.PropTypes.object
  };
  render () {
    return (
      <div className='webui-peer'>
        <div className='info'>
          <p>
            <strong>{i18n.t('Peer ID')} </strong> <code>{this.props.peer.ID}</code>&nbsp;
          </p>
          <br />
          <p>
            <strong>{i18n.t('Location')} </strong> {this.props.location.formatted || i18n.t('Unknown')}
          </p>
          <p>
            <strong>{i18n.t('Agent Version')} </strong> <code>{this.props.peer.AgentVersion || ''}</code>
          </p>
          <p>
            <strong>{i18n.t('Protocol Version')} </strong> <code>{this.props.peer.ProtocolVersion || ''}</code>
          </p>
          <br />
          <div>
            <h4>{i18n.t('Public Key')}</h4>
            <pre>{this.props.peer.PublicKey || ''}</pre>
          </div>
          <br />
          <div>
            <h4>{i18n.t('Network Addresses')}</h4>
            <pre className='box addresses'>
              {(this.props.peer.Addresses || []).map(address => {
                if (!address) return
                return address + '\n'
              })}
            </pre>
          </div>
        </div>
      </div>
    )
  }
}
