import type { CustomerWithVirtualAccount } from '@/lib/api/types'

export type Customer = CustomerWithVirtualAccount & {
  outstanding: number
  walletCredit: number
  lastPayment: Date
}

export interface Obligation {
    id: string
    customerId: string
    type: 'invoice' | 'subscription' | 'custom'
    amount: number
    dueDate: Date
    status: 'unpaid' | 'partial' | 'paid'
    description: string
    createdDate: Date
    recurring?: boolean
  }
  
  export interface Transaction {
    id: string
    customerId: string
    amount: number
    date: Date
    status: 'matched' | 'partial' | 'unmatched' | 'overpaid' | 'duplicate'
    reasoning: string
    reference: string
  }
  
  export interface BillingRule {
    id: string
    name: string
    customerId?: string
    amount: number
    nextRunDate: Date
    status: 'active' | 'paused'
    createdDate: Date
  }
  
  export interface LedgerEntry {
    id: string
    customerId: string
    type: 'payment_received' | 'invoice_created' | 'account_created' | 'credit_applied' | 'refund_issued'
    title: string
    description: string
    amount?: number
    date: Date
  }
  
  export const mockLedgers: LedgerEntry[] = [
    {
      id: 'led1',
      customerId: '1',
      type: 'payment_received',
      title: 'Payment received',
      description: 'Jun 10, 2026 • applied to Invoice #1042',
      amount: 70000,
      date: new Date('2026-06-10'),
    },
    {
      id: 'led2',
      customerId: '1',
      type: 'invoice_created',
      title: 'Invoice created',
      description: 'Jun 1, 2026 • Invoice #1042',
      amount: 150000,
      date: new Date('2026-06-01'),
    },
    {
      id: 'led3',
      customerId: '1',
      type: 'account_created',
      title: 'Account created',
      description: 'Jun 1, 2026',
      date: new Date('2026-06-01'),
    },
    {
      id: 'led4',
      customerId: '2',
      type: 'payment_received',
      title: 'Payment received',
      description: 'Nov 28, 2024 • applied to Invoice #INV-002',
      amount: 250000,
      date: new Date('2024-11-28'),
    },
    {
      id: 'led5',
      customerId: '2',
      type: 'invoice_created',
      title: 'Invoice created',
      description: 'Nov 15, 2024 • Invoice #INV-002',
      amount: 480000,
      date: new Date('2024-11-15'),
    },
    {
      id: 'led6',
      customerId: '2',
      type: 'account_created',
      title: 'Account created',
      description: 'Nov 1, 2024',
      date: new Date('2024-11-01'),
    },
    {
      id: 'led7',
      customerId: '3',
      type: 'payment_received',
      title: 'Payment received',
      description: 'Dec 20, 2024 • applied to Invoice #INV-003',
      amount: 150000,
      date: new Date('2024-12-20'),
    },
    {
      id: 'led8',
      customerId: '3',
      type: 'credit_applied',
      title: 'Credit applied',
      description: 'Dec 15, 2024 • ₦75,000 credit issued',
      amount: 75000,
      date: new Date('2024-12-15'),
    },
    {
      id: 'led9',
      customerId: '3',
      type: 'invoice_created',
      title: 'Invoice created',
      description: 'Nov 10, 2024 • Invoice #INV-003',
      amount: 150000,
      date: new Date('2024-11-10'),
    },
    {
      id: 'led10',
      customerId: '3',
      type: 'account_created',
      title: 'Account created',
      description: 'Oct 1, 2024',
      date: new Date('2024-10-01'),
    },
  ]
  
  export const mockCustomers: Customer[] = [
    {
      id: '1',
      business_id: 'demo-business',
      full_name: 'Acme Corporation',
      email: 'contact@acme.ng',
      phone: null,
      status: 'ACTIVE',
      metadata: {},
      created_at: '2024-06-01T08:00:00.000Z',
      updated_at: '2024-12-15T12:00:00.000Z',
      virtual_account: {
        id: 'va1',
        customer_id: '1',
        nomba_account_ref: 'NOMBA-ACME-1',
        account_number: '0123456789',
        bank_name: 'Access Bank',
        bank_code: '044',
        is_active: true,
        created_at: '2024-06-01T08:00:00.000Z',
      },
      outstanding: 250000,
      walletCredit: 50000,
      lastPayment: new Date('2024-12-15'),
    },
    {
      id: '2',
      business_id: 'demo-business',
      full_name: 'Tech Solutions Ltd',
      email: 'billing@techsol.ng',
      phone: null,
      status: 'INACTIVE',
      metadata: {},
      created_at: '2024-04-15T09:30:00.000Z',
      updated_at: '2024-11-28T15:45:00.000Z',
      virtual_account: {
        id: 'va2',
        customer_id: '2',
        nomba_account_ref: 'NOMBA-TECH-2',
        account_number: '9876543210',
        bank_name: 'GTBank',
        bank_code: '058',
        is_active: false,
        created_at: '2024-04-15T09:30:00.000Z',
      },
      outstanding: 580000,
      walletCredit: 0,
      lastPayment: new Date('2024-11-28'),
    },
    {
      id: '3',
      business_id: 'demo-business',
      full_name: 'Global Imports',
      email: 'finance@globalimports.ng',
      phone: null,
      status: 'ACTIVE',
      metadata: {},
      created_at: '2024-03-10T11:20:00.000Z',
      updated_at: '2024-12-20T14:10:00.000Z',
      virtual_account: {
        id: 'va3',
        customer_id: '3',
        nomba_account_ref: 'NOMBA-GLOB-3',
        account_number: '5555555555',
        bank_name: 'Zenith Bank',
        bank_code: '057',
        is_active: true,
        created_at: '2024-03-10T11:20:00.000Z',
      },
      outstanding: 0,
      walletCredit: 125000,
      lastPayment: new Date('2024-12-20'),
    },
    {
      id: '4',
      business_id: 'demo-business',
      full_name: 'Creative Agency Pro',
      email: 'accounts@creativeagency.ng',
      phone: null,
      status: 'ACTIVE',
      metadata: {},
      created_at: '2024-05-20T14:00:00.000Z',
      updated_at: '2024-12-18T10:30:00.000Z',
      virtual_account: {
        id: 'va4',
        customer_id: '4',
        nomba_account_ref: 'NOMBA-CREA-4',
        account_number: '1111111111',
        bank_name: 'First Bank',
        bank_code: '011',
        is_active: true,
        created_at: '2024-05-20T14:00:00.000Z',
      },
      outstanding: 180000,
      walletCredit: 0,
      lastPayment: new Date('2024-12-18'),
    },
    {
      id: '5',
      business_id: 'demo-business',
      full_name: 'Supply Chain Hub',
      email: 'logistics@supplychainub.ng',
      phone: null,
      status: 'INACTIVE',
      metadata: {},
      created_at: '2024-02-12T08:15:00.000Z',
      updated_at: '2024-11-10T13:00:00.000Z',
      virtual_account: {
        id: 'va5',
        customer_id: '5',
        nomba_account_ref: 'NOMBA-SUPP-5',
        account_number: '2222222222',
        bank_name: 'UBA',
        bank_code: '033',
        is_active: false,
        created_at: '2024-02-12T08:15:00.000Z',
      },
      outstanding: 920000,
      walletCredit: 0,
      lastPayment: new Date('2024-11-10'),
    },
  ]
  
  export const mockObligations: Obligation[] = [
    {
      id: 'ob1',
      customerId: '1',
      type: 'invoice',
      amount: 250000,
      dueDate: new Date('2024-12-31'),
      status: 'unpaid',
      description: 'Invoice #INV-001',
      createdDate: new Date('2024-12-01'),
    },
    {
      id: 'ob2',
      customerId: '2',
      type: 'subscription',
      amount: 100000,
      dueDate: new Date('2024-12-25'),
      status: 'unpaid',
      description: 'Monthly subscription',
      createdDate: new Date('2024-12-01'),
      recurring: true,
    },
    {
      id: 'ob3',
      customerId: '2',
      type: 'invoice',
      amount: 480000,
      dueDate: new Date('2024-12-15'),
      status: 'partial',
      description: 'Invoice #INV-002',
      createdDate: new Date('2024-11-15'),
    },
    {
      id: 'ob4',
      customerId: '3',
      type: 'invoice',
      amount: 150000,
      dueDate: new Date('2024-12-10'),
      status: 'paid',
      description: 'Invoice #INV-003',
      createdDate: new Date('2024-11-10'),
    },
    {
      id: 'ob5',
      customerId: '4',
      type: 'invoice',
      amount: 180000,
      dueDate: new Date('2024-12-28'),
      status: 'unpaid',
      description: 'Invoice #INV-004',
      createdDate: new Date('2024-12-05'),
    },
  ]
  
  export const mockTransactions: Transaction[] = [
    {
      id: 'tx1',
      customerId: '1',
      amount: 250000,
      date: new Date('2024-12-20'),
      status: 'matched',
      reasoning: 'Exact match to Invoice #INV-001',
      reference: 'TXN20241220001',
    },
    {
      id: 'tx2',
      customerId: '2',
      amount: 480000,
      date: new Date('2024-12-18'),
      status: 'matched',
      reasoning: 'Matched to Invoice #INV-002 (partial)',
      reference: 'TXN20241218001',
    },
    {
      id: 'tx3',
      customerId: '3',
      amount: 180000,
      date: new Date('2024-12-19'),
      status: 'unmatched',
      reasoning: 'No matching obligation found',
      reference: 'TXN20241219001',
    },
    {
      id: 'tx4',
      customerId: '4',
      amount: 90000,
      date: new Date('2024-12-21'),
      status: 'partial',
      reasoning: 'Partial match - ₦90,000 of ₦180,000 applied',
      reference: 'TXN20241221001',
    },
    {
      id: 'tx5',
      customerId: '5',
      amount: 250000,
      date: new Date('2024-12-20'),
      status: 'matched',
      reasoning: 'FIFO applied to oldest obligation',
      reference: 'TXN20241220002',
    },
  ]
  
  export const mockBillingRules: BillingRule[] = [
    {
      id: 'br1',
      name: 'Monthly subscription - All',
      amount: 100000,
      nextRunDate: new Date('2025-01-01'),
      status: 'active',
      createdDate: new Date('2024-11-01'),
    },
    {
      id: 'br2',
      name: 'Quarterly review fee',
      customerId: '1',
      amount: 50000,
      nextRunDate: new Date('2025-01-15'),
      status: 'active',
      createdDate: new Date('2024-10-01'),
    },
    {
      id: 'br3',
      name: 'Setup fee',
      customerId: '3',
      amount: 25000,
      nextRunDate: new Date('2025-03-01'),
      status: 'paused',
      createdDate: new Date('2024-09-01'),
    },
  ]
  