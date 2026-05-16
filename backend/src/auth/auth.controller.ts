import {
  Controller,
  Get,
  Query,
  Redirect,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/guards/roles.guard';
import { LineCallbackDto } from './dto/line-callback.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('line/login-url')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get LINE Login URL',
    description: 'Returns the LINE OAuth2 authorization URL. Redirect the user to this URL to begin LINE Login.',
  })
  @ApiQuery({ name: 'redirect', required: false, description: 'Path to redirect after login', type: String })
  @ApiResponse({ status: 200, schema: { example: { url: 'https://access.line.me/oauth2/v2.1/authorize?...' } } })
  getLoginUrl(@Query('redirect') redirect?: string): { url: string } {
    return { url: this.authService.getLineLoginUrl(redirect) };
  }

  @Get('line/callback')
  @Redirect()
  @ApiOperation({
    summary: 'LINE Login callback',
    description: 'LINE redirects here with an authorization code. Exchanges the code for a JWT and redirects to the frontend.',
  })
  @ApiQuery({ name: 'code', description: 'Authorization code from LINE', type: String })
  @ApiResponse({ status: 302, description: 'Redirects to frontend /login?token=JWT' })
  @ApiResponse({ status: 401, description: 'Invalid or expired authorization code' })
  async lineCallback(@Query() query: LineCallbackDto): Promise<{ url: string }> {
    const { accessToken } = await this.authService.lineCallback(query.code);
    const appUrl = this.configService.get<string>('APP_URL', 'http://localhost:5173');
    return { url: `${appUrl}/login?token=${encodeURIComponent(accessToken)}` };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Employee profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@CurrentUser() user: JwtPayload): Promise<object> {
    return this.authService.getProfile(user.employeeId);
  }
}
