import {
  Controller,
  Get,
  Query,
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
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/guards/roles.guard';
import { LineCallbackDto } from './dto/line-callback.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * LINE Login OAuth2 callback.
   * The LINE platform redirects here with an authorization code after the
   * user grants consent. The server exchanges the code for an access token
   * and returns a signed application JWT.
   */
  @Get('line/callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'LINE Login callback',
    description:
      'Exchange the LINE authorization code for a CheckPass JWT. ' +
      'Call this endpoint with the code returned by LINE OAuth2 redirect.',
  })
  @ApiQuery({ name: 'code', description: 'Authorization code from LINE', type: String })
  @ApiResponse({
    status: 200,
    description: 'Login successful — returns JWT access token and employee profile',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        employee: {
          id: 1,
          empNo: 'EMP0001',
          name: 'John Doe',
          roles: ['employee'],
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired authorization code' })
  async lineCallback(@Query() query: LineCallbackDto): Promise<{
    accessToken: string;
    employee: object;
  }> {
    const result = await this.authService.lineCallback(query.code);
    return {
      accessToken: result.accessToken,
      employee: {
        id: result.employee.id,
        empNo: result.employee.empNo,
        name: result.employee.name,
        roles: result.employee.roles,
      },
    };
  }

  /**
   * Get the profile of the currently authenticated employee.
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Returns the employee profile associated with the authenticated JWT.',
  })
  @ApiResponse({
    status: 200,
    description: 'Employee profile',
    schema: {
      example: {
        id: 1,
        empNo: 'EMP0001',
        name: 'John Doe',
        email: 'john@example.com',
        roles: ['employee'],
        status: 'active',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT' })
  async getProfile(@CurrentUser() user: JwtPayload): Promise<object> {
    const employee = await this.authService.getProfile(user.employeeId);
    return {
      id: employee.id,
      empNo: employee.empNo,
      name: employee.name,
      email: employee.email,
      lineUserId: employee.lineUserId,
      roles: employee.roles,
      status: employee.status,
    };
  }
}
