#!/usr/bin/env python3
"""
Generate comprehensive seed data for SunnyBudget
This script generates SQL INSERT statements for all tables
"""

import datetime
from decimal import Decimal

def generate_subscriptions():
    """Generate 100+ subscriptions"""
    subscriptions = []
    categories = {
        'rent': [
            ('Rent - Main Location', 5000.00, 'monthly', '2024-01-01'),
            ('Rent - Secondary Location', 3500.00, 'monthly', '2024-03-01'),
            ('Rent - Warehouse', 2000.00, 'monthly', '2024-05-01'),
            ('Rent - Office Space', 1800.00, 'monthly', '2024-02-01'),
            ('Rent - Parking Lot', 500.00, 'monthly', '2024-01-01'),
        ],
        'utilities': [
            ('Electricity', 800.00, 'monthly', '2024-01-01'),
            ('Electricity - Secondary', 600.00, 'monthly', '2024-03-01'),
            ('Water', 200.00, 'monthly', '2024-01-01'),
            ('Water - Secondary', 150.00, 'monthly', '2024-03-01'),
            ('Internet & Phone', 150.00, 'monthly', '2024-01-01'),
            ('Internet - Secondary', 120.00, 'monthly', '2024-03-01'),
            ('Gas', 300.00, 'monthly', '2024-01-01'),
            ('Waste Management', 100.00, 'monthly', '2024-01-01'),
            ('Security System Monitoring', 80.00, 'monthly', '2024-01-01'),
        ],
        'supplies': [
            ('Kitchen Supplies', 1200.00, 'monthly', '2024-01-01'),
            ('Kitchen Supplies - Secondary', 800.00, 'monthly', '2024-03-01'),
            ('Cleaning Supplies', 250.00, 'monthly', '2024-01-01'),
            ('Office Supplies', 150.00, 'monthly', '2024-01-01'),
            ('Paper Products', 200.00, 'monthly', '2024-01-01'),
            ('Beverage Supplies', 600.00, 'monthly', '2024-01-01'),
            ('Packaging Materials', 180.00, 'monthly', '2024-01-01'),
            ('Uniforms & Linens', 300.00, 'quarterly', '2024-01-01'),
        ],
        'marketing': [
            ('Marketing Campaign - Q1', 2000.00, 'quarterly', '2024-01-01'),
            ('Social Media Marketing', 800.00, 'monthly', '2024-01-01'),
            ('Print Advertising', 500.00, 'monthly', '2024-01-01'),
            ('Radio Advertising', 600.00, 'monthly', '2024-02-01'),
            ('TV Advertising', 1500.00, 'monthly', '2024-03-01'),
            ('SEO Services', 400.00, 'monthly', '2024-01-01'),
            ('Content Creation', 350.00, 'monthly', '2024-01-01'),
        ],
        'insurance': [
            ('Insurance - Annual', 3000.00, 'yearly', '2024-01-01'),
            ('Equipment Insurance', 200.00, 'monthly', '2024-01-01'),
            ('Vehicle Insurance', 150.00, 'monthly', '2024-01-01'),
            ('Liability Insurance', 250.00, 'monthly', '2024-01-01'),
            ('Health Insurance Contribution', 500.00, 'monthly', '2024-01-01'),
        ],
        'maintenance': [
            ('Equipment Maintenance', 500.00, 'monthly', '2024-01-01'),
            ('Building Maintenance', 300.00, 'monthly', '2024-01-01'),
            ('HVAC Maintenance', 200.00, 'quarterly', '2024-01-01'),
            ('Vehicle Maintenance', 400.00, 'monthly', '2024-01-01'),
            ('IT Support', 300.00, 'monthly', '2024-01-01'),
            ('Landscaping', 150.00, 'monthly', '2024-02-01'),
        ],
        'professional_services': [
            ('Legal Services', 1500.00, 'quarterly', '2024-01-01'),
            ('Accounting Services', 1200.00, 'monthly', '2024-01-01'),
            ('Consulting Services', 1000.00, 'monthly', '2024-02-01'),
            ('Tax Preparation', 800.00, 'quarterly', '2024-01-01'),
            ('Audit Services', 2000.00, 'yearly', '2024-01-01'),
            ('HR Services', 600.00, 'monthly', '2024-01-01'),
        ],
    }
    
    sub_id = 1
    for category, items in categories.items():
        for name, amount, recurrence, start_date in items:
            subscriptions.append(f"({sub_id}, '{name}', '{category}', {amount:.2f}, '{recurrence}', '{start_date}', NULL, '{name} subscription', 'Vendor {sub_id}', true)")
            sub_id += 1
    
    # Add more subscriptions
    for i in range(sub_id, 101):
        category = list(categories.keys())[i % len(categories)]
        subscriptions.append(f"({i}, 'Subscription {i}', '{category}', {100.00 + (i * 10):.2f}, 'monthly', '2024-01-01', NULL, 'Auto-generated subscription {i}', 'Vendor {i}', true)")
    
    return subscriptions

