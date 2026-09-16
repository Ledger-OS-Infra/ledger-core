declare module "flutterwave-node-v3" {
  export interface FlutterwaveVirtualAccountCreatePayload {
    email: string;
    tx_ref: string;
    is_permanent: boolean;
    bvn?: string;
    phonenumber?: string;
    firstname?: string;
    lastname?: string;
    narration?: string;
    amount?: number;
    currency?: string;
    bank_code?: string;
  }

  export interface FlutterwaveVirtualAccountCreateResponse {
    status: string;
    message?: string;
    data?: {
      account_number?: string;
      bank_name?: string;
      order_ref?: string;
      flw_ref?: string;
      [key: string]: unknown;
    };
  }

  class Flutterwave {
    constructor(publicKey: string, secretKey: string, baseUrl?: string);
    VirtualAcct: {
      create(
        payload: FlutterwaveVirtualAccountCreatePayload,
      ): Promise<FlutterwaveVirtualAccountCreateResponse>;
    };
  }

  export = Flutterwave;
}
