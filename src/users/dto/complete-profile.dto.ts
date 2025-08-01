import { IsString, IsNotEmpty, IsArray, IsOptional, IsDateString, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type, Transform } from 'class-transformer';
export class WorkExperienceDto {
  @IsString()
  @IsNotEmpty()
  employerName: string;
  @IsString()
  @IsNotEmpty()
  jobTitle: string;
  @IsString()
  @IsNotEmpty()
  startMonth: string;
  @IsString()
  @IsNotEmpty()
  startYear: string;
  @IsString()
  @IsNotEmpty()
  endMonth: string;
  @IsString()
  @IsNotEmpty()
  endYear: string;
  @IsString()
  @IsNotEmpty()
  jobDescription: string;
}
export class ProjectDto {
  @IsString()
  @IsNotEmpty()
  title: string;
  @IsString()
  @IsNotEmpty()
  description: string;
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  tags: string[];
  images?: string[];
}
export class CompleteProfileDto {
  @IsString()
  @IsNotEmpty()
  location: string;
  @IsString()
  @IsNotEmpty()
  category: string;
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @Transform(({ value }) => typeof value === 'string' ? JSON.parse(value) : value)
  skills: string[];
  @IsOptional()
  @IsString()
  nameOnId?: string;
  @IsOptional()
  @IsString()
  idCountryOfIssue?: string;
  @IsOptional()
  @IsDateString()
  idExpiryDate?: string;
  @IsOptional()
  @IsString()
  businessName?: string;
  @IsOptional()
  @IsString()
  businessCountryOfRegistration?: string;
  @IsOptional()
  @IsString()
  businessType?: string;
  @IsOptional()
  @IsString()
  taxRegistrationNumber?: string;
  @IsOptional()
  governmentIdImages?: string[];
  
  @IsOptional()
  businessCertificateImage?: string;
  
  @IsOptional()
  projectImages?: Express.Multer.File[];
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkExperienceDto)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  })
  workExperience?: WorkExperienceDto[];
  
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectDto)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  })
  projects?: ProjectDto[];
}