def generate_expenses_for_subscriptions(num_subs=100, months=24):
    """Generate expense payments for all subscriptions across all months"""
    expenses = []
    expense_id = 1
    
    # One-time expenses first
    one_time = [
        ('One-time Setup Cost', 'other', 5000.00, '2024-01-15'),
        ('Security System', 'other', 2500.00, '2024-02-01'),
        ('Signage', 'other', 1800.00, '2024-01-20'),
        ('Initial Marketing Campaign', 'marketing', 5000.00, '2024-01-10'),
        ('Legal Setup', 'professional_services', 3000.00, '2024-01-05'),
        ('Equipment Purchase', 'other', 15000.00, '2024-02-15'),
        ('Renovation Costs', 'other', 25000.00, '2024-01-25'),
    ]
    
    for name, category, amount, date in one_time:
        expenses.append(f"({expense_id}, '{name}', '{category}', {amount:.2f}, 'one_time', '{date}', '{date}', '{name} expense', 'Vendor', NULL)")
        expense_id += 1
    
    # Generate monthly payments for subscriptions
    start_date = datetime.date(2024, 1, 1)
    for month_offset in range(months):
        current_date = start_date + datetime.timedelta(days=30 * month_offset)
        year = current_date.year
        month = current_date.month
        
        for sub_id in range(1, num_subs + 1):
            # Skip some to make it realistic (not all subscriptions paid every month)
            if sub_id % 7 == 0:  # Skip every 7th subscription
                continue
            
            # Vary payment dates
            payment_day = 1 + (sub_id % 28)
            payment_date = f"{year}-{month:02d}-{payment_day:02d}"
            
            amount = 100.00 + (sub_id * 10)
            expenses.append(f"({expense_id}, 'Payment - Sub {sub_id} - {year}-{month:02d}', 'rent', {amount:.2f}, 'one_time', '{payment_date}', '{payment_date}', 'Payment for subscription {sub_id}', 'Vendor {sub_id}', {sub_id})")
            expense_id += 1
    
    return expenses, expense_id

def generate_leasing_payments():
    """Generate 30+ leasing payments"""
    leases = []
    lease_id = 1
    
    base_leases = [
        ('Vehicle Lease - Delivery Van', 'operating', 800.00, '2024-01-01', '2026-12-31', 'monthly'),
        ('Vehicle Lease - Second Van', 'operating', 750.00, '2024-03-01', '2027-02-28', 'monthly'),
        ('Equipment Lease - Kitchen', 'finance', 1200.00, '2024-01-01', '2027-12-31', 'monthly'),
        ('Equipment Lease - Refrigeration', 'finance', 900.00, '2024-02-01', '2027-01-31', 'monthly'),
        ('Office Space Lease', 'operating', 1500.00, '2024-01-01', None, 'monthly'),
        ('Storage Unit Lease', 'operating', 400.00, '2024-01-01', None, 'monthly'),
        ('Equipment Lease - POS Systems', 'finance', 300.00, '2024-01-01', '2026-12-31', 'monthly'),
        ('Vehicle Lease - Third Van', 'operating', 850.00, '2024-06-01', '2027-05-31', 'monthly'),
        ('Equipment Lease - Dishwasher', 'finance', 450.00, '2024-02-01', '2027-01-31', 'monthly'),
        ('Equipment Lease - Oven', 'finance', 600.00, '2024-01-01', '2027-12-31', 'monthly'),
    ]
    
    for name, lease_type, amount, start_date, end_date, frequency in base_leases:
        end_date_str = f"'{end_date}'" if end_date else "NULL"
        leases.append(f"({lease_id}, '{name}', '{lease_type}', {amount:.2f}, '{start_date}', {end_date_str}, '{frequency}', '{name} lease', 'Lessor {lease_id}', true)")
        lease_id += 1
    
    # Generate more leases
    for i in range(lease_id, 31):
        lease_type = 'operating' if i % 2 == 0 else 'finance'
        amount = 300.00 + (i * 50)
        start_date = f"2024-{(i % 12) + 1:02d}-01"
        end_date = f"'{2027 + (i % 3)}-12-31'" if i % 3 == 0 else "NULL"
        leases.append(f"({i}, 'Lease {i}', '{lease_type}', {amount:.2f}, '{start_date}', {end_date}, 'monthly', 'Auto-generated lease {i}', 'Lessor {i}', true)")
    
    return leases

