import {
  Controller,
  Sse,
  Query,
  UnauthorizedException,
  OnModuleDestroy,
  Logger,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { Observable, merge, interval, map, takeUntil, Subject } from 'rxjs';
import { Request } from 'express';
import { SseService } from './sse.service';
import { JwtPayload } from '../common/guards/roles.guard';

@ApiTags('sse')
@Controller('sse')
export class SseController implements OnModuleDestroy {
  private readonly logger = new Logger(SseController.name);
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly sseService: SseService,
    private readonly jwtService: JwtService,
  ) {}

  @Sse('notifications')
  @ApiOperation({
    summary: 'SSE notification stream',
    description:
      'Server-Sent Events stream for real-time notifications. ' +
      'Pass the JWT as a query parameter because EventSource does not support custom headers.',
  })
  @ApiQuery({ name: 'token', description: 'JWT access token', type: String })
  notifications(
    @Query('token') token: string,
    @Req() req: Request,
  ): Observable<MessageEvent> {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const { employeeId } = payload;
    this.logger.log(`SSE connected: employee #${employeeId}`);

    // Heartbeat every 30 seconds to keep the connection alive
    const heartbeat$ = interval(30_000).pipe(
      map(() => ({ type: 'heartbeat', data: JSON.stringify({ ts: Date.now() }) } as unknown as MessageEvent)),
    );

    const events$ = this.sseService.getStream(employeeId);

    req.on('close', () => {
      this.logger.log(`SSE disconnected: employee #${employeeId}`);
      this.sseService.onDisconnect(employeeId);
    });

    return merge(events$, heartbeat$).pipe(takeUntil(this.destroy$));
  }

  onModuleDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
