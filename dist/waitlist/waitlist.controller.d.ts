import { WaitlistService } from './waitlist.service';
import { JoinWaitlistDto } from './dto/waitlist.dto';
export declare class WaitlistController {
    private readonly waitlistService;
    constructor(waitlistService: WaitlistService);
    join(joinWaitlistDto: JoinWaitlistDto): Promise<{
        status: boolean;
        message: string;
    }>;
}
