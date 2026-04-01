import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import java from 'highlight.js/lib/languages/java'
import csharp from 'highlight.js/lib/languages/csharp'
import cpp from 'highlight.js/lib/languages/cpp'
import go from 'highlight.js/lib/languages/go'
import rust from 'highlight.js/lib/languages/rust'
import php from 'highlight.js/lib/languages/php'
import ruby from 'highlight.js/lib/languages/ruby'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import json from 'highlight.js/lib/languages/json'
import sql from 'highlight.js/lib/languages/sql'
import bash from 'highlight.js/lib/languages/bash'
import 'highlight.js/styles/github-dark.css'

// Register languages
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('python', python)
hljs.registerLanguage('java', java)
hljs.registerLanguage('csharp', csharp)
hljs.registerLanguage('cpp', cpp)
hljs.registerLanguage('go', go)
hljs.registerLanguage('rust', rust)
hljs.registerLanguage('php', php)
hljs.registerLanguage('ruby', ruby)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('css', css)
hljs.registerLanguage('json', json)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('bash', bash)

function App() {
  const [activeTab, setActiveTab] = useState('text')
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [language, setLanguage] = useState('plaintext')
  const [expiresValue, setExpiresValue] = useState('15')
  const [expiresUnit, setExpiresUnit] = useState('minutes')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [viewMode, setViewMode] = useState('create')
  const [pasteId, setPasteId] = useState('')
  const [pasteData, setPasteData] = useState(null)
  const [copied, setCopied] = useState(false)
  const [password, setPassword] = useState('')
  const [isSplit, setIsSplit] = useState(false)
  const [showApiKeyWarning, setShowApiKeyWarning] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordRequired, setPasswordRequired] = useState(false)
  const [maxViews, setMaxViews] = useState(null)
  const [syntaxHighlighting, setSyntaxHighlighting] = useState(true)
  const [showExpiryWarning, setShowExpiryWarning] = useState(false)
  const [showViewsWarning, setShowViewsWarning] = useState(false)
  const [detectedLanguage, setDetectedLanguage] = useState('plaintext')
  const [showSecurityModal, setShowSecurityModal] = useState(false)
  const [pendingSubmit, setPendingSubmit] = useState(false)
  const [useCustomUrl, setUseCustomUrl] = useState(false)
  const [customUrl, setCustomUrl] = useState('')
  const [customUrlError, setCustomUrlError] = useState('')
  const [allowEdit, setAllowEdit] = useState(false)
  const [editPassword, setEditPassword] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [theme, setTheme] = useState('dark')
  const [currentTime, setCurrentTime] = useState(Date.now())
  const [showExpiringNotification, setShowExpiringNotification] = useState(false)
  const codeRef = useRef(null)
  const previewCodeRef = useRef(null)

  useEffect(() => {
    const pathId = window.location.pathname.substring(1)
    if (pathId && pathId.length > 0) {
      setPasteId(pathId)
      setViewMode('view')
      loadPaste(pathId)
    }

    // Load theme preference
    const savedTheme = localStorage.getItem('theme') || 'dark'
    setTheme(savedTheme)
    document.body.classList.toggle('light', savedTheme === 'light')
  }, [])

  // Update time every second for countdown timer
  useEffect(() => {
    if (viewMode === 'view' && pasteData) {
      const interval = setInterval(() => {
        setCurrentTime(Date.now())
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [viewMode, pasteData])

  // Show expiring notification when paste has < 5 minutes remaining
  useEffect(() => {
    if (viewMode === 'view' && pasteData && pasteData.expiresAt) {
      const now = new Date()
      const expires = new Date(pasteData.expiresAt)
      const diff = expires - now
      const totalSeconds = Math.floor(diff / 1000)

      // Show notification if < 5 minutes (300 seconds) remaining
      if (totalSeconds > 0 && totalSeconds < 300) {
        setShowExpiringNotification(true)

        // Hide notification after 20 seconds
        const timeout = setTimeout(() => {
          setShowExpiringNotification(false)
        }, 20000)

        return () => clearTimeout(timeout)
      }
    }
  }, [viewMode, pasteData])

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'

    // Use View Transitions API if supported
    if (!document.startViewTransition) {
      // Fallback for browsers without View Transitions API
      setTheme(newTheme)
      localStorage.setItem('theme', newTheme)
      document.body.classList.toggle('light', newTheme === 'light')
      return
    }

    document.startViewTransition(() => {
      setTheme(newTheme)
      localStorage.setItem('theme', newTheme)
      document.body.classList.toggle('light', newTheme === 'light')
    })
  }

  useEffect(() => {
    if (codeRef.current && pasteData && !pasteData.passwordProtected && pasteData.content && syntaxHighlighting) {
      hljs.highlightElement(codeRef.current)
    }
  }, [pasteData, syntaxHighlighting])

  // Highlight preview in create form
  useEffect(() => {
    if (previewCodeRef.current && content && detectedLanguage !== 'plaintext') {
      hljs.highlightElement(previewCodeRef.current)
    }
  }, [content, detectedLanguage])

  useEffect(() => {
    if (pasteData && pasteData.expiresAt && !pasteData.passwordProtected) {
      const expiresAt = new Date(pasteData.expiresAt)
      const now = new Date()
      const timeLeft = expiresAt - now
      const minutesLeft = Math.floor(timeLeft / 60000)

      // Show warning if less than 5 minutes left
      if (minutesLeft <= 5 && minutesLeft > 0) {
        setShowExpiryWarning(true)
      }

      // Show warning if max views is close
      if (pasteData.maxViews && pasteData.viewCount) {
        const viewsLeft = pasteData.maxViews - pasteData.viewCount
        if (viewsLeft <= 1) {
          setShowViewsWarning(true)
        }
      }
    }
  }, [pasteData])

  // Detect API keys, tokens, passwords in content
  const detectSensitiveData = (text) => {
    if (!text || text.length < 10) return false

    const sensitivePatterns = [
      // API Keys & Tokens
      /[A-Za-z0-9]{32,}/,  // Generic long token
      /sk-[A-Za-z0-9]{40,}/, // OpenAI-style key
      /AIza[A-Za-z0-9_-]{35}/, // Google API key
      /ghp_[A-Za-z0-9]{36}/, // GitHub token
      /gho_[A-Za-z0-9]{36}/, // GitHub OAuth
      /xox[baprs]-[A-Za-z0-9-]{10,}/, // Slack token
      /AKIA[A-Z0-9]{16}/, // AWS Access Key
      /ya29\.[A-Za-z0-9_-]+/, // Google OAuth token
      /glpat-[A-Za-z0-9_-]{20,}/, // GitLab token
      /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/, // JWT token

      // Password-like patterns
      /password\s*[:=]\s*['"]?[A-Za-z0-9!@#$%^&*]{8,}['"]?/i,
      /pwd\s*[:=]\s*['"]?[A-Za-z0-9!@#$%^&*]{8,}['"]?/i,
      /pass\s*[:=]\s*['"]?[A-Za-z0-9!@#$%^&*]{8,}['"]?/i,
      /secret\s*[:=]\s*['"]?[A-Za-z0-9!@#$%^&*]{8,}['"]?/i,
      /apikey\s*[:=]\s*['"]?[A-Za-z0-9_-]{20,}['"]?/i,
      /api_key\s*[:=]\s*['"]?[A-Za-z0-9_-]{20,}['"]?/i,
      /access_token\s*[:=]\s*['"]?[A-Za-z0-9_-]{20,}['"]?/i,
      /bearer\s+[A-Za-z0-9_-]{20,}/i,

      // Database connection strings
      /mongodb:\/\/[^:]+:[^@]+@/i,
      /postgres:\/\/[^:]+:[^@]+@/i,
      /mysql:\/\/[^:]+:[^@]+@/i,
    ]

    return sensitivePatterns.some(pattern => pattern.test(text))
  }

  const detectApiKey = detectSensitiveData // Backwards compatibility

  // Validate custom URL
  const validateCustomUrl = (url) => {
    if (!url || url.length === 0) {
      setCustomUrlError('')
      return true
    }

    if (url.length < 6) {
      setCustomUrlError('Must be at least 6 characters')
      return false
    }

    const hasNumberOrSpecial = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(url)
    if (!hasNumberOrSpecial) {
      setCustomUrlError('Must contain at least 1 number or special character')
      return false
    }

    const validChars = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/
    if (!validChars.test(url)) {
      setCustomUrlError('Contains invalid characters')
      return false
    }

    setCustomUrlError('')
    return true
  }

  useEffect(() => {
    if (useCustomUrl && customUrl) {
      validateCustomUrl(customUrl)
    }
  }, [customUrl, useCustomUrl])

  useEffect(() => {
    if (content && detectApiKey(content) && !password && !isSplit) {
      setShowApiKeyWarning(true)
    } else {
      setShowApiKeyWarning(false)
    }

    // Auto-detect language when content changes
    if (content && content.trim().length > 0) {
      const detected = detectLanguageFromContent(content)
      setDetectedLanguage(detected)

      // Auto-set language dropdown if it's on "plaintext" (Auto Detect)
      if (language === 'plaintext' && detected !== 'plaintext') {
        setLanguage(detected)
      }
    } else {
      setDetectedLanguage('plaintext')
    }
  }, [content, password, isSplit, language])

  // Detect language from content - ORDER MATTERS!
  const detectLanguageFromContent = (text) => {
    if (!text || text.trim().length === 0) return 'plaintext'

    const trimmed = text.trim()

    // JSON Detection (highest priority for pure JSON)
    try {
      JSON.parse(trimmed)
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        return 'json'
      }
    } catch (e) {}

    // JavaScript/TypeScript Detection (BEFORE HTML - template strings contain HTML!)
    if (/\b(function|const|let|var|=>|import|export|require|return)\b/.test(text)) {
      if (/\b(interface|type|enum)\b/.test(text) && /:/.test(text)) {
        return 'typescript'
      }
      return 'javascript'
    }

    // PHP Detection (before HTML)
    if (/<\?php/.test(text)) {
      return 'php'
    }

    // Python Detection
    if (/\b(def|class|import|from|print|if __name__|elif)\b/.test(text)) {
      return 'python'
    }

    // XML Detection (before HTML)
    if (/^<\?xml/i.test(trimmed)) {
      return 'xml'
    }

    // HTML Detection (only if no other code detected)
    if (/<\s*([a-z]+)[^>]*>/i.test(trimmed) && /^<!DOCTYPE|^<html/i.test(trimmed)) {
      return 'html'
    }

    // CSS Detection
    if (/[.#][\w-]+\s*\{[^}]*\}/.test(text) && !/</.test(text)) {
      return 'css'
    }

    // SQL Detection
    if (/\b(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|FROM|WHERE|JOIN)\b/i.test(text)) {
      return 'sql'
    }

    // Bash/Shell Detection
    if (/^#!\/bin\/(bash|sh)/.test(trimmed) || /\b(echo|cd|ls|mkdir|chmod|grep|awk)\b/.test(text)) {
      return 'bash'
    }

    // Java Detection
    if (/\b(public|private|protected)\s+(class|interface)\b/.test(text)) {
      return 'java'
    }

    // Go Detection
    if (/\b(package|func)\b/.test(text) && /package\s+\w+/.test(text)) {
      return 'go'
    }

    // Rust Detection
    if (/\b(fn\s+\w+|impl\s+\w+|trait\s+\w+)\b/.test(text)) {
      return 'rust'
    }

    return 'plaintext'
  }

  const prettifyContent = () => {
    if (!content) return

    try {
      // Try to parse as JSON
      const parsed = JSON.parse(content)
      setContent(JSON.stringify(parsed, null, 2))
      setLanguage('json')
      setDetectedLanguage('json')
    } catch (e) {
      // For now, only prettify JSON to avoid breaking whitespace
      setError('Prettify currently only works for JSON. For other languages, please format before pasting.')
      setTimeout(() => setError(null), 3000)
    }
  }

  // Map language names to Prism.js language identifiers
  const mapLanguageToPrism = (lang) => {
    const mapping = {
      'html': 'markup',
      'xml': 'markup',
      'plaintext': 'plaintext'
    }
    return mapping[lang] || lang
  }

  const loadPaste = async (id, pwd = null) => {
    setLoading(true)
    setError(null)
    try {
      let response
      if (pwd) {
        // Verify password
        response = await axios.post(`/api/paste/${id}/verify`, { password: pwd })
        setPasteData(response.data)
        setPasswordRequired(false)
        setPasswordInput('')
      } else {
        // First check if paste exists and if password is required
        response = await axios.get(`/api/paste/${id}`)
        if (response.data.passwordProtected) {
          setPasswordRequired(true)
          setPasteData({ ...response.data, id })
        } else {
          setPasteData(response.data)
        }
      }
      setViewMode('view')
      window.history.pushState({}, '', `/${id}`)
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Paste not found, expired, or invalid URL'
      setError(errorMsg)
      setPasswordRequired(false)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePaste = async (e) => {
    e.preventDefault()

    // Check for sensitive data without protection
    const hasSensitiveData = detectSensitiveData(content)
    const isProtected = password || isSplit || maxViews
    const dontShowAgain = localStorage.getItem('dontShowSecurityWarning') === 'true'

    if (hasSensitiveData && !isProtected && !dontShowAgain) {
      setShowSecurityModal(true)
      setPendingSubmit(true)
      return
    }

    // Proceed with submission
    await submitPaste()
  }

  const handleEditPaste = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await axios.put(`/api/paste/${pasteData.id}`, {
        content: editContent,
        title: editTitle,
        editPassword: pasteData.editPassword ? editPassword : null
      })

      // Update pasteData with new content
      setPasteData({
        ...pasteData,
        content: response.data.content,
        title: response.data.title,
        language: response.data.language,
        lastEditedAt: response.data.lastEditedAt
      })

      setIsEditing(false)
      setEditPassword('')
      setError(null)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to edit paste')
    } finally {
      setLoading(false)
    }
  }

  const submitPaste = async () => {
    // Validate custom URL if enabled
    if (useCustomUrl && !validateCustomUrl(customUrl)) {
      setError('Please fix the custom URL errors before submitting')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)
    setShowSecurityModal(false)
    setPendingSubmit(false)

    try {
      const response = await axios.post('/api/paste', {
        content,
        title: title || 'Untitled',
        type: activeTab,
        language,
        expiresValue: parseInt(expiresValue),
        expiresUnit,
        password: password || null,
        isSplit,
        maxViews: maxViews ? parseInt(maxViews) : null,
        customUrl: (useCustomUrl && customUrl) ? customUrl : null,
        allowEdit: allowEdit,
        editPassword: (allowEdit && editPassword) ? editPassword : null
      })

      setResult(response.data)
      setContent('')
      setTitle('')
      setPassword('')
      setIsSplit(false)
      setMaxViews(null)
      setUseCustomUrl(false)
      setCustomUrl('')
      setCustomUrlError('')
      setAllowEdit(false)
      setEditPassword('')
      setShowApiKeyWarning(false)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create paste')
    } finally {
      setLoading(false)
    }
  }

  const handleSecurityModalContinue = (dontShowAgain) => {
    if (dontShowAgain) {
      localStorage.setItem('dontShowSecurityWarning', 'true')
    }
    submitPaste()
  }

  const handleUploadFile = async (e) => {
    e.preventDefault()
    if (!file) {
      setError('Please select a file')
      return
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      setError('File size exceeds 10MB limit')
      return
    }

    // Validate file type - only programming/text files and archives
    const allowedExtensions = [
      '.js', '.jsx', '.ts', '.tsx', '.json',
      '.py', '.java', '.c', '.cpp', '.h', '.hpp',
      '.cs', '.go', '.rs', '.php', '.rb',
      '.html', '.css', '.scss', '.sass', '.less',
      '.xml', '.yml', '.yaml', '.toml', '.ini',
      '.sql', '.sh', '.bash', '.zsh',
      '.txt', '.md', '.markdown', '.log',
      '.env', '.gitignore', '.dockerfile',
      '.zip'
    ]

    const fileExtension = '.' + file.name.split('.').pop().toLowerCase()
    if (!allowedExtensions.includes(fileExtension)) {
      setError(`File type not allowed. Only programming files and archives are supported: ${allowedExtensions.slice(0, 10).join(', ')}...`)
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('expiresValue', expiresValue)
    formData.append('expiresUnit', expiresUnit)
    if (password) formData.append('password', password)
    if (maxViews) formData.append('maxViews', maxViews)

    try {
      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      setResult(response.data)
      setFile(null)
      setPassword('')
      setMaxViews(null)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload file')
    } finally {
      setLoading(false)
    }
  }

  const handleViewPaste = async (e) => {
    e.preventDefault()
    if (!pasteId) {
      setError('Please enter a paste ID')
      return
    }
    loadPaste(pasteId)
  }

  const copyToClipboard = async (text) => {
    try {
      // Use Clipboard API to copy exact text without any modifications
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const downloadFile = async () => {
    if (!pasteData) return
    window.open(`/api/raw/${pasteData.id}`, '_blank')
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  const getTimeRemaining = (expiresAt) => {
    const now = new Date()
    const expires = new Date(expiresAt)
    const diff = expires - now

    if (diff <= 0) return { text: 'Expired', color: 'inherit' }

    const totalSeconds = Math.floor(diff / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    // Color coding:
    // Red: < 4 minutes (240 seconds)
    // Yellow: < 20 minutes (1200 seconds)
    // Normal: >= 20 minutes
    let color = 'inherit'
    if (totalSeconds < 240) {
      color = 'var(--error)' // Red
    } else if (totalSeconds < 1200) {
      color = '#e5c07b' // Yellow
    }

    // Display format based on time remaining:
    // Days: show days + hours
    // Hours: show hours + minutes
    // Minutes (red): show minutes + seconds
    // Minutes (normal): show minutes only

    if (days > 0) {
      return { text: `${days}d ${hours % 24}h remaining`, color: 'inherit' }
    }

    if (hours > 0) {
      return { text: `${hours}h ${minutes % 60}m remaining`, color: 'inherit' }
    }

    // Show seconds only when red (< 4 minutes)
    if (totalSeconds < 240) {
      return { text: `${minutes}m ${seconds}s remaining`, color }
    }

    return { text: `${minutes}m remaining`, color }
  }

  if (viewMode === 'view' && pasteData) {
    return (
      <div className="app">
        <header className="header">
          <div className="header-content">
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <a href="/" className="logo" onClick={() => { setViewMode('create'); setPasteData(null); setPasswordRequired(false); window.history.pushState({}, '', '/') }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <img src="/favicon-32x32.png" alt="OpenPasteBin Logo" style={{ width: '24px', height: '24px' }} />
                OpenPasteBin
              </a>
              <a
                href="https://github.com/weisser-dev"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--accent)',
                  textDecoration: 'none',
                  fontWeight: '400',
                  opacity: 0.8,
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.opacity = '1'}
                onMouseLeave={(e) => e.target.style.opacity = '0.8'}
              >
                by weisser-dev
              </a>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div className="header-info">
                Open-source pastebin with temporary storage
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={theme === 'light'}
                  onChange={toggleTheme}
                />
                <div></div>
              </label>
            </div>
          </div>
        </header>

        <div className="usps">
          <div className="usp">🔒 No data stored permanently</div>
          <div className="usp">📝 No logs created</div>
          <div className="usp">🚫 No tracking or analytics</div>
          <div className="usp">⚡ Auto-expiring content</div>
        </div>

        {copied && (
          <div className="copy-notification">
            ✓ Copied to clipboard!
          </div>
        )}

        {showExpiringNotification && (
          <div className="warning-notification">
            ⏰ Paste expires soon - Copy it now!
          </div>
        )}

        {showViewsWarning && (
          <div className="warning-notification">
            👁️ Max views almost reached - This is your last chance to copy!
          </div>
        )}

        {error && (
          <div className="container">
            <div className="error-box">{error}</div>
          </div>
        )}

        <div className="container">
          {passwordRequired ? (
            <div className="view-section">
              <h2>Password Protected Paste</h2>
              <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                This paste is password protected. Please enter the password to view it.
              </p>
              <form onSubmit={(e) => { e.preventDefault(); loadPaste(pasteData.id, passwordInput) }}>
                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter password..."
                    required
                    autoFocus
                  />
                </div>
                <button type="submit" disabled={loading || !passwordInput}>
                  {loading ? 'Verifying...' : 'Unlock Paste'}
                </button>
              </form>
            </div>
          ) : (
            <div className="view-section">
              <div className="paste-info">
                <div>
                  <h2 className="paste-title">{pasteData.title}</h2>
                  <div className="paste-meta">
                    Created: {formatDate(pasteData.createdAt)} | Expires: {formatDate(pasteData.expiresAt)}
                    <br />
                    <span style={{ color: getTimeRemaining(pasteData.expiresAt).color }}>
                      {getTimeRemaining(pasteData.expiresAt).text}
                    </span>
                    {pasteData.maxViews && (
                      <>
                        <br />
                        <span style={{ color: pasteData.burnAfterRead ? 'var(--error)' : 'var(--accent)' }}>
                          {pasteData.burnAfterRead ? '🔥 This paste has been deleted (max views reached)' :
                           `👁️ Views: ${pasteData.viewCount}/${pasteData.maxViews} ${pasteData.maxViews - pasteData.viewCount === 0 ? '(will be deleted on next view)' : ''}`}
                        </span>
                      </>
                    )}
                    {pasteData.isSplit && (
                      <>
                        <br />
                        <span style={{ color: 'var(--accent)' }}>
                          ⚠️ Split Token - Partner ID: <a href={`/${pasteData.splitPartner}`}>{pasteData.splitPartner}</a>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="actions">
                {!isEditing && (
                  <>
                    <button type="button" onClick={() => copyToClipboard(pasteData.content)}>
                      Copy Content
                    </button>
                    <button type="button" onClick={() => window.open(`/api/raw/${pasteData.id}`, '_blank')}>
                      View Raw
                    </button>
                    {pasteData.type === 'file' && (
                      <button type="button" onClick={downloadFile}>
                        Download File
                      </button>
                    )}
                    {pasteData.type !== 'file' && pasteData.language !== 'plaintext' && (
                      <button type="button" onClick={() => setSyntaxHighlighting(!syntaxHighlighting)}>
                        {syntaxHighlighting ? '🎨 Disable Highlighting' : '🎨 Enable Highlighting'}
                      </button>
                    )}
                    {pasteData.allowEdit && pasteData.type !== 'file' && (
                      <button type="button" onClick={() => {
                        setIsEditing(true)
                        setEditContent(pasteData.content)
                        setEditTitle(pasteData.title)
                      }}>
                        ✏️ Edit Paste
                      </button>
                    )}
                    <button type="button" onClick={() => { setViewMode('create'); setPasteData(null); setSyntaxHighlighting(true); window.history.pushState({}, '', '/') }}>
                      Create New
                    </button>
                  </>
                )}
                {isEditing && (
                  <>
                    <button type="button" onClick={handleEditPaste} disabled={loading || !editContent}>
                      {loading ? 'Saving...' : '💾 Save Changes'}
                    </button>
                    <button type="button" onClick={() => { setIsEditing(false); setEditPassword('') }}>
                      ❌ Cancel
                    </button>
                  </>
                )}
              </div>

              {isEditing ? (
                <div className="paste-content">
                  <div className="form-group">
                    <label>Title</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Paste title..."
                    />
                  </div>
                  <div className="form-group">
                    <label>Content</label>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      placeholder="Edit your content..."
                      style={{ minHeight: '400px' }}
                    />
                  </div>
                  {pasteData.editPassword && (
                    <div className="form-group">
                      <label>Edit Password</label>
                      <input
                        type="password"
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        placeholder="Enter edit password..."
                        required
                      />
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                        This paste is protected with a separate edit password
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="paste-content">
                  {pasteData.type === 'file' ? (
                    <div>
                      <p><strong>File:</strong> {pasteData.fileName}</p>
                      <p><strong>Type:</strong> {pasteData.mimeType}</p>
                      <p><strong>Size:</strong> {Math.round(pasteData.content.length * 0.75 / 1024)} KB</p>
                      <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
                        This is a file. Click "Download File" or "View Raw" to access it.
                      </p>
                    </div>
                  ) : syntaxHighlighting && pasteData.language !== 'plaintext' ? (
                    <pre>
                      <code ref={codeRef} className={`language-${pasteData.language}`}>
                        {pasteData.content}
                      </code>
                    </pre>
                  ) : (
                    <pre className="no-highlight">
                      {pasteData.content}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <footer className="footer">
          <p>OpenPasteBin - Open Source Pastebin | <a href="https://github.com/weisser-dev/openpastebin" target="_blank" rel="noopener noreferrer">GitHub</a></p>
        </footer>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <a href="/" className="logo" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <img src="/favicon-32x32.png" alt="OpenPasteBin Logo" style={{ width: '24px', height: '24px' }} />
              OpenPasteBin
            </a>
            <a
              href="https://github.com/weisser-dev"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '0.75rem',
                color: 'var(--accent)',
                textDecoration: 'none',
                fontWeight: '400',
                opacity: 0.8,
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.opacity = '1'}
              onMouseLeave={(e) => e.target.style.opacity = '0.8'}
            >
              by weisser-dev
            </a>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="header-info">
              Open-source pastebin with temporary storage
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={theme === 'light'}
                onChange={toggleTheme}
              />
              <div></div>
            </label>
          </div>
        </div>
      </header>

      <div className="usps">
        <div className="usp">🔒 No data stored permanently</div>
        <div className="usp">📝 No logs created</div>
        <div className="usp">🚫 No tracking or analytics</div>
        <div className="usp">⚡ Auto-expiring content</div>
      </div>

      {copied && (
        <div className="copy-notification">
          ✓ Copied to clipboard!
        </div>
      )}

      {showSecurityModal && (
        <div className="modal-overlay" onClick={() => { setShowSecurityModal(false); setPendingSubmit(false) }}>
          <div className="modal-box security-modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ color: '#ffbf00', marginBottom: '1rem', fontSize: '1.25rem' }}>
              ⚠️ Security Warning
            </h3>
            <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
              Your content appears to contain <strong>sensitive data</strong> (API keys, tokens, or passwords) without any protection.
            </p>

            <div style={{ background: 'rgba(255, 191, 0, 0.1)', border: '1px solid #ffbf00', borderRadius: '6px', padding: '1rem', marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>🔒 Recommended Security Measures:</p>
              <ul style={{ fontSize: '0.85rem', lineHeight: '1.6', paddingLeft: '1.5rem', margin: 0 }}>
                <li>Enable <strong>Split Token</strong> to divide your secret into 2 parts</li>
                <li>Add <strong>Password Protection</strong> to encrypt your paste</li>
                <li>Use <strong>Burn After Read</strong> (1-2 views max)</li>
                <li>Set short <strong>Expiration Time</strong></li>
              </ul>
            </div>

            <div style={{ background: 'rgba(47, 108, 122, 0.12)', border: '1px solid rgba(47, 108, 122, 0.25)', borderRadius: '6px', padding: '1rem', marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.85rem', lineHeight: '1.6', margin: 0 }}>
                💡 <strong>Best Practice:</strong> Never share sensitive credentials on a single channel.
                Split your token and send each part via different communication methods
                (e.g., one part via email, one via Slack) to prevent unauthorized access.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
              <input
                type="checkbox"
                id="dontShowAgain"
                style={{ width: 'auto', cursor: 'pointer' }}
              />
              <label htmlFor="dontShowAgain" style={{ fontSize: '0.85rem', cursor: 'pointer', margin: 0 }}>
                Don't show this warning again
              </label>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={() => { setShowSecurityModal(false); setPendingSubmit(false) }}
                style={{ flex: 1, background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const dontShow = document.getElementById('dontShowAgain').checked
                  handleSecurityModalContinue(dontShow)
                }}
                style={{ flex: 1, background: '#ffbf00', color: '#0d1117' }}
              >
                Continue Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="modal-overlay" onClick={() => setResult(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>✓ Paste Created Successfully!</h3>
            {result.isSplit ? (
              <>
                <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                  Your content has been split into 2 parts for security:
                </p>
                <div className="split-result">
                  <div className="split-part">
                    <label>Part 1/2:</label>
                    <div className="url-display">
                      <input type="text" value={result.url1} readOnly />
                      <button type="button" onClick={() => copyToClipboard(result.url1)}>Copy</button>
                      <button type="button" onClick={() => window.open(`/${result.id1}`, '_blank')}>View</button>
                    </div>
                    <p className="id-text">ID: {result.id1}</p>
                  </div>
                  <div className="split-part">
                    <label>Part 2/2:</label>
                    <div className="url-display">
                      <input type="text" value={result.url2} readOnly />
                      <button type="button" onClick={() => copyToClipboard(result.url2)}>Copy</button>
                      <button type="button" onClick={() => window.open(`/${result.id2}`, '_blank')}>View</button>
                    </div>
                    <p className="id-text">ID: {result.id2}</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="url-display">
                  <input type="text" value={result.url} readOnly />
                  <button type="button" onClick={() => copyToClipboard(result.url)}>Copy URL</button>
                  <button type="button" onClick={() => window.open(`/${result.id}`, '_blank')}>View</button>
                </div>
                <p className="id-text">ID: {result.id}</p>
                {result.detectedLanguage && result.detectedLanguage !== 'plaintext' && (
                  <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--accent)' }}>
                    🎨 Detected: {result.detectedLanguage}
                  </p>
                )}
              </>
            )}
            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Expires: {new Date(result.expiresAt).toLocaleString()}
            </p>
            <button
              type="button"
              onClick={() => setResult(null)}
              style={{ marginTop: '1rem', width: '100%' }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className="container">
        {error && (
          <div className="error-box">
            {error}
          </div>
        )}

        <div className="view-section" style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>View Existing Paste</h2>
          <form onSubmit={handleViewPaste}>
            <div className="form-group">
              <label>Paste ID or URL</label>
              <input
                type="text"
                value={pasteId}
                onChange={(e) => {
                  const value = e.target.value
                  const match = value.match(/\/([a-zA-Z0-9_-]+)$/)
                  setPasteId(match ? match[1] : value)
                }}
                placeholder="Enter paste ID or full URL..."
              />
            </div>
            <button type="submit" disabled={loading || !pasteId}>
              {loading ? 'Loading...' : 'View Paste'}
            </button>
          </form>
        </div>

        <div className="create-section">
          <h2 style={{ marginBottom: '1rem' }}>Create New Paste</h2>

          <div className="tabs">
            <button
              className={`tab ${activeTab === 'text' ? 'active' : ''}`}
              onClick={() => setActiveTab('text')}
            >
              Text/Code
            </button>
            <button
              className={`tab ${activeTab === 'file' ? 'active' : ''}`}
              onClick={() => setActiveTab('file')}
            >
              Upload File
            </button>
          </div>

          {activeTab === 'text' && (
            <form onSubmit={handleCreatePaste}>
              <div className="form-group">
                <label>Title (optional)</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="My awesome paste..."
                />
              </div>

              <div className="form-group">
                <label>Content (required)</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste your text or code here..."
                  required
                />
                {content && detectedLanguage !== 'plaintext' && (
                  <div className="code-preview">
                    <div className="code-preview-header">
                      <span>Preview - Detected: {detectedLanguage.toUpperCase()}</span>
                    </div>
                    <pre style={{ maxHeight: '200px', overflow: 'auto', margin: 0 }}>
                      <code ref={previewCodeRef} className={`language-${detectedLanguage}`}>
                        {content}
                      </code>
                    </pre>
                  </div>
                )}
                {content && detectedLanguage !== 'plaintext' && (
                  <button
                    type="button"
                    onClick={prettifyContent}
                    className="prettify-btn"
                    disabled={detectedLanguage !== 'json'}
                    title={detectedLanguage === 'json' ? 'Format JSON with proper indentation' : 'Only works for JSON'}
                    style={{ marginTop: '0.5rem' }}
                  >
                    ✨ Prettify {detectedLanguage.toUpperCase()}
                  </button>
                )}
              </div>

              {showApiKeyWarning && (
                <div className="warning-box">
                  ⚠️ <strong>API Key Detected!</strong> You're about to share what looks like an API key or token without password protection or splitting. Are you sure?
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>Language/Syntax (auto-detected)</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    <option value="plaintext">Auto Detect</option>
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="csharp">C#</option>
                    <option value="cpp">C++</option>
                    <option value="go">Go</option>
                    <option value="rust">Rust</option>
                    <option value="php">PHP</option>
                    <option value="ruby">Ruby</option>
                    <option value="html">HTML</option>
                    <option value="css">CSS</option>
                    <option value="json">JSON</option>
                    <option value="xml">XML</option>
                    <option value="sql">SQL</option>
                    <option value="bash">Bash</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Expires In</label>
                  <div className="expires-input-group">
                    <input
                      type="number"
                      min="1"
                      max={expiresUnit === 'days' ? 30 : expiresUnit === 'hours' ? 720 : expiresUnit === 'minutes' ? 43200 : 2592000}
                      value={expiresValue}
                      onChange={(e) => setExpiresValue(e.target.value)}
                      placeholder="15"
                      className="expires-value-input"
                    />
                    <select
                      value={expiresUnit}
                      onChange={(e) => setExpiresUnit(e.target.value)}
                      className="expires-unit-select"
                    >
                      <option value="seconds">Seconds</option>
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days (max 30)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>View Password (optional)</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Protect with password..."
                    style={useCustomUrl && customUrl && !customUrlError && customUrl.length >= 6 && !password ? {
                      border: '2px solid #e5c07b',
                      boxShadow: '0 0 0 2px rgba(229, 192, 123, 0.2)'
                    } : {}}
                  />
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    Required to view the paste content
                  </p>
                </div>

                <div className="form-group">
                  <label>Max Views (Burn After Read)</label>
                  <select
                    value={maxViews || ''}
                    onChange={(e) => setMaxViews(e.target.value ? e.target.value : null)}
                  >
                    <option value="">Unlimited</option>
                    <option value="1">1 View (Burn After Read)</option>
                    <option value="2">2 Views (Test + Share)</option>
                    <option value="5">5 Views</option>
                    <option value="10">10 Views</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={isSplit}
                      onChange={(e) => {
                        setIsSplit(e.target.checked)
                        if (e.target.checked) {
                          setUseCustomUrl(false)
                          setCustomUrl('')
                        }
                      }}
                    />
                    <span>Split Token (split into 2 parts)</span>
                  </label>
                </div>

                <div className="checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={useCustomUrl}
                      onChange={(e) => {
                        setUseCustomUrl(e.target.checked)
                        if (e.target.checked) {
                          setIsSplit(false)
                        }
                      }}
                    />
                    <span>Custom Short URL (personalize URL)</span>
                  </label>
                </div>
              </div>

              {useCustomUrl && (
                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label>
                    Custom URL (min 6 chars, must include 1 number or special character)
                  </label>
                  <input
                    type="text"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="mylink123 or secure_paste!"
                    maxLength="50"
                  />
                  {customUrlError && (
                    <p style={{ color: 'var(--error)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                      ⚠️ {customUrlError}
                    </p>
                  )}
                  {customUrl && !customUrlError && customUrl.length >= 6 && !password && (
                    <div style={{
                      marginTop: '0.75rem',
                      padding: '0.75rem',
                      background: 'rgba(229, 192, 123, 0.1)',
                      border: '1px solid #e5c07b',
                      borderRadius: '6px',
                      fontSize: '0.85rem'
                    }}>
                      <p style={{ color: '#e5c07b', marginBottom: '0.25rem', fontWeight: '600' }}>
                        ⚠️ Security Warning: No Password
                      </p>
                      <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                        Custom URLs are easier to guess (only 900 combinations per slug). <strong>Please use a password</strong> to protect your paste from unauthorized access.
                        <br />
                        <span style={{ fontSize: '0.75rem', fontStyle: 'italic', marginTop: '0.25rem', display: 'block' }}>
                          URL format: [2 digits]{customUrl}[1 digit]
                        </span>
                      </p>
                    </div>
                  )}
                  {customUrl && !customUrlError && customUrl.length >= 6 && password && (
                    <div style={{
                      marginTop: '0.75rem',
                      padding: '0.75rem',
                      background: 'rgba(63, 185, 80, 0.1)',
                      border: '1px solid var(--success)',
                      borderRadius: '6px',
                      fontSize: '0.85rem'
                    }}>
                      <p style={{ color: 'var(--success)', marginBottom: '0.25rem', fontWeight: '600' }}>
                        ✓ Valid Custom URL (Password Protected)
                      </p>
                      <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                        Your URL will be: <span style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>
                          {Math.floor(Math.random() * 90) + 10}{customUrl}{Math.floor(Math.random() * 10)}
                        </span>
                        <br />
                        <span style={{ fontSize: '0.75rem', fontStyle: 'italic' }}>
                          (Format: [2 digits]{customUrl}[1 digit])
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={allowEdit}
                    onChange={(e) => setAllowEdit(e.target.checked)}
                  />
                  <span>Allow Paste Edit After Sharing</span>
                </label>
              </div>

              {allowEdit && (
                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label>
                    Edit Password (optional)
                  </label>
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Optional password for editing..."
                  />
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    Required to edit the paste (separate from View Password). Leave empty to allow anyone who can view to also edit.
                  </p>
                </div>
              )}

              <button type="submit" disabled={loading || !content || (useCustomUrl && customUrlError)}>
                {loading ? 'Creating...' : 'Create Paste'}
              </button>
            </form>
          )}

          {activeTab === 'file' && (
            <form onSubmit={handleUploadFile}>
              <div className="form-group">
                <label>Select File (max 10MB) *</label>
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files[0])}
                  required
                />
                {file && (
                  <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                  </p>
                )}
              </div>

              <div className="form-group">
                <label>Expires In</label>
                <div className="expires-input-group">
                  <input
                    type="number"
                    min="1"
                    max={expiresUnit === 'days' ? 1 : expiresUnit === 'hours' ? 24 : expiresUnit === 'minutes' ? 1440 : 86400}
                    value={expiresValue}
                    onChange={(e) => setExpiresValue(e.target.value)}
                    placeholder="15"
                    className="expires-value-input"
                  />
                  <select
                    value={expiresUnit}
                    onChange={(e) => setExpiresUnit(e.target.value)}
                    className="expires-unit-select"
                  >
                    <option value="seconds">Seconds</option>
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours (max 24)</option>
                    <option value="days">Days (max 1)</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>View Password (optional)</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Protect with password..."
                  />
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    Required to view/download the file
                  </p>
                </div>

                <div className="form-group">
                  <label>Max Views (Burn After Read)</label>
                  <select
                    value={maxViews || ''}
                    onChange={(e) => setMaxViews(e.target.value ? e.target.value : null)}
                  >
                    <option value="">Unlimited</option>
                    <option value="1">1 View (Burn After Read)</option>
                    <option value="2">2 Views (Test + Share)</option>
                    <option value="5">5 Views</option>
                    <option value="10">10 Views</option>
                  </select>
                </div>
              </div>

              <button type="submit" disabled={loading || !file}>
                {loading ? 'Uploading...' : 'Upload File'}
              </button>
            </form>
          )}
        </div>
      </div>

      <footer className="footer">
        <p>OpenPasteBin - Open Source Pastebin | <a href="https://github.com/weisser-dev/openpastebin" target="_blank" rel="noopener noreferrer">GitHub</a></p>
      </footer>
    </div>
  )
}

export default App
