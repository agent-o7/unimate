import { useState, useEffect, useCallback } from 'react'
import './App.css'
import VideoInput from './components/VideoInput'
import VideoPreview from './components/VideoPreview'
import DownloadProgress from './components/DownloadProgress'

const API_BASE = '/api'
const WS_URL = `ws://${window.location.hostname}:3001`

function App() {
    const [videoInfo, setVideoInfo] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [downloads, setDownloads] = useState([])
    const [serverStatus, setServerStatus] = useState(null)

    // Check server health on mount
    useEffect(() => {
        fetch(`${API_BASE}/health`)
            .then(res => res.json())
            .then(data => setServerStatus(data))
            .catch(() => setServerStatus({ status: 'error', message: 'Cannot connect to server' }))
    }, [])

    // WebSocket connection for progress updates
    useEffect(() => {
        let ws = null
        let reconnectTimeout = null

        const connect = () => {
            ws = new WebSocket(WS_URL)

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data)

                if (data.type === 'progress' || data.type === 'complete' || data.type === 'error') {
                    setDownloads(prev => {
                        const existing = prev.find(d => d.downloadId === data.downloadId)
                        if (existing) {
                            return prev.map(d =>
                                d.downloadId === data.downloadId
                                    ? { ...d, ...data }
                                    : d
                            )
                        }
                        return prev
                    })
                }
            }

            ws.onclose = () => {
                reconnectTimeout = setTimeout(connect, 3000)
            }
        }

        connect()

        return () => {
            if (ws) ws.close()
            if (reconnectTimeout) clearTimeout(reconnectTimeout)
        }
    }, [])

    const handleUrlSubmit = useCallback(async (url) => {
        setLoading(true)
        setError(null)
        setVideoInfo(null)

        try {
            const response = await fetch(`${API_BASE}/info`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to get video info')
            }

            setVideoInfo(data)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [])

    const handleDownload = useCallback(async (format = 'best') => {
        if (!videoInfo) return

        try {
            const response = await fetch(`${API_BASE}/download`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: videoInfo.originalUrl,
                    format
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to start download')
            }

            // Add to downloads list
            setDownloads(prev => [...prev, {
                downloadId: data.downloadId,
                title: videoInfo.title,
                thumbnail: videoInfo.thumbnail,
                platform: videoInfo.platform,
                progress: 0,
                type: 'starting'
            }])

        } catch (err) {
            setError(err.message)
        }
    }, [videoInfo])

    const handleDownloadFile = useCallback((downloadId) => {
        window.open(`${API_BASE}/download/${downloadId}/file`, '_blank')
    }, [])

    const handleClear = useCallback(() => {
        setVideoInfo(null)
        setError(null)
    }, [])

    const handleRemoveDownload = useCallback((downloadId) => {
        setDownloads(prev => prev.filter(d => d.downloadId !== downloadId))
    }, [])

    return (
        <div className="app">
            {/* Header */}
            <header className="header">
                <div className="header-content">
                    <div className="logo">
                        <span className="logo-icon">🎬</span>
                        <h1 className="logo-text">
                            Video <span className="gradient-text">Downloader</span>
                        </h1>
                    </div>
                    <p className="tagline">Download videos from YouTube & TikTok</p>
                </div>
            </header>

            {/* Main Content */}
            <main className="main">
                {/* Server Status Warning */}
                {serverStatus && !serverStatus.ytdlpInstalled && (
                    <div className="warning-banner fade-in">
                        <span className="warning-icon">⚠️</span>
                        <div>
                            <strong>yt-dlp not installed!</strong>
                            <p>Install it using: <code>pip install yt-dlp</code> or <code>winget install yt-dlp</code></p>
                        </div>
                    </div>
                )}

                {/* URL Input Section */}
                <section className="input-section fade-in">
                    <VideoInput
                        onSubmit={handleUrlSubmit}
                        loading={loading}
                        onClear={handleClear}
                    />
                </section>

                {/* Error Message */}
                {error && (
                    <div className="error-message fade-in">
                        <span className="error-icon">❌</span>
                        <span>{error}</span>
                        <button className="error-dismiss" onClick={() => setError(null)}>×</button>
                    </div>
                )}

                {/* Video Preview */}
                {videoInfo && (
                    <section className="preview-section fade-in">
                        <VideoPreview
                            video={videoInfo}
                            onDownload={handleDownload}
                        />
                    </section>
                )}

                {/* Downloads List */}
                {downloads.length > 0 && (
                    <section className="downloads-section fade-in">
                        <h2 className="section-title">
                            <span className="section-icon">📥</span>
                            Downloads
                        </h2>
                        <div className="downloads-list">
                            {downloads.map(download => (
                                <DownloadProgress
                                    key={download.downloadId}
                                    download={download}
                                    onDownloadFile={handleDownloadFile}
                                    onRemove={handleRemoveDownload}
                                />
                            ))}
                        </div>
                    </section>
                )}
            </main>

            {/* Footer */}
            <footer className="footer">
                <p>Built with ❤️ using React & yt-dlp</p>
            </footer>
        </div>
    )
}

export default App
