import React from 'react';
import { Box, Text } from 'ink';
import { Spinner } from '@inkjs/ui';

/**
 * Docker service status
 */
export interface ServiceStatus {
    name: string;
    status: 'pending' | 'running' | 'done' | 'error';
}

/**
 * Setup phase status
 */
export interface SetupPhase {
    name: string;
    status: 'pending' | 'running' | 'done' | 'error';
}

/**
 * Props for the StartupUI component
 */
interface StartupUIProps {
    setupPhases: SetupPhase[];
    services: ServiceStatus[];
    isReady: boolean;
    port: number;
    logPath: string;
}

/**
 * Main Ink component that displays the server startup UI.
 * Shows setup phases, Docker service status, server URLs, and startup state.
 */
export function StartupUI({ setupPhases, services, isReady, port, logPath }: StartupUIProps): React.ReactElement {
    const tailscaleHostname = process.env.TAILSCALE_HOSTNAME;

    // Check if all setup is done
    const setupDone = setupPhases.every(p => p.status === 'done');
    const currentPhase = setupPhases.find(p => p.status === 'running');

    return (
        <Box flexDirection="column" padding={1}>
            {/* Header */}
            <Box marginBottom={1}>
                <Text bold color="cyan">═══════════════════════════════════════════════════════════════</Text>
            </Box>
            <Box marginBottom={1}>
                <Text bold color="cyan">  Happy Server</Text>
            </Box>
            <Box marginBottom={1}>
                <Text bold color="cyan">═══════════════════════════════════════════════════════════════</Text>
            </Box>

            {/* Setup Phases */}
            {!setupDone && (
                <Box flexDirection="column" marginBottom={1}>
                    <Text bold dimColor>Setup:</Text>
                    {setupPhases.map((phase) => (
                        <Box key={phase.name}>
                            {phase.status === 'running' ? (
                                <Text color="yellow">  ◐ {phase.name}...</Text>
                            ) : phase.status === 'done' ? (
                                <Text color="green">  ✓ {phase.name}</Text>
                            ) : phase.status === 'error' ? (
                                <Text color="red">  ✗ {phase.name}</Text>
                            ) : (
                                <Text dimColor>  ○ {phase.name}</Text>
                            )}
                        </Box>
                    ))}
                </Box>
            )}

            {/* Docker Services - only show after setup */}
            {setupDone && (
                <Box flexDirection="column" marginBottom={1}>
                    <Text bold dimColor>Services:</Text>
                    {services.map((service) => (
                        <Box key={service.name}>
                            {service.status === 'done' ? (
                                <Text color="green">  ✓ {service.name}</Text>
                            ) : service.status === 'running' ? (
                                <Text color="yellow">  ◐ {service.name}</Text>
                            ) : service.status === 'error' ? (
                                <Text color="red">  ✗ {service.name}</Text>
                            ) : (
                                <Text dimColor>  ○ {service.name}</Text>
                            )}
                        </Box>
                    ))}
                </Box>
            )}

            {/* Server Status */}
            <Box flexDirection="column" marginBottom={1}>
                {isReady ? (
                    <>
                        <Text bold dimColor>URLs:</Text>
                        <Text>  Local:      http://localhost:{port}</Text>
                        {tailscaleHostname && (
                            <Text>  Tailscale:  https://{tailscaleHostname}:{port}</Text>
                        )}
                    </>
                ) : currentPhase ? (
                    <Box>
                        <Spinner label={`${currentPhase.name}...`} />
                    </Box>
                ) : setupDone ? (
                    <Box>
                        <Spinner label="Starting server..." />
                    </Box>
                ) : null}
            </Box>

            {/* Log Path */}
            {logPath && (
                <Box marginBottom={1}>
                    <Text dimColor>Logs: {logPath}</Text>
                </Box>
            )}

            {/* Footer */}
            <Box marginTop={1}>
                <Text bold color="cyan">═══════════════════════════════════════════════════════════════</Text>
            </Box>
            <Box>
                <Text dimColor>Press </Text>
                <Text bold>Ctrl+C</Text>
                <Text dimColor> to stop</Text>
            </Box>
        </Box>
    );
}
