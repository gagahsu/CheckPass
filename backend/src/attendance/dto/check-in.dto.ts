import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CheckInType } from '../entities/attendance-record.entity';

export class CheckInDto {
  @ApiProperty({ enum: CheckInType, example: CheckInType.GPS })
  @IsEnum(CheckInType)
  type: CheckInType;

  @ApiPropertyOptional({ example: 25.033964 })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ example: 121.564468 })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({ description: 'WiFi SSID (required for WIFI check-in type)', example: 'Office-5G' })
  @IsOptional()
  @IsString()
  wifiSsid?: string;

  @ApiPropertyOptional({ example: 42 })
  @IsOptional()
  @IsNumber()
  shiftScheduleId?: number;

  @ApiPropertyOptional({ example: 'iPhone 15 / iOS 17' })
  @IsOptional()
  @IsString()
  device?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class CheckOutDto {
  @ApiPropertyOptional({ example: 25.033964 })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ example: 121.564468 })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class AttendanceQueryDto {
  @ApiPropertyOptional({ example: '2026-05-01' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-05-31' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class CreateWorkplaceDto {
  @IsString() @MaxLength(100) name: string;
  @IsNumber() latitude: number;
  @IsNumber() longitude: number;
  @IsOptional() @IsInt() @Min(50) @Max(5000) gpsRadiusMeters?: number;
  @IsOptional() @IsString() wifiSsids?: string;
}

export class UpdateWorkplaceDto {
  @IsOptional() @IsString() @MaxLength(100) name?: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsOptional() @IsInt() @Min(50) @Max(5000) gpsRadiusMeters?: number;
  @IsOptional() @IsString() wifiSsids?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
