import { IsOptional, IsString, IsDateString, IsIn, IsArray, IsNotEmpty } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class UpdateEmployeeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: '2024-01-15' })
  @IsOptional()
  @IsDateString()
  hireDate?: string;

  @ApiPropertyOptional({ enum: ['active', 'inactive', 'resigned'] })
  @IsOptional()
  @IsIn(['active', 'inactive', 'resigned'])
  status?: string;
}

export class AssignRolesDto {
  @ApiProperty({ type: [String], example: ['employee', 'manager'] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  roleNames: string[];
}
