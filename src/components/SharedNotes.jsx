import { useState, useRef, useCallback, useEffect } from 'react'
import { useAblyNotes } from '../hooks/useAblyNotes'
import styles from './SharedNotes.module.css'

const LS_MODE_KEY  = 'll-notes-mode'
const LS_TOKEN_KEY = 'll-bbb-token'
const LS_BBBURL_KEY = 'll-bbb-url'

const TOOLBAR = [
  { cmd: 'bold',          icon: 'B',  title: 'Bold',           style: { fontWeight: 700 } },
  { cmd: 'italic',        icon: 'I',  title: 'Italic',         style: { fontStyle: 'italic' } },
  { cmd: 'underline',     icon: 'U',  title: 'Underline',      style: { textDecoration: 'underline' } },
  { cmd: 'strikeThrough', icon: 'S',  title: 'Strikethrough',  style: { textDecoration: 'line-through' } },
  '|',
  { cmd: 'insertOrderedList',   icon: '1.', title: 'Numbered list' },
  { cmd: 'insertUnorderedList', icon: '•',  title: 'Bullet list' },
  '|',
  { cmd: 'indent',  icon: '→', title: 'Indent' },
  { cmd: 'outdent', icon: '←', title: 'Outdent' },
  '|',
  { cmd: 'undo', icon: '↶', title: 'Undo' },
  { cmd: 'redo', icon: '↷', title: 'Redo' },
  '|',
  { cmd: 'removeFormat', icon: 'T̸', title: 'Clear formatting' },
]

function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Strip &sessionToken=... from a BBB URL */
function stripSessionToken(url) {
  return url.replace(/[&?]sessionToken=[^&]*/gi, '')
}

