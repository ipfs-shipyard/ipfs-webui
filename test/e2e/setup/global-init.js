const { setup: setupPuppeteer } = require('jest-environment-puppeteer')
const { setup: setupDevServer } = require('jest-dev-server')
const ipfsClient = require('ipfs-http-client')
const { createController } = require('ipfsd-ctl')
const { findBin } = require('ipfsd-ctl/src/utils')

// port on which static HTTP server exposes the webui from build/ directory
// for use in E2E tests
const webuiPort = 3001

module.exports = async function globalSetup (globalConfig) {
  // global setup first
  await setupPuppeteer(globalConfig)
  // http server with webui build
  await setupDevServer({
    command: `ecstatic build --cache=0 --port=${webuiPort}`,
    launchTimeout: 10000,
    port: webuiPort,
    debug: process.env.DEBUG === 'true'
  })
  const endpoint = process.env.E2E_API_URL
  let ipfsd
  let ipfs
  if (endpoint) {
    // create http client for endpoint passed via E2E_API_URL=
    ipfs = ipfsClient({ apiAddr: endpoint })
  } else {
    // use ipfds-ctl to spawn daemon to expose http api used for e2e tests
    const type = process.env.E2E_IPFSD_TYPE || 'go'
    ipfsd = await createController({
      type,
      test: true, // sets up all CORS headers required for accessing HTTP API port of ipfsd node
    }, {
      // overrides: call findBin here to ensure we use version from devDependencies, and not from ipfsd-ctl
      js: { ipfsBin: findBin('js') },
      go: { ipfsBin: findBin('go') }
    })
    ipfs = ipfsd.api
  }
  const { id, agentVersion } = await ipfs.id()
  console.log(`\nE2E init: using ${agentVersion} with Peer ID ${id}${endpoint ? ' at ' + endpoint : ''}\n`)
  // store globals for later use
  global.__IPFSD__ = ipfsd
  global.__IPFS__ = ipfs
  global.__WEBUI_URL__ = `http://localhost:${webuiPort}/`
}
