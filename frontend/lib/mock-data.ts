export interface Customer {
    id: string
    name: string
    email: string
    virtualAccount: string
    outstanding: number
    walletCredit: number
    lastPayment: Date
    status: 'current' | 'overdue' | 'credit'
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
      name: 'Acme Corporation',
      email: 'contact@acme.ng',
      virtualAccount: '0123456789',
      outstanding: 250000,
      walletCredit: 50000,
      lastPayment: new Date('2024-12-15'),
      status: 'current',
    },
    {
      id: '2',
      name: 'Tech Solutions Ltd',
      email: 'billing@techsol.ng',
      virtualAccount: '9876543210',
      outstanding: 580000,
      walletCredit: 0,
      lastPayment: new Date('2024-11-28'),
      status: 'overdue',
    },
    {
      id: '3',
      name: 'Global Imports',
      email: 'finance@globalimports.ng',
      virtualAccount: '5555555555',
      outstanding: 0,
      walletCredit: 125000,
      lastPayment: new Date('2024-12-20'),
      status: 'credit',
    },
    {
      id: '4',
      name: 'Creative Agency Pro',
      email: 'accounts@creativeagency.ng',
      virtualAccount: '1111111111',
      outstanding: 180000,
      walletCredit: 0,
      lastPayment: new Date('2024-12-18'),
      status: 'current',
    },
    {
      id: '5',
      name: 'Supply Chain Hub',
      email: 'logistics@supplychainub.ng',
      virtualAccount: '2222222222',
      outstanding: 920000,
      walletCredit: 0,
      lastPayment: new Date('2024-11-10'),
      status: 'overdue',
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
  