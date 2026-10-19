import { Controller, Get } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Public } from '../../modules/auth/decorators/public.decorator';

export interface HealthResponse {
  status: 'ok';
  uptime: number;
  version: string;
}

// Resolves api/package.json from both src/ (ts-node) and dist/ (build output).
function readVersion(): string {
  try {
    const packageJson = JSON.parse(
      readFileSync(join(__dirname, '..', '..', '..', 'package.json'), 'utf8'),
    ) as { version?: string };
    return packageJson.version ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

@Public()
@Controller('health')
export class HealthController {
  private readonly version = readVersion();

  @Get()
  check(): HealthResponse {
    return {
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      version: this.version,
    };
  }
}
