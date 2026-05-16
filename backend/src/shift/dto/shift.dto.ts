import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsDateString,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateShiftTypeDto {
  @ApiPropertyOptional({ description: 'Store / location ID. Omit for company-wide.', example: 1 })
  @IsOptional()
  @IsNumber()
  storeId?: number;

  @ApiProperty({ description: 'Shift name', example: '早班' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Start time HH:MM', example: '09:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime must be HH:MM' })
  startTime: string;

  @ApiProperty({ description: 'End time HH:MM', example: '18:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime must be HH:MM' })
  endTime: string;

  @ApiPropertyOptional({ description: 'Break duration in minutes', example: 60 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(480)
  breakMinutes?: number;

  @ApiPropertyOptional({ description: 'Tardiness grace period in minutes', example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(60)
  graceMinutes?: number;

  @ApiPropertyOptional({ description: 'Minimum staff required', example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  minStaff?: number;

  @ApiPropertyOptional({ description: 'Maximum staff allowed', example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxStaff?: number;

  @ApiPropertyOptional({ description: 'Hex color for calendar', example: '#06b6d4' })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color must be a hex color like #06b6d4' })
  color?: string;
}

export class AssignShiftDto {
  @ApiProperty({ description: 'Employee ID', example: 5 })
  @IsNumber()
  employeeId: number;

  @ApiProperty({ description: 'Shift type ID', example: 2 })
  @IsNumber()
  shiftTypeId: number;

  @ApiProperty({ description: 'Work date YYYY-MM-DD', example: '2026-05-20' })
  @IsDateString()
  date: string;
}

export class PublishScheduleDto {
  @ApiProperty({ description: 'Store ID', example: 1 })
  @IsNumber()
  storeId: number;

  @ApiProperty({ description: 'Week start (Monday) YYYY-MM-DD', example: '2026-05-18' })
  @IsDateString()
  weekStart: string;
}
