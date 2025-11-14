// Supabase Client Setup
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL and Anon Key must be set in environment variables');
}

// Client-side Supabase client
export const supabase = typeof window !== 'undefined' 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Server-side Supabase client (for API routes)
export function createServerSupabaseClient() {
  return createClient(supabaseUrl, supabaseAnonKey);
}

// Database types (generated from Supabase)
export type Database = {
  public: {
    Tables: {
      expenses: {
        Row: {
          id: number;
          name: string;
          category: string;
          amount: number;
          recurrence: string;
          start_date: string;
          end_date: string | null;
          description: string | null;
          vendor: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['expenses']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['expenses']['Insert']>;
      };
      leasing_payments: {
        Row: {
          id: number;
          name: string;
          type: string;
          amount: number;
          start_date: string;
          end_date: string | null;
          frequency: string;
          description: string | null;
          lessor: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['leasing_payments']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['leasing_payments']['Insert']>;
      };
      loans: {
        Row: {
          id: number;
          name: string;
          loan_number: string;
          principal_amount: number;
          interest_rate: number;
          duration_months: number;
          start_date: string;
          status: string;
          lender: string | null;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['loans']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['loans']['Insert']>;
      };
      loan_schedules: {
        Row: {
          id: number;
          loan_id: number;
          month: number;
          payment_date: string;
          principal_payment: number;
          interest_payment: number;
          total_payment: number;
          remaining_balance: number;
          is_paid: boolean;
          paid_date: string | null;
        };
        Insert: Omit<Database['public']['Tables']['loan_schedules']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['loan_schedules']['Insert']>;
      };
      variables: {
        Row: {
          id: number;
          name: string;
          type: string;
          value: number;
          unit: string | null;
          effective_date: string;
          end_date: string | null;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['variables']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['variables']['Insert']>;
      };
      personnel: {
        Row: {
          id: number;
          first_name: string;
          last_name: string;
          email: string | null;
          position: string;
          type: string;
          base_salary: number;
          employer_charges: number;
          employer_charges_type: string;
          start_date: string;
          end_date: string | null;
          is_active: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['personnel']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['personnel']['Insert']>;
      };
      sales: {
        Row: {
          id: number;
          date: string;
          type: string;
          amount: number;
          quantity: number | null;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['sales']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['sales']['Insert']>;
      };
      investments: {
        Row: {
          id: number;
          name: string;
          type: string;
          amount: number;
          purchase_date: string;
          useful_life_months: number;
          depreciation_method: string;
          residual_value: number;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['investments']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['investments']['Insert']>;
      };
      depreciation_entries: {
        Row: {
          id: number;
          investment_id: number;
          month: string;
          depreciation_amount: number;
          accumulated_depreciation: number;
          book_value: number;
        };
        Insert: Omit<Database['public']['Tables']['depreciation_entries']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['depreciation_entries']['Insert']>;
      };
      cash_flow: {
        Row: {
          id: number;
          month: string;
          opening_balance: number;
          cash_inflows: number;
          cash_outflows: number;
          net_cash_flow: number;
          closing_balance: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['cash_flow']['Row'], 'id' | 'net_cash_flow' | 'closing_balance' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['cash_flow']['Insert']>;
      };
      working_capital: {
        Row: {
          id: number;
          month: string;
          accounts_receivable: number;
          inventory: number;
          accounts_payable: number;
          other_current_assets: number;
          other_current_liabilities: number;
          working_capital_need: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['working_capital']['Row'], 'id' | 'working_capital_need' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['working_capital']['Insert']>;
      };
      profit_and_loss: {
        Row: {
          id: number;
          month: string;
          total_revenue: number;
          cost_of_goods_sold: number;
          operating_expenses: number;
          personnel_costs: number;
          leasing_costs: number;
          depreciation: number;
          interest_expense: number;
          taxes: number;
          other_expenses: number;
          gross_profit: number;
          operating_profit: number;
          net_profit: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profit_and_loss']['Row'], 'id' | 'gross_profit' | 'operating_profit' | 'net_profit' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['profit_and_loss']['Insert']>;
      };
      balance_sheet: {
        Row: {
          id: number;
          month: string;
          current_assets: number;
          fixed_assets: number;
          intangible_assets: number;
          total_assets: number;
          current_liabilities: number;
          long_term_debt: number;
          total_liabilities: number;
          share_capital: number;
          retained_earnings: number;
          total_equity: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['balance_sheet']['Row'], 'id' | 'total_assets' | 'total_liabilities' | 'total_equity' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['balance_sheet']['Insert']>;
      };
      financial_plan: {
        Row: {
          id: number;
          month: string;
          equity: number;
          loans: number;
          other_sources: number;
          total_sources: number;
          investments: number;
          working_capital: number;
          loan_repayments: number;
          other_uses: number;
          total_uses: number;
          net_financing: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['financial_plan']['Row'], 'id' | 'total_sources' | 'total_uses' | 'net_financing' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['financial_plan']['Insert']>;
      };
      budget_projections: {
        Row: {
          id: number;
          projection_type: string;
          reference_id: number | null;
          month: string;
          amount: number;
          category: string | null;
          is_projected: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['budget_projections']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['budget_projections']['Insert']>;
      };
    };
  };
};

