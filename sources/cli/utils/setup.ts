import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Setup phase status
 */
export interface SetupPhase {
    name: string;
    status: 'pending' | 'running' | 'done' | 'error';
    error?: string;
}

/**
 * Runs yarn install silently
 */
export async function runYarnInstall(): Promise<void> {
    await execAsync('yarn install --silent 2>/dev/null || yarn install');
}

/**
 * Checks if Docker is running, starts it if needed (macOS only)
 */
export async function ensureDocker(): Promise<void> {
    try {
        await execAsync('docker info > /dev/null 2>&1');
    } catch {
        // Try to start Docker on macOS
        try {
            await execAsync('open -a Docker 2>/dev/null');
            // Wait for Docker to start
            for (let i = 0; i < 60; i++) {
                try {
                    await execAsync('docker info > /dev/null 2>&1');
                    return;
                } catch {
                    await new Promise(r => setTimeout(r, 1000));
                }
            }
            throw new Error('Docker failed to start');
        } catch {
            throw new Error('Docker is not running');
        }
    }
}

/**
 * Ensures a Docker container is running
 */
async function ensureContainer(
    name: string,
    runCommand: string
): Promise<void> {
    try {
        // Check if already running
        const { stdout } = await execAsync(`docker ps -q -f name=^${name}$`);
        if (stdout.trim()) return;

        // Try to start existing container
        try {
            await execAsync(`docker start ${name} > /dev/null 2>&1`);
            return;
        } catch {
            // Container doesn't exist, create it
        }

        // Remove old container if exists
        await execAsync(`docker rm -f ${name} > /dev/null 2>&1 || true`);

        // Create and run new container
        await execAsync(runCommand);
    } catch (e) {
        throw new Error(`Failed to start ${name}`);
    }
}

/**
 * Ensures PostgreSQL is running
 */
export async function ensurePostgres(): Promise<void> {
    await ensureContainer(
        'happy-postgres',
        `docker run -d --name happy-postgres \
            -e POSTGRES_PASSWORD=postgres \
            -e POSTGRES_DB=handy \
            -v "$(pwd)/.pgdata:/var/lib/postgresql/data" \
            -p 5432:5432 \
            postgres > /dev/null`
    );
}

/**
 * Ensures Redis is running
 */
export async function ensureRedis(): Promise<void> {
    await ensureContainer(
        'happy-redis',
        `docker run -d --name happy-redis -p 6379:6379 redis > /dev/null`
    );
}

/**
 * Ensures MinIO is running
 */
export async function ensureMinio(): Promise<void> {
    await ensureContainer(
        'minio',
        `docker run -d --name minio \
            -p 9000:9000 -p 9001:9001 \
            -e MINIO_ROOT_USER=minioadmin \
            -e MINIO_ROOT_PASSWORD=minioadmin \
            -v "$(pwd)/.minio/data:/data" \
            minio/minio server /data --console-address :9001 > /dev/null`
    );
}

/**
 * Runs Prisma generate
 */
export async function runPrismaGenerate(): Promise<void> {
    await execAsync('yarn generate > /dev/null 2>&1');
}

/**
 * Runs Prisma migrations
 */
export async function runPrismaMigrate(): Promise<void> {
    try {
        await execAsync('yarn migrate > /dev/null 2>&1');
    } catch {
        // Migrations might fail if already up to date, that's OK
    }
}

/**
 * Waits for services to be ready
 */
export async function waitForServices(): Promise<void> {
    await new Promise(r => setTimeout(r, 2000));
}
