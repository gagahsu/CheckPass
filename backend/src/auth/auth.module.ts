import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { HrService } from './hr.service';
import { HrController } from './hr.controller';
import { JwtStrategy } from './jwt.strategy';
import { Employee } from './entities/employee.entity';
import { Role } from './entities/role.entity';
import { Department } from './entities/department.entity';
import { Position } from './entities/position.entity';
import { OrgService } from './org.service';
import { OrgController } from './org.controller';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'fallback-secret'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN', '7d') },
      }),
    }),
    TypeOrmModule.forFeature([Employee, Role, Department, Position]),
    NotificationModule,
  ],
  controllers: [AuthController, HrController, OrgController],
  providers: [AuthService, HrService, JwtStrategy, OrgService],
  exports: [JwtModule, PassportModule, TypeOrmModule],
})
export class AuthModule {}
