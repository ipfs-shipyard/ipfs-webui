import React from 'react'
import { Helmet } from 'react-helmet'
import { connect } from 'redux-bundler-react'
import { translate, Trans } from 'react-i18next'
import Box from '../components/box/Box'
import Button from '../components/button/Button'
import JsonEditor from './editor/JsonEditor'
import Tick from '../icons/GlyphSmallTick'

const PAUSE_AFTER_SAVE_MS = 3000

const SettingsPage = ({
  t, tReady,
  isConfigBlocked, isLoading, isSaving,
  hasSaveFailed, hasSaveSucceded, hasErrors, hasLocalChanges, hasExternalChanges,
  config, onChange, onReset, onSave, editorKey
}) => (
  <div data-id='SettingsPage'>
    <Helmet>
      <title>{t('title')} - IPFS</title>
    </Helmet>
    <Box>
      <div className='dt dt--fixed pb3'>
        <div className='dtc v-mid'>
          <SettingsInfo
            t={t}
            tReady={tReady}
            config={config}
            isConfigBlocked={isConfigBlocked}
            isLoading={isLoading}
            hasExternalChanges={hasExternalChanges}
            hasSaveFailed={hasSaveFailed}
            hasSaveSucceded={hasSaveSucceded} />
        </div>
        <div className='dtc tr v-btm pt2' style={{ width: 240 }}>
          { config ? (
            <div>
              <Button
                minWidth={100}
                className='ml3'
                bg='bg-charcoal'
                disabled={isSaving || (!hasLocalChanges && !hasExternalChanges)}
                onClick={onReset}>
                {t('reset')}
              </Button>
              <SaveButton
                t={t}
                tReady={tReady}
                hasErrors={hasErrors}
                hasSaveFailed={hasSaveFailed}
                hasSaveSucceded={hasSaveSucceded}
                hasLocalChanges={hasLocalChanges}
                hasExternalChanges={hasExternalChanges}
                isSaving={isSaving}
                onClick={onSave} />
            </div>
          ) : null }
        </div>
      </div>
      {config ? (
        <JsonEditor
          value={config}
          onChange={onChange}
          readOnly={isSaving}
          key={editorKey} />
      ) : null}
    </Box>
  </div>
)

const SaveButton = ({ t, hasErrors, hasSaveFailed, hasSaveSucceded, isSaving, hasLocalChanges, hasExternalChanges, onClick }) => {
  const bg = hasSaveSucceded ? 'bg-green' : 'bg-aqua'
  return (
    <Button
      minWidth={100}
      className='ml2'
      bg={bg}
      disabled={!hasLocalChanges || hasErrors}
      danger={hasSaveFailed || hasExternalChanges}
      onClick={onClick}>
      { hasSaveSucceded && !hasSaveFailed ? (
        <Tick height={16} className='fill-snow' style={{ transform: 'scale(3)' }} />
      ) : (
        isSaving ? t('saving') : t('save')
      )}
    </Button>
  )
}

const SettingsInfo = ({ t, isConfigBlocked, hasExternalChanges, hasSaveFailed, hasSaveSucceded, isLoading, config }) => {
  if (isConfigBlocked) {
    return (
      <p className='ma0 lh-copy charcoal f5 mw7'>
        {t('configApiNotAvailable')}
      </p>
    )
  } else if (!config) {
    return (
      <p className='ma0 lh-copy charcoal f5 mw7'>
        { isLoading ? t('fetchingSettings') : t('settingsUnavailable') }
      </p>
    )
  } else if (hasExternalChanges) {
    return (
      <p className='ma0 lh-copy red f5 mw7'>
        <Trans i18nKey='settingsHaveChanged'>
          The settings have changed, please click <strong>Reset</strong> to update the editor contents
        </Trans>
      </p>
    )
  } else if (hasSaveFailed) {
    return (
      <p className='ma0 lh-copy red fw6 f5 mw7'>
        {t('errorOccured')}
        <span className='db fw4 f6 charcoal-muted'>{t('checkConsole')}</span>
      </p>
    )
  } else if (hasSaveSucceded) {
    return (
      <p className='ma0 lh-copy green fw6 f5 mw7'>
        {t('changesSaved')}
        <span className='db fw4 f6 charcoal-muted'>{t('settingsWillBeUsedNextTime')}</span>
      </p>
    )
  }
  return (
    <p className='ma0 lh-copy charcoal-muted f6' style={{ maxWidth: 580 }}>
      {t('ipfsConfigDescription')}
    </p>
  )
}

export class SettingsPageContainer extends React.Component {
  state = {
    // valid json?
    hasErrors: false,
    // we edited it
    hasLocalChanges: false,
    // something else edited it
    hasExternalChanges: false,
    // mutable copy of the config
    editableConfig: this.props.config,
    // reset the editor on reset
    editorKey: Date.now()
  }

  onChange = (value) => {
    this.setState({
      hasErrors: !this.isValidJson(value),
      hasLocalChanges: this.props.config !== value,
      editableConfig: value
    })
  }

  onReset = () => {
    this.setState({
      hasErrors: false,
      hasLocalChanges: false,
      hasExternalChanges: false,
      editableConfig: this.props.config,
      editorKey: Date.now()
    })
  }

  onSave = () => {
    this.props.doSaveConfig(this.state.editableConfig)
  }

  isValidJson (str) {
    try {
      JSON.parse(str)
      return true
    } catch (err) {
      return false
    }
  }

  isRecent (msSinceEpoch) {
    return msSinceEpoch > Date.now() - PAUSE_AFTER_SAVE_MS
  }

  componentDidUpdate (prevProps) {
    if (this.props.configSaveLastSuccess !== prevProps.configSaveLastSuccess) {
      setTimeout(() => this.onReset(), PAUSE_AFTER_SAVE_MS)
    }
    if (prevProps.config !== this.props.config) {
      // no previous config, or we just saved.
      if (!prevProps.config || this.isRecent(this.props.configSaveLastSuccess)) {
        return this.setState({
          editableConfig: this.props.config
        })
      }
      // uh oh... something else edited the config while we were looking at it.
      if (this.props.config !== this.state.editableConfig) {
        return this.setState({
          hasExternalChanges: true
        })
      }
    }
  }

  render () {
    const { t, tReady, isConfigBlocked, configIsLoading, configLastError, configIsSaving, configSaveLastSuccess, configSaveLastError } = this.props
    const { hasErrors, hasLocalChanges, hasExternalChanges, editableConfig, editorKey } = this.state
    const hasSaveSucceded = this.isRecent(configSaveLastSuccess)
    const hasSaveFailed = this.isRecent(configSaveLastError)
    const isLoading = configIsLoading || (!editableConfig && !configLastError)
    return (
      <SettingsPage
        t={t}
        tReady={tReady}
        isConfigBlocked={isConfigBlocked}
        isLoading={isLoading}
        isSaving={configIsSaving}
        hasSaveFailed={hasSaveFailed}
        hasSaveSucceded={hasSaveSucceded}
        hasErrors={hasErrors}
        hasLocalChanges={hasLocalChanges}
        hasExternalChanges={hasExternalChanges}
        config={editableConfig}
        editorKey={editorKey}
        onChange={this.onChange}
        onReset={this.onReset}
        onSave={this.onSave} />
    )
  }
}

export default connect(
  'selectConfig',
  'selectIsConfigBlocked',
  'selectConfigLastError',
  'selectConfigIsLoading',
  'selectConfigIsSaving',
  'selectConfigSaveLastSuccess',
  'selectConfigSaveLastError',
  'doSaveConfig',
  translate('settings')(SettingsPageContainer)
)
