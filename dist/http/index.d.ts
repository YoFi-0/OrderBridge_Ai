import type { Session } from "express-session";
import http from "http";
import type { Product } from "../products/types.js";
declare module "express" {
    interface Request {
        session: Session & {
            [key: string]: any;
        };
    }
}
export declare const httpServer: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>;
export declare const ioSearch: (socketId: string, userMsg: any) => void;
export declare const ioDisconnectSocket: (socketId?: string) => void;
export declare let tempSocket: {
    socketId: string;
    phoneNumber: string;
    apiKey: string;
    whatsAppKey: string;
    whatsAppVerifyToken: string;
    whatsAppPhoneNumberId: string;
    openRouterKey: string;
}[];
export declare const ioOnProductFound: (socketId: string) => Promise<Product>;
//# sourceMappingURL=index.d.ts.map