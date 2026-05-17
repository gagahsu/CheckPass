import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LineCallbackDto {
  @ApiProperty({
    description: 'Authorization code returned by LINE Login OAuth2 flow',
    example: 'abc123xyz',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({ description: 'OAuth2 state parameter returned by LINE' })
  @IsString()
  @IsOptional()
  state?: string;
}
