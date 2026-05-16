import {
  IsNumber,
  IsInt,
  Min,
  Max,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** DTO for triggering payroll calculation */
export class CalculatePayrollDto {
  @ApiProperty({ description: 'Employee ID to calculate payroll for', example: 5 })
  @IsNumber()
  employeeId: number;

  @ApiProperty({ description: 'Payroll year', example: 2026 })
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @ApiProperty({ description: 'Payroll month (1–12)', example: 5 })
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @ApiPropertyOptional({
    description: 'Base salary override (TWD). Uses employee\'s contracted salary if omitted.',
    example: 45000,
  })
  @IsOptional()
  @IsNumber()
  baseSalary?: number;

  @ApiPropertyOptional({
    description: 'Overtime multiplier (default 1.33 per Labour Standards Act)',
    example: 1.33,
  })
  @IsOptional()
  @IsNumber()
  overtimeMultiplier?: number;
}

/** Query DTO for retrieving a payroll record */
export class GetPayrollDto {
  @ApiPropertyOptional({ description: 'Employee ID (HR/admin only; defaults to self)', example: 5 })
  @IsOptional()
  @IsNumber()
  employeeId?: number;

  @ApiProperty({ description: 'Payroll year', example: 2026 })
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @ApiProperty({ description: 'Payroll month (1–12)', example: 5 })
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;
}