export function SharedNotes({ sidebarMode, onRemoteActivity, roomId, onContentChange }) {
  const [open, setOpen]             = useState(false)
  const [mobileUnread, setMobileUnread] = useState(false)
  const editorRef                   = useRef(null)
  const localEditRef                = useRef(false)
  const localEditTimerRef           = useRef(null)

  // Mode: 'builtin' | 'bbb'
  const [mode, setMode]             = useState(() => localStorage.getItem(LS_MODE_KEY) || 'builtin')
  const [bbbBaseUrl, setBbbBaseUrl] = useState(() => localStorage.getItem(LS_BBBURL_KEY) || '')
  const [bbbToken, setBbbToken]     = useState(() => localStorage.getItem(LS_TOKEN_KEY) || '')
  const [bbbUrlInput, setBbbUrlInput] = useState('')
  const [bbbConnected, setBbbConnected] = useState(false)

  // Persist mode & token to localStorage
  useEffect(() => { localStorage.setItem(LS_MODE_KEY, mode) }, [mode])
  useEffect(() => { localStorage.setItem(LS_TOKEN_KEY, bbbToken) }, [bbbToken])
  useEffect(() => { localStorage.setItem(LS_BBBURL_KEY, bbbBaseUrl) }, [bbbBaseUrl])

  // Built-in notes
  const markLocalEdit = useCallback(() => {
    localEditRef.current = true
    if (localEditTimerRef.current) clearTimeout(localEditTimerRef.current)
    localEditTimerRef.current = setTimeout(() => {
      localEditRef.current = false
    }, 600)
  }, [])

  const handleRemoteNotes = useCallback((remote) => {
    if (localEditRef.current) return
    if (editorRef.current && editorRef.current.innerHTML !== remote) {
      editorRef.current.innerHTML = remote
      onRemoteActivity?.()
      setMobileUnread(true)
    }
  }, [onRemoteActivity])

  const handleRemoteBbbUrl = useCallback((remote) => {
    if (remote && typeof remote === 'object') {
      if (remote.url) {
        setBbbBaseUrl(remote.url)
        setBbbConnected(true)
      }
      if (remote.url === '') {
        setBbbBaseUrl('')
        setBbbConnected(false)
      }
    }
  }, [])

  const { publish, publishBbbUrl } = useAblyNotes({
    roomId,
    onNotesUpdate: handleRemoteNotes,
    onBbbUrlUpdate: handleRemoteBbbUrl,
  })

  const handleInput = useCallback(() => {
    if (!editorRef.current) return
    markLocalEdit()
    const html = editorRef.current.innerHTML
    publish(html)
    onContentChange?.(html.length > 0 && html !== '<br>')
  }, [publish, markLocalEdit, onContentChange])

  const execCmd = useCallback((cmd) => {
    editorRef.current?.focus()
    document.execCommand(cmd, false, null)
    handleInput()
  }, [handleInput])

  const handleExportText = useCallback(() => {
    const text = editorRef.current?.innerText || ''
    downloadFile('lightning-ladder-notes.txt', text, 'text/plain')
  }, [])

  const handleExportHtml = useCallback(() => {
    const html = editorRef.current?.innerHTML || ''
    const full = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Lightning Ladder Notes</title><style>body{font-family:monospace;padding:24px;max-width:800px;margin:0 auto;line-height:1.6}</style></head><body>${html}</body></html>`
    downloadFile('lightning-ladder-notes.html', full, 'text/html')
  }, [])

  const handleClearAll = useCallback(() => {
    if (!confirm('Clear all notes? This affects all connected users.')) return
    if (editorRef.current) {
      editorRef.current.innerHTML = ''
      publish('')
    }
  }, [publish])

  // BBB handlers
  const handleSetBbbUrl = useCallback(() => {
    const cleaned = stripSessionToken(bbbUrlInput.trim())
    if (!cleaned) return
    setBbbBaseUrl(cleaned)
    setBbbConnected(true)
    publishBbbUrl({ url: cleaned })
    setBbbUrlInput('')
  }, [bbbUrlInput, publishBbbUrl])

  const handleDisconnectBbb = useCallback(() => {
    if (!confirm('Disconnect BBB shared notes for all users?')) return
    setBbbBaseUrl('')
    setBbbConnected(false)
    publishBbbUrl({ url: '' })
  }, [publishBbbUrl])

  const handleBbbUrlPaste = useCallback((e) => {
    // Auto-clean on paste
    setTimeout(() => {
      setBbbUrlInput((v) => stripSessionToken(v))
    }, 0)
  }, [])

  // Computed BBB iframe URL
  const bbbIframeUrl = bbbBaseUrl && bbbToken
    ? `${bbbBaseUrl}&sessionToken=${bbbToken}`
    : null

  const panelClass = sidebarMode
    ? `${styles.panel} ${styles.sidebarPanel}`
    : styles.panel

  const isOpen = open || sidebarMode

  // ── Mode tabs ──
  const renderModeTabs = () => (
    <div className={styles.modeTabs}>
      <button
        className={`${styles.modeTab} ${mode === 'builtin' ? styles.modeTabActive : ''}`}
        onClick={() => setMode('builtin')}
      >
        BUILT-IN
      </button>
      <button
        className={`${styles.modeTab} ${mode === 'bbb' ? styles.modeTabActive : ''}`}
        onClick={() => setMode('bbb')}
      >
        BBB ETHERPAD
      </button>
    </div>
  )

  // ── BBB setup / iframe ──
  const renderBbbContent = () => {
    // No base URL set yet — show setup form
    if (!bbbBaseUrl) {
      return (
        <div className={styles.bbbSetup}>
          <div className={styles.bbbStep}>
            <div className={styles.bbbStepNum}>1</div>
            <div className={styles.bbbStepContent}>
              <div className={styles.bbbStepTitle}>PASTE BBB SHARED NOTES URL</div>
              <div className={styles.bbbStepHint}>
                In BBB, open Shared Notes → right-click the content area → &quot;Open frame in new tab&quot; → copy that URL.
                The sessionToken will be auto-removed.
              </div>
              <div className={styles.bbbInputRow}>
                <input
                  className={styles.bbbInput}
                  type="text"
                  placeholder="https://your-bbb.com/pad/auth_session?padName=..."
                  value={bbbUrlInput}
                  onChange={(e) => setBbbUrlInput(e.target.value)}
                  onPaste={handleBbbUrlPaste}
                  onKeyDown={(e) => e.key === 'Enter' && handleSetBbbUrl()}
                />
                <button className="btn btn-amber" style={{ fontSize: '9px', padding: '8px 14px' }} onClick={handleSetBbbUrl}>
                  SET URL
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    // Base URL set — show token input (if needed) and iframe
    return (
      <div className={styles.bbbContent}>
        {!bbbToken && (
          <div className={styles.bbbTokenSetup}>
            <div className={styles.bbbStep}>
              <div className={styles.bbbStepNum}>2</div>
              <div className={styles.bbbStepContent}>
                <div className={styles.bbbStepTitle}>ENTER YOUR SESSION TOKEN</div>
                <div className={styles.bbbStepHint}>
                  Look at your BBB browser URL — copy the text after <strong>?sessionToken=</strong>
                  <br />
                  e.g. from <code>https://your-bbb.com/html5client/?sessionToken=<strong>abc123xyz</strong></code> copy <strong>abc123xyz</strong>
                </div>
                <div className={styles.bbbInputRow}>
                  <input
                    className={styles.bbbInput}
                    type="text"
                    placeholder="paste your sessionToken here..."
                    value={bbbToken}
                    onChange={(e) => setBbbToken(e.target.value.trim())}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {bbbIframeUrl && (
          <div className={styles.bbbIframeWrap}>
            <iframe
              className={styles.bbbIframe}
              src={bbbIframeUrl}
              title="BBB Shared Notes"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            />
          </div>
        )}

        <div className={styles.bbbFooter}>
          <button
            className={styles.bbbFooterBtn}
            onClick={() => { setBbbToken(''); localStorage.removeItem(LS_TOKEN_KEY) }}
            title="Change your session token"
          >
            ↻ CHANGE TOKEN
          </button>
          <button
            className={`${styles.bbbFooterBtn} ${styles.bbbFooterDanger}`}
            onClick={handleDisconnectBbb}
            title="Disconnect BBB notes for all users"
          >
            ✕ DISCONNECT BBB
          </button>
        </div>
      </div>
    )
  }

  // ── Built-in editor ──
  const renderBuiltinContent = () => (
    <div className={styles.editorWrap}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          {TOOLBAR.map((item, i) =>
            item === '|' ? (
              <div key={i} className={styles.toolSep} />
            ) : (
              <button
                key={item.cmd}
                className={styles.toolBtn}
                title={item.title}
                style={item.style || {}}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => execCmd(item.cmd)}
              >
                {item.icon}
              </button>
            )
          )}
        </div>
        <div className={styles.toolbarRight}>
          <button className={styles.toolBtn} title="Export as text" onMouseDown={(e) => e.preventDefault()} onClick={handleExportText}>↓TXT</button>
          <button className={styles.toolBtn} title="Export as HTML" onMouseDown={(e) => e.preventDefault()} onClick={handleExportHtml}>↓HTML</button>
          <button className={`${styles.toolBtn} ${styles.toolDanger}`} title="Clear all notes" onMouseDown={(e) => e.preventDefault()} onClick={handleClearAll}>✕</button>
        </div>
      </div>
      <div
        ref={editorRef}
        className={styles.editor}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        data-placeholder="Type shared notes here... everyone sees updates in real-time."
      />
    </div>
  )

  return (
    <div className={panelClass}>
      {!sidebarMode && (
        <button className={styles.toggle} onClick={() => setOpen((o) => { if (!o) setMobileUnread(false); return !o })}>
          <span className={styles.toggleIcon}>{open ? '▾' : '▸'}</span>
          <span className={styles.toggleLabel}>SHARED NOTES</span>
          <span className={styles.toggleHint}>
            {open ? '' : '// click to expand'}
          </span>
          {!open && mobileUnread && <span className={styles.unreadDot} />}
        </button>
      )}

      {sidebarMode && (
        <div className={styles.sidebarHeader}>
          <span className={styles.sidebarTitle}>SHARED NOTES</span>
        </div>
      )}

      {isOpen && (
        <>
          {renderModeTabs()}
          {mode === 'builtin' ? renderBuiltinContent() : renderBbbContent()}
        </>
      )}
    </div>
  )
}
