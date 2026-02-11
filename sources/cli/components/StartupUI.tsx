import React from 'react';
import { Box, Text } from 'ink';
import { Spinner } from '@inkjs/ui';

export interface ServiceStatus {
    name: string;
    status: 'pending' | 'running' | 'done' | 'error';
}

export interface SetupPhase {
    name: string;
    status: 'pending' | 'running' | 'done' | 'error';
}

interface StartupUIProps {
    setupPhases: SetupPhase[];
    services: ServiceStatus[];
    isReady: boolean;
    port: number;
    logPath: string;
}

const WIDTH = 50;
const LINE = '═'.repeat(WIDTH - 2);

export function StartupUI({ setupPhases, services, isReady, port, logPath }: StartupUIProps): React.ReactElement {
    const tailscaleHostname = process.env.TAILSCALE_HOSTNAME;
    const setupDone = setupPhases.every(p => p.status === 'done');
    const currentPhase = setupPhases.find(p => p.status === 'running');

    const pad = (text: string, len: number = WIDTH - 4) => {
        const visible = text.replace(/\x1b\[[0-9;]*m/g, '');
        if (visible.length > len) {
            return text.substring(0, len - 3) + '...';
        }
        return text + ' '.repeat(Math.max(0, len - visible.length));
    };

    return (
        <Box flexDirection="column">
            {/* Top border */}
            <Text color="cyan">╔{LINE}╗</Text>
            <Text color="cyan">║<Text bold>  Happy Server</Text>{' '.repeat(WIDTH - 16)}║</Text>
            <Text color="cyan">╠{LINE}╣</Text>

            {/* Setup Phases */}
            {!setupDone && (
                <>
                    <Text color="cyan">║  <Text dimColor>Setup:</Text>{' '.repeat(WIDTH - 12)}║</Text>
                    {setupPhases.map((phase) => (
                        <Text key={phase.name} color="cyan">
                            ║  <Text color={
                                phase.status === 'running' ? 'yellow' :
                                phase.status === 'done' ? 'green' :
                                phase.status === 'error' ? 'red' : 'gray'
                            }>
                                {phase.status === 'running' ? '◐' :
                                 phase.status === 'done' ? '✓' :
                                 phase.status === 'error' ? '✗' : '○'} {pad(phase.name, WIDTH - 7)}
                            </Text>║
                        </Text>
                    ))}
                    <Text color="cyan">║{' '.repeat(WIDTH - 2)}║</Text>
                    {currentPhase && (
                        <Box>
                            <Text color="cyan">║  </Text>
                            <Spinner />
                            <Text color="cyan"> {pad(currentPhase.name, WIDTH - 9)}║</Text>
                        </Box>
                    )}
                </>
            )}

            {/* Services - only show after setup */}
            {setupDone && (
                <>
                    <Text color="cyan">║  <Text dimColor>Services:</Text>{' '.repeat(WIDTH - 14)}║</Text>
                    {services.map((service) => (
                        <Text key={service.name} color="cyan">
                            ║  <Text color={service.status === 'done' ? 'green' : 'gray'}>
                                {service.status === 'done' ? '✓' : '○'} {pad(service.name, WIDTH - 7)}
                            </Text>║
                        </Text>
                    ))}
                    <Text color="cyan">║{' '.repeat(WIDTH - 2)}║</Text>
                </>
            )}

            {/* URLs */}
            {isReady ? (
                <>
                    <Text color="cyan">║  <Text dimColor>URLs:</Text>{' '.repeat(WIDTH - 10)}║</Text>
                    <Text color="cyan">║  Local:     <Text bold>{pad(`http://localhost:${port}`, WIDTH - 16)}</Text>║</Text>
                    {tailscaleHostname && (
                        <Text color="cyan">║  Tailscale: <Text bold>{pad(`https://${tailscaleHostname}:${port}`, WIDTH - 16)}</Text>║</Text>
                    )}
                    <Text color="cyan">║{' '.repeat(WIDTH - 2)}║</Text>
                </>
            ) : setupDone && !currentPhase ? (
                <Box>
                    <Text color="cyan">║  </Text>
                    <Spinner />
                    <Text color="cyan"> {pad('Starting server', WIDTH - 9)}║</Text>
                </Box>
            ) : null}

            {/* Log Path */}
            {logPath && (
                <Text color="cyan">║  <Text dimColor>Logs: {pad(logPath, WIDTH - 10)}</Text>║</Text>
            )}

            {/* Bottom border */}
            <Text color="cyan">╠{LINE}╣</Text>
            <Text color="cyan">║  <Text dimColor>Ctrl+C to stop</Text>{' '.repeat(WIDTH - 18)}║</Text>
            <Text color="cyan">╚{LINE}╝</Text>
        </Box>
    );
}
