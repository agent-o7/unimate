import { useState } from 'react'
import './VideoPreview.css'

function VideoPreview({ video, onDownload }) {
    const [selectedFormat, setSelectedFormat] = useState('best')
    const [audioOnly, setAudioOnly] = useState(false)
    const [downloading, setDownloading] = useState(false)

    const formatDuration = (seconds) => {
        if (!seconds) return '--:--'
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        const s = seconds % 60
        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
        }
        return `${m}:${s.toString().padStart(2, '0')}`
    }

    const formatFileSize = (bytes) => {
        if (!bytes) return ''
        const units = ['B', 'KB', 'MB', 'GB']
        let size = bytes
        let unitIndex = 0
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024
            unitIndex++
        }
        return `${size.toFixed(1)} ${units[unitIndex]}`
    }

    const handleDownload = async () => {
        setDownloading(true)
        await onDownload(audioOnly ? 'bestaudio' : selectedFormat, audioOnly)
        setDownloading(false)
    }

    const platformClass = video.platform?.toLowerCase() || 'unknown'

    return (
        <div className="video-preview glass">
            <div className="thumbnail-container">
                {video.thumbnail ? (
                    <img src={video.thumbnail} alt={video.title} className="thumbnail" />
                ) : (
                    <div className="thumbnail-placeholder">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48">
                            <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
                        </svg>
                    </div>
                )}
                <div className="thumbnail-overlay">
                    <span className="duration">{formatDuration(video.duration)}</span>
                </div>
                <div className={`platform-tag ${platformClass}`}>
                    {video.platform}
                </div>
            </div>

            <div className="video-info">
                <h3 className="video-title">{video.title}</h3>
                {video.uploader && (
                    <p className="video-uploader">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                        {video.uploader}
                    </p>
                )}

                <div className="mode-toggle">
                    <button
                        className={`mode-btn ${!audioOnly ? 'active' : ''}`}
                        onClick={() => setAudioOnly(false)}
                    >
                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                            <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
                        </svg>
                        Video
                    </button>
                    <button
                        className={`mode-btn ${audioOnly ? 'active' : ''}`}
                        onClick={() => setAudioOnly(true)}
                    >
                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                        </svg>
                        Audio
                    </button>
                </div>

                {!audioOnly && (
                    <div className="format-section">
                        <label className="format-label">Quality:</label>
                        <select
                            value={selectedFormat}
                            onChange={(e) => setSelectedFormat(e.target.value)}
                            className="format-select"
                        >
                            {video.formats?.map(format => (
                                <option key={format.formatId} value={format.formatId}>
                                    {format.quality}
                                    {format.ext && ` (${format.ext})`}
                                    {format.filesize && ` - ${formatFileSize(format.filesize)}`}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {audioOnly && (
                    <div className="format-section">
                        <label className="format-label">Format: MP3 (Audio Only)</label>
                        <div className="audio-info">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                            </svg>
                            <span>Best quality MP3 will be extracted</span>
                        </div>
                    </div>
                )}

                <button
                    className="download-btn"
                    onClick={handleDownload}
                    disabled={downloading}
                >
                    {downloading ? (
                        <>
                            <span className="btn-spinner"></span>
                            Starting Download...
                        </>
                    ) : (
                        <>
                            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                            </svg>
                            {audioOnly ? 'Download MP3' : 'Download Video'}
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}

export default VideoPreview