def generate_loans():
    """Generate 15+ loans - returns both SQL strings and raw data"""
    loans_sql = []
    loans_data = []  # Raw data for schedule generation
    loan_id = 1
    
    base_loans = [
        ('Business Startup Loan', 'Emprunt 1', 50000.00, 6.5, 60, '2024-01-01', 'active'),
        ('Equipment Financing', 'Emprunt 2', 30000.00, 5.5, 36, '2024-02-01', 'active'),
        ('Expansion Loan', 'Emprunt 3', 75000.00, 7.0, 84, '2024-03-01', 'active'),
        ('Working Capital Loan', 'Emprunt 4', 40000.00, 6.0, 48, '2024-04-01', 'active'),
        ('Renovation Loan', 'Emprunt 5', 60000.00, 6.8, 72, '2024-05-01', 'active'),
    ]
    
    for name, loan_num, principal, rate, duration, start_date, status in base_loans:
        loans_sql.append(f"({loan_id}, '{name}', '{loan_num}', {principal:.2f}, {rate:.2f}, {duration}, '{start_date}', '{status}', 'Bank {loan_id}', '{name} description')")
        loans_data.append((loan_id, principal, rate, duration, start_date))
        loan_id += 1
    
    # Generate more loans
    for i in range(loan_id, 16):
        principal = 20000.00 + (i * 5000)
        rate = 5.0 + (i * 0.2)
        duration = 36 + (i * 6)
        month = (i % 12) + 1
        start_date = f"2024-{month:02d}-01"
        loans_sql.append(f"({i}, 'Loan {i}', 'Emprunt {i}', {principal:.2f}, {rate:.2f}, {duration}, '{start_date}', 'active', 'Bank {i}', 'Auto-generated loan {i}')")
        loans_data.append((i, principal, rate, duration, start_date))
    
    return loans_sql, loans_data

def generate_loan_schedules(loans_data):
    """Generate full loan schedules for all loans"""
    schedules = []
    schedule_id = 1
    
    for loan_id, principal, rate, duration, start_date_str in loans_data:
        
        # Calculate monthly payment using amortization formula
        monthly_rate = rate / 100 / 12
        if monthly_rate > 0:
            monthly_payment = principal * (monthly_rate * (1 + monthly_rate)**duration) / ((1 + monthly_rate)**duration - 1)
        else:
            monthly_payment = principal / duration
        
        # Generate schedule
        remaining_balance = principal
        start = datetime.datetime.strptime(start_date_str, '%Y-%m-%d').date()
        
        for month in range(1, min(duration + 1, 25)):  # Generate up to 24 months
            payment_date = start + datetime.timedelta(days=30 * (month - 1))
            interest_payment = remaining_balance * monthly_rate
            principal_payment = monthly_payment - interest_payment
            remaining_balance -= principal_payment
            
            is_paid = month <= 6  # First 6 months paid
            paid_date = f"'{payment_date}'" if is_paid else "NULL"
            
            schedules.append(f"({schedule_id}, {loan_id}, {month}, '{payment_date}', {principal_payment:.2f}, {interest_payment:.2f}, {monthly_payment:.2f}, {max(remaining_balance, 0):.2f}, {str(is_paid).lower()}, {paid_date})")
            schedule_id += 1
    
    return schedules

