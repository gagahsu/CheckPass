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

/** DTO for creating a new shift type */
export class CreateShiftTypeDto {
  @ApiPropertyOptional({
    description: 'Store / location ID. Omit for company-wide shift types.',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  storeId?: number;

  @ApiProperty({ description: 'Shift name', example: 'Morning Shift' })
  @IsString()
  @IsNotEmpty()
  shiftName: string;

  @ApiProperty({
    description: 'Shift start time in HH:MM format',
    example: '09:00',
  })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime must be in HH:MM format' })
  startTime: string;

  @ApiProperty({
    description: 'Shift end time in HH:MM format',
    example: '18:00',
  })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime must be in HH:MM format' })
  endTime: string;

  @ApiPropertyOptional({ description: 'Break duration in minutes', example: 60 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(480)
  breakMinutes?: number;

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
}

/** DTO for assigning an employee to a shift */
export class AssignShiftDto {
  @ApiProperty({ description: 'Employee ID to assign', example: 5 })
  @IsNumber()
  employeeId: number;

  @ApiProperty({ description: 'Shift type ID', example: 2 })
  @IsNumber()
  shiftTypeId: number;

  @ApiProperty({
    description: 'Work date in YYYY-MM-DD format',
    example: '2026-05-20',
  })
  @IsDateString()
  date: string;
}

/** DTO for publishing a week's schedule */
export class PublishScheduleDto {
  @ApiProperty({ description: 'Store ID to publish schedule for', example: 1 })
  @IsNumber()
  storeId: number;

  @ApiProperty({
    description: 'First day of the work week (Monday) in YYYY-MM-DD format',
    example: '2026-05-18',
  })
  @IsDateString()
  weekStart: string;
}
