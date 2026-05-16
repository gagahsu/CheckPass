import {
  Injectable,
  UnauthorizedException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { JwtPayload } from '../common/guards/roles.guard';

/**
 * Minimal employee record used internally; replace with TypeORM entity when
 * the full HR module is wired up.
 */
interface EmployeeRecord {
  id: number;
  empNo: string;
  name: string;
  email: string | null;
  lineUserId: string | null;
  status: string;
  roles: string[];
}

/**
 * In-memory employee store for Phase-0 scaffolding.
 * Replace with TypeORM repository in Phase 1.
 */
const employeeStore: Map<string, EmployeeRecord> = new Map();
let employeeIdSeq = 1;

/** LINE Login token exchange response shape */
interface LineTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  id_token: string;
}

/** LINE user profile response shape */
interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Exchange LINE authorization code for an access token, retrieve the user
   * profile, and either find or create the corresponding employee record.
   * Returns a signed JWT ready for the client.
   */
  async lineCallback(code: string): Promise<{ accessToken: string; employee: EmployeeRecord }> {
    // 1. Exchange authorization code for LINE access token
    const channelId = this.configService.get<string>('LINE_LOGIN_CHANNEL_ID', '');
    const channelSecret = this.configService.get<string>('LINE_LOGIN_CHANNEL_SECRET', '');

    if (!channelId || !channelSecret) {
      throw new UnauthorizedException(
        'LINE Login is not configured. Set LINE_LOGIN_CHANNEL_ID and LINE_LOGIN_CHANNEL_SECRET.',
      );
    }

    let lineToken: LineTokenResponse;
    try {
      const tokenRes = await axios.post<LineTokenResponse>(
        'https://api.line.me/oauth2/v2.1/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: `${this.configService.get<string>('APP_URL', 'http://localhost:3000')}/auth/line/callback`,
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
      const profileRes = await axios.get<LineProfile>(
        'https://api.line.me/v2/profile',
        { headers: { Authorization: `Bearer ${lineToken.access_token}` } },
      );
      profile = profileRes.data;
    } catch (err: unknown) {
      this.logger.error('Failed to fetch LINE profile', err);
      throw new UnauthorizedException('LINE Login failed: could not retrieve user profile');
    }

    // 3. Find or create employee record by LINE user ID
    let employee = [...employeeStore.values()].find(
      (e) => e.lineUserId === profile.userId,
    );

    if (!employee) {
      const id = employeeIdSeq++;
      employee = {
        id,
        empNo: `EMP${String(id).padStart(4, '0')}`,
        name: profile.displayName,
        email: null,
        lineUserId: profile.userId,
        status: 'active',
        roles: ['employee'],
      };
      employeeStore.set(profile.userId, employee);
      this.logger.log(`Created new employee #${id} for LINE user ${profile.userId}`);
    }

    if (employee.status !== 'active') {
      throw new UnauthorizedException('Employee account is inactive');
    }

    // 4. Sign JWT
    const payload: JwtPayload = {
      employeeId: employee.id,
      roles: employee.roles,
    };
    const accessToken = this.jwtService.sign(payload);

    return { accessToken, employee };
  }

  /**
   * Fetch basic employee profile by ID.
   * In Phase 1 this will query the TypeORM Employee entity.
   */
  async getProfile(employeeId: number): Promise<EmployeeRecord> {
    const employee = [...employeeStore.values()].find((e) => e.id === employeeId);
    if (!employee) {
      throw new NotFoundException(`Employee #${employeeId} not found`);
    }
    return employee;
  }
}