def generate_personnel():
    """Generate 100+ personnel records"""
    personnel = []
    person_id = 1
    
    positions = [
        ('Head Chef', 2500.00, 'full_time'),
        ('Sous Chef', 1800.00, 'full_time'),
        ('Line Cook', 1400.00, 'full_time'),
        ('Prep Cook', 1100.00, 'full_time'),
        ('Waiter', 1200.00, 'full_time'),
        ('Waitress', 1200.00, 'full_time'),
        ('Cashier', 1000.00, 'full_time'),
        ('Manager', 3500.00, 'full_time'),
        ('Assistant Manager', 2200.00, 'full_time'),
        ('Delivery Driver', 800.00, 'part_time'),
        ('Dishwasher', 900.00, 'full_time'),
        ('Hostess', 1000.00, 'full_time'),
        ('Accountant', 2000.00, 'contractor'),
        ('Security Guard', 1500.00, 'contractor'),
        ('Marketing Specialist', 1800.00, 'contractor'),
    ]
    
    first_names = ['Ahmed', 'Fatima', 'Mohamed', 'Salma', 'Youssef', 'Amira', 'Karim', 'Leila', 'Hassan', 'Nour', 'Omar', 'Ines', 'Mehdi', 'Sana', 'Tarek', 'Rania', 'Bilel', 'Hiba', 'Wassim', 'Sami', 'Lina', 'Khalil', 'Mariem', 'Yasmine', 'Zied']
    last_names = ['Ben Ali', 'Trabelsi', 'Jebali', 'Khelifi', 'Mansouri', 'Bouazizi', 'Hamdi', 'Slimani', 'Mezghani', 'Ben Ammar', 'Chaabane', 'Ghanmi', 'Bouazza', 'Mahjoub', 'Bouslama', 'Fadhel', 'Khelil', 'Zarrouk', 'Ben Youssef', 'Gharbi', 'Bouhlel', 'Masmoudi', 'Ben Salah', 'Karray', 'Bouaziz']
    
    for i, (position, base_salary, emp_type) in enumerate(positions):
        for j in range(5):  # 5 of each position
            first = first_names[(i * 5 + j) % len(first_names)]
            last = last_names[(i * 5 + j) % len(last_names)]
            email = f"{first.lower()}.{last.lower().replace(' ', '')}@restaurant.com"
            
            employer_charges = base_salary * 0.1875 if emp_type != 'contractor' else 0
            charges_type = 'percentage' if emp_type != 'contractor' else 'fixed'
            
            start_month = (i * 5 + j) % 12 + 1
            start_date = f"2024-{start_month:02d}-01"
            
            personnel.append(f"({person_id}, '{first}', '{last}', '{email}', '{position}', '{emp_type}', {base_salary:.2f}, {employer_charges:.2f}, '{charges_type}', '{start_date}', NULL, true, NULL)")
            person_id += 1
    
    # Generate more personnel
    for i in range(person_id, 101):
        first = first_names[i % len(first_names)]
        last = last_names[i % len(last_names)]
        position = positions[i % len(positions)][0]
        base_salary = 800.00 + (i * 20)
        emp_type = 'full_time' if i % 3 != 0 else ('part_time' if i % 3 == 1 else 'contractor')
        email = f"{first.lower()}.{last.lower().replace(' ', '')}{i}@restaurant.com"
        
        employer_charges = base_salary * 0.1875 if emp_type != 'contractor' else 0
        charges_type = 'percentage' if emp_type != 'contractor' else 'fixed'
        
        start_month = (i % 12) + 1
        start_date = f"2024-{start_month:02d}-01"
        
        personnel.append(f"({person_id}, '{first}', '{last}', '{email}', '{position} {i}', '{emp_type}', {base_salary:.2f}, {employer_charges:.2f}, '{charges_type}', '{start_date}', NULL, true, NULL)")
        person_id += 1
    
    return personnel

def generate_sales(start_year=2024, end_year=2025):
    """Generate sales data for full years"""
    sales = []
    sale_id = 1
    
    sales_types = ['on_site', 'delivery', 'takeaway', 'catering']
    base_amounts = {'on_site': 950, 'delivery': 650, 'takeaway': 380, 'catering': 2500}
    
    current_date = datetime.date(start_year, 1, 1)
    end_date = datetime.date(end_year, 12, 31)
    
    while current_date <= end_date:
        # Generate 2-5 sales per day
        num_sales = 2 + (sale_id % 4)
        
        for _ in range(num_sales):
            sale_type = sales_types[sale_id % len(sales_types)]
            base_amount = base_amounts[sale_type]
            
            # Add variation
            amount = base_amount + (sale_id % 500) - 250
            quantity = 30 + (sale_id % 50)
            
            description = None
            if current_date.weekday() >= 5:  # Weekend
                amount *= 1.2
                description = 'Weekend special'
            elif sale_id % 20 == 0:
                description = 'Special event'
            
            desc_str = f"'{description}'" if description else 'NULL'
            sales.append(f"({sale_id}, '{current_date}', '{sale_type}', {amount:.2f}, {quantity}, {desc_str})")
            sale_id += 1
        
        current_date += datetime.timedelta(days=1)
    
    return sales

