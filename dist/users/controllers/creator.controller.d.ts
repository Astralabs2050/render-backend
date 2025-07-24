export declare class CreatorController {
    getCreatorDashboard(): {
        status: boolean;
        message: string;
        data: {
            stats: {
                designs: number;
                followers: number;
                sales: number;
            };
        };
    };
}
