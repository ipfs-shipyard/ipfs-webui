import { createSelector } from 'redux-bundler'
import { getConfiguredCache } from 'money-clip'
import geoip from 'ipfs-geoip'
import Multiaddr from 'multiaddr'
import ms from 'milliseconds'

// Depends on ipfsBundle, peersBundle
export default function (opts) {
  opts = opts || {}
  // Max number of locations to retrieve concurrently
  opts.concurrency = opts.concurrency || 10
  // Cache options
  opts.cache = opts.cache || {}

  const defaultState = {
    // Peer locations keyed by peer ID then peer address.
    // i.e. { [peerId]: { [multiaddr]: { state, data?, error? } } }
    // `state` can be queued, resolving, resolved or failed
    // `data` is the resolved location data (see ipfs-geoip docs)
    // `error` is only present if state is 'failed'
    locations: {},
    // Peer IDs in the queue for resolving ONE of their queued addresses.
    // We actually have a queue of queues since each peer may have multiple
    // addresses to resolve. Peer locations are resolved in PARALLEL but for
    // any given peer we work our way through it's list of addresses in SERIES
    // until we find one that resolves.
    queuingPeers: [],
    // Peer IDs currently resolving for one of their queued addresses
    resolvingPeers: []
  }

  const cache = getConfiguredCache({
    name: 'peerLocations',
    version: 1,
    maxAge: ms.weeks(1),
    ...opts.cache
  })

  return {
    name: 'peerLocations',

    reducer (state = defaultState, action) {
      if (action.type === 'PEER_LOCATIONS_PEERS_QUEUED') {
        const { addrsByPeer, peerByAddr } = action.payload

        return {
          ...state,
          queuingPeers: state.queuingPeers.concat(Object.keys(addrsByPeer)),
          locations: Object.keys(peerByAddr).reduce((locs, addr) => {
            const peerId = peerByAddr[addr]
            locs[peerId] = locs[peerId] || {}
            locs[peerId][addr] = { state: 'queued' }
            return locs
          }, { ...state.locations })
        }
      }

      if (action.type === 'PEER_LOCATIONS_RESOLVE_STARTED') {
        const { peerId, addr } = action.payload

        return {
          ...state,
          queuingPeers: state.queuingPeers.filter(id => id !== peerId),
          resolvingPeers: state.resolvingPeers.concat(peerId),
          locations: {
            ...state.locations,
            [peerId]: {
              ...state.locations[peerId],
              [addr]: { state: 'resolving' }
            }
          }
        }
      }

      if (action.type === 'PEER_LOCATIONS_RESOLVE_FINISHED') {
        const { peerId, addr, location } = action.payload

        return {
          ...state,
          resolvingPeers: state.resolvingPeers.filter(id => id !== peerId),
          locations: {
            ...state.locations,
            [peerId]: {
              ...state.locations[peerId],
              [addr]: {
                state: 'resolved',
                data: location
              }
            }
          }
        }
      }

      if (action.type === 'PEER_LOCATIONS_RESOLVE_FAILED') {
        const { peerId, addr } = action.payload

        // Is there another queued address for this peer?
        const hasAlternate = Object.keys(state.locations[peerId])
          .filter(a => a !== addr)
          .some(a => state.locations[peerId][a].state === 'queued')

        return {
          ...state,
          resolvingPeers: state.resolvingPeers.filter(id => id !== peerId),
          // Re-queue the peer if it has another address to try
          queuingPeers: hasAlternate
            ? state.queuingPeers.concat(peerId)
            : state.queuingPeers,
          locations: {
            ...state.locations,
            [peerId]: {
              ...state.locations[peerId],
              [addr]: {
                state: 'failed',
                error: action.payload.error
              }
            }
          }
        }
      }

      return state
    },

    // Returns an object of the form:
    // { [peerId]: { [multiaddr]: { state, data?, error? } } }
    selectPeerLocationsRaw: state => state.peerLocations.locations,

    // Select just the data for the peer locations that have been resolved
    // Returns an object of the form:
    // { [peerId]: { /* location data */ } }
    selectPeerLocations: createSelector(
      'selectPeerLocationsRaw',
      peerLocsRaw => Object.keys(peerLocsRaw).reduce((locs, peerId) => {
        const locsByAddr = peerLocsRaw[peerId]
        const addr = Object.keys(locsByAddr).find(a => locsByAddr[a].state === 'resolved')
        if (addr) locs[peerId] = peerLocsRaw[peerId][addr].data
        return locs
      }, {})
    ),

    selectPeerLocationsQueuingPeers: state => state.peerLocations.queuingPeers,

    selectPeerLocationsResolvingPeers: state => state.peerLocations.resolvingPeers,

    selectPeerLocationsForSwarm: createSelector(
      'selectPeers',
      'selectPeerLocations',
      (peers, locations) => peers && peers.map((peer, idx) => {
        const peerId = peer.peer.toB58String()
        const address = peer.addr.toString()
        const locationObj = locations[peerId]
        const location = toLocationString(locationObj)
        const flagCode = locationObj && locationObj.country_code
        const coordinates = locationObj && [
          locationObj.longitude,
          locationObj.latitude
        ]

        return {
          peerId,
          address,
          location,
          flagCode,
          coordinates
        }
      })
    ),

    selectPeerCoordinates: createSelector(
      'selectPeerLocationsForSwarm',
      peers => {
        if (!peers) return []
        return peers.map(p => p.coordinates).filter(arr => !!arr)
      }
    ),

    doResolvePeerLocation: ({ peerId, addr }) => async ({ dispatch, store, getIpfs }) => {
      dispatch({ type: 'PEER_LOCATIONS_RESOLVE_STARTED', payload: { peerId, addr } })

      let location = await cache.get(peerId)

      if (location) {
        dispatch({
          type: 'PEER_LOCATIONS_RESOLVE_FINISHED',
          payload: { peerId, addr, location }
        })

        return
      }

      const ipfs = getIpfs()

      try {
        const ipv4Tuple = Multiaddr(addr).stringTuples().find(isNonHomeIPv4)

        if (!ipv4Tuple) {
          throw new Error(`Unable to resolve location for non-IPv4 address ${addr}`)
        }

        location = await new Promise((resolve, reject) => {
          geoip.lookup(ipfs, ipv4Tuple[1], (err, data) => {
            if (err) return reject(err)
            resolve(data)
          })
        })
      } catch (err) {
        return dispatch({
          type: 'PEER_LOCATIONS_RESOLVE_FAILED',
          payload: { peerId, addr, error: err }
        })
      }

      cache.set(peerId, location)

      dispatch({
        type: 'PEER_LOCATIONS_RESOLVE_FINISHED',
        payload: { peerId, addr, location }
      })
    },

    // Resolve another peer location where there's a peer in the queue and we're
    // not already resolving more than our allowed concurrency
    reactResolvePeerLocation: createSelector(
      'selectHash',
      'selectIpfsConnected',
      'selectPeerLocationsRaw',
      'selectPeerLocationsQueuingPeers',
      'selectPeerLocationsResolvingPeers',
      (hash, ipfsConnected, peerLocationsRaw, queuingPeers, resolvingPeers) => {
        if (hash === '/peers' && ipfsConnected && queuingPeers.length && resolvingPeers.length < opts.concurrency) {
          const peerId = queuingPeers[0]
          const locsByAddr = peerLocationsRaw[peerId]

          // TODO: what is causing this to fail?
          if (!locsByAddr) {
            return
          }

          const addr = Object.keys(locsByAddr).find(a => locsByAddr[a].state === 'queued')
          return { actionCreator: 'doResolvePeerLocation', args: [{ peerId, addr }] }
        }
      }
    ),

    // When the peers list changes, queue up the peers we don't already know about
    reactQueuePeerLocations: createSelector(
      'selectPeers',
      'selectPeerLocationsRaw',
      (peers, peerLocationsRaw) => {
        const payload = (peers || []).reduce(({ addrsByPeer, peerByAddr }, p) => {
          const peerId = p.peer.toB58String()
          const addr = p.addr.toString()

          if (peerLocationsRaw[peerId] && peerLocationsRaw[peerId][addr]) {
            return { addrsByPeer, peerByAddr }
          }

          addrsByPeer[peerId] = (addrsByPeer[peerId] || []).concat(addr)
          peerByAddr[addr] = peerId
          return { addrsByPeer, peerByAddr }
        }, { addrsByPeer: {}, peerByAddr: {} })

        if (Object.keys(payload.addrsByPeer).length) {
          return { type: 'PEER_LOCATIONS_PEERS_QUEUED', payload }
        }
      }
    )
  }
}

const isNonHomeIPv4 = t => t[0] === 4 && t[1] !== '127.0.0.1'

const toLocationString = loc => {
  if (!loc) return null
  const { country_name: country, city } = loc
  return city && country ? `${city}, ${country}` : country
}