def generate_investments():
    """Generate 50+ investments - returns both SQL strings and raw data"""
    investments_sql = []
    investments_data = []  # Raw data for depreciation generation
    inv_id = 1
    
    base_investments = [
        ('Commercial Oven', 'equipment', 15000.00, '2024-01-01', 120, 'straight_line', 1500.00),
        ('Refrigeration System', 'equipment', 12000.00, '2024-01-01', 96, 'straight_line', 1200.00),
        ('Delivery Vehicle', 'vehicle', 35000.00, '2024-02-01', 60, 'declining_balance', 5000.00),
        ('POS System', 'technology', 5000.00, '2024-01-01', 36, 'straight_line', 500.00),
        ('Kitchen Renovation', 'renovation', 45000.00, '2024-01-15', 120, 'straight_line', 0.00),
        ('Dining Area Furniture', 'other', 18000.00, '2024-01-01', 84, 'straight_line', 2000.00),
    ]
    
    for name, inv_type, amount, purchase_date, useful_life, method, residual in base_investments:
        investments_sql.append(f"({inv_id}, '{name}', '{inv_type}', {amount:.2f}, '{purchase_date}', {useful_life}, '{method}', {residual:.2f}, '{name} investment')")
        investments_data.append((inv_id, amount, purchase_date, useful_life, method, residual))
        inv_id += 1
    
    # Generate more investments
    inv_types = ['equipment', 'vehicle', 'technology', 'renovation', 'other']
    methods = ['straight_line', 'declining_balance']
    
    for i in range(inv_id, 51):
        inv_type = inv_types[i % len(inv_types)]
        amount = 5000.00 + (i * 1000)
        month = (i % 12) + 1
        purchase_date = f"2024-{month:02d}-01"
        useful_life = 60 + (i % 60)
        method = methods[i % len(methods)]
        residual = amount * 0.1
        
        investments_sql.append(f"({i}, 'Investment {i}', '{inv_type}', {amount:.2f}, '{purchase_date}', {useful_life}, '{method}', {residual:.2f}, 'Auto-generated investment {i}')")
        investments_data.append((i, amount, purchase_date, useful_life, method, residual))
    
    return investments_sql, investments_data

def generate_depreciation_entries(investments_data, months=24):
    """Generate depreciation entries for all investments"""
    entries = []
    entry_id = 1
    
    for inv_id, amount, purchase_date_str, useful_life, method, residual in investments_data:
        
        purchase_date = datetime.datetime.strptime(purchase_date_str, '%Y-%m-%d').date()
        
        # Calculate depreciation
        if method == 'straight_line':
            monthly_dep = (amount - residual) / useful_life
        else:  # declining_balance
            rate = 2.0 / useful_life  # Double declining balance
            monthly_dep = amount * rate / 12
        
        accumulated = 0
        current_date = purchase_date.replace(day=1)
        end_date = purchase_date + datetime.timedelta(days=30 * months)
        
        while current_date <= end_date and accumulated < (amount - residual):
            month_str = f"{current_date.year}-{current_date.month:02d}"
            
            if method == 'declining_balance':
                book_value = amount - accumulated
                monthly_dep = book_value * rate / 12
                monthly_dep = min(monthly_dep, amount - residual - accumulated)
            
            accumulated += monthly_dep
            book_value = amount - accumulated
            
            entries.append(f"({entry_id}, {inv_id}, '{month_str}', {monthly_dep:.2f}, {accumulated:.2f}, {book_value:.2f})")
            entry_id += 1
            
            # Move to next month
            if current_date.month == 12:
                current_date = current_date.replace(year=current_date.year + 1, month=1)
            else:
                current_date = current_date.replace(month=current_date.month + 1)
    
    return entries

