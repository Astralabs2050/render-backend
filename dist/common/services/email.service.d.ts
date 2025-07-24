import { ConfigService } from '@nestjs/config';
export declare class EmailService {
    private configService;
    private readonly logger;
    constructor(configService: ConfigService);
    sendOtpEmail(email: string, otp: string): Promise<boolean>;
}
