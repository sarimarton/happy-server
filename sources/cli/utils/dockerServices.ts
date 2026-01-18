import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Docker service information
 */
export interface DockerService {
    name: string;
    containerName: string;
    running: boolean;
}

/**
 * Docker container names used by Happy Server
 */
const DOCKER_CONTAINERS = ['happy-postgres', 'happy-redis', 'minio'];

/**
 * Checks the status of Docker services by running `docker ps`.
 * Returns an array of DockerService objects with their running status.
 */
export async function checkDockerServices(): Promise<DockerService[]> {
    const services: DockerService[] = [
        { name: 'PostgreSQL', containerName: 'happy-postgres', running: false },
        { name: 'Redis', containerName: 'happy-redis', running: false },
        { name: 'MinIO', containerName: 'minio', running: false },
    ];

    try {
        const { stdout } = await execAsync('docker ps --format "{{.Names}}"');
        const runningContainers = stdout.trim().split('\n').filter(Boolean);

        for (const service of services) {
            service.running = runningContainers.includes(service.containerName);
        }
    } catch {
        // Docker not available or not running - all services will show as not running
    }

    return services;
}

/**
 * Stops all Docker containers used by Happy Server.
 * Called during graceful shutdown.
 */
export async function stopDockerServices(): Promise<void> {
    try {
        await execAsync(`docker stop ${DOCKER_CONTAINERS.join(' ')} 2>/dev/null`);
    } catch {
        // Ignore errors - containers may not be running
    }
}