def generate_financial_statements(months=24):
    """Generate cash flow, working capital, P&L, balance sheet, financial plan data"""
    statements = {
        'cash_flow': [],
        'working_capital': [],
        'profit_loss': [],
        'balance_sheet': [],
        'financial_plan': [],
    }
    
    start_year = 2024
    start_month = 1
    opening_balance = 10000.00
    
    for i in range(months):
        # Properly increment months
        year = start_year + (start_month + i - 1) // 12
        month = ((start_month + i - 1) % 12) + 1
        month_str = f"{year}-{month:02d}"
        
        # Cash Flow
        cash_inflows = 35000.00 + (i * 1000)
        cash_outflows = 28000.00 + (i * 800)
        net_cash = cash_inflows - cash_outflows
        closing_balance = opening_balance + net_cash
        
        statements['cash_flow'].append(f"('{month_str}', {opening_balance:.2f}, {cash_inflows:.2f}, {cash_outflows:.2f}, {net_cash:.2f}, {closing_balance:.2f}, '{month_str} cash flow')")
        opening_balance = closing_balance
        
        # Working Capital
        ar = 5000.00 + (i * 200)
        inventory = 8000.00 + (i * 300)
        ap = 6000.00 + (i * 250)
        oca = 2000.00 + (i * 100)
        ocl = 1500.00 + (i * 50)
        wc_need = ar + inventory + oca - ap - ocl
        
        statements['working_capital'].append(f"('{month_str}', {ar:.2f}, {inventory:.2f}, {ap:.2f}, {oca:.2f}, {ocl:.2f}, {wc_need:.2f})")
        
        # P&L
        revenue = 35000.00 + (i * 1000)
        cogs = revenue * 0.4
        op_exp = 8500.00 + (i * 200)
        personnel = 12000.00 + (i * 300)
        leasing = 3500.00 + (i * 100)
        depreciation = 1200.00 + (i * 50)
        interest = 450.00
        taxes = 1500.00 + (i * 50)
        other = 500.00
        gross_profit = revenue - cogs
        op_profit = gross_profit - op_exp - personnel - leasing - depreciation
        net_profit = op_profit - interest - taxes - other
        
        statements['profit_loss'].append(f"('{month_str}', {revenue:.2f}, {cogs:.2f}, {op_exp:.2f}, {personnel:.2f}, {leasing:.2f}, {depreciation:.2f}, {interest:.2f}, {taxes:.2f}, {other:.2f}, {gross_profit:.2f}, {op_profit:.2f}, {net_profit:.2f})")
        
        # Balance Sheet
        current_assets = 25000.00 + (i * 1000)
        fixed_assets = 125000.00 - (i * 500)
        intangible = 0.00
        total_assets = current_assets + fixed_assets + intangible
        current_liab = 15000.00 + (i * 500)
        long_term_debt = 155000.00 - (i * 1000)
        total_liab = current_liab + long_term_debt
        share_capital = 50000.00
        retained_earnings = -20000.00 + (i * 1000)
        total_equity = share_capital + retained_earnings
        
        statements['balance_sheet'].append(f"('{month_str}', {current_assets:.2f}, {fixed_assets:.2f}, {intangible:.2f}, {total_assets:.2f}, {current_liab:.2f}, {long_term_debt:.2f}, {total_liab:.2f}, {share_capital:.2f}, {retained_earnings:.2f}, {total_equity:.2f})")
        
        # Financial Plan
        equity = 50000.00
        loans = 155000.00 - (i * 1000)
        other_sources = 0.00
        total_sources = equity + loans + other_sources
        investments = 125000.00 if i == 0 else 0.00
        wc = wc_need
        loan_repayments = 2500.00
        other_uses = 5000.00 if i == 0 else 3000.00
        total_uses = investments + wc + loan_repayments + other_uses
        net_financing = total_sources - total_uses
        
        statements['financial_plan'].append(f"('{month_str}', {equity:.2f}, {loans:.2f}, {other_sources:.2f}, {total_sources:.2f}, {investments:.2f}, {wc:.2f}, {loan_repayments:.2f}, {other_uses:.2f}, {total_uses:.2f}, {net_financing:.2f})")
    
    return statements

