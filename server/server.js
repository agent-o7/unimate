import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { checkYtdlp, getVideoInfo, downloadVideo, DOWNLOADS_DIR } from './ytdlp.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Store active downloads
const activeDownloads = new Map();
const wsClients = new Map();

// Create HTTP server
const server = createServer(app);

// WebSocket server for progress updates
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
    const clientId = uuidv4();
    wsClients.set(clientId, ws);

    ws.send(JSON.stringify({ type: 'connected', clientId }));

    ws.on('close', () => {
        wsClients.delete(clientId);
    });
});

// Broadcast to all clients
function broadcast(data) {
    const message = JSON.stringify(data);
    wsClients.forEach((client) => {
        if (client.readyState === 1) { // WebSocket.OPEN
            client.send(message);
        }
    });
}

// Health check
app.get('/api/health', async (req, res) => {
    const ytdlpInstalled = await checkYtdlp();
    res.json({
        status: 'ok',
        ytdlpInstalled,
        message: ytdlpInstalled
            ? 'Server is ready'
            : 'yt-dlp is not installed. Please install it: https://github.com/yt-dlp/yt-dlp#installation'
    });
});

// Get video info
app.post('/api/info', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        const info = await getVideoInfo(url);
        res.json(info);
    } catch (error) {
        console.error('Error getting video info:', error);
        res.status(500).json({ error: error.message });
    }
});

// Start download
app.post('/api/download', async (req, res) => {
    const { url, format = 'best' } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    const downloadId = uuidv4();

    // Store download info
    activeDownloads.set(downloadId, {
        url,
        format,
        status: 'starting',
        progress: 0,
        startedAt: new Date()
    });

    // Start download in background
    downloadVideo(url, { format, downloadId }, (progress) => {
        const download = activeDownloads.get(downloadId);
        if (download) {
            download.progress = progress.progress;
            download.status = progress.type;
            if (progress.file) {
                download.file = progress.file;
            }
        }
        broadcast({ ...progress, downloadId });
    }).catch((error) => {
        const download = activeDownloads.get(downloadId);
        if (download) {
            download.status = 'error';
            download.error = error.message;
        }
        broadcast({ type: 'error', downloadId, error: error.message });
    });

    res.json({ downloadId, status: 'started' });
});

// Get download status
app.get('/api/download/:id/status', (req, res) => {
    const download = activeDownloads.get(req.params.id);

    if (!download) {
        return res.status(404).json({ error: 'Download not found' });
    }

    res.json(download);
});

// Download file
app.get('/api/download/:id/file', (req, res) => {
    const download = activeDownloads.get(req.params.id);

    if (!download || !download.file) {
        return res.status(404).json({ error: 'File not found' });
    }

    if (!fs.existsSync(download.file)) {
        return res.status(404).json({ error: 'File not found on disk' });
    }

    const filename = path.basename(download.file);
    res.download(download.file, filename, (err) => {
        if (err) {
            console.error('Error sending file:', err);
        } else {
            // Clean up after successful download
            setTimeout(() => {
                if (fs.existsSync(download.file)) {
                    fs.unlinkSync(download.file);
                }
                activeDownloads.delete(req.params.id);
            }, 5000);
        }
    });
});

// List active downloads
app.get('/api/downloads', (req, res) => {
    const downloads = [];
    activeDownloads.forEach((value, key) => {
        downloads.push({ id: key, ...value });
    });
    res.json(downloads);
});

// Start server
server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🎬 YouTube & TikTok Downloader Server                   ║
║                                                            ║
║   Server running at: http://localhost:${PORT}               ║
║   WebSocket at: ws://localhost:${PORT}                      ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);

    // Check yt-dlp on startup
    checkYtdlp().then((installed) => {
        if (!installed) {
            console.log('\n⚠️  yt-dlp is not installed!');
            console.log('   Install it from: https://github.com/yt-dlp/yt-dlp#installation');
            console.log('   Windows: winget install yt-dlp');
            console.log('   Or: pip install yt-dlp\n');
        } else {
            console.log('✅ yt-dlp is installed and ready\n');
        }
    });
});
