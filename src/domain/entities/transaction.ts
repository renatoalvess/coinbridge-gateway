import { InvalidTransactionStateError } from '../errors/invalid-transaction-state-error.js';

export type TransactionStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';

export interface TransactionProps {
  id?: string;
  merchantId: string;
  blockchainTxId: string;
  amount: number;
  currency: string;
  exchangeRate?: number | null;
  amountBrl?: number | null;
  status?: TransactionStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Transaction {
  private props: Required<TransactionProps>;

  constructor(props: TransactionProps) {
    this.props = {
      ...props,
      id: props.id ?? crypto.randomUUID(),
      exchangeRate: props.exchangeRate ?? null,
      amountBrl: props.amountBrl ?? null,
      status: props.status ?? 'PENDING',
      createdAt: props.createdAt ?? new Date(),
      updatedAt: props.updatedAt ?? new Date(),
    };
  }

  get id(): string { return this.props.id; }
  get merchantId(): string { return this.props.merchantId; }
  get blockchainTxId(): string { return this.props.blockchainTxId; }
  get amount(): number { return this.props.amount; }
  get currency(): string { return this.props.currency; }
  get exchangeRate(): number | null { return this.props.exchangeRate; }
  get amountBrl(): number | null { return this.props.amountBrl; }
  get status(): TransactionStatus { return this.props.status; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  applyExchangeRate(rate: number): void {
    if (this.props.status !== 'PENDING' && this.props.status !== 'PROCESSING') {
      throw new InvalidTransactionStateError(this.props.status, 'RATED');
    }
    this.props.exchangeRate = rate;
    this.props.amountBrl = Math.floor(this.props.amount * rate);
    this.props.updatedAt = new Date();
  }

  process(): void {
    if (this.props.status !== 'PENDING' && this.props.status !== 'FAILED') {
      throw new InvalidTransactionStateError(this.props.status, 'PROCESSING');
    }
    this.props.status = 'PROCESSING';
    this.props.updatedAt = new Date();
  }

  complete(): void {
    if (this.props.status !== 'PROCESSING') {
      throw new InvalidTransactionStateError(this.props.status, 'SUCCESS');
    }
    this.props.status = 'SUCCESS';
    this.props.updatedAt = new Date();
  }

  fail(): void {
    this.props.status = 'FAILED';
    this.props.updatedAt = new Date();
  }
}
