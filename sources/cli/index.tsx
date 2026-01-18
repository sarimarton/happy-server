import { config } from 'dotenv';
config({ override: true });

const fancyUiEnabled = process.env.HAPPY_FANCY_UI !== 'false';

// Suppress ALL console output when fancy UI is enabled
if (fancyUiEnabled) {
    const noop = () => {};
    console.log = noop;
    console.error = noop;
    console.warn = noop;
    console.info = noop;
    console.debug = noop;

    const originalStdoutWrite = process.stdout.write.bind(process.stdout);
    const originalStderrWrite = process.stderr.write.bind(process.stderr);

    (globalThis as any).__inkRender = false;

    process.stdout.write = ((chunk: any, encoding?: any, callback?: any): boolean => {
        if ((globalThis as any).__inkRender) {
            return originalStdoutWrite(chunk, encoding, callback);
        }
        if (typeof encoding === 'function') encoding();
        else if (callback) callback();
        return true;
    }) as typeof process.stdout.write;

    process.stderr.write = ((chunk: any, encoding?: any, callback?: any): boolean => {
        if (typeof encoding === 'function') encoding();
        else if (callback) callback();
        return true;
    }) as typeof process.stderr.write;

    (globalThis as any).__originalStdoutWrite = originalStdoutWrite;
}

/**
 * CLI entry point for Happy Server with Ink-based UI.
 */

if (!fancyUiEnabled) {
    await import('../main.js');
} else {
    const React = await import('react');
    const ink = await import('ink');
    const net = await import('net');
    const { StartupUI } = await import('./components/StartupUI.js');
    const setup = await import('./utils/setup.js');
    const { stopDockerServices } = await import('./utils/dockerServices.js');
    const { onShutdown } = await import('@/utils/shutdown');

    const { useState, useEffect } = React;
    const { render } = ink;

    interface SetupPhase {
        name: string;
        status: 'pending' | 'running' | 'done' | 'error';
    }

    interface ServiceStatus {
        name: string;
        status: 'pending' | 'running' | 'done' | 'error';
    }

    function isPortListening(port: number): Promise<boolean> {
        return new Promise((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(500);
            socket.on('connect', () => { socket.destroy(); resolve(true); });
            socket.on('timeout', () => { socket.destroy(); resolve(false); });
            socket.on('error', () => { socket.destroy(); resolve(false); });
            socket.connect(port, '127.0.0.1');
        });
    }

    onShutdown('docker', async () => {
        await stopDockerServices();
    });

    // Shared state for setup phases
    let setupPhasesState: SetupPhase[] = [
        { name: 'Dependencies', status: 'pending' },
        { name: 'Docker', status: 'pending' },
        { name: 'PostgreSQL', status: 'pending' },
        { name: 'Redis', status: 'pending' },
        { name: 'MinIO', status: 'pending' },
        { name: 'Prisma', status: 'pending' },
        { name: 'Migrations', status: 'pending' },
    ];

    let servicesState: ServiceStatus[] = [
        { name: 'PostgreSQL', status: 'pending' },
        { name: 'Redis', status: 'pending' },
        { name: 'MinIO', status: 'pending' },
    ];

    let isReadyState = false;
    let logPathState = '';
    let updateUI: (() => void) | null = null;

    function setPhaseStatus(name: string, status: 'pending' | 'running' | 'done' | 'error') {
        const phase = setupPhasesState.find(p => p.name === name);
        if (phase) {
            phase.status = status;
            updateUI?.();
        }
    }

    function setServiceStatus(name: string, status: 'pending' | 'running' | 'done' | 'error') {
        const service = servicesState.find(s => s.name === name);
        if (service) {
            service.status = status;
            updateUI?.();
        }
    }

    async function runSetup() {
        try {
            // Dependencies
            setPhaseStatus('Dependencies', 'running');
            await setup.runYarnInstall();
            setPhaseStatus('Dependencies', 'done');

            // Docker
            setPhaseStatus('Docker', 'running');
            await setup.ensureDocker();
            setPhaseStatus('Docker', 'done');

            // PostgreSQL
            setPhaseStatus('PostgreSQL', 'running');
            await setup.ensurePostgres();
            setPhaseStatus('PostgreSQL', 'done');

            // Redis
            setPhaseStatus('Redis', 'running');
            await setup.ensureRedis();
            setPhaseStatus('Redis', 'done');

            // MinIO
            setPhaseStatus('MinIO', 'running');
            await setup.ensureMinio();
            setPhaseStatus('MinIO', 'done');

            // Wait for services
            await setup.waitForServices();

            // Prisma generate
            setPhaseStatus('Prisma', 'running');
            await setup.runPrismaGenerate();
            setPhaseStatus('Prisma', 'done');

            // Migrations
            setPhaseStatus('Migrations', 'running');
            await setup.runPrismaMigrate();
            setPhaseStatus('Migrations', 'done');

            // Update service status
            setServiceStatus('PostgreSQL', 'done');
            setServiceStatus('Redis', 'done');
            setServiceStatus('MinIO', 'done');

            // Start main server
            await import('../main.js');

            // Get log path
            const { consolidatedLogFile } = await import('@/utils/log');
            if (consolidatedLogFile) {
                logPathState = consolidatedLogFile;
                updateUI?.();
            }
        } catch (e) {
            // Mark current running phase as error
            const runningPhase = setupPhasesState.find(p => p.status === 'running');
            if (runningPhase) {
                runningPhase.status = 'error';
                updateUI?.();
            }
        }
    }

    function App(): React.ReactElement {
        const [, forceUpdate] = useState(0);
        const [isReady, setIsReady] = useState(false);
        const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3005;

        useEffect(() => {
            updateUI = () => forceUpdate(n => n + 1);
            runSetup();
            return () => { updateUI = null; };
        }, []);

        useEffect(() => {
            const setupDone = setupPhasesState.every(p => p.status === 'done');
            if (!setupDone) return;

            const checkReady = async () => {
                const listening = await isPortListening(port);
                if (listening) {
                    isReadyState = true;
                    setIsReady(true);
                } else {
                    setTimeout(checkReady, 500);
                }
            };
            setTimeout(checkReady, 1000);
        }, [setupPhasesState.every(p => p.status === 'done'), port]);

        return (
            <StartupUI
                setupPhases={setupPhasesState}
                services={servicesState}
                isReady={isReady}
                port={port}
                logPath={logPathState}
            />
        );
    }

    (globalThis as any).__inkRender = true;
    render(<App />);
}
