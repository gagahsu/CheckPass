import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CheckInType } from '../entities/attendance-record.entity';

export class CheckInDto {
  @ApiProperty({
    description: 'Check-in method',
    enum: CheckInType,
    example: CheckInType.GPS,
  })
  @IsEnum(CheckInType)
  type: CheckInType;

  @ApiPropertyOptional({
    description: 'Employee GPS latitude',
    example: 25.033964,
  })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Employee GPS longitude',
    example: 121.564468,
  })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Shift schedule ID to associate the record with',
    example: 42,
  })
  @IsOptional()
  @IsNumber()
  shiftScheduleId?: number;

  @ApiPropertyOptional({
    description: 'Device identifier or user-agent string',
    example: 'iPhone 15 / iOS 17',
  })
  @IsOptional()
  @IsString()
  device?: string;

  @ApiPropertyOptional({
    description: 'Optional note from the employee',
    example: 'Working from client site today',
  })
  @IsOptional()
  @IsString()
  note?: string;
}

export class CheckOutDto {
  @ApiPropertyOptional({
    description: 'Employee GPS latitude at check-out',
    example: 25.033964,
  })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Employee GPS longitude at check-out',
    example: 121.564468,
  })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Optional note from the employee',
  })
  @IsOptional()
  @IsString()
  note?: string;
}

export class AttendanceQueryDto {
  @ApiPropertyOptional({ description: 'Start date (YYYY-MM-DD)', example: '2026-05-01' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (YYYY-MM-DD)', example: '2026-05-31' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Page number (1-based)', example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Records per page', example: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}