def main():
    print("-- Comprehensive Seed Data for SunnyBudget")
    print("-- Generated by generate_seed_data.py")
    print("-- This file contains extensive sample data for development and testing")
    print("-- Run with: supabase db reset (applies migrations then seed.sql)")
    print()
    
    # Generate all data
    print("-- ============================================================================")
    print("-- SUBSCRIPTIONS (100+ recurring expenses)")
    print("-- ============================================================================")
    subscriptions = generate_subscriptions()
    print("INSERT INTO subscriptions (id, name, category, amount, recurrence, start_date, end_date, description, vendor, is_active) VALUES")
    print(",\n".join(subscriptions) + ";")
    print("SELECT setval('subscriptions_id_seq', (SELECT MAX(id) FROM subscriptions));")
    print()
    
    print("-- ============================================================================")
    print("-- EXPENSES (1000+ expense payments)")
    print("-- ============================================================================")
    expenses, next_expense_id = generate_expenses_for_subscriptions(100, 24)
    print("INSERT INTO expenses (id, name, category, amount, recurrence, start_date, expense_date, description, vendor, subscription_id) VALUES")
    print(",\n".join(expenses[:500]) + ";")  # First batch
    if len(expenses) > 500:
        print("INSERT INTO expenses (id, name, category, amount, recurrence, start_date, expense_date, description, vendor, subscription_id) VALUES")
        print(",\n".join(expenses[500:]) + ";")
    print("SELECT setval('expenses_id_seq', (SELECT MAX(id) FROM expenses));")
    print()
    
    print("-- ============================================================================")
    print("-- LEASING PAYMENTS (30+ leases)")
    print("-- ============================================================================")
    leases = generate_leasing_payments()
    print("INSERT INTO leasing_payments (id, name, type, amount, start_date, end_date, frequency, description, lessor, is_active) VALUES")
    print(",\n".join(leases) + ";")
    print("SELECT setval('leasing_payments_id_seq', (SELECT MAX(id) FROM leasing_payments));")
    print()
    
    print("-- ============================================================================")
    print("-- LOANS (15+ loans)")
    print("-- ============================================================================")
    loans_sql, loans_data = generate_loans()
    print("INSERT INTO loans (id, name, loan_number, principal_amount, interest_rate, duration_months, start_date, status, lender, description) VALUES")
    print(",\n".join(loans_sql) + ";")
    print("SELECT setval('loans_id_seq', (SELECT MAX(id) FROM loans));")
    print()
    
    print("-- ============================================================================")
    print("-- LOAN SCHEDULES (Full schedules for all loans)")
    print("-- ============================================================================")
    schedules = generate_loan_schedules(loans_data)
    print("INSERT INTO loan_schedules (id, loan_id, month, payment_date, principal_payment, interest_payment, total_payment, remaining_balance, is_paid, paid_date) VALUES")
    print(",\n".join(schedules[:200]) + ";")  # First batch
    if len(schedules) > 200:
        print("INSERT INTO loan_schedules (id, loan_id, month, payment_date, principal_payment, interest_payment, total_payment, remaining_balance, is_paid, paid_date) VALUES")
        print(",\n".join(schedules[200:]) + ";")
    print("SELECT setval('loan_schedules_id_seq', (SELECT MAX(id) FROM loan_schedules));")
    print()
    
    print("-- ============================================================================")
    print("-- PERSONNEL (100+ personnel records)")
    print("-- ============================================================================")
    personnel = generate_personnel()
    print("INSERT INTO personnel (id, first_name, last_name, email, position, type, base_salary, employer_charges, employer_charges_type, start_date, end_date, is_active, notes) VALUES")
    print(",\n".join(personnel) + ";")
    print("SELECT setval('personnel_id_seq', (SELECT MAX(id) FROM personnel));")
    print()
    
    print("-- ============================================================================")
    print("-- SALES (Full year 2024-2025)")
    print("-- ============================================================================")
    sales = generate_sales(2024, 2025)
    print(f"-- Generating {len(sales)} sales records...")
    print("INSERT INTO sales (id, date, type, amount, quantity, description) VALUES")
    # Print in batches
    batch_size = 500
    for i in range(0, len(sales), batch_size):
        batch = sales[i:i+batch_size]
        if i > 0:
            print("INSERT INTO sales (id, date, type, amount, quantity, description) VALUES")
        print(",\n".join(batch) + ";")
        if i + batch_size < len(sales):
            print()
    print("SELECT setval('sales_id_seq', (SELECT MAX(id) FROM sales));")
    print()
    
    print("-- ============================================================================")
    print("-- INVESTMENTS (50+ investments)")
    print("-- ============================================================================")
    investments_sql, investments_data = generate_investments()
    print("INSERT INTO investments (id, name, type, amount, purchase_date, useful_life_months, depreciation_method, residual_value, description) VALUES")
    print(",\n".join(investments_sql) + ";")
    print("SELECT setval('investments_id_seq', (SELECT MAX(id) FROM investments));")
    print()
    
    print("-- ============================================================================")
    print("-- DEPRECIATION ENTRIES (Full depreciation for all investments)")
    print("-- ============================================================================")
    depreciation = generate_depreciation_entries(investments_data, 24)
    print(f"-- Generating {len(depreciation)} depreciation entries...")
    print("INSERT INTO depreciation_entries (id, investment_id, month, depreciation_amount, accumulated_depreciation, book_value) VALUES")
    batch_size = 500
    for i in range(0, len(depreciation), batch_size):
        batch = depreciation[i:i+batch_size]
        if i > 0:
            print("INSERT INTO depreciation_entries (id, investment_id, month, depreciation_amount, accumulated_depreciation, book_value) VALUES")
        print(",\n".join(batch) + ";")
        if i + batch_size < len(depreciation):
            print()
    print("SELECT setval('depreciation_entries_id_seq', (SELECT MAX(id) FROM depreciation_entries));")
    print()
    
    print("-- ============================================================================")
    print("-- FINANCIAL STATEMENTS (24 months)")
    print("-- ============================================================================")
    statements = generate_financial_statements(24)
    
    print("-- Cash Flow")
    print("INSERT INTO cash_flow (month, opening_balance, cash_inflows, cash_outflows, net_cash_flow, closing_balance, notes) VALUES")
    print(",\n".join(statements['cash_flow']) + ";")
    print()
    
    print("-- Working Capital")
    print("INSERT INTO working_capital (month, accounts_receivable, inventory, accounts_payable, other_current_assets, other_current_liabilities, working_capital_need) VALUES")
    print(",\n".join(statements['working_capital']) + ";")
    print()
    
    print("-- Profit and Loss")
    print("INSERT INTO profit_and_loss (month, total_revenue, cost_of_goods_sold, operating_expenses, personnel_costs, leasing_costs, depreciation, interest_expense, taxes, other_expenses, gross_profit, operating_profit, net_profit) VALUES")
    print(",\n".join(statements['profit_loss']) + ";")
    print()
    
    print("-- Balance Sheet")
    print("INSERT INTO balance_sheet (month, current_assets, fixed_assets, intangible_assets, total_assets, current_liabilities, long_term_debt, total_liabilities, share_capital, retained_earnings, total_equity) VALUES")
    print(",\n".join(statements['balance_sheet']) + ";")
    print()
    
    print("-- Financial Plan")
    print("INSERT INTO financial_plan (month, equity, loans, other_sources, total_sources, investments, working_capital, loan_repayments, other_uses, total_uses, net_financing) VALUES")
    print(",\n".join(statements['financial_plan']) + ";")
    print()
    
    print("-- ============================================================================")
    print("-- VARIABLES")
    print("-- ============================================================================")
    print("INSERT INTO variables (name, type, value, unit, effective_date, end_date, description, is_active) VALUES")
    variables = [
        "('VAT Rate', 'tax', 19.0, 'percentage', '2024-01-01', NULL, 'Value Added Tax rate', true)",
        "('Corporate Tax Rate', 'tax', 25.0, 'percentage', '2024-01-01', NULL, 'Corporate income tax rate', true)",
        "('Inflation Rate', 'inflation', 8.5, 'percentage', '2024-01-01', NULL, 'Annual inflation rate', true)",
        "('EUR to TND Exchange Rate', 'exchange_rate', 3.25, 'rate', '2024-01-01', NULL, 'Euro to Tunisian Dinar exchange rate', true)",
        "('Minimum Wage', 'cost', 450.0, 'TND', '2024-01-01', NULL, 'Minimum monthly wage', true)",
        "('Social Security Rate', 'tax', 18.75, 'percentage', '2024-01-01', NULL, 'Employer social security contribution rate', true)",
    ]
    print(",\n".join(variables) + ";")

if __name__ == '__main__':
    main()

