import {
  Injectable,
  UnauthorizedException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { Employee } from './entities/employee.entity';
import { Role } from './entities/role.entity';
import { JwtPayload } from '../common/guards/roles.guard';

interface LineTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  id_token: string;
}

interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

export interface EmployeeProfile {
  id: number;
  empNo: string;
  name: string;
  email: string | null;
  lineUserId: string | null;
  roles: string[];
  status: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(Employee) private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
  ) {}

  getLineLoginUrl(redirectPath = '/dashboard'): string {
    const channelId = this.configService.get<string>('LINE_LOGIN_CHANNEL_ID', '');
    const appUrl = this.configService.get<string>('APP_URL', 'http://localhost:5173');
    const callbackUrl = this.configService.get<string>(
      'LINE_CALLBACK_URL',
      `${appUrl}/login`,
    );

    const state = Buffer.from(JSON.stringify({ redirect: redirectPath })).toString('base64url');

    return (
      `https://access.line.me/oauth2/v2.1/authorize` +
      `?response_type=code` +
      `&client_id=${encodeURIComponent(channelId)}` +
      `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
      `&state=${encodeURIComponent(state)}` +
      `&scope=profile%20openid%20email`
    );
  }

  async lineCallback(code: string): Promise<{ accessToken: string; employee: EmployeeProfile }> {
    const channelId = this.configService.get<string>('LINE_LOGIN_CHANNEL_ID', '');
    const channelSecret = this.configService.get<string>('LINE_LOGIN_CHANNEL_SECRET', '');
    const appUrl = this.configService.get<string>('APP_URL', 'http://localhost:5173');
    const callbackUrl = this.configService.get<string>(
      'LINE_CALLBACK_URL',
      `${appUrl}/login`,
    );

    if (!channelId || !channelSecret) {
      throw new UnauthorizedException(
        'LINE Login is not configured. Set LINE_LOGIN_CHANNEL_ID and LINE_LOGIN_CHANNEL_SECRET.',
      );
    }

    // 1. Exchange authorization code for LINE access token
    let lineToken: LineTokenResponse;
    try {
      const tokenRes = await axios.post<LineTokenResponse>(
        'https://api.line.me/oauth2/v2.1/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: callbackUrl,
          client_id: channelId,
          client_secret: channelSecret,
        }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );
      lineToken = tokenRes.data;
    } catch (err: unknown) {
      this.logger.error('Failed to exchange LINE code for token', err);
      throw new UnauthorizedException('LINE Login failed: could not exchange authorization code');
    }

    // 2. Retrieve LINE user profile
    let profile: LineProfile;
    try {
      const profileRes = await axios.get<LineProfile>('https://api.line.me/v2/profile', {
        headers: { Authorization: `Bearer ${lineToken.access_token}` },
      });
      profile = profileRes.data;
    } catch (err: unknown) {
      this.logger.error('Failed to fetch LINE profile', err);
      throw new UnauthorizedException('LINE Login failed: could not retrieve user profile');
    }

    // 3. Find or create employee by LINE user ID
    let employee = await this.employeeRepo.findOne({
      where: { lineUserId: profile.userId },
      relations: ['roles'],
    });

    if (!employee) {
      const defaultRole = await this.roleRepo.findOne({ where: { name: 'employee' } });
      const count = await this.employeeRepo.count();
      const empNo = `EMP${String(count + 1).padStart(4, '0')}`;

      employee = this.employeeRepo.create({
        empNo,
        name: profile.displayName,
        lineUserId: profile.userId,
        status: 'active',
        roles: defaultRole ? [defaultRole] : [],
      });
      employee = await this.employeeRepo.save(employee);
      employee = await this.employeeRepo.findOne({
        where: { id: employee.id },
        relations: ['roles'],
      }) as Employee;
      this.logger.log(`Created employee ${empNo} for LINE user ${profile.userId}`);
    }

    if (employee.status !== 'active') {
      throw new UnauthorizedException('Employee account is inactive');
    }

    // 4. Sign JWT
    const roleNames = employee.roles.map((r) => r.name);
    const payload: JwtPayload = { employeeId: employee.id, roles: roleNames };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      employee: {
        id: employee.id,
        empNo: employee.empNo,
        name: employee.name,
        email: employee.email,
        lineUserId: employee.lineUserId,
        roles: roleNames,
        status: employee.status,
      },
    };
  }

  async getProfile(employeeId: number): Promise<EmployeeProfile> {
    const employee = await this.employeeRepo.findOne({
      where: { id: employeeId },
      relations: ['roles'],
    });
    if (!employee) {
      throw new NotFoundException(`Employee #${employeeId} not found`);
    }
    return {
      id: employee.id,
      empNo: employee.empNo,
      name: employee.name,
      email: employee.email,
      lineUserId: employee.lineUserId,
      roles: employee.roles.map((r) => r.name),
      status: employee.status,
    };
  }
}
