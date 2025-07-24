export declare class MakerController {
    getMakerDashboard(): {
        status: boolean;
        message: string;
        data: {
            stats: {
                orders: number;
                completedOrders: number;
                revenue: number;
            };
        };
    };
}
