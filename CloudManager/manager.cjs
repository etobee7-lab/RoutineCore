const express = require('express');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

const app = express();
const server = http.createServer(app);
const PORT = 4000; // Dashboard Port

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Process Tracking
const processes = {
    frontend: {
        command: 'npm',
        args: ['run', 'dev'],
        cwd: path.join(__dirname, '..'),
        instance: null,
        status: 'stopped',
        logs: []
    },
    backend: {
        command: 'node',
        args: ['server.cjs'],
        cwd: path.join(__dirname, '..'),
        instance: null,
        status: 'stopped',
        logs: []
    },
    tunnel: {
        command: path.join(__dirname, '..', 'cloudflared.exe'),
        args: ['tunnel', '--url', 'http://localhost:5173'],
        cwd: path.join(__dirname, '..'),
        instance: null,
        status: 'stopped',
        logs: []
    },
    cap_core: {
        command: 'npm',
        args: ['run', 'dev'],
        cwd: 'c:\\Cap_Core',
        instance: null,
        status: 'stopped',
        logs: []
    },
    tunnel_capcore: {
        command: path.join('c:\\Cap_Core', 'cloudflared.exe'),
        args: ['tunnel', '--url', 'http://127.0.0.1:3001'],
        cwd: 'c:\\Cap_Core',
        instance: null,
        status: 'stopped',
        logs: []
    }
};

// Check if cloudflared.exe exists
const cloudflaredPath = path.join(__dirname, '..', 'cloudflared.exe');
if (!fs.existsSync(cloudflaredPath)) {
    console.error(`Cloudflared not found at ${cloudflaredPath}`);
}

function startProcess(name) {
    const p = processes[name];
    if (p.status === 'running') return;

    console.log(`Starting ${name}...`);
    p.status = 'starting';
    p.logs = [`[${new Date().toLocaleTimeString()}] Starting ${name}...`];

    // On Windows, npm needs to be run via cmd /c
    const cmd = process.platform === 'win32' && p.command === 'npm' ? 'npm.cmd' : p.command;
    
    p.instance = spawn(cmd, p.args, { 
        cwd: p.cwd || path.join(__dirname, '..'),
        shell: true 
    });

    p.instance.stdout.on('data', (data) => {
        const line = data.toString().trim();
        if (line) {
            p.logs.push(line);
            if (p.logs.length > 100) p.logs.shift();
            console.log(`[${name}] ${line}`);
        }
    });

    p.instance.stderr.on('data', (data) => {
        const line = data.toString().trim();
        if (line) {
            p.logs.push(`ERROR: ${line}`);
            if (p.logs.length > 100) p.logs.shift();
        }
    });

    p.instance.on('close', (code) => {
        p.status = 'stopped';
        p.logs.push(`[${new Date().toLocaleTimeString()}] Process exited with code ${code}`);
        p.instance = null;
    });

    p.status = 'running';
}

function stopProcess(name) {
    const p = processes[name];
    if (p.status === 'stopped' || !p.instance) return;

    console.log(`Stopping ${name}...`);
    
    // On Windows, we often need taskkill to kill the entire process tree
    if (process.platform === 'win32') {
        exec(`taskkill /pid ${p.instance.pid} /f /t`, (err) => {
            if (err) console.error(`Failed to kill ${name}:`, err);
        });
    } else {
        p.instance.kill();
    }
    
    p.status = 'stopped';
}

// API Endpoints
app.get('/api/status', (req, res) => {
    const status = {};
    for (const name in processes) {
        status[name] = {
            status: processes[name].status,
            logs: processes[name].logs.slice(-20)
        };
    }
    res.json(status);
});

app.post('/api/start', (req, res) => {
    const { name } = req.body;
    if (processes[name]) {
        startProcess(name);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Service not found' });
    }
});

app.post('/api/stop', (req, res) => {
    const { name } = req.body;
    if (processes[name]) {
        stopProcess(name);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Service not found' });
    }
});

// Start everything if requested
if (process.argv.includes('--start-all')) {
    startProcess('backend');
    startProcess('frontend');
    startProcess('cap_core');
    setTimeout(() => {
        startProcess('tunnel');
        startProcess('tunnel_capcore');
    }, 5000);
}

server.listen(PORT, () => {
    console.log(`Cloudflare Manager Dashboard running at http://localhost:${PORT}`);
});
