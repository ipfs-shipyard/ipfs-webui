var React = require('react')
var Router = require('react-router')
var Route = Router.Route
var DefaultRoute = Router.DefaultRoute
var NotFoundRoute = Router.NotFoundRoute
var Redirect = Router.Redirect
var Page = require('./views/page.jsx')
var HomePage = require('./pages/home.jsx')
var ConnectionsPage = require('./pages/connections.jsx')
var FilesPage = require('./pages/files.jsx')
var ObjectsPage = require('./pages/objects.jsx')
var BitswapPage = require('./pages/bitswap.jsx')
var RoutingPage = require('./pages/routing.jsx')
var ConfigPage = require('./pages/config.jsx')
var LogPage = require('./pages/logs.jsx')
var MetricsPage = require('./pages/metrics.jsx');
var NotFoundPage = require('./pages/notfound.jsx')

module.exports = (
  <Route handler={Page} path="/">
    <DefaultRoute name="home" handler={HomePage} />
    <Route name="connections" handler={ConnectionsPage} />
    <Route name="files" handler={FilesPage} />
    <Route name="files-pinned" path="/files/pinned" handler={FilesPage} />
    <Route name="files-all" path="/files/all" handler={FilesPage} />
    <Route name="objects" handler={ObjectsPage} />
    <Route name="object" path="/objects/:hash" handler={ObjectsPage} />
    <Route name="object-ipfs" path="/objects/ipfs/:hash" handler={ObjectsPage} />
    <Route name="object-ipns" path="/objects/ipns/:hash" handler={ObjectsPage} />
    <Route name="bitswap" handler={BitswapPage} />
    <Route name="routing" handler={RoutingPage} />
    <Route name="config" handler={ConfigPage} />
    <Route name="logs" handler={LogPage} />
    <Route name="metrics" handler={MetricsPage} />
    <NotFoundRoute handler={NotFoundPage} />
    <Redirect from="/index.html" to="home" />
  </Route>
)
