export interface MerchantProps {
  id?: string;
  name: string;
  email: string;
  apiKey?: string;
  callbackUrl?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Merchant {
  private props: Required<MerchantProps>;

  constructor(props: MerchantProps) {
    this.props = {
      ...props,
      id: props.id ?? crypto.randomUUID(),
      apiKey: props.apiKey ?? crypto.randomUUID(),
      callbackUrl: props.callbackUrl ?? null,
      createdAt: props.createdAt ?? new Date(),
      updatedAt: props.updatedAt ?? new Date(),
    };
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get email(): string {
    return this.props.email;
  }

  get apiKey(): string {
    return this.props.apiKey;
  }

  get callbackUrl(): string | null {
    return this.props.callbackUrl;
  }
}
