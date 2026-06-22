import { useState, useEffect, useCallback } from 'react'
import './App.css'
import VideoInput from './components/VideoInput'
import VideoPreview from './components/VideoPreview'
import DownloadProgress from './components/DownloadProgress'
import { SkeletonPreview } from './components/Skeleton'
import EmptyState from './components/EmptyState'
import { useToast } from './context/ToastContext'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

const HISTORY_KEY = 'unimate-history'

function loadHistory() {
    try {
        const stored = localStorage.getItem(HISTORY_KEY)
        return stored ? JSON.parse(stored) : []
    } catch {
        return []
    }
}

function saveHistory(items) {
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 50)))
    } catch { /* quota exceeded */ }
}

function App() {
    const [videoInfo, setVideoInfo] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [downloads, setDownloads] = useState([])
    const [history, setHistory] = useState(loadHistory)
    const [serverStatus, setServerStatus] = useState(null)
    const [darkMode, setDarkMode] = useState(() => {
        const stored = localStorage.getItem('unimate-theme')
        return stored !== null ? stored === 'dark' : true
    })
    const toast = useToast()

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
        localStorage.setItem('unimate-theme', darkMode ? 'dark' : 'light')
    }, [darkMode])

    useEffect(() => {
        invoke('check_ytdlp')
            .then(installed => {
                setServerStatus({
                    status: 'ok',
                    ytdlpInstalled: installed,
                    message: installed ? 'Server is ready' : 'yt-dlp is not installed'
                });
            })
            .catch(() => setServerStatus({ status: 'error', message: 'Failed to verify environment' }));
    }, [])

    useEffect(() => {
        let unlistenFn = null;

        listen('download-progress', (event) => {
            const data = event.payload;

            if (data.type === 'progress' || data.type === 'complete' || data.type === 'error' || data.type === 'cancelled') {
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

                if (data.type === 'complete') {
                    toast.success('Download complete!')
                } else if (data.type === 'error') {
                    toast.error(data.error || 'Download failed')
                } else if (data.type === 'cancelled') {
                    toast.info('Download cancelled')
                }
            }
        }).then(fn => {
            unlistenFn = fn;
        });

        return () => {
            if (unlistenFn) {
                unlistenFn();
            }
        }
    }, [toast])

    const handleUrlSubmit = useCallback(async (url) => {
        setLoading(true)
        setError(null)
        setVideoInfo(null)

        try {
            const data = await invoke('get_video_info', { url })
            setVideoInfo(data)
        } catch (err) {
            setError(err)
            toast.error(err)
        } finally {
            setLoading(false)
        }
    }, [toast])

    const handleDownload = useCallback(async (format, audioOnly = false) => {
        if (!videoInfo) return

        try {
            const downloadId = await invoke('start_download', {
                url: videoInfo.originalUrl,
                format,
                audioOnly
            })

            toast.info(audioOnly ? 'Downloading MP3...' : 'Download started')

            setDownloads(prev => [...prev, {
                downloadId,
                title: videoInfo.title,
                thumbnail: videoInfo.thumbnail,
                platform: videoInfo.platform,
                audioOnly,
                progress: 0,
                type: 'starting'
            }])

        } catch (err) {
            setError(err)
            toast.error(err)
        }
    }, [videoInfo, toast])

    const handleCancel = useCallback(async (downloadId) => {
        try {
            await invoke('cancel_download', { downloadId })
        } catch {
            toast.error('Failed to cancel download')
        }
    }, [toast])

    const handleDownloadFile = useCallback(async (downloadId) => {
        try {
            const saved = await invoke('save_file', { downloadId });
            if (saved) {
                toast.success('File saved successfully');
                await invoke('delete_temp_file', { downloadId });
            }
        } catch (err) {
            toast.error(err || 'Failed to save file');
        }
    }, [toast])

    const handleClear = useCallback(() => {
        setVideoInfo(null)
        setError(null)
    }, [])

    const handleRemoveDownload = useCallback((downloadId) => {
        setDownloads(prev => prev.filter(d => d.downloadId !== downloadId))
    }, [])

    // Persist completed downloads to history
    useEffect(() => {
        const completed = downloads.filter(d => d.type === 'complete')
        if (completed.length > 0) {
            setHistory(prev => {
                const existing = new Set(prev.map(h => h.downloadId))
                const newItems = completed.filter(c => !existing.has(c.downloadId))
                if (newItems.length === 0) return prev
                const updated = [...newItems.map(c => ({
                    downloadId: c.downloadId,
                    title: c.title,
                    thumbnail: c.thumbnail,
                    platform: c.platform,
                    audioOnly: c.audioOnly,
                    completedAt: Date.now()
                })), ...prev]
                saveHistory(updated)
                return updated
            })
        }
    }, [downloads])

    const handleClearHistory = useCallback(() => {
        setHistory([])
        saveHistory([])
        toast.info('History cleared')
    }, [toast])

    return (
        <div className="app">
            <header className="header">
                <div className="header-content">
                    <div className="header-top">
                        <div className="logo">
                            <span className="logo-icon">🎬</span>
                            <h1 className="logo-text">
                                Video <span className="gradient-text">Downloader</span>
                            </h1>
                        </div>
                        <button
                            className="theme-toggle"
                            onClick={() => setDarkMode(p => !p)}
                            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                        >
                            {darkMode ? (
                                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                                    <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z" />
                                </svg>
                            ) : (
                                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                                    <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z" />
                                </svg>
                            )}
                        </button>
                    </div>
                    <p className="tagline">Download videos from YouTube & TikTok</p>
                </div>
            </header>

            <main className="main">
                {serverStatus && !serverStatus.ytdlpInstalled && (
                    <div className="warning-banner fade-in">
                        <span className="warning-icon">⚠️</span>
                        <div>
                            <strong>yt-dlp not installed!</strong>
                            <p>Install it using: <code>pip install yt-dlp</code> or <code>winget install yt-dlp</code></p>
                        </div>
                    </div>
                )}

                <section className="input-section fade-in">
                    <VideoInput
                        onSubmit={handleUrlSubmit}
                        loading={loading}
                        onClear={handleClear}
                    />
                </section>

                {error && (
                    <div className="error-message fade-in">
                        <span className="error-icon">❌</span>
                        <span>{error}</span>
                        <button className="error-dismiss" onClick={() => setError(null)}>×</button>
                    </div>
                )}

                {loading && <SkeletonPreview />}

                {videoInfo && !loading && (
                    <section className="preview-section fade-in">
                        <VideoPreview
                            video={videoInfo}
                            onDownload={handleDownload}
                        />
                    </section>
                )}

                <section className="downloads-section">
                    <h2 className="section-title">
                        <span className="section-icon">📥</span>
                        Downloads
                        {downloads.length > 0 && <span className="section-count">{downloads.length}</span>}
                    </h2>
                    {downloads.length > 0 ? (
                        <div className="downloads-list">
                            {downloads.map((download, i) => (
                                <div key={download.downloadId} className="stagger-item" style={{ animationDelay: `${i * 0.08}s` }}>
                                    <DownloadProgress
                                        download={download}
                                        onDownloadFile={handleDownloadFile}
                                        onRemove={handleRemoveDownload}
                                        onCancel={handleCancel}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            title="No downloads yet"
                            description="Paste a YouTube or TikTok URL above and hit download!"
                        />
                    )}
                </section>

                {history.length > 0 && (
                    <section className="history-section">
                        <div className="section-title-row">
                            <h2 className="section-title">
                                <span className="section-icon">🕐</span>
                                History
                            </h2>
                            <button className="clear-history-btn" onClick={handleClearHistory}>
                                Clear all
                            </button>
                        </div>
                        <div className="history-list">
                            {history.map((item, i) => (
                                <div key={item.downloadId + item.completedAt} className="stagger-item" style={{ animationDelay: `${i * 0.04}s` }}>
                                    <div className="history-item glass">
                                        {item.thumbnail && (
                                            <div className="history-thumb">
                                                <img src={item.thumbnail} alt="" />
                                                {item.audioOnly && <span className="history-badge audio">MP3</span>}
                                            </div>
                                        )}
                                        <div className="history-info">
                                            <span className="history-title">{item.title}</span>
                                            <span className="history-meta">
                                                {item.platform}
                                                {item.audioOnly && ' • MP3'}
                                                {' • ' + new Date(item.completedAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </main>

            <footer className="footer">
                <p>Built with ❤️ using React & yt-dlp</p>
            </footer>
        </div>
    )
}

export default App